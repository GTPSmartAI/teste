"""
Mangaflix Prime - API (FastAPI)
Base de dados: aaa (MariaDB na VPS 2.25.124.5). ISOLAMENTO: só a base 'aaa' e o bucket 'mangaflix'.

Segurança:
- Login com e-mail e senha (Argon2id). Toda rota com dados de usuário exige sessão (token Bearer).
  O usuário vem do token, nunca de um user_id mandado pelo app.
- Tradução exige login; backup no Google Drive só para administradores.
"""

import json
import logging
import secrets
import sys
from pathlib import Path
from typing import Any, Dict, Optional

# Adiciona diretórios ao sys.path para resolução limpa de módulos
_BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(_BASE_DIR / "shared" / "python"))
sys.path.insert(0, str(_BASE_DIR / "components" / "IngestaoCapitulos" / "python"))
sys.path.insert(0, str(_BASE_DIR / "components" / "TradutorIA" / "python"))
sys.path.insert(0, str(_BASE_DIR / "components" / "BackupDrive" / "python"))

from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

from config import get_settings
from database import ensure_schema, get_connection
from auth import (
    EMAIL_RE,
    bearer_token,
    clear_login_failures,
    client_ip,
    create_session,
    delete_session,
    hash_password,
    login_blocked_for,
    password_problem,
    public_user,
    register_login_failure,
    require_admin,
    require_user,
    verify_password,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("API")

settings = get_settings()

app = FastAPI(
    title="Mangaflix Prime API",
    description="Backend do Mangaflix Prime: catálogo, leitor, conta única com login e tradução de capítulos.",
    version="1.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.on_event("startup")
def _startup() -> None:
    # Tabela de sessões de login (criada sozinha se não existir)
    ensure_schema()


@app.middleware("http")
async def security_headers(request: Request, call_next):
    resp = await call_next(request)
    resp.headers.setdefault("X-Content-Type-Options", "nosniff")
    resp.headers.setdefault("X-Frame-Options", "DENY")
    if request.url.path.startswith("/api/auth/"):
        resp.headers["Cache-Control"] = "no-store"
    return resp


def db():
    """Conexão por requisição (fechada no fim). 503 se o banco estiver fora do ar."""
    conn = get_connection()
    if not conn:
        raise HTTPException(status_code=503, detail="Banco de dados indisponível no momento. Tente novamente em instantes.")
    try:
        yield conn
    finally:
        conn.close()


def _json_list(value: Any) -> list:
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, list) else []
        except ValueError:
            return []
    return []


# ==========================================
# MODELOS
# ==========================================

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class NovoComentario(BaseModel):
    manga_id: str
    chapter_number: Optional[int] = None
    text: str


class RegistroHistorico(BaseModel):
    manga_id: str
    chapter_number: int
    percent_read: int = 100


# ==========================================
# STATUS
# ==========================================

@app.get("/")
def root():
    return {"status": "online", "app": "Mangaflix Prime API", "docs": "/docs"}


@app.get("/api/health")
def health_check():
    conn = get_connection()
    if not conn:
        return {"status": "error", "database": "disconnected"}
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) AS total FROM mangas")
            mangas_count = cursor.fetchone()["total"]
            cursor.execute("SELECT COUNT(*) AS total FROM capitulos")
            caps_count = cursor.fetchone()["total"]
        return {"status": "ok", "database": "connected", "metrics": {"mangas": mangas_count, "capitulos": caps_count}}
    except Exception as e:
        logger.error(f"Health check falhou: {e}")
        return {"status": "error", "database": "query_failed"}
    finally:
        conn.close()


# ==========================================
# LOGIN E CONTA
# ==========================================

@app.post("/api/auth/register")
def auth_register(req: RegisterRequest, request: Request, conn=Depends(db)):
    name = req.name.strip()
    email = req.email.strip().lower()
    if not name or len(name) > 150:
        raise HTTPException(status_code=400, detail="Informe seu nome (até 150 caracteres).")
    if not EMAIL_RE.match(email) or len(email) > 254:
        raise HTTPException(status_code=400, detail="E-mail inválido.")
    problem = password_problem(req.password)
    if problem:
        raise HTTPException(status_code=400, detail=problem)

    with conn.cursor() as cursor:
        cursor.execute("SELECT id FROM usuarios WHERE LOWER(email) = %s LIMIT 1", (email,))
        if cursor.fetchone():
            raise HTTPException(status_code=409, detail="Já existe uma conta com este e-mail. Use a opção Entrar.")
        user_id = f"user-{secrets.token_hex(8)}"
        # Toda conta nova começa como leitor; o papel (vip/admin) só muda direto no banco
        cursor.execute(
            "INSERT INTO usuarios (id, name, email, password_hash, `rank`, level, xp, role) "
            "VALUES (%s, %s, %s, %s, 'RANK E', 1, 0, 'leitor')",
            (user_id, name, email, hash_password(req.password)),
        )
        conn.commit()
        cursor.execute("SELECT * FROM usuarios WHERE id = %s", (user_id,))
        user = cursor.fetchone()

    token = create_session(conn, user_id, request)
    return {"token": token, "user": public_user(user)}


@app.post("/api/auth/login")
def auth_login(req: LoginRequest, request: Request, conn=Depends(db)):
    email = req.email.strip().lower()
    ip = client_ip(request)
    wait = login_blocked_for(email, ip)
    if wait:
        minutes = max(1, wait // 60)
        raise HTTPException(status_code=429, detail=f"Muitas tentativas. Tente de novo em {minutes} min.")

    with conn.cursor() as cursor:
        cursor.execute("SELECT * FROM usuarios WHERE LOWER(email) = %s LIMIT 1", (email,))
        user = cursor.fetchone()

    if not verify_password(user.get("password_hash") if user else None, req.password):
        register_login_failure(email, ip)
        raise HTTPException(status_code=401, detail="E-mail ou senha incorretos.")

    clear_login_failures(email)
    token = create_session(conn, user["id"], request)
    return {"token": token, "user": public_user(user)}


@app.post("/api/auth/logout")
def auth_logout(request: Request):
    token = bearer_token(request)
    if token:
        delete_session(token)
    return {"success": True}


@app.get("/api/auth/me")
def auth_me(user: Dict[str, Any] = Depends(require_user)):
    return {"user": user}


# ==========================================
# CATÁLOGO DE MANGÁS (aberto)
# ==========================================

def _format_manga(m: Dict[str, Any]) -> Dict[str, Any]:
    m["genres"] = _json_list(m.get("genres"))
    m["tags"] = _json_list(m.get("tags"))
    if m.get("rating") is not None:
        m["rating"] = float(m["rating"])
    return m


@app.get("/api/mangas")
def list_mangas(
    q: Optional[str] = Query(None, description="Busca por título ou autor"),
    genre: Optional[str] = Query(None, description="Filtrar por gênero"),
    status: Optional[str] = Query(None, description="Status da obra (lancando/concluido)"),
    conn=Depends(db),
):
    query = "SELECT * FROM mangas WHERE 1=1"
    params: list = []
    if q:
        query += " AND (title LIKE %s OR author LIKE %s)"
        params.extend([f"%{q}%", f"%{q}%"])
    if status:
        query += " AND status = %s"
        params.append(status)
    query += " ORDER BY rating DESC, chapters_count DESC"
    with conn.cursor() as cursor:
        cursor.execute(query, params)
        mangas = [_format_manga(m) for m in cursor.fetchall()]
    if genre:
        mangas = [m for m in mangas if genre.lower() in [g.lower() for g in m["genres"]]]
    return mangas


@app.get("/api/mangas/{manga_id}")
def get_manga(manga_id: str, conn=Depends(db)):
    with conn.cursor() as cursor:
        cursor.execute("SELECT * FROM mangas WHERE id = %s", (manga_id,))
        manga = cursor.fetchone()
    if not manga:
        raise HTTPException(status_code=404, detail="Obra não encontrada")
    return _format_manga(manga)


@app.get("/api/mangas/{manga_id}/capitulos")
def get_chapters(manga_id: str, conn=Depends(db)):
    with conn.cursor() as cursor:
        cursor.execute(
            "SELECT id, manga_id, chapter_number, title, views_count, rating, created_at "
            "FROM capitulos WHERE manga_id = %s ORDER BY chapter_number DESC",
            (manga_id,),
        )
        return cursor.fetchall()


@app.get("/api/capitulos/{manga_id}/{chapter_number}")
def get_chapter_pages(manga_id: str, chapter_number: int, conn=Depends(db)):
    with conn.cursor() as cursor:
        cursor.execute(
            "SELECT * FROM capitulos WHERE manga_id = %s AND chapter_number = %s",
            (manga_id, chapter_number),
        )
        cap = cursor.fetchone()
    if not cap:
        raise HTTPException(status_code=404, detail="Capítulo não encontrado")
    cap["pages_json"] = _json_list(cap.get("pages_json"))
    return cap


# ==========================================
# RANKING (sem e-mails)
# ==========================================

@app.get("/api/ranking")
def get_ranking(user: Dict[str, Any] = Depends(require_user), conn=Depends(db)):
    with conn.cursor() as cursor:
        cursor.execute(
            "SELECT u.id, u.name, u.`rank`, u.level, u.xp, "
            "(SELECT COUNT(*) FROM historico_leitura h WHERE h.user_id = u.id) AS total_lidos "
            "FROM usuarios u ORDER BY u.xp DESC, u.level DESC, u.created_at ASC LIMIT 50"
        )
        rows = cursor.fetchall()
    return [
        {
            "pos": i + 1,
            "name": r["name"],
            "rank": r["rank"],
            "level": int(r["level"] or 1),
            "xp": int(r["xp"] or 0),
            "total_lidos": int(r["total_lidos"] or 0),
            "initial": (r["name"] or "U")[:1].upper(),
            "isUser": r["id"] == user["id"],
        }
        for i, r in enumerate(rows)
    ]


# ==========================================
# FAVORITOS E HISTÓRICO (do usuário logado)
# ==========================================

@app.get("/api/favoritos")
def get_favorites(user: Dict[str, Any] = Depends(require_user), conn=Depends(db)):
    with conn.cursor() as cursor:
        cursor.execute("SELECT manga_id FROM favoritos WHERE user_id = %s", (user["id"],))
        return [row["manga_id"] for row in cursor.fetchall()]


@app.post("/api/favoritos/{manga_id}/toggle")
def toggle_favorite(manga_id: str, user: Dict[str, Any] = Depends(require_user), conn=Depends(db)):
    with conn.cursor() as cursor:
        cursor.execute("SELECT id FROM favoritos WHERE user_id = %s AND manga_id = %s", (user["id"], manga_id))
        if cursor.fetchone():
            cursor.execute("DELETE FROM favoritos WHERE user_id = %s AND manga_id = %s", (user["id"], manga_id))
            conn.commit()
            return {"favorited": False}
        cursor.execute("SELECT id FROM mangas WHERE id = %s", (manga_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Obra não encontrada")
        cursor.execute("INSERT INTO favoritos (user_id, manga_id) VALUES (%s, %s)", (user["id"], manga_id))
        conn.commit()
        return {"favorited": True}


@app.get("/api/historico")
def get_history(user: Dict[str, Any] = Depends(require_user), conn=Depends(db)):
    with conn.cursor() as cursor:
        cursor.execute(
            "SELECT h.manga_id, h.chapter_number, h.percent_read, h.updated_at "
            "FROM historico_leitura h WHERE h.user_id = %s ORDER BY h.updated_at DESC",
            (user["id"],),
        )
        return cursor.fetchall()


@app.post("/api/historico")
def save_history(data: RegistroHistorico, user: Dict[str, Any] = Depends(require_user), conn=Depends(db)):
    percent = max(0, min(100, data.percent_read))
    with conn.cursor() as cursor:
        cursor.execute(
            "INSERT INTO historico_leitura (user_id, manga_id, chapter_number, percent_read) "
            "VALUES (%s, %s, %s, %s) "
            "ON DUPLICATE KEY UPDATE chapter_number = VALUES(chapter_number), percent_read = VALUES(percent_read)",
            (user["id"], data.manga_id, data.chapter_number, percent),
        )
        conn.commit()
    return {"success": True}


@app.delete("/api/historico/{manga_id}")
def delete_history_item(manga_id: str, user: Dict[str, Any] = Depends(require_user), conn=Depends(db)):
    with conn.cursor() as cursor:
        cursor.execute("DELETE FROM historico_leitura WHERE user_id = %s AND manga_id = %s", (user["id"], manga_id))
        conn.commit()
    return {"success": True}


@app.delete("/api/historico")
def clear_history(user: Dict[str, Any] = Depends(require_user), conn=Depends(db)):
    with conn.cursor() as cursor:
        cursor.execute("DELETE FROM historico_leitura WHERE user_id = %s", (user["id"],))
        conn.commit()
    return {"success": True}


# ==========================================
# COMENTÁRIOS
# ==========================================

@app.get("/api/comentarios/{manga_id}")
def get_comments(manga_id: str, chapter: Optional[int] = None, conn=Depends(db)):
    with conn.cursor() as cursor:
        if chapter is not None:
            cursor.execute(
                "SELECT * FROM comentarios WHERE manga_id = %s AND chapter_number = %s ORDER BY created_at DESC LIMIT 200",
                (manga_id, chapter),
            )
        else:
            cursor.execute(
                "SELECT * FROM comentarios WHERE manga_id = %s AND chapter_number IS NULL ORDER BY created_at DESC LIMIT 200",
                (manga_id,),
            )
        comments = cursor.fetchall()
    for c in comments:
        c["userInitial"] = (c.get("user_name") or "U")[:1].upper()
    return comments


@app.post("/api/comentarios")
def post_comment(c: NovoComentario, user: Dict[str, Any] = Depends(require_user), conn=Depends(db)):
    text = c.text.strip()
    if not text or len(text) > 2000:
        raise HTTPException(status_code=400, detail="O comentário precisa ter entre 1 e 2000 caracteres.")
    comment_id = "c_" + secrets.token_hex(6)
    with conn.cursor() as cursor:
        cursor.execute(
            "INSERT INTO comentarios (id, manga_id, chapter_number, user_id, user_name, user_rank, text, rating) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, NULL)",
            (comment_id, c.manga_id, c.chapter_number, user["id"], user["name"], user["rank"], text),
        )
        conn.commit()
    return {"success": True, "comment_id": comment_id}


# ==========================================
# TRADUÇÃO IA / OCR
# ==========================================

@app.get("/api/traducao/{manga_id}/{chapter_number}")
def get_translation_status(manga_id: str, chapter_number: int):
    """Verifica se já existem páginas traduzidas para o capítulo no MinIO."""
    from minio_storage import get_minio_client, MINIO_BUCKET, build_public_url
    client = get_minio_client()
    prefix = f"capitulos_traduzidos/{manga_id}/cap_{chapter_number}/"
    translated_pages = []
    if client:
        try:
            objects = client.list_objects(MINIO_BUCKET, prefix=prefix, recursive=True)
            for obj in sorted(objects, key=lambda x: x.object_name):
                if obj.object_name.endswith(".webp"):
                    translated_pages.append(build_public_url(obj.object_name))
        except Exception as e:
            logger.warning(f"Falha ao listar tradução {prefix}: {e}")
    return {
        "manga_id": manga_id,
        "chapter_number": chapter_number,
        "translated": len(translated_pages) > 0,
        "total_translated": len(translated_pages),
        "pages": translated_pages,
    }


@app.post("/api/traducao/{manga_id}/{chapter_number}")
def execute_translation(
    manga_id: str,
    chapter_number: int,
    max_pages: int = Query(10, ge=1, le=30),
    user: Dict[str, Any] = Depends(require_user),
):
    """Dispara o pipeline de tradução (OCR + tradução PT-BR + upload no MinIO)."""
    from translator_pipeline import translate_chapter
    try:
        return translate_chapter(manga_id, chapter_number, max_pages=max_pages)
    except Exception as e:
        logger.error(f"Erro na tradução de {manga_id} cap {chapter_number}: {e}")
        raise HTTPException(status_code=500, detail="Erro na tradução. Tente novamente.")


# ==========================================
# BACKUP (GOOGLE DRIVE & ZIP) - só administradores
# ==========================================

@app.post("/api/backup/{manga_id}/gdrive")
def trigger_gdrive_backup(manga_id: str, user: Dict[str, Any] = Depends(require_admin)):
    """Gera o ZIP com todos os capítulos e substitui a versão anterior na pasta do Google Drive."""
    from gdrive_backup import backup_manga_to_gdrive
    try:
        return backup_manga_to_gdrive(manga_id)
    except Exception as e:
        logger.error(f"Erro no backup de {manga_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Erro no backup para o Google Drive: {e}")


@app.get("/api/backup/{manga_id}/download")
def download_manga_zip(manga_id: str, user: Dict[str, Any] = Depends(require_admin)):
    """Download direto do ZIP completo de todos os capítulos do mangá."""
    from gdrive_backup import build_manga_zip
    try:
        zip_path = build_manga_zip(manga_id)
    except Exception as e:
        logger.error(f"Erro ao gerar ZIP de {manga_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao gerar ZIP do mangá: {e}")
    return FileResponse(path=zip_path, filename=f"{manga_id}_completo.zip", media_type="application/zip")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.HOST, port=settings.PORT)
