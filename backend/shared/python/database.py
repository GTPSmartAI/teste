"""
Conexão com o MariaDB do Mangaflix Prime
Base oficial: aaa (VPS 2.25.124.5)
REGRA DE ISOLAMENTO: NUNCA TOCAR EM 'cell' OU 'ebook_readers_gtp'
"""
import logging

from config import get_settings

logger = logging.getLogger("Database")


def get_connection():
    """
    Retorna uma conexão ativa com o MariaDB (pymysql, DictCursor), ou None se o banco estiver fora do ar.
    """
    settings = get_settings()
    try:
        import pymysql
        return pymysql.connect(
            host=settings.DB_HOST,
            port=settings.DB_PORT,
            user=settings.DB_USER,
            password=settings.DB_PASSWORD,
            database=settings.DB_NAME,
            cursorclass=pymysql.cursors.DictCursor,
            charset="utf8mb4",
            connect_timeout=10,
        )
    except ImportError:
        logger.error("pymysql não instalado. Rode 'pip install -r requirements.txt'.")
        return None
    except Exception as e:
        logger.error(f"Falha ao conectar ao MariaDB ({settings.DB_HOST} / {settings.DB_NAME}): {e}")
        return None


# Tabelas criadas sozinhas quando a API inicia (idempotente)
_NEW_TABLES = {
    # Uma linha por aparelho logado. Só o SHA-256 do token fica salvo.
    "sessoes": """
        CREATE TABLE IF NOT EXISTS `sessoes` (
          `token_hash` CHAR(64) NOT NULL PRIMARY KEY,
          `user_id` VARCHAR(100) NOT NULL,
          `created_at` DATETIME NOT NULL,
          `expires_at` DATETIME NOT NULL,
          `last_seen_at` DATETIME NULL,
          `user_agent` VARCHAR(255) NULL,
          `ip` VARCHAR(64) NULL,
          INDEX `idx_sessoes_user` (`user_id`),
          INDEX `idx_sessoes_expires` (`expires_at`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    """,
    # Sem COLLATE fixo: usa o padrão do banco, o mesmo das tabelas do schema_mariadb.sql
    # (com collations diferentes o JOIN com `usuarios` falha com "Illegal mix of collations")
}


def ensure_schema() -> None:
    """Cria as tabelas novas (sessões de login) se ainda não existirem."""
    conn = get_connection()
    if not conn:
        logger.error("Não foi possível verificar o schema: banco indisponível.")
        return
    try:
        with conn.cursor() as cursor:
            for ddl in _NEW_TABLES.values():
                cursor.execute(ddl)
        conn.commit()
    except Exception as e:
        logger.error(f"Não foi possível verificar/migrar o schema do banco: {e}")
    finally:
        conn.close()
