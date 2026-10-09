# Instalación y ejecución

Requisitos: Git y Docker con Compose. En Windows inicia Docker Desktop con contenedores Linux. Para desarrollo y pruebas locales instala también Node.js 24 y [uv](https://docs.astral.sh/uv/getting-started/installation/); uv prepara Python 3.12. En PowerShell puedes usar `npm.cmd` si se bloquea `npm.ps1`.

## Obtener el código

```bash
git clone https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart.git
cd Pruebas-De-Software-RentSmart
git switch develop
cp .env.example .env
```

Todavía no publicamos una versión estable de Entrega 1. Usa `develop` para obtener el MVP descrito en esta Wiki.

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

Si la API devuelve `503`, revisa servicios, credenciales y logs. Si falta la clave de sesión, configura una de al menos 32 caracteres. Las instrucciones y variables originales están en el [README](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/develop/README.md) y los archivos `.env.example`.
