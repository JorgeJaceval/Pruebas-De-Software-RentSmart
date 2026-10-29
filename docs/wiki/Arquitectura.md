# Arquitectura y tecnologías

```mermaid
flowchart LR
  Usuario[Visitante o cuenta autenticada] --> React[React y TypeScript]
  React -->|HTTP /api; proxy Vite en desarrollo| API[FastAPI]
  API -->|SQLModel y psycopg| DB[(PostgreSQL 17)]
  Alembic[Alembic] -->|Migraciones versionadas| DB
```

El frontend presenta formularios, catálogo, detalle y paneles privados. La API valida las entradas, comprueba la cuenta y sus permisos, calcula los contratos y conserva la información. PostgreSQL respalda relaciones, restricciones y transacciones; el cliente no asigna propietario, precio contratado, privilegios ni estados de reserva.

## Selección de tecnologías y relación con las pruebas

| Tecnología | Propósito y verificación |
| --- | --- |
| React y TypeScript | Interfaz por componentes y contratos tipados; Jest/React Testing Library comprueban interacciones y estados visibles |
| Vite | Servidor, proxy y build; CI verifica tipos y compila la aplicación |
| FastAPI y Pydantic | API y validación; Pytest/TestClient comprueban respuestas, permisos y errores |
| SQLModel, psycopg y PostgreSQL 17 | Persistencia y transacciones; pruebas con PostgreSQL real verifican restricciones, rollback y bloqueos |
| Alembic | Evolución del esquema; CI aplica migraciones y revisa correspondencia con modelos |
| Argon2 y JWT | Hash de contraseñas y sesión con vencimiento; pruebas de autenticación, privacidad y privilegios |
| Docker Compose | Arranque reproducible de frontend, backend y base de datos |
| GitHub Actions | Ejecuta build, migraciones y suites en PR/push hacia `develop` o `main` |
| Caddy y Compose de producción | Preparan frontend estático, proxy `/api`, HTTPS y persistencia en un servidor Linux; el job `production` verifica la infraestructura con recursos temporales |

Jest es la herramienta principal de testing seleccionada; Pytest complementa la verificación del backend. Playwright está configurado para trabajo posterior, sin casos E2E actuales.

## Infraestructura publicada para entrega 2

Conservamos Actions como alternativa permitida a Jenkins. Después de `quality`, el job `production` comprueba las imágenes con PostgreSQL temporal y HTTP local. El despliegue por SSH depende de ambos jobs y requiere `main`, evento push/manual y `DEPLOY_ENABLED=true`.

En el VPS de Azure, Caddy sirve React compilado y envía `/api` a FastAPI; PostgreSQL y la API solo tienen puertos internos. Compose conserva datos y certificados en volúmenes, y Alembic se ejecuta antes de reemplazar la aplicación. El SHA de las imágenes y `/version.json` permiten verificar la publicación junto con readiness.

El 29 de octubre de 2026 publicamos [RentSmart en Azure, Chile Central](https://rentsmart-usm-viveros.chilecentral.cloudapp.azure.com), revisión `ff19bc3` de `main` revisada en PR #28. El segundo intento de Actions autenticó SSH, migró y publicó; comprobamos HTTPS, versión/readiness y contenedores sanos desde el equipo de trabajo. El primer intento había fallado al leer el secreto de clave privada y se conserva como incidencia corregida. La [evidencia](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/develop/docs/evidencias/REN-84-despliegue-2026-10-29.md) y la [guía de despliegue](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/develop/docs/despliegue.md) distinguen publicación real, smoke temporal y recuperación. Las E2E/UI corresponden a la entrega 3.

REN-83 incorpora `notify`, ejecutado al terminar los jobs de CI/CD incluso ante fallos de etapas, para enviar estado, rama, commit y enlace a Slack mediante Incoming Webhook. El secreto está configurado en GitHub como `SLACK_WEBHOOK_URL`; no depende del ambiente de producción del VPS. El canal confirmado es `#rentsmart-ci` del workspace `Rent-Smart-aceval-viveros`. La [guía de notificaciones](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/develop/docs/notificaciones-slack.md) documenta la evidencia de validación real y los límites; las pruebas HTTP simuladas se conservan por separado.

```mermaid
flowchart LR
  GitHub[Push / PR / ejecución manual] --> FE[frontend: build y Jest]
  GitHub --> BE[backend: Alembic y Pytest con PostgreSQL temporal]
  FE --> Quality[quality]
  BE --> Quality
  Quality --> Production[production: guardas y smoke temporal]
  Production --> Gate{main y DEPLOY_ENABLED}
  Gate -->|SSH validado| Deploy[deploy: VPS Azure publicado por HTTPS]
  FE --> Notify[notify: resultados finales con always]
  BE --> Notify
  Quality --> Notify
  Production --> Notify
  Deploy --> Notify
  Notify --> Slack[Slack: rentsmart-ci]
```

Los jobs omitidos también entregan su estado al notificador. [[Entrega-2]] explica eventos, permisos, evidencia y ubicación de cada servicio; el despliegue está activo únicamente para `main` y cada publicación verifica su SHA/readiness.

## Decisiones relevantes

- Una cuenta normal puede publicar espacios y reservar publicaciones ajenas. La relación con cada recurso determina el permiso.
- Los listados privados filtran por la cuenta verificada en el servidor. Un identificador o parámetro enviado por el navegador no permite consultar otra cuenta.
- Las reservas guardan precio unitario, duración y total del contrato; editar la tarifa del espacio no cambia esos importes.
- Crear reserva y pago pendiente usa un único commit. El bloqueo `SELECT FOR UPDATE` del espacio se comparte con su edición, cambio de estado y eliminación.
- La consulta calcula el estado efectivo según la hora del servidor. Una pendiente vencida deja de bloquear sin depender de que una tarea periódica cambie primero su fila.
- Eliminar requiere ausencia de cualquier reserva histórica. Si existe historial se ofrece desactivar y conservar.

## Estructura y referencias

| Ubicación | Contenido |
| --- | --- |
| `frontend/src/` | Componentes, cliente HTTP y pruebas Jest |
| `backend/app/` | Rutas, modelos, validación y reglas de negocio |
| `backend/tests/` | Pruebas Pytest y fixtures de PostgreSQL |
| `backend/migrations/` | Revisiones Alembic |
| `docs/` | Requerimientos, alcance por HU, identidad y fuentes de Wiki |
| `.github/workflows/ci.yml` | Pipeline de verificación |

El [avance de entrega 2 en develop](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/tree/develop) contiene esta ampliación; `main` conserva el hito estable hasta revisar la release. FastAPI publica el contrato interactivo local en `http://localhost:8000/docs`. Los detalles temporales y transaccionales están en [HU-12](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/develop/docs/HU-12.md) y [HU-16](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/develop/docs/HU-16.md).
