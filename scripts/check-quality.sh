#!/usr/bin/env bash
# Check requerido por la protección de ramas: no admite fallos, cancelaciones ni omisiones.
set -euo pipefail

{
  printf '## Resultado de CI\n\n'
  printf '| Trabajo | Resultado |\n| --- | --- |\n'
  printf '| frontend | %s |\n' "$FRONTEND_RESULT"
  printf '| backend | %s |\n' "$BACKEND_RESULT"
  printf '| production | %s |\n' "$PRODUCTION_RESULT"
  printf '| e2e | %s |\n' "$E2E_RESULT"
} >> "${GITHUB_STEP_SUMMARY:?Falta el destino del resumen de CI}"

for result in "$FRONTEND_RESULT" "$BACKEND_RESULT" "$PRODUCTION_RESULT" "$E2E_RESULT"; do
  if [[ "$result" != success ]]; then
    echo '::error::CI bloqueada: frontend, backend, smoke y E2E deben terminar correctamente.'
    exit 1
  fi
done
echo 'Build, migraciones, pruebas, smoke y E2E aprobados.'
