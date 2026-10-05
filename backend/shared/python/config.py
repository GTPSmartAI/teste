import os
from pathlib import Path
from dotenv import load_dotenv

# Carrega o .env localizado na raiz de backend/
_BASE_DIR = Path(__file__).resolve().parent.parent.parent
_ENV_PATH = _BASE_DIR / ".env"

if _ENV_PATH.exists():
    load_dotenv(dotenv_path=_ENV_PATH)
else:
    load_dotenv()

# Origens do app que podem chamar a API: site, app Android (Capacitor) e desenvolvimento local
_DEFAULT_ORIGINS = "https://front-teste.iagtp.com.br,https://localhost,capacitor://localhost,http://localhost:5173,http://127.0.0.1:5173"


class Settings:
    """Configurações centrais do Mangaflix Prime."""
    PORT: int = int(os.getenv("PORT", "5000"))
    HOST: str = os.getenv("HOST", "0.0.0.0")
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"

    # Senhas e chaves vêm só do .env (backend/.env local; na VPS, backend.env). Nunca escrever no código.

    # MariaDB (VPS 2.25.124.5 / túnel SSH). Base exclusiva do Mangaflix: 'aaa'
    DB_HOST: str = os.getenv("DB_HOST", "127.0.0.1")
    DB_PORT: int = int(os.getenv("DB_PORT", "3306"))
    DB_USER: str = os.getenv("DB_USER", "")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "")
    DB_NAME: str = os.getenv("DB_NAME", "aaa")

    # MinIO S3 (VPS Traefik). Bucket exclusivo: 'mangaflix'
    MINIO_ENDPOINT: str = os.getenv("MINIO_ENDPOINT", "cell-s3.iagtp.com.br")
    MINIO_ROOT_USER: str = os.getenv("MINIO_ROOT_USER", "")
    MINIO_ROOT_PASSWORD: str = os.getenv("MINIO_ROOT_PASSWORD", "")
    MINIO_BUCKET: str = os.getenv("MINIO_BUCKET", "mangaflix")
    MINIO_SECURE: bool = os.getenv("MINIO_SECURE", "true").lower() in ("true", "1", "yes")
    MINIO_PUBLIC_URL: str = os.getenv("MINIO_PUBLIC_URL", "https://cell-s3.iagtp.com.br/mangaflix")

    # Backup no Google Drive
    GDRIVE_FOLDER_ID: str = os.getenv("GDRIVE_FOLDER_ID", "")
    GDRIVE_CREDENTIALS_FILE: str = os.getenv("GDRIVE_CREDENTIALS_FILE", str(_BASE_DIR / "gdrive_credentials.json"))

    CORS_ORIGINS: list = [o.strip() for o in os.getenv("CORS_ORIGINS", _DEFAULT_ORIGINS).split(",") if o.strip()]


_settings_instance = None


def get_settings() -> Settings:
    global _settings_instance
    if _settings_instance is None:
        _settings_instance = Settings()
    return _settings_instance
