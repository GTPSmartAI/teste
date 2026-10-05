"""
Módulo de Backup de Manhwas em ZIP para Google Drive (Mangaflix Prime)
Pasta Oficial de Backup no Google Drive:
https://drive.google.com/drive/folders/11g-K6_KWhbdYcC5eKBpuiox_iVTzkzc3

Regra de Negócio:
- Junta todos os capítulos do Manhwa em um único ZIP completo ({manga_id}_completo.zip)
- Ao adicionar novos capítulos, gera novo ZIP completo, envia para a pasta e remove o ZIP anterior no Drive.
"""
import os
import io
import json
import zipfile
import tempfile
import urllib.request
from typing import Dict, List, Optional
from config import get_settings
from database import get_connection

# Pasta oficial de backup e credencial da Service Account (GDRIVE_FOLDER_ID / GDRIVE_CREDENTIALS_FILE no .env)
GDRIVE_FOLDER_ID = get_settings().GDRIVE_FOLDER_ID
GDRIVE_CREDENTIALS_FILE = get_settings().GDRIVE_CREDENTIALS_FILE

def get_gdrive_service():
    """
    Retorna cliente autenticado do Google Drive API v3 caso haja credencial Service Account.
    """
    if not os.path.exists(GDRIVE_CREDENTIALS_FILE):
        return None
    try:
        from google.oauth2 import service_account
        from googleapiclient.discovery import build
        
        creds = service_account.Credentials.from_service_account_file(
            GDRIVE_CREDENTIALS_FILE,
            scopes=['https://www.googleapis.com/auth/drive']
        )
        service = build('drive', 'v3', credentials=creds)
        return service
    except Exception as e:
        print(f"[GDRIVE ERROR] Falha ao inicializar Google Drive Service: {e}")
        return None

def build_manga_zip(manga_id: str, output_zip_path: Optional[str] = None) -> str:
    """
    Baixa todas as páginas de todos os capítulos do mangá e cria um arquivo .zip consolidado.
    """
    conn = get_connection()
    if not conn:
        raise RuntimeError("Banco MariaDB 'aaa' inacessível para gerar backup.")

    chapters = []
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT chapter_number, title, pages_json 
                FROM aaa.capitulos 
                WHERE manga_id = %s 
                ORDER BY chapter_number ASC;
                """,
                (manga_id,)
            )
            chapters = cur.fetchall()
    finally:
        conn.close()

    if not chapters:
        raise ValueError(f"Nenhum capítulo encontrado para o mangá '{manga_id}'.")

    if not output_zip_path:
        temp_dir = tempfile.gettempdir()
        output_zip_path = os.path.join(temp_dir, f"{manga_id}_completo.zip")

    print(f"[BACKUP ZIP] Criando arquivo consolidado para '{manga_id}' ({len(chapters)} capítulos)...")
    
    with zipfile.ZipFile(output_zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for ch in chapters:
            c_num = ch['chapter_number']
            pages = json.loads(ch['pages_json']) if isinstance(ch['pages_json'], str) else ch['pages_json']
            folder_name = f"Capitulo_{c_num:03d}"

            for idx, p_url in enumerate(pages, start=1):
                try:
                    req = urllib.request.Request(p_url, headers={'User-Agent': 'MangaflixBackup/1.0'})
                    with urllib.request.urlopen(req, timeout=20) as resp:
                        page_data = resp.read()
                    
                    ext = "webp"
                    if ".png" in p_url.lower():
                        ext = "png"
                    elif ".jpg" in p_url.lower() or ".jpeg" in p_url.lower():
                        ext = "jpg"

                    file_in_zip = f"{folder_name}/p_{idx:03d}.{ext}"
                    zipf.writestr(file_in_zip, page_data)
                except Exception as ep:
                    print(f"  [Aviso Backup] Erro ao baixar pág {idx} do Cap {c_num}: {ep}")

    print(f"[BACKUP ZIP] ZIP gerado com sucesso: {output_zip_path} ({os.path.getsize(output_zip_path) // 1024} KB)")
    return output_zip_path

def backup_manga_to_gdrive(manga_id: str) -> Dict:
    """
    Executa o fluxo completo de backup:
    1. Gera o ZIP consolidado com todos os capítulos
    2. Procura se já existe um ZIP anterior no Google Drive na pasta informada
    3. Se existir, exclui o anterior
    4. Sobe o novo ZIP
    """
    zip_path = build_manga_zip(manga_id)
    zip_filename = f"{manga_id}_completo.zip"
    service = get_gdrive_service()

    if not service:
        # Se as credenciais do Google API não estiverem adicionadas no servidor, mantém o zip local
        return {
            "success": True,
            "status": "zip_generated_locally",
            "message": "ZIP gerado localmente. Configure 'gdrive_credentials.json' na raiz do backend para upload automático.",
            "local_path": zip_path,
            "folder_id": GDRIVE_FOLDER_ID,
            "filename": zip_filename,
            "size_kb": os.path.getsize(zip_path) // 1024
        }

    try:
        from googleapiclient.http import MediaFileUpload

        # 1. Buscar arquivo anterior com o mesmo nome na pasta
        query = f"'{GDRIVE_FOLDER_ID}' in parents and name = '{zip_filename}' and trashed = false"
        results = service.files().list(q=query, spaces='drive', fields='files(id, name)').execute()
        existing_files = results.get('files', [])

        # 2. Excluir versões anteriores para manter apenas o ZIP mais completo
        for old_file in existing_files:
            print(f"[GDRIVE] Removendo versão antiga do ZIP: {old_file['name']} (ID: {old_file['id']})...")
            service.files().delete(fileId=old_file['id']).execute()

        # 3. Upload do novo ZIP
        file_metadata = {
            'name': zip_filename,
            'parents': [GDRIVE_FOLDER_ID]
        }
        media = MediaFileUpload(zip_path, mimetype='application/zip', resumable=True)
        uploaded = service.files().create(body=file_metadata, media_body=media, fields='id, name, webViewLink').execute()

        print(f"[GDRIVE] Upload concluído com sucesso! ID: {uploaded.get('id')}")
        return {
            "success": True,
            "status": "uploaded",
            "file_id": uploaded.get('id'),
            "file_name": uploaded.get('name'),
            "view_link": uploaded.get('webViewLink'),
            "folder_id": GDRIVE_FOLDER_ID,
            "size_kb": os.path.getsize(zip_path) // 1024
        }
    except Exception as e:
        print(f"[GDRIVE ERROR] Falha no upload para o Google Drive: {e}")
        return {
            "success": False,
            "error": str(e),
            "local_path": zip_path
        }
