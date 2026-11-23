#!/usr/bin/env bash
# Credenciales disponibles solo en el job protegido de GitHub Actions.
set -euo pipefail
umask 077

: "${DEPLOY_HOST:?Configura DEPLOY_HOST}"
: "${DEPLOY_USER:?Configura DEPLOY_USER}"
: "${DEPLOY_PORT:?Configura DEPLOY_PORT}"
: "${DEPLOY_ROOT:?Configura DEPLOY_ROOT}"
: "${DEPLOY_URL:?Configura DEPLOY_URL}"
: "${SSH_PRIVATE_KEY:?Configura SSH_PRIVATE_KEY}"
: "${SSH_KNOWN_HOSTS:?Configura SSH_KNOWN_HOSTS}"
: "${GITHUB_SHA:?Falta el SHA de GitHub}"
# Opcional: si existe el secreto GEMINI_API_KEY, se escribe en shared/.env antes de desplegar.
gemini_api_key=${GEMINI_API_KEY:-}
unset GEMINI_API_KEY
[[ -z "$gemini_api_key" || "$gemini_api_key" =~ ^[A-Za-z0-9._-]{20,512}$ ]] || { echo 'GEMINI_API_KEY con formato inválido' >&2; exit 1; }
[[ "$DEPLOY_HOST" =~ ^[a-zA-Z0-9][a-zA-Z0-9.-]*$ ]] || { echo 'Host inválido' >&2; exit 1; }
[[ "$DEPLOY_USER" =~ ^[a-z_][a-z0-9_-]*$ ]] || { echo 'Usuario inválido' >&2; exit 1; }
[[ "$DEPLOY_PORT" =~ ^[0-9]{1,5}$ ]] || { echo 'Puerto inválido' >&2; exit 1; }
((10#$DEPLOY_PORT >= 1 && 10#$DEPLOY_PORT <= 65535)) || { echo 'Puerto fuera de rango' >&2; exit 1; }
[[ "$DEPLOY_ROOT" =~ ^/([a-zA-Z0-9_-]+/)*[a-zA-Z0-9_-]+$ ]] || { echo 'Directorio inválido' >&2; exit 1; }
[[ "$DEPLOY_URL" =~ ^https://[a-zA-Z0-9.-]+(:[0-9]+)?/?$ ]] || { echo 'URL HTTPS inválida' >&2; exit 1; }
[[ "$GITHUB_SHA" =~ ^[a-f0-9]{40}$ ]] || { echo 'SHA inválido' >&2; exit 1; }
[[ "$(git rev-parse HEAD)" == "$GITHUB_SHA" ]] || { echo 'El checkout no corresponde al SHA aprobado' >&2; exit 1; }

ssh_dir=$(mktemp -d)
trap 'rm -rf -- "$ssh_dir"' EXIT
printf '%s\n' "$SSH_PRIVATE_KEY" > "$ssh_dir/key"
printf '%s\n' "$SSH_KNOWN_HOSTS" > "$ssh_dir/known_hosts"
chmod 600 "$ssh_dir/key" "$ssh_dir/known_hosts"
unset SSH_PRIVATE_KEY SSH_KNOWN_HOSTS
ssh-keygen -y -P '' -f "$ssh_dir/key" >/dev/null
ssh_options=(-i "$ssh_dir/key" -o BatchMode=yes -o IdentitiesOnly=yes
  -o StrictHostKeyChecking=yes -o "UserKnownHostsFile=$ssh_dir/known_hosts"
  -o ConnectTimeout=15 -o ServerAliveInterval=15 -o ServerAliveCountMax=4)
destination="$DEPLOY_USER@$DEPLOY_HOST"

# Los argumentos interpolados se restringen arriba a caracteres sin significado de shell.
release_dir=$(ssh "${ssh_options[@]}" -p "$DEPLOY_PORT" "$destination" \
  "mkdir -p -- '$DEPLOY_ROOT/releases' && mktemp -d '$DEPLOY_ROOT/releases/$GITHUB_SHA.XXXXXXXX'")
[[ "$release_dir" =~ ^$DEPLOY_ROOT/releases/$GITHUB_SHA\.[a-zA-Z0-9]{8}$ ]] || { echo 'Respuesta de directorio remoto inválida' >&2; exit 1; }
# Incluye exclusivamente los archivos versionados del SHA; excluye .git y archivos locales.
git archive --format=tar.gz --output="$ssh_dir/release.tar.gz" "$GITHUB_SHA"
scp "${ssh_options[@]}" -P "$DEPLOY_PORT" "$ssh_dir/release.tar.gz" "$destination:$release_dir/release.tar.gz"
ssh "${ssh_options[@]}" -p "$DEPLOY_PORT" "$destination" \
  "tar -xzf '$release_dir/release.tar.gz' -C '$release_dir' && rm -- '$release_dir/release.tar.gz'"
if [[ -n "$gemini_api_key" ]]; then
  # El valor viaja por stdin: no aparece en la línea de comandos remota ni en los registros.
  printf '%s' "$gemini_api_key" | ssh "${ssh_options[@]}" -p "$DEPLOY_PORT" "$destination" \
    "python3 '$release_dir/scripts/set_env_value.py' '$DEPLOY_ROOT/shared/.env' GEMINI_API_KEY"
fi
unset gemini_api_key
ssh "${ssh_options[@]}" -p "$DEPLOY_PORT" "$destination" \
  "bash '$release_dir/scripts/deploy.sh' '$DEPLOY_ROOT' '$GITHUB_SHA' '$DEPLOY_URL'"
