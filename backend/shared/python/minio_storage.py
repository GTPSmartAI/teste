"""
Integração com o MinIO S3 (Mangaflix Prime)
Guarda capas, banners e páginas verticais dos capítulos no bucket 'mangaflix'.
Credenciais só no .env (MINIO_ROOT_USER / MINIO_ROOT_PASSWORD).
"""
import io
import logging

from config import get_settings

logger = logging.getLogger("MinIO")

_settings = get_settings()
MINIO_BUCKET = _settings.MINIO_BUCKET


def get_minio_client():
    """Retorna o cliente MinIO configurado, ou None sem o SDK ou sem credenciais."""
    if not _settings.MINIO_ROOT_USER or not _settings.MINIO_ROOT_PASSWORD:
        logger.warning("MinIO sem credenciais no .env (MINIO_ROOT_USER / MINIO_ROOT_PASSWORD).")
        return None
    try:
        from minio import Minio
    except ImportError:
        return None
    endpoint = _settings.MINIO_ENDPOINT.replace("http://", "").replace("https://", "").strip()
    return Minio(
        endpoint,
        access_key=_settings.MINIO_ROOT_USER,
        secret_key=_settings.MINIO_ROOT_PASSWORD,
        secure=_settings.MINIO_SECURE,
    )


def build_public_url(path: str) -> str:
    """URL HTTPS pública direta do objeto no bucket (o bucket 'mangaflix' tem leitura pública)."""
    return f"{_settings.MINIO_PUBLIC_URL.rstrip('/')}/{path.lstrip('/')}"


def _put(object_path: str, data: bytes, ext: str) -> str:
    client = get_minio_client()
    if client:
        try:
            client.put_object(
                bucket_name=MINIO_BUCKET,
                object_name=object_path,
                data=io.BytesIO(data),
                length=len(data),
                content_type=f"image/{ext}",
            )
        except Exception as e:
            logger.error(f"Falha no upload de {object_path}: {e}")
    return build_public_url(object_path)


def upload_page_image(manga_id: str, chapter_num: int, page_num: int, image_bytes: bytes, ext: str = "webp") -> str:
    """Página vertical do capítulo: capitulos/{manga_id}/cap_{chapter_num}/p_{page_num:03d}.{ext}"""
    return _put(f"capitulos/{manga_id}/cap_{chapter_num}/p_{page_num:03d}.{ext}", image_bytes, ext)


def upload_cover_image(manga_id: str, image_bytes: bytes, ext: str = "webp") -> str:
    """Capa oficial da obra: capas/{manga_id}.{ext}"""
    return _put(f"capas/{manga_id}.{ext}", image_bytes, ext)
