#!/usr/bin/env bash
set -euo pipefail

public_url=${1:?Uso: verify-deployment.sh URL SHA}
expected_sha=${2:?Indica el SHA esperado}
public_url=${public_url%/}
[[ "$public_url" =~ ^https?://[a-zA-Z0-9.-]+(:[0-9]+)?$ ]] || { echo 'URL inválida' >&2; exit 1; }
[[ "$expected_sha" =~ ^[a-f0-9]{40}$ ]] || { echo 'SHA inválido' >&2; exit 1; }

probe_dir=$(mktemp -d)
trap 'rm -rf -- "$probe_dir"' EXIT
for endpoint in version.json api/health/ready; do
  curl --fail --silent --show-error --connect-timeout 10 --max-time 15 \
    --retry 8 --retry-all-errors --retry-delay 3 \
    "$public_url/$endpoint" -o "$probe_dir/${endpoint##*/}"
done
python3 - "$probe_dir" "$expected_sha" <<'PY'
import json
import pathlib
import sys

directory = pathlib.Path(sys.argv[1])
version = json.loads((directory / "version.json").read_text())
health = json.loads((directory / "ready").read_text())
if version.get("commit") != sys.argv[2]:
    raise SystemExit("La versión pública no coincide con el commit aprobado")
if health != {"status": "ok", "database": "connected"}:
    raise SystemExit("La API pública no confirma conexión con PostgreSQL")
print(f"Versión verificada: {sys.argv[2]}; API y PostgreSQL disponibles.")
PY
