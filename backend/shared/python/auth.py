"""
Autenticação do Mangaflix Prime

- Senhas: Argon2id (argon2-cffi). Regra: 8+ caracteres, maiúsculas, minúsculas e número.
- Sessões: token aleatório de 256 bits entregue ao app; no banco fica só o SHA-256 dele
  (tabela sessoes). Quem ler o banco não consegue entrar na conta. Sair apaga a sessão.
- Tentativas de login: bloqueio temporário por e-mail e por IP (em memória: a API roda 1 processo).
- Rotas protegidas usam Depends(require_user); o servidor nunca confia em user_id mandado pelo app.
"""

import hashlib
import logging
import re
import secrets
import threading
import time
from datetime import datetime, timedelta
from typing import Any, Dict, Optional, Tuple

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError
from fastapi import HTTPException, Request

from database import get_connection

logger = logging.getLogger("Auth")

SESSION_DAYS = 30
PASSWORD_MIN = 8
PASSWORD_MAX = 256
EMAIL_RE = re.compile(r"^[^@\s]{1,64}@[^@\s]{1,190}\.[^@\s]{2,}$")

_hasher = PasswordHasher()
# Hash de uma senha qualquer: e-mail inexistente também paga o custo do Argon2 (não dá para descobrir
# quais e-mails têm conta medindo o tempo de resposta)
_DUMMY_HASH = _hasher.hash(secrets.token_urlsafe(16))


# ------------------------------------------------------------------ senhas

def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(stored_hash: Optional[str], password: str) -> bool:
    if not stored_hash:
        try:
            _hasher.verify(_DUMMY_HASH, password)
        except Exception:
            pass
        return False
    try:
        return _hasher.verify(stored_hash, password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def password_problem(password: str) -> Optional[str]:
    """Mensagem de erro se a senha não serve, ou None."""
    if not isinstance(password, str) or len(password) < PASSWORD_MIN:
        return f"A senha precisa ter pelo menos {PASSWORD_MIN} caracteres."
    if len(password) > PASSWORD_MAX:
        return "A senha é longa demais."
    if password.lower() == password or password.upper() == password or not re.search(r"\d", password):
        return "Use letras maiúsculas, minúsculas e pelo menos um número."
    return None


# ------------------------------------------------------------------ usuário público

def public_user(row: Dict[str, Any]) -> Dict[str, Any]:
    """Dados do usuário que podem ir para o app (nunca o hash da senha)."""
    name = row.get("name") or ""
    return {
        "id": row["id"],
        "name": name,
        "email": row.get("email"),
        "rank": row.get("rank") or "RANK E",
        "level": int(row.get("level") or 1),
        "xp": int(row.get("xp") or 0),
        "role": row.get("role") or "leitor",
        "avatarInitial": name[:1].upper() or "U",
        "created_at": str(row["created_at"]) if row.get("created_at") else None,
    }


# ------------------------------------------------------------------ sessões

def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _now() -> datetime:
    return datetime.now()


def client_ip(request: Request) -> str:
    # O uvicorn roda com --proxy-headers: request.client já é o IP real vindo do Traefik
    return request.client.host if request.client else "?"


def create_session(conn, user_id: str, request: Request) -> str:
    token = secrets.token_urlsafe(32)
    now = _now()
    with conn.cursor() as cursor:
        cursor.execute(
            "INSERT INTO `sessoes` (`token_hash`, `user_id`, `created_at`, `expires_at`, `last_seen_at`, `user_agent`, `ip`) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s)",
            (
                _token_hash(token),
                user_id,
                now,
                now + timedelta(days=SESSION_DAYS),
                now,
                (request.headers.get("user-agent") or "")[:255],
                client_ip(request)[:64],
            ),
        )
    conn.commit()
    return token


def delete_session(token: str) -> None:
    th = _token_hash(token)
    with _session_cache_lock:
        _session_cache.pop(th, None)
    conn = get_connection()
    if not conn:
        return
    try:
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM `sessoes` WHERE `token_hash` = %s", (th,))
        conn.commit()
    finally:
        conn.close()


# Cache curto (token -> usuário) para não consultar o banco em toda requisição
_SESSION_CACHE_SECONDS = 60
_session_cache: Dict[str, Tuple[float, Dict[str, Any]]] = {}
_session_cache_lock = threading.Lock()


def forget_cached_user(user_id: str) -> None:
    """Descarta o cache do usuário (depois de mudar nome, XP, etc.)."""
    with _session_cache_lock:
        for key in [k for k, (_, u) in _session_cache.items() if u.get("id") == user_id]:
            _session_cache.pop(key, None)


def user_from_token(token: str) -> Optional[Dict[str, Any]]:
    if not token or len(token) > 200:
        return None
    th = _token_hash(token)
    now = time.monotonic()
    with _session_cache_lock:
        cached = _session_cache.get(th)
        if cached and now - cached[0] < _SESSION_CACHE_SECONDS:
            return cached[1]
    conn = get_connection()
    if not conn:
        raise HTTPException(status_code=503, detail="Banco de dados indisponível no momento. Tente novamente em instantes.")
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT u.* FROM `sessoes` s JOIN `usuarios` u ON u.`id` = s.`user_id` "
                "WHERE s.`token_hash` = %s AND s.`expires_at` > %s LIMIT 1",
                (th, _now()),
            )
            row = cursor.fetchone()
            if not row:
                return None
            cursor.execute("UPDATE `sessoes` SET `last_seen_at` = %s WHERE `token_hash` = %s", (_now(), th))
        conn.commit()
    finally:
        conn.close()
    user = public_user(row)
    with _session_cache_lock:
        _session_cache[th] = (now, user)
        if len(_session_cache) > 5000:
            _session_cache.clear()
    return user


def bearer_token(request: Request) -> Optional[str]:
    header = request.headers.get("authorization", "")
    if header.startswith("Bearer "):
        return header[7:].strip()
    return None


def require_user(request: Request) -> Dict[str, Any]:
    """Dependência FastAPI: rota só para usuário logado."""
    user = user_from_token(bearer_token(request) or "")
    if not user:
        raise HTTPException(status_code=401, detail="Sessão expirada. Entre novamente.")
    return user


def require_admin(request: Request) -> Dict[str, Any]:
    """Dependência FastAPI: rota só para administradores."""
    user = require_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem fazer isso.")
    return user


# ------------------------------------------------------------------ limite de tentativas

_WINDOW_SECONDS = 15 * 60
_MAX_FAILS_PER_EMAIL = 5
_MAX_FAILS_PER_IP = 25
_fails: Dict[str, list] = {}
_fails_lock = threading.Lock()


def _recent(key: str, now: float) -> list:
    stamps = [t for t in _fails.get(key, []) if now - t < _WINDOW_SECONDS]
    _fails[key] = stamps
    return stamps


def login_blocked_for(email: str, ip: str) -> int:
    """Segundos até poder tentar de novo (0 = liberado)."""
    now = time.monotonic()
    with _fails_lock:
        waits = []
        for key, limit in ((f"e:{email}", _MAX_FAILS_PER_EMAIL), (f"i:{ip}", _MAX_FAILS_PER_IP)):
            stamps = _recent(key, now)
            if len(stamps) >= limit:
                waits.append(int(_WINDOW_SECONDS - (now - stamps[-limit])) + 1)
        return max(waits) if waits else 0


def register_login_failure(email: str, ip: str) -> None:
    now = time.monotonic()
    with _fails_lock:
        for key in (f"e:{email}", f"i:{ip}"):
            _recent(key, now).append(now)
        if len(_fails) > 20000:
            _fails.clear()


def clear_login_failures(email: str) -> None:
    with _fails_lock:
        _fails.pop(f"e:{email}", None)
