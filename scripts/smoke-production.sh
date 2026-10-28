#!/usr/bin/env bash
# Integración HTTP/infraestructura de entrega 2, sin navegador ni pruebas E2E/UI.
set -euo pipefail
umask 077
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."
export RELEASE_SHA=${1:-$(git rev-parse HEAD)}
[[ "$RELEASE_SHA" =~ ^[a-f0-9]{40}$ ]] || { echo 'SHA inválido' >&2; exit 1; }
project="rentsmart-smoke-$$"
probe_dir=$(mktemp -d)
export IMAGE_PREFIX="$project"
export POSTGRES_USER=rentsmart POSTGRES_DB=rentsmart
export POSTGRES_PASSWORD AUTH_SECRET_KEY
POSTGRES_PASSWORD=$(openssl rand -hex 32)
AUTH_SECRET_KEY=$(openssl rand -hex 32)
export SITE_ADDRESS=:80 HTTP_BIND=127.0.0.1 HTTP_PORT=0 HTTPS_PORT=0
export AUTH_TOKEN_MINUTES=30
touch "$probe_dir/empty.env"
compose=(docker compose --project-name "$project" --env-file "$probe_dir/empty.env" -f compose.production.yaml)
cleanup() {
  result=$?
  if (( result != 0 )); then
    "${compose[@]}" logs --tail 60 db backend frontend || true
  fi
  # Solo eliminamos los recursos del proyecto temporal creado por esta ejecución.
  "${compose[@]}" down --volumes --remove-orphans >/dev/null 2>&1 || true
  docker image rm "$IMAGE_PREFIX-backend:$RELEASE_SHA" "$IMAGE_PREFIX-frontend:$RELEASE_SHA" >/dev/null 2>&1 || true
  rm -rf -- "$probe_dir"
  exit "$result"
}
trap cleanup EXIT
"${compose[@]}" config --quiet
"${compose[@]}" build backend frontend
"${compose[@]}" run --rm --no-deps frontend caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
"${compose[@]}" up -d --wait --wait-timeout 120 db
"${compose[@]}" run --rm --no-deps migrate
"${compose[@]}" run --rm --no-deps migrate /app/.venv/bin/alembic check
"${compose[@]}" up -d --no-build --wait --wait-timeout 180 backend frontend
for service in backend frontend; do
  container=$("${compose[@]}" ps -q "$service")
  revision=$(docker inspect --format '{{ index .Config.Labels "org.opencontainers.image.revision" }}' "$container")
  [[ "$revision" == "$RELEASE_SHA" ]]
done
address=$("${compose[@]}" port frontend 80)
public_url="http://$address"
bash scripts/verify-deployment.sh "$public_url" "$RELEASE_SHA"

curl --fail --silent --show-error "$public_url/" -o "$probe_dir/index.html"
curl --fail --silent --show-error "$public_url/ruta-spa" -o "$probe_dir/fallback.html"
cmp "$probe_dir/index.html" "$probe_dir/fallback.html"
grep -q 'id="root"' "$probe_dir/index.html"
status=$(curl --silent --show-error -o "$probe_dir/api-error.json" -w '%{http_code}' "$public_url/api/no-existe")
[[ "$status" == 404 ]]
python3 - "$probe_dir/api-error.json" <<'PY'
import json, pathlib, sys
assert json.loads(pathlib.Path(sys.argv[1]).read_text()) == {"detail": "Not Found"}
PY
if bash scripts/verify-deployment.sh "$public_url" 0000000000000000000000000000000000000000; then
  echo 'La comprobación aceptó un SHA incorrecto' >&2
  exit 1
fi

# Recrear contenedores conserva los datos y permite repetir las migraciones.
"${compose[@]}" exec -T db psql -v ON_ERROR_STOP=1 -U rentsmart -d rentsmart <<'SQL'
CREATE TABLE deployment_probe (id integer PRIMARY KEY);
INSERT INTO deployment_probe VALUES (1);
SQL
"${compose[@]}" down
"${compose[@]}" up -d --wait --wait-timeout 120 db
"${compose[@]}" run --rm --no-deps migrate
value=$("${compose[@]}" exec -T db psql -At -v ON_ERROR_STOP=1 -U rentsmart -d rentsmart -c 'SELECT id FROM deployment_probe')
[[ "$value" == 1 ]]
"${compose[@]}" up -d --no-build --wait --wait-timeout 180 backend frontend
public_url="http://$("${compose[@]}" port frontend 80)"
bash scripts/verify-deployment.sh "$public_url" "$RELEASE_SHA"
printf 'Smoke aprobado: build, migraciones, proxy, SPA, versión y persistencia.\n'
