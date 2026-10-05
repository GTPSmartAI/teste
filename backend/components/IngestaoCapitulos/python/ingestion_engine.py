"""
Engine de Ingestão & Processamento de Mangás (Mangaflix Prime)
- Otimização automática de imagens para WebP (alta nitidez e peso reduzido).
- Upload para o MinIO S3 (Bucket 'mangaflix').
- Registro automático no MariaDB (Base 'aaa').
ISOLAMENTO: Rígido para a base 'aaa' e bucket 'mangaflix'.
"""

import os
import io
import sys
import json
import argparse
from pathlib import Path
from typing import List, Optional
from PIL import Image

# Rodando direto pela linha de comando: acha os módulos de backend/shared/python
sys.path.insert(0, str(Path(__file__).resolve().parents[3] / "shared" / "python"))

from database import get_connection
from minio_storage import get_minio_client, build_public_url, MINIO_BUCKET

def optimize_image_to_webp(image_input: bytes, max_width: int = 1200, quality: int = 85) -> bytes:
    """
    Converte qualquer imagem (JPG, PNG, WebP bruta) para WebP otimizado para Webtoon.
    Reduz largura para max_width se for maior, mantendo proporção original.
    """
    with Image.open(io.BytesIO(image_input)) as img:
        # Converter modo para RGB (remover transparências problemáticas para webtoon)
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")

        # Redimensionamento inteligente se ultrapassar max_width
        if img.width > max_width:
            ratio = max_width / float(img.width)
            new_height = int(float(img.height) * float(ratio))
            img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)

        output_io = io.BytesIO()
        img.save(output_io, format="WEBP", quality=quality, method=4)
        return output_io.getvalue()

def register_or_update_manga(
    manga_id: str,
    title: str,
    author: str,
    genres: List[str],
    synopsis: str,
    cover_bytes: Optional[bytes] = None,
    banner_bytes: Optional[bytes] = None,
    manga_type: str = "Manhwa",
    status: str = "lancando"
) -> dict:
    """
    Cria ou atualiza uma obra no catálogo e envia capa/banner para o MinIO.
    """
    client = get_minio_client()
    cover_url = build_public_url(f"capas/{manga_id}.webp")
    banner_url = build_public_url(f"banners/{manga_id}.webp")

    # Upload da Capa para o MinIO
    if client and cover_bytes:
        opt_cover = optimize_image_to_webp(cover_bytes, max_width=800, quality=90)
        object_name = f"capas/{manga_id}.webp"
        client.put_object(
            bucket_name=MINIO_BUCKET,
            object_name=object_name,
            data=io.BytesIO(opt_cover),
            length=len(opt_cover),
            content_type="image/webp"
        )
        cover_url = build_public_url(object_name)

    # Upload do Banner para o MinIO
    if client and banner_bytes:
        opt_banner = optimize_image_to_webp(banner_bytes, max_width=1600, quality=85)
        object_name = f"banners/{manga_id}.webp"
        client.put_object(
            bucket_name=MINIO_BUCKET,
            object_name=object_name,
            data=io.BytesIO(opt_banner),
            length=len(opt_banner),
            content_type="image/webp"
        )
        banner_url = build_public_url(object_name)

    # Registro na base MariaDB 'aaa'
    conn = get_connection()
    if conn:
        try:
            with conn.cursor() as cursor:
                sql = """
                INSERT INTO aaa.mangas (id, title, type, genres, cover, banner, author, status, synopsis)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    title = VALUES(title),
                    type = VALUES(type),
                    genres = VALUES(genres),
                    cover = VALUES(cover),
                    banner = VALUES(banner),
                    author = VALUES(author),
                    status = VALUES(status),
                    synopsis = VALUES(synopsis);
                """
                cursor.execute(sql, (
                    manga_id, title, manga_type, json.dumps(genres),
                    cover_url, banner_url, author, status, synopsis
                ))
                conn.commit()
        finally:
            conn.close()

    return {
        "manga_id": manga_id,
        "title": title,
        "cover_url": cover_url,
        "banner_url": banner_url
    }

def register_chapter(
    manga_id: str,
    chapter_number: int,
    chapter_title: str,
    pages_raw: List[bytes] # Lista de bytes das imagens em ordem
) -> dict:
    """
    Processa todas as páginas do capítulo, converte para WebP, faz upload para o MinIO
    e salva o registro do capítulo no MariaDB com o array de páginas no pages_json.
    """
    client = get_minio_client()
    pages_urls = []

    print(f"\n[INGESTÃO] Processando Capítulo {chapter_number} de '{manga_id}' ({len(pages_raw)} páginas)...")

    for idx, page_bytes in enumerate(pages_raw, start=1):
        # 1. Otimizar para WebP
        opt_page = optimize_image_to_webp(page_bytes, max_width=1200, quality=85)
        object_name = f"capitulos/{manga_id}/cap_{chapter_number}/p_{idx:03d}.webp"

        # 2. Upload para MinIO
        if client:
            client.put_object(
                bucket_name=MINIO_BUCKET,
                object_name=object_name,
                data=io.BytesIO(opt_page),
                length=len(opt_page),
                content_type="image/webp"
            )

        public_url = build_public_url(object_name)
        pages_urls.append(public_url)
        print(f"  ✓ Página {idx:02d}/{len(pages_raw):02d} -> {object_name} ({len(opt_page) // 1024} KB)")

    # 3. Salvar no MariaDB base 'aaa'
    conn = get_connection()
    if conn:
        try:
            with conn.cursor() as cursor:
                # Salvar/atualizar capítulo
                sql_cap = """
                INSERT INTO aaa.capitulos (manga_id, chapter_number, title, pages_json)
                VALUES (%s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    title = VALUES(title),
                    pages_json = VALUES(pages_json);
                """
                cursor.execute(sql_cap, (manga_id, chapter_number, chapter_title, json.dumps(pages_urls)))

                # Atualizar contagem de capítulos na tabela mangas
                sql_update_count = """
                UPDATE aaa.mangas
                SET chapters_count = (SELECT COUNT(*) FROM aaa.capitulos WHERE manga_id = %s)
                WHERE id = %s;
                """
                cursor.execute(sql_update_count, (manga_id, manga_id))
                conn.commit()
                print(f"[SUCESSO] Capítulo {chapter_number} registrado com sucesso na base 'aaa'!")
        finally:
            conn.close()

    return {
        "manga_id": manga_id,
        "chapter_number": chapter_number,
        "total_pages": len(pages_urls),
        "pages": pages_urls
    }

def ingest_from_folder(manga_id: str, chapter_number: int, chapter_title: str, folder_path: str):
    """
    Lê todas as imagens de uma pasta local e ingere o capítulo completo.
    """
    if not os.path.isdir(folder_path):
        print(f"[ERRO] Pasta não encontrada: {folder_path}")
        return

    valid_extensions = (".jpg", ".jpeg", ".png", ".webp", ".bmp")
    files = sorted([
        os.path.join(folder_path, f) for f in os.listdir(folder_path)
        if f.lower().endswith(valid_extensions)
    ])

    if not files:
        print(f"[AVISO] Nenhuma imagem encontrada na pasta: {folder_path}")
        return

    pages_bytes = []
    for f in files:
        with open(f, "rb") as img_file:
            pages_bytes.append(img_file.read())

    return register_chapter(manga_id, chapter_number, chapter_title, pages_bytes)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Mangaflix Ingestion Engine")
    parser.add_argument("--manga", type=str, help="ID do mangá (ex: solo-leveling)")
    parser.add_argument("--cap", type=int, help="Número do capítulo")
    parser.add_argument("--title", type=str, default="", help="Título do capítulo")
    parser.add_argument("--pasta", type=str, help="Caminho da pasta com as imagens da obra")
    
    args = parser.parse_args()
    if args.manga and args.cap and args.pasta:
        ingest_from_folder(args.manga, args.cap, args.title or f"Capítulo {args.cap}", args.pasta)
    else:
        print("Engine de Ingestão Mangaflix pronta!")
        print("Uso: python ingestion_engine.py --manga <id> --cap <numero> --pasta <caminho_das_imagens>")
