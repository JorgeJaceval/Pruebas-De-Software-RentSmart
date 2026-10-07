# RentSmart

Desarrollamos RentSmart, un proyecto académico de Pruebas de Software para conectar personas que ofrecen espacios con quienes necesitan arrendarlos.

![Identidad de RentSmart](docs/identidad/logo.svg)

## Equipo

| Integrante | Rol | Responsabilidades |
| --- | --- | --- |
| Jorge Aceval | Líder de equipo y responsable de backend e integración | Coordinar tareas y entregas; administrar el repositorio y GitFlow; desarrollar la API con FastAPI, los modelos con SQLModel y la persistencia en PostgreSQL; implementar pruebas con Pytest y configurar CI/CD con GitHub Actions. |
| Joaquín Viveros | Responsable de frontend y pruebas de interfaz | Desarrollar la interfaz con React, TypeScript y Vite; integrar el frontend con la API; implementar pruebas con Jest y React Testing Library y pruebas E2E con Playwright. |

Entre ambos mantenemos la documentación, verificamos los criterios de aceptación y revisamos los pull requests del otro antes de integrarlos.

## Tecnologías seleccionadas

Elegimos las siguientes tecnologías para desarrollar y probar la aplicación:

| Área | Tecnología |
| --- | --- |
| Frontend | React, TypeScript y Vite |
| Backend | Python y FastAPI |
| Base de datos | PostgreSQL y SQLModel ORM |
| Pruebas frontend | Jest y React Testing Library |
| Pruebas backend | Pytest |
| Pruebas E2E | Playwright |
| CI/CD | GitHub Actions |

## Funcionalidades disponibles

Hasta ahora implementamos:

- Página inicial en React y TypeScript, servida por Vite, con estado de disponibilidad y reintento ante fallos.
- Registro de cuentas (HU-01 / REN-1): formulario con nombre, correo y contraseña, validaciones por campo y confirmación de registro.
- API FastAPI con configuración por variables de entorno, CORS y documentación OpenAPI.
- Persistencia PostgreSQL mediante SQLModel y migraciones Alembic. Los correos se normalizan y son únicos; las contraseñas se almacenan como hashes Argon2.
- Docker Compose para iniciar los tres servicios.
- Pruebas con Jest/React Testing Library y Pytest; GitHub Actions las ejecuta en cada PR hacia `develop` o `main` y tras integrar cambios en esas ramas. Las pruebas E2E con Playwright se reservan para la entrega 3.

En la página, selecciona **Crear cuenta** y completa los tres campos. El nombre debe tener entre 2 y 80 caracteres y la contraseña entre 8 y 64. Los errores conservan los datos del formulario para corregirlos. Un correo ya registrado muestra un mensaje junto al campo correspondiente. El registro confirma la creación de la cuenta y no inicia sesión automáticamente; la autenticación corresponde a HU-02.

## Obtener el proyecto

```bash
git clone https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart.git
cd Pruebas-De-Software-RentSmart
git switch develop
```

## Ejecutar con Docker Compose

Requiere Docker con Compose. En Windows, inicia Docker Desktop con el motor de contenedores Linux.

Desde la raíz del repositorio:

```bash
cp .env.example .env
docker compose up --build -d --wait
```

Abre:

| Servicio | Dirección |
| --- | --- |
| Aplicación | <http://localhost:5173> |
| Documentación de la API | <http://localhost:8000/docs> |
| Estado de la API | <http://localhost:8000/api/health> |
| Estado de la API y PostgreSQL | <http://localhost:8000/api/health/ready> |

PostgreSQL se publica en `127.0.0.1:15432`. Su puerto interno es `5432`; los datos se conservan en el volumen `postgres_data`. Las credenciales de los ejemplos son para desarrollo local.

El backend aplica `alembic upgrade head` antes de iniciar. Esto crea la tabla de cuentas y sus restricciones sin borrar los datos existentes.

Para consultar el estado, los registros o detener los servicios conservando los datos:

```bash
docker compose ps
docker compose logs backend frontend
docker compose down
```

## Desarrollo local

Requiere Node.js 24 y [uv](https://docs.astral.sh/uv/getting-started/installation/). uv instala Python 3.12 y crea el entorno del backend. En PowerShell, `cp` también funciona; usa `npm.cmd` y `npx.cmd` si la política de ejecución bloquea `npm.ps1` o `npx.ps1`.

1. Inicia solo PostgreSQL, desde la raíz:

```bash
cp .env.example .env
docker compose up -d --wait db
```

2. En una terminal, instala e inicia el backend:

```bash
cd backend
cp .env.example .env
uv sync --frozen
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

3. En otra terminal, desde la raíz, instala e inicia el frontend:

```bash
cd frontend
cp .env.example .env
npm ci
npm run dev -- --host 127.0.0.1
```

Vite envía las solicitudes `/api` al backend a través de un proxy. `API_PROXY_TARGET` permite cambiar su destino y es una variable del servidor de desarrollo; no contiene secretos ni se incorpora al navegador.

Los archivos `.env.example` documentan las variables de cada servicio. Si cambias usuario, contraseña, base de datos o puerto de PostgreSQL en el `.env` de la raíz, actualiza también `backend/.env` para la ejecución local. Docker Compose transmite estas variables automáticamente al backend dentro del contenedor.

## Ejecutar las pruebas

Con PostgreSQL iniciado, instala las dependencias de backend y frontend como se indica arriba.

Frontend, desde `frontend`:

```bash
npm run test:ci
```

Backend, desde `backend`:

```bash
uv run pytest -q
```

Para probar la API usamos Pytest y PostgreSQL real en un esquema independiente por prueba. Aplicamos las migraciones y eliminamos el esquema al terminar. El usuario de pruebas necesita permiso para crear esquemas. Para el formulario usamos Jest y React Testing Library en jsdom, con solicitudes HTTP simuladas.

Registramos los resultados de HU-01 en el campo **Testing** de [REN-1](https://rentsmartpsf.atlassian.net/browse/REN-1) y en el [PR #4](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/pull/4).

### Playwright: entrega 3

Reservamos las pruebas E2E para la entrega 3 y conservamos la dependencia, el script y la configuración de Playwright para prepararlas. Actualmente no tenemos casos E2E en el repositorio ni ejecutamos Playwright en el pipeline.

Para compilar y visualizar el frontend compilado, con el backend disponible:

```bash
npm run build
npm run preview -- --host 127.0.0.1
```

La vista compilada se sirve en <http://localhost:4173>. Los contenedores de Compose están configurados para desarrollo local.

## Estructura

```text
backend/
  app/             API, configuración y sesiones SQLModel
  migrations/      Historial Alembic del esquema de PostgreSQL
  alembic.ini      Configuración de migraciones
  tests/           Pruebas de API y PostgreSQL
  pyproject.toml   Dependencias Python
  uv.lock          Versiones resueltas de Python
frontend/
  src/             Interfaz, cliente API y pruebas Jest
  package-lock.json
docs/              Documentación e identidad
compose.yaml       PostgreSQL, backend y frontend
.github/workflows/ci.yml
```

Consulta [la arquitectura y configuración de la base](docs/desarrollo.md) para entender los servicios y resolver problemas de arranque.

## Flujo de trabajo

Usamos GitFlow: `main` contiene versiones estables, `develop` integra el desarrollo y las ramas `feature/REN-<numero>-<descripcion>` parten desde `develop`. Proponemos cada cambio mediante un pull request para que lo revise el otro integrante. Usamos las ramas `release/*` para preparar entregas y `hotfix/*` para corregir versiones estables.

Incluimos la clave exacta de Jira en el nombre de la rama, los mensajes de commit y el título del PR. También enlazamos la tarea en la descripción. Por ejemplo, la configuración del repositorio corresponde a [REN-27](https://rentsmartpsf.atlassian.net/browse/REN-27).

Consulta la [guía de contribución](CONTRIBUTING.md) para los comandos, revisión y criterios de integración.

## Documentación y enlaces

- [Repositorio](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart)
- [Arquitectura y desarrollo local](docs/desarrollo.md).
- [Tarea REN-73](https://rentsmartpsf.atlassian.net/browse/REN-73).
- [Implementación de HU-01 / REN-1](docs/HU-01.md).
- [Requerimientos, reglas de negocio y caso de uso UC-01](docs/requerimientos.md).
- [Identidad y configuración de la organización](docs/organizacion.md).
- [Requisitos de entrega 1](https://github.com/Pruebas-de-Software/HandsOnProject/blob/main/semestres/2026-1/entrega1.md).
- [Tema RentSmart](https://github.com/Pruebas-de-Software/HandsOnProject/blob/main/semestres/2026-2/tema1.md).

## Contacto y contribución

Somos Jorge Aceval y Joaquín Viveros, responsables del proyecto. Recibimos consultas, propuestas y reportes de errores mediante los [issues del repositorio](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/issues). Para contribuir, sigue [CONTRIBUTING.md](CONTRIBUTING.md).

## Licencia

Distribuimos el proyecto bajo la [licencia MIT](LICENSE). Copyright © 2026 Jorge Aceval y Joaquín Viveros.
