#!/bin/sh
set -e

PORT=${PORT:-5000}
echo "== Iniciando Mangaflix Prime API na porta $PORT =="

# Um único processo: o limite de tentativas de login e o cache de sessões ficam na memória do processo.
# --proxy-headers: atrás do Traefik, o IP real do visitante vem no X-Forwarded-For.
exec uvicorn api_server:app --host 0.0.0.0 --port "$PORT" --workers 1 \
    --proxy-headers --forwarded-allow-ips '*'
