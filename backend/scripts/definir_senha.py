"""
Define (ou troca) a senha de uma conta sem precisar entrar nela.
Serve para as contas criadas antes do login com senha (ex.: alexandre@gtpsmart.com), que não têm senha.
Também derruba todas as sessões abertas da conta.

Uso (na pasta backend, com o túnel do banco aberto):
    python scripts/definir_senha.py alexandre@gtpsmart.com
"""

import getpass
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "shared" / "python"))

from auth import hash_password, password_problem  # noqa: E402
from database import get_connection  # noqa: E402


def main() -> int:
    if len(sys.argv) != 2:
        print("Uso: python scripts/definir_senha.py <email>")
        return 1
    email = sys.argv[1].strip().lower()

    conn = get_connection()
    if not conn:
        print("Banco indisponível. Abra o túnel (iniciar_dev.ps1) e confira o backend/.env.")
        return 1
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT id, name FROM usuarios WHERE LOWER(email) = %s LIMIT 1", (email,))
            user = cursor.fetchone()
            if not user:
                print(f"Nenhuma conta com o e-mail {email}.")
                return 1

            password = getpass.getpass(f"Nova senha para {user['name']} ({email}): ")
            problem = password_problem(password)
            if problem:
                print(problem)
                return 1
            if getpass.getpass("Repita a senha: ") != password:
                print("As senhas não conferem.")
                return 1

            cursor.execute("UPDATE usuarios SET password_hash = %s WHERE id = %s", (hash_password(password), user["id"]))
            cursor.execute("DELETE FROM sessoes WHERE user_id = %s", (user["id"],))
        conn.commit()
    finally:
        conn.close()

    print("Senha definida. Já dá para entrar pelo app.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
