# Base de desarrollo de RentSmart

En REN-73 construimos la base ejecutable con React, TypeScript, Vite, FastAPI, PostgreSQL y SQLModel. Agregamos una página inicial que comprueba si la API puede consultar PostgreSQL y permite reintentar cuando hay un fallo.

## Comunicación entre servicios

```mermaid
flowchart LR
  Navegador -->|localhost:5173| Vite
  Vite -->|proxy /api| FastAPI
  FastAPI -->|sesión SQLModel y psycopg| PostgreSQL
```

Configuramos el proxy de Docker para apuntar a `http://backend:8000` y el backend para conectar a `db:5432`. En desarrollo local, usamos `http://127.0.0.1:8000` como destino del proxy y publicamos PostgreSQL en `127.0.0.1:15432`.

## Backend

- `app/main.py` crea FastAPI, registra CORS y monta las rutas bajo `/api`.
- `app/settings.py` lee las variables de entorno y construye la URL PostgreSQL sin concatenar credenciales, de modo que los caracteres especiales de la contraseña se codifican correctamente.
- `app/database.py` crea el motor y proporciona una sesión SQLModel por solicitud, cerrándola al terminar.
- `app/routers/health.py` expone las comprobaciones de funcionamiento y conexión.
- `app/routers/auth.py` implementa registro, inicio de sesión y consulta de la cuenta, con respuestas que excluyen contraseñas y hashes.
- `app/routers/spaces.py` crea, recupera, edita, cambia el estado y elimina publicaciones propias sin reservas; su consulta pública incluye solo activos no retirados.
- `app/dependencies.py` comprueba el token y consulta la cuenta para cada acceso privado; la autorización administrativa usa el rol persistido. La guardia preparada para nuevas reservas consulta una fila actual bajo bloqueo; HU-12 deberá mantener esa transacción al insertar.
- `app/models.py` define la cuenta única, sus publicaciones y la base de reservas que protege la edición. La cuenta puede participar como propietaria o arrendataria según la operación; `is_admin` se establece en `false` en el registro público.
- `app/security.py` genera y verifica hashes Argon2 mediante pwdlib y firma tokens JWT con PyJWT. La contraseña se procesa sin recortarla.
- `app/schemas.py` valida tipos, longitudes y Unicode codificable; rechaza NUL en nombre y correo con nombre visible. `app/errors.py` traduce esos fallos a mensajes fijos por campo, sin publicar entradas.
- `app/space_schemas.py` valida los datos de publicación, las URLs HTTPS y el horario; el propietario y el estado activo proceden del servidor.
- `migrations/` contiene el historial Alembic del esquema y las restricciones de PostgreSQL.

| Endpoint | Propósito | Resultado |
| --- | --- | --- |
| `GET /api/health` | Comprobar la API sin depender de PostgreSQL | `200`, `{"status":"ok","service":"rentsmart-api"}` |
| `GET /api/health/ready` | Comprobar una consulta real mediante SQLModel | `200`, `{"status":"ok","database":"connected"}` |
| `GET /api/health/ready` con fallo de base de datos | Comunicar indisponibilidad | `503`, mensaje sin datos de conexión |
| `POST /api/auth/register` | Registrar nombre, correo y contraseña | `201`, cuenta con `id`, `name` y `email` |
| Registro con correo repetido | Conservar una única cuenta | `409`, error asociado a `email` |
| Registro con datos inválidos o campos adicionales | Rechazar el registro | `422`, errores por campo sin copiar el contenido enviado |
| Registro con fallo de base de datos | Comunicar indisponibilidad | `503`, mensaje genérico |
| `POST /api/auth/login` | Iniciar sesión con correo y contraseña | `200`, token con vencimiento y cuenta; `401` para credenciales incorrectas |
| `GET /api/auth/me` | Recuperar la cuenta de un token vigente | `200`, cuenta pública; `401` sin autenticación válida |
| `GET /api/auth/admin-access` | Comprobar acceso administrativo | `200` para administrador; `403` para cuenta normal |
| `POST /api/spaces` | Publicar un espacio con la cuenta autenticada | `201`, datos persistidos, UUID y estado activo |
| `GET /api/spaces/{id}` | Recuperar el espacio creado por la cuenta propietaria | `200`; `403` para otra cuenta y `404` si no existe |
| `PUT /api/spaces/{id}` | Editar todos los datos publicables del espacio propio | `200`; `409` si el horario perjudica reservas vigentes, sin cambios parciales |
| `PATCH /api/spaces/{id}/status` | Establecer explícitamente el estado del espacio propio | `200` con identidad y banderas; `409` para activar un retiro y `422` para datos inválidos |
| `DELETE /api/spaces/{id}` | Eliminar un espacio propio sin ninguna reserva histórica | `204` sin cuerpo; `409` si existen reservas, `401/403` sin acceso y `404` si no existe |
| `GET /api/spaces` | Consultar publicaciones activas no retiradas, sin sesión | `200` con datos publicables e identificador, sin propietario ni banderas administrativas |

La documentación interactiva se publica en `/docs` y el contrato OpenAPI en `/openapi.json`. Las variables se encuentran en `backend/.env.example`; las URLs autorizadas para CORS se configuran con `CORS_ORIGINS` como una lista JSON.

## Frontend

`src/api.ts` comprueba tanto el código HTTP como el contenido de la respuesta. `src/App.tsx` presenta los estados de comprobación, disponibilidad e indisponibilidad. Las solicitudes se cancelan al desmontar el componente y cada reintento inicia una comprobación nueva.

Usamos `API_PROXY_TARGET` en Vite para dirigir `/api` al backend. Construimos la interfaz con React y TypeScript y probamos el formulario con Jest y React Testing Library, simulando `fetch`. Reservamos la configuración de Playwright para la entrega 3.

`src/RegistrationForm.tsx` mantiene los datos del formulario en memoria, valida antes de enviar, asocia los errores a cada campo y evita solicitudes duplicadas mientras se registra la cuenta. `src/registration.ts` envía exclusivamente `name`, `email` y `password` a `/api/auth/register`. Nombre y correo se normalizan; la contraseña conserva todos sus caracteres. El éxito limpia los campos y no guarda tokens ni contraseñas en almacenamiento del navegador.

Para [HU-02](HU-02.md), guardamos el token y su vencimiento en `sessionStorage` y recuperamos la cuenta mediante `/api/auth/me`. Verificamos la sesión al restaurar el acceso y navegar a las vistas privadas. El cierre y la expiración eliminan el acceso guardado; los permisos proceden del backend. `AUTH_SECRET_KEY` se configura solo en el servidor y `AUTH_TOKEN_MINUTES` vale 30 por defecto.

En [HU-03](HU-03.md), usamos el mismo acceso para publicar y recuperar un espacio concreto. La confirmación procede del backend y la recarga obtiene los datos persistidos; las fotos se previsualizan por URL con reemplazo visual ante errores. Los datos del espacio no se guardan en el almacenamiento del navegador.

En [HU-04](HU-04.md), reutilizamos el formulario con los datos actuales y permitimos guardar o cancelar. El PUT conserva identidad y estado y comprueba las reservas antes de cambiar el horario. El precio acordado de esas reservas se mantiene separado de la tarifa editable del espacio.

En [HU-05](HU-05.md), añadimos la acción explícita de activar/desactivar al detalle propio. Conservamos el estado conocido ante errores, evitamos doble envío y descartamos respuestas después de salir. El retiro administrativo tiene un mensaje propio y bloquea activar.

En [HU-06](HU-06.md), mostramos una confirmación que identifica el espacio. Solo un DELETE confirmado con `204` vuelve a Mis espacios y anuncia la eliminación. Un `409` conserva el detalle y ofrece desactivar mediante la acción de HU-05, sin enviarla automáticamente. Bloqueamos edición y acciones competidoras durante el envío; descartamos resultados después de navegar o cerrar sesión.

## Migraciones y datos

Desde `backend`, ejecuta `uv run alembic upgrade head` para aplicar las migraciones y `uv run alembic current` para consultar la revisión instalada. Docker ejecuta la actualización antes de iniciar Uvicorn. `uv run alembic check` permite comprobar diferencias entre los modelos y el esquema instalado.

La revisión `0001_create_users` crea `users`, con UUID generado por la aplicación, nombre, correo, hash de contraseña y flag administrativo. La restricción `uq_users_email` garantiza unicidad en la base incluso con solicitudes simultáneas. `ck_users_email_normalized` exige correos en minúsculas y sin espacios exteriores. No hay procedimientos que borren cuentas al iniciar o reiniciar el backend.

La revisión `0002_create_spaces` agrega las publicaciones con propietario, datos, fotos, horario y estado activo. Las restricciones de PostgreSQL respaldan los rangos y la relación con la cuenta propietaria.

La revisión `0003_create_reservations` incorpora la base de reservas usada por HU-04. Los instantes se guardan con zona horaria; para la comprobación del horario diario usamos `America/Santiago` y declaramos `tzdata` para los ambientes que no incluyen esa información. La futura creación de reservas deberá compartir el bloqueo de fila del espacio con su edición.

La revisión `0004_space_withdrawal` añade `is_withdrawn` a los espacios, inicialmente falso, con una restricción que impide retiro y estado activo simultáneos. Los contratos de creación, edición y cambio de estado no permiten establecer esa bandera. Su gestión y auditoría se implementarán en HU-18.

HU-06 utiliza el esquema existente. Bloqueamos la fila del espacio, comprobamos su propietario y la ausencia de cualquier reserva y eliminamos en una única transacción. La FK de reservas no usa borrado en cascada. Probamos los dos órdenes de una carrera con PostgreSQL real: DELETE HTTP y un escritor de reservas de prueba que mantiene el bloqueo hasta insertar y confirmar. Coordinamos eventos y comprobamos esperas mediante `pg_blocking_pids`. HU-12 deberá conservar ese mismo protocolo en su endpoint; no contamos como probado un flujo público de reserva todavía.

## Dependencias reproducibles

Versionamos `frontend/package-lock.json` y `backend/uv.lock` para mantener instalaciones reproducibles. Usamos `npm ci` para el frontend y `uv sync --frozen` para el backend. Trabajamos con Node.js 24 y Python 3.12.

Configuramos un override de `js-yaml` para evitar dependencias antiguas dentro de la cadena de paquetes de Jest.

## Pruebas y CI

Documentamos los comandos en el [README](../README.md) y configuramos dos trabajos en GitHub Actions:

- `frontend`: instalación con lockfile, TypeScript, build de Vite y pruebas Jest de registro, sesión, publicación, edición, estado y eliminación.
- `backend`: instalación con lockfile, migraciones y pruebas Pytest de registro, autenticación, permisos, publicación, edición, estado y eliminación con un servicio PostgreSQL real.

Probamos la API con `TestClient` y PostgreSQL real. Reemplazamos la dependencia de sesión para usar un esquema independiente por prueba, con las mismas migraciones de la aplicación. Eliminamos el esquema al terminar; las cuentas existentes quedan fuera de ese esquema.

Reservamos las E2E para la entrega 3 y conservamos la configuración de Playwright para preparar esos recorridos. Registramos los resultados actuales en el PR y en **Testing** de Jira.

## Resolver problemas de arranque

- **Docker no conecta al motor:** inicia Docker Desktop y selecciona contenedores Linux antes de ejecutar Compose.
- **Falta `AUTH_SECRET_KEY` o su longitud es insuficiente:** genera una clave aleatoria de al menos 32 caracteres como indicamos en el README y configúrala en el `.env` correspondiente. Conserva la clave entre reinicios para mantener válidos los tokens emitidos.
- **El puerto PostgreSQL está ocupado o bloqueado:** cambia `POSTGRES_PORT` en el `.env` de la raíz y `DATABASE_PORT` en `backend/.env` si ejecutas la API localmente. El valor de desarrollo es `15432`.
- **La API devuelve 503:** comprueba `docker compose ps`, las credenciales y `docker compose logs db backend`. `/api/health` permite distinguir el estado de la API del estado de PostgreSQL.
- **Cambiaste credenciales después de crear el volumen:** PostgreSQL conserva los usuarios existentes; actualiza sus credenciales en la base o usa un volumen nuevo para otra instancia de desarrollo.
- **PowerShell bloquea npm:** ejecuta `npm.cmd` y `npx.cmd`; uv evita tener que activar un entorno con scripts PowerShell.
- **Playwright no encuentra Chromium:** ejecuta `npx playwright install chromium` antes de las pruebas E2E.
- **Fallo al instalar dependencias:** usa las versiones de Node.js y Python indicadas y los comandos con lockfile del README.
