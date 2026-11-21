# Instalación y ejecución

Requisitos: Git y Docker con Compose. En Windows inicia Docker Desktop con contenedores Linux. Para desarrollo y pruebas locales instala también Node.js 24 y [uv](https://docs.astral.sh/uv/getting-started/installation/); uv prepara Python 3.12. En PowerShell puedes usar `npm.cmd` si se bloquea `npm.ps1`.

## Obtener el código

```bash
git clone https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart.git
cd Pruebas-De-Software-RentSmart
git switch develop
cp .env.example .env
```

`develop` contiene el avance integrado; registramos `git rev-parse HEAD` al ejecutar pruebas. `main` conserva las versiones estables. Para reproducir la entrega 3 utilizamos `git switch --detach v3.0-entrega3`; los hitos anteriores son `v1.0-entrega1` y `v2.0-entrega2`.

## Iniciar con Docker

Genera una clave de sesión; por ejemplo, si tienes uv:

```bash
uv run --directory backend python -c "import secrets; print(secrets.token_hex(32))"
```

Coloca el resultado en `AUTH_SECRET_KEY` del `.env` raíz. Si trabajas únicamente con Docker puedes generarlo antes del arranque con `docker run --rm python:3.12-alpine python -c "import secrets; print(secrets.token_hex(32))"`. Conserva la clave entre reinicios y mantén el archivo fuera de Git.

```bash
docker compose up --build -d --wait
docker compose ps
```

| Servicio | Dirección |
| --- | --- |
| Aplicación | http://localhost:5173 |
| API interactiva | http://localhost:8000/docs |
| Estado de API | http://localhost:8000/api/health |
| Estado de API y PostgreSQL | http://localhost:8000/api/health/ready |
| PostgreSQL local | `127.0.0.1:15432` |

El backend aplica las migraciones antes de iniciar. PostgreSQL conserva sus datos en el volumen `postgres_data`. Para consultar errores o detener los servicios conservando datos:

```bash
docker compose logs backend frontend db
docker compose down
```

La sugerencia de descripción con IA (HU-17) es opcional. Para usarla, crea una clave gratuita en [Google AI Studio](https://aistudio.google.com/apikey) y colócala en `GEMINI_API_KEY` del `.env`; no la versiones ni la compartas. `GEMINI_MODEL`, `AI_TIMEOUT_SECONDS` (12), `AI_USER_REQUESTS` (5) y `AI_USER_WINDOW_SECONDS` (60) también son opcionales; vacías, usan el valor por defecto. Sin clave, la aplicación informa que la sugerencia no está disponible y la descripción se escribe a mano.

## Desarrollo local

Desde la raíz, inicia la base:

```bash
docker compose up -d --wait db
```

En una terminal, prepara el backend; copia la misma `AUTH_SECRET_KEY` en `backend/.env` antes de iniciarlo:

```bash
cd backend
cp .env.example .env
uv sync --frozen
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

En otra terminal, desde la raíz:

```bash
cd frontend
cp .env.example .env
npm ci
npm run dev -- --host 127.0.0.1
```

Los ejemplos usan PostgreSQL en el puerto `15432`; si cambias credenciales, base o puerto del `.env` raíz, ajusta también `backend/.env`. `API_PROXY_TARGET` del frontend permite cambiar el destino de `/api` en desarrollo.

## Ejecutar pruebas

Con PostgreSQL iniciado y las dependencias locales instaladas, desde `frontend`:

```bash
npm run build
npm run test:ci
```

Desde `backend`, con su `.env` configurado:

```bash
uv run alembic upgrade head
uv run alembic check
uv run pytest -q
```

El usuario PostgreSQL debe poder crear esquemas: las pruebas aíslan cada caso, aplican las migraciones y eliminan únicamente su esquema al finalizar. El frontend simula HTTP en jsdom; estas suites no requieren un navegador conectado a la API. [[Estrategia-y-resultados-de-pruebas]] explica lo que comprueba cada nivel.

Para las pruebas E2E, desde la raíz y con Docker iniciado:

```bash
cd frontend && npm ci && npx playwright install --with-deps chromium && cd ..
bash scripts/run-e2e.sh
```

El lanzador crea un entorno temporal propio, ejecuta Chromium en modo headless y lo elimina al terminar; no usa tu `.env` ni la base de desarrollo, y deja `GEMINI_API_KEY` vacía. En Git Bash para Windows usa `MSYS2_ARG_CONV_EXCL=/app bash scripts/run-e2e.sh`. [[Entrega-3]] explica opciones y reportes.

Si la API devuelve `503`, revisa servicios, credenciales y logs. Si falta la clave de sesión, configura una de al menos 32 caracteres. Las instrucciones y variables originales están en el [README](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/main/README.md) y los archivos `.env.example`.

## Actualización, CI y producción

Para actualizar a `v3.0-entrega3` ejecutamos `alembic upgrade head` antes de iniciar la API: `0008_space_moderation` (HU-18) agrega motivo, autor y fecha del retiro. Los retiros anteriores quedan sin motivo registrado. Para administrar publicaciones se promueve una cuenta existente en PostgreSQL, como explica [HU-18](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/develop/docs/HU-18.md). En producción, la clave de Gemini va en `/opt/rentsmart/shared/.env` y se aplica en el siguiente despliegue ([HU-17](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/develop/docs/HU-17.md)); hoy no está configurada.

En entrega 2, la migración `0006_payment_simulation` incorporó importe y fecha opcionales al pago. Al actualizar ejecutamos Alembic antes de iniciar la API; no inventamos valores para datos antiguos. Conservamos los volúmenes y respaldamos bases con datos relevantes antes de migrar.

Las [instrucciones de CI/Slack](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/develop/docs/notificaciones-slack.md) describen el secreto de repositorio y la verificación real en `#rentsmart-ci`. [[Entrega-2]] explica los eventos, jobs, artefactos y sondas.

`compose.production.yaml` es independiente del Compose local y sirve React compilado con Caddy. La [guía de despliegue](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/develop/docs/despliegue.md) detalla requisitos Linux, entorno protegido, SSH, migraciones y verificación pública. La [guía para obtener los datos del VPS](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/develop/docs/preparar-vps.md) reúne la información del servidor. El VPS de Azure está publicado desde la entrega 2 y se actualiza al desplegar `main`; no reutilizamos puertos, secretos ni volúmenes de producción para pruebas temporales.
