# Deploy e infraestrutura

Última atualização: 05/10/2026

## Onde fica cada coisa

- **VPS:** `2.25.124.5`, usuário `root`, acesso só pela chave SSH `~/.ssh/id_ed25519` (sem senha nos scripts nem na documentação).
- **Frontend:** https://front-teste.iagtp.com.br (serviço `mangaflix_frontend`, nginx servindo `/root/MANGAFLIX-APP/frontend/dist`).
- **Backend:** https://back-api-teste.iagtp.com.br (serviço `mangaflix_api`, imagem `mangaflix-api:<data>`, uvicorn na porta 5000 do container, 1 processo).
- Os dois serviços rodam no Docker Swarm da VPS, na rede `GTP`, atrás do Traefik (certificado Let's Encrypt).

## Banco de dados (MariaDB/MySQL da VPS)

- Base exclusiva do Mangaflix: **`aaa`**. NUNCA tocar nas bases `cell` e `ebook_readers_gtp` (são de outros projetos).
- Tabelas: `usuarios`, `mangas`, `capitulos`, `comentarios`, `favoritos`, `historico_leitura` (criadas pelo `backend/schema_mariadb.sql`) e `sessoes` (criada sozinha pela API ao iniciar).
- O container chega no banco por `172.17.0.1` (docker0). No computador, pelo túnel SSH que o `iniciar_dev.ps1` abre (`localhost:3306`).
- As tabelas usam a collation padrão do servidor (`utf8mb4_0900_ai_ci`). Tabela nova não deve fixar outra collation: o JOIN com `usuarios` falha ("Illegal mix of collations").
- Em 05/10/2026 a base estava **vazia** (nenhuma conta, nenhuma obra). Os dados de exemplo ficam em `backend/scripts/seed_data.sql`.

## MinIO (imagens)

- Bucket exclusivo **`mangaflix`**, leitura pública por `https://cell-s3.iagtp.com.br/mangaflix/` (não mexer nos buckets `cell` e `ebook-readers-gtp`).
- Pastas: `capas/{manga_id}.webp`, `banners/{manga_id}.webp`, `capitulos/{manga_id}/cap_{n}/p_{001}.webp`, `capitulos_traduzidos/{manga_id}/cap_{n}/...`.

## Senhas e chaves

- Ficam **só** no `backend/.env` (fora do Git). O `deploy.ps1` gera o `backend.env` da VPS a partir dele, trocando `DB_HOST`, `HOST`, `PORT`, `DEBUG` e `TZ`.
- Variáveis: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `MINIO_ENDPOINT`, `MINIO_PUBLIC_URL`, `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`, `MINIO_BUCKET`, `MINIO_SECURE`, `GDRIVE_FOLDER_ID`, `GDRIVE_CREDENTIALS_FILE`, `CORS_ORIGINS` (opcional).
- Até 05/10/2026 a senha do banco, a chave do MinIO e a senha root da VPS estavam escritas no código e nesta pasta, e foram para o GitHub. Foram tiradas dos arquivos, mas **continuam no histórico do Git**: precisam ser trocadas (ver [proximos-passos.md](proximos-passos.md)).

## Como publicar

```powershell
powershell -ExecutionPolicy Bypass -File deploy\deploy.ps1                         # deploy + APK + GitHub
powershell -ExecutionPolicy Bypass -File deploy\deploy.ps1 -Message "o que mudou"  # mensagem do commit
powershell -ExecutionPolicy Bypass -File deploy\deploy.ps1 -NoApk -NoGit           # só a VPS
```

O script compila o frontend com `VITE_API_URL=https://back-api-teste.iagtp.com.br`, envia backend e frontend, roda `deploy/remote_deploy.sh` na VPS, gera o APK e faz commit/push. Antes do push ele recusa arquivos `.env`, chaves e linhas com cara de senha.

## Remover tudo da VPS (só se o dono pedir)

```bash
docker service rm mangaflix_api mangaflix_frontend
rm -rf /root/MANGAFLIX-APP
mysql -e "DROP DATABASE aaa; CREATE DATABASE aaa CHARACTER SET utf8mb4;"   # SÓ a base aaa
docker run --rm --network GTP -v /root/.mc:/root/.mc minio/mc rb --force local/mangaflix   # SÓ o bucket mangaflix
```
