#!/usr/bin/env bash
# Navegador real contra Caddy/API/PostgreSQL temporales; nunca reutiliza producción.
set -euo pipefail
umask 077
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."

[[ -x frontend/node_modules/.bin/playwright ]] || {
  echo 'Instala dependencias: cd frontend && npm ci && npx playwright install --with-deps chromium' >&2
  exit 1
}
# Detecta navegador/dependencias ausentes antes de construir o crear recursos Docker.
node <<'JS'
const { chromium } = require('./frontend/node_modules/@playwright/test');
(async () => {
  const browser = await chromium.launch({ headless: true });
  await browser.close();
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
JS
export RELEASE_SHA
RELEASE_SHA=$(git rev-parse HEAD)
project="rentsmart-e2e-$(openssl rand -hex 6)"
export IMAGE_PREFIX="$project"
export POSTGRES_USER=rentsmart POSTGRES_DB=rentsmart
export POSTGRES_PASSWORD AUTH_SECRET_KEY
POSTGRES_PASSWORD=$(openssl rand -hex 32)
AUTH_SECRET_KEY=$(openssl rand -hex 32)
export SITE_ADDRESS=:80 HTTP_BIND=127.0.0.1 HTTP_PORT=0 HTTPS_PORT=0 AUTH_TOKEN_MINUTES=30
# HU-17: E2E never calls the real AI provider, even if the shell exports a key.
export GEMINI_API_KEY=

mkdir -p frontend/test-results/e2e
export E2E_ARTIFACTS_DIR
E2E_ARTIFACTS_DIR=$(mktemp -d "$PWD/frontend/test-results/e2e/run-XXXXXXXX")
probe_dir=$(mktemp -d)
touch "$probe_dir/empty.env"
compose=(docker compose --project-name "$project" --env-file "$probe_dir/empty.env" -f compose.production.yaml)
cleanup() {
  result=$?
  trap - EXIT
  set +e
  if [[ "${E2E_FAILURE_PROBE:-false}" == true ]]; then
    python3 scripts/e2e_probe.py "$E2E_ARTIFACTS_DIR" > "$E2E_ARTIFACTS_DIR/probe-verification.log" 2>&1
  fi
  "${compose[@]}" logs --no-color --tail 200 db backend frontend > "$E2E_ARTIFACTS_DIR/services.log" 2>&1
  "${compose[@]}" down --volumes --remove-orphans >> "$E2E_ARTIFACTS_DIR/cleanup.log" 2>&1
  cleanup_result=$?
  if (( cleanup_result != 0 )); then
    echo 'No se completó la limpieza del proyecto E2E; revisa cleanup.log.' >&2
    (( result != 0 )) || result=$cleanup_result
  fi
  docker image rm "$IMAGE_PREFIX-backend:$RELEASE_SHA" "$IMAGE_PREFIX-frontend:$RELEASE_SHA" \
    >> "$E2E_ARTIFACTS_DIR/cleanup.log" 2>&1
  rm -rf -- "$probe_dir"
  printf 'Resultado E2E: %s; artefactos: %s\n' "$result" "$E2E_ARTIFACTS_DIR"
  exit "$result"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

{
  printf 'project=%s\nsource_head=%s\n' "$project" "$RELEASE_SHA"
  printf 'failure_probe=%s\n' "${E2E_FAILURE_PROBE:-false}"
  if [[ -n "$(git status --porcelain -- backend frontend scripts/run-e2e.sh scripts/e2e_probe.py compose.production.yaml)" ]]; then
    echo 'source_dirty=true'
  else
    echo 'source_dirty=false'
  fi
} > "$E2E_ARTIFACTS_DIR/environment.txt"

"${compose[@]}" config --quiet
"${compose[@]}" build backend frontend
"${compose[@]}" up -d --wait --wait-timeout 120 db
"${compose[@]}" run --rm --no-deps migrate
"${compose[@]}" run --rm --no-deps migrate /app/.venv/bin/alembic check
"${compose[@]}" up -d --no-build --wait --wait-timeout 180 backend frontend
export BASE_URL
BASE_URL="http://$("${compose[@]}" port frontend 80)"
bash scripts/verify-deployment.sh "$BASE_URL" "$RELEASE_SHA" | tee "$E2E_ARTIFACTS_DIR/readiness.log"
printf 'base_url=%s\n' "$BASE_URL" >> "$E2E_ARTIFACTS_DIR/environment.txt"

# HU-18: public registration never grants admin rights, so we promote one fictitious account
# directly in this temporary database. Credentials live only in this process.
export E2E_ADMIN_EMAIL E2E_ADMIN_PASSWORD
E2E_ADMIN_EMAIL="e2e-admin-$(openssl rand -hex 6)@example.com"
E2E_ADMIN_PASSWORD="Aa9!$(openssl rand -hex 18)"
curl -fsS -o /dev/null -X POST "$BASE_URL/api/auth/register" -H 'Content-Type: application/json' \
  --data "{\"name\":\"Administraci\u00f3n E2E\",\"email\":\"$E2E_ADMIN_EMAIL\",\"password\":\"$E2E_ADMIN_PASSWORD\"}"
promoted=$("${compose[@]}" exec -T db psql -v ON_ERROR_STOP=1 -qtA -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c "UPDATE users SET is_admin = true WHERE email = '$E2E_ADMIN_EMAIL' RETURNING id" | grep -c .)
[[ "$promoted" == 1 ]] || { echo 'No se pudo preparar la cuenta administrativa E2E.' >&2; exit 1; }

npm --prefix frontend run test:e2e -- "$@" 2>&1 | tee "$E2E_ARTIFACTS_DIR/playwright.log"
