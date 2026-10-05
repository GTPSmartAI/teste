#!/bin/bash
# Roda na VPS (chamado pelo deploy.ps1). Recebe em /root/MANGAFLIX-APP/incoming:
#   backend.tgz, frontend-dist.tgz, nginx-frontend.conf
# e o arquivo de ambiente /root/MANGAFLIX-APP/backend.env.
set -euo pipefail

TAG="$1"
APP=/root/MANGAFLIX-APP
IN="$APP/incoming"
API_SERVICE=mangaflix_api
WEB_SERVICE=mangaflix_frontend

mkdir -p "$APP/frontend/dist" "$APP/deploy" "$APP/logs"

echo "== Backend: build da imagem mangaflix-api:$TAG"
rm -rf "$APP/backend-src"
mkdir -p "$APP/backend-src"
tar -xzf "$IN/backend.tgz" -C "$APP/backend-src"
docker build -q -t "mangaflix-api:$TAG" "$APP/backend-src"

if docker service inspect "$API_SERVICE" >/dev/null 2>&1; then
    echo "== Backend: atualizando serviço no Docker Swarm"
    ENV_ARGS=()
    while IFS= read -r line || [ -n "$line" ]; do
        [[ -z "$line" || "$line" == \#* ]] && continue
        ENV_ARGS+=(--env-add "$line")
    done < "$APP/backend.env"
    # Nomes antigos das variáveis (antes de 05/10/2026), trocados por DB_* e MINIO_ROOT_*
    for old in MARIADB_HOST MARIADB_PORT MARIADB_USER MARIADB_PASSWORD MARIADB_DATABASE MINIO_ACCESS_KEY MINIO_SECRET_KEY; do
        ENV_ARGS+=(--env-rm "$old")
    done
    docker service update --quiet --detach=false --image "mangaflix-api:$TAG" "${ENV_ARGS[@]}" "$API_SERVICE"
else
    echo "== Backend: criando serviço mangaflix_api no Docker Swarm"
    docker service create --quiet --detach=false \
        --name "$API_SERVICE" \
        --network GTP \
        --env-file "$APP/backend.env" \
        --label 'traefik.enable=true' \
        --label 'traefik.http.routers.mangaflix-api.rule=Host(`back-api-teste.iagtp.com.br`)' \
        --label 'traefik.http.routers.mangaflix-api.entrypoints=websecure' \
        --label 'traefik.http.routers.mangaflix-api.tls.certresolver=letsencryptresolver' \
        --label 'traefik.http.services.mangaflix-api.loadbalancer.server.port=5000' \
        "mangaflix-api:$TAG"
fi

echo "== Frontend: publicando arquivos web"
rm -rf "$APP/frontend/dist.new"
mkdir -p "$APP/frontend/dist.new"
tar -xzf "$IN/frontend-dist.tgz" -C "$APP/frontend/dist.new"
cp "$IN/nginx-frontend.conf" "$APP/deploy/nginx-frontend.conf"

find "$APP/frontend/dist" -mindepth 1 -delete
cp -a "$APP/frontend/dist.new/." "$APP/frontend/dist/"
rm -rf "$APP/frontend/dist.new"

if docker service inspect "$WEB_SERVICE" >/dev/null 2>&1; then
    echo "== Frontend: atualizando serviço no Docker Swarm"
    docker service update --quiet --detach=false --force "$WEB_SERVICE"
else
    echo "== Frontend: criando serviço mangaflix_frontend no Docker Swarm"
    docker service create --quiet --detach=false \
        --name "$WEB_SERVICE" \
        --network GTP \
        --mount "type=bind,source=$APP/frontend/dist,target=/usr/share/nginx/html,readonly" \
        --mount "type=bind,source=$APP/deploy/nginx-frontend.conf,target=/etc/nginx/conf.d/default.conf,readonly" \
        --label 'traefik.enable=true' \
        --label 'traefik.http.routers.mangaflix-frontend.rule=Host(`front-teste.iagtp.com.br`)' \
        --label 'traefik.http.routers.mangaflix-frontend.entrypoints=websecure' \
        --label 'traefik.http.routers.mangaflix-frontend.tls.certresolver=letsencryptresolver' \
        --label 'traefik.http.services.mangaflix-frontend.loadbalancer.server.port=80' \
        nginx:alpine
fi

# Limpa imagens antigas do backend mantendo apenas as 2 mais recentes
docker images mangaflix-api --format '{{.Tag}}' | sort -r | tail -n +3 | xargs -r -I{} docker rmi "mangaflix-api:{}" >/dev/null 2>&1 || true

rm -rf "$IN"
echo "== Deploy $TAG concluído com sucesso!"
echo "   Backend:  https://back-api-teste.iagtp.com.br"
echo "   Frontend: https://front-teste.iagtp.com.br"
