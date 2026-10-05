# Arquitetura do backend

Mesma organização do projeto Aedolia (`Criação de pdf Readers`): código comum em `shared/python`, cada função grande em `components/<Nome>/python`. O `api_server.py` põe essas pastas no `sys.path`, então os módulos se importam pelo nome (`from database import get_connection`).

```
backend/
├── api_server.py              # API FastAPI (todas as rotas)
├── main.py                    # Sobe a API localmente (porta do .env)
├── entrypoint.sh / Dockerfile # Produção: uvicorn, 1 processo, atrás do Traefik
├── schema_mariadb.sql         # Tabelas da base 'aaa'
├── shared/python/
│   ├── config.py              # Lê o backend/.env (Settings / get_settings)
│   ├── database.py            # Conexão MariaDB e criação da tabela de sessões
│   ├── auth.py                # Senhas Argon2id, sessões, bloqueio de tentativas, require_user/require_admin
│   └── minio_storage.py       # Upload e URL pública no bucket 'mangaflix'
├── components/
│   ├── IngestaoCapitulos/     # ingestion_engine.py: imagens -> WebP -> MinIO -> tabela capitulos
│   ├── TradutorIA/            # translator_pipeline.py: OCR (Tesseract) + tradução PT-BR + glossário
│   └── BackupDrive/           # gdrive_backup.py: ZIP da obra e envio para o Google Drive
├── scripts/
│   ├── definir_senha.py       # Define a senha de uma conta pelo terminal
│   └── seed_data.sql          # Obras e capítulos de exemplo
└── docs/                      # Este arquivo e API_ENDPOINTS.md
```

- Diferença para o Aedolia: aqui a API é **FastAPI** (lá é Flask). A organização das pastas é a mesma.
- Banco: uma conexão por requisição (`Depends(db)` no `api_server.py`); banco fora do ar responde 503.
