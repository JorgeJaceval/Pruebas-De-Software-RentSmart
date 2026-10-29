#!/usr/bin/env bash
# Se ejecuta en Linux desde una release extraída, nunca desde el checkout de trabajo.
set -euo pipefail
umask 077

deploy_root=${1:?Uso: deploy.sh DEPLOY_ROOT SHA URL_HTTPS}
export RELEASE_SHA=${2:?Indica el SHA aprobado}
public_url=${3:?Indica la URL pública HTTPS}
[[ "$deploy_root" =~ ^/([a-zA-Z0-9_-]+/)*[a-zA-Z0-9_-]+$ ]] || { echo 'DEPLOY_ROOT inválido' >&2; exit 1; }
[[ "$RELEASE_SHA" =~ ^[a-f0-9]{40}$ ]] || { echo 'SHA inválido' >&2; exit 1; }
[[ "$public_url" =~ ^https://[a-zA-Z0-9.-]+(:[0-9]+)?/?$ ]] || { echo 'Se requiere una URL HTTPS sin ruta' >&2; exit 1; }
release_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)
[[ "$release_dir" == "$deploy_root/releases/$RELEASE_SHA."* ]] || { echo 'La release no pertenece al destino indicado' >&2; exit 1; }
env_file="$deploy_root/shared/.env"
[[ -f "$env_file" && "$(stat -c '%a' "$env_file")" == 600 ]] || { echo 'Falta shared/.env con permisos 600' >&2; exit 1; }
[[ ! -e "$deploy_root/current" || -L "$deploy_root/current" ]] || { echo 'current debe ser un enlace simbólico' >&2; exit 1; }

exec 9>"$deploy_root/deploy.lock"
flock -n 9 || { echo 'Existe otro despliegue en curso' >&2; exit 1; }
export IMAGE_PREFIX=rentsmart
compose=(docker compose --project-name rentsmart-production --env-file "$env_file" -f "$release_dir/compose.production.yaml")
"${compose[@]}" config --quiet
"${compose[@]}" build --pull backend frontend
"${compose[@]}" run --rm --no-deps frontend caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
"${compose[@]}" up -d --wait --wait-timeout 120 db
# Si la migración falla, no reemplazamos backend/frontend ni marcamos la release.
"${compose[@]}" run --rm --no-deps migrate
"${compose[@]}" up -d --no-build --wait --wait-timeout 180 backend frontend
for service in backend frontend; do
  container=$("${compose[@]}" ps -q "$service")
  revision=$(docker inspect --format '{{ index .Config.Labels "org.opencontainers.image.revision" }}' "$container")
  [[ "$revision" == "$RELEASE_SHA" ]] || { echo "Revisión inesperada en $service" >&2; exit 1; }
done
bash "$release_dir/scripts/verify-deployment.sh" "$public_url" "$RELEASE_SHA"

# Este enlace registra la última verificación exitosa; no controla los contenedores.
ln -s -- "$release_dir" "$deploy_root/.current-$RELEASE_SHA-$$"
mv -Tf -- "$deploy_root/.current-$RELEASE_SHA-$$" "$deploy_root/current"
printf 'Despliegue verificado: %s\n' "$RELEASE_SHA"
