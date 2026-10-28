# Entrega 2 — Registro de trabajo de RentSmart

Actualización: 28 de octubre de 2026. Somos Jorge Aceval y Joaquín Viveros. Mantenemos este archivo como registro acumulativo: cada cambio de la entrega 2 incorpora su alcance, Jira, rama/PR, verificaciones y pendientes. Los enlaces describen evidencia de la revisión indicada; una ejecución anterior no demuestra por sí sola el estado de una revisión nueva.

## 1. Alcance acordado

Revisamos los documentos `entregas.md`, `entrega2.md` y `entrega3.md` proporcionados para el curso. La entrega 2 incorpora CI/CD, dos nuevos requisitos funcionales con sus pruebas, planificación, documentación y cápsula de video. Reutilizamos GitHub Actions, alternativa permitida por el enunciado y ya utilizada en la entrega 1. No instalamos Jenkins ni lo presentamos como trabajo realizado.

Elegimos HU-14, reservas recibidas del propietario, y HU-16, pago simulado. La ejecución de cancelación de CA-05 de HU-14 continúa dependiendo de HU-15. Las pruebas E2E/UI, su ejecución headless y su etapa de pipeline corresponden a la entrega 3. Las fechas de entrega se consultan en Aula.

## 2. Base heredada de la entrega 1

Partimos de React/TypeScript/Vite, FastAPI, SQLModel/PostgreSQL, migraciones Alembic y Docker Compose. Ya existían registro/sesión, administración de espacios, catálogo con filtros básicos, detalle, horario, creación de reservas y consulta del arrendatario.

REN-31 ya había configurado GitHub Actions con `npm ci`, build, Jest, `uv sync --frozen`, Alembic y Pytest/PostgreSQL para PR y push a `develop`/`main`. En esta entrega ampliamos ese workflow. Conservamos tecnologías, lockfiles y datos; las comprobaciones backend utilizaron PostgreSQL temporal y esquemas aislados.

## 3. Planificación y trazabilidad en Jira

Revisamos el backlog REN y reutilizamos las historias REN-14 y REN-16, que ya tenían criterios de aceptación. Creamos el Epic [REN-74](https://rentsmartpsf.atlassian.net/browse/REN-74), **EP-08: CI/CD y liberación de la entrega 2**, y diez tarjetas nuevas. Todas las tarjetas nuevas quedaron asignadas a Joaquín Viveros, como solicitó el equipo.

| Tarjeta | Trabajo | Situación del alcance |
| --- | --- | --- |
| [REN-75](https://rentsmartpsf.atlassian.net/browse/REN-75) | API de reservas recibidas, hija de REN-14 | Integrada en PR #20 |
| [REN-76](https://rentsmartpsf.atlassian.net/browse/REN-76) | Panel del propietario, hija de REN-14 | Integrada en PR #20 |
| [REN-78](https://rentsmartpsf.atlassian.net/browse/REN-78) | Pruebas del panel, hija de REN-14 | Integradas en PR #20 |
| [REN-79](https://rentsmartpsf.atlassian.net/browse/REN-79) | API de pago simulado, hija de REN-16 | Integrada en PR #21 |
| [REN-80](https://rentsmartpsf.atlassian.net/browse/REN-80) | Interfaz de pago, hija de REN-16 | Integrada en PR #21 |
| [REN-82](https://rentsmartpsf.atlassian.net/browse/REN-82) | Pruebas de pago, hija de REN-16 | Integradas en PR #21 |
| [REN-81](https://rentsmartpsf.atlassian.net/browse/REN-81) | Extender CI para validar entrega 2 | PR #22 aceptado e integrado; tarjeta finalizada |
| [REN-84](https://rentsmartpsf.atlassian.net/browse/REN-84) | Despliegue automático después de superar CI | Desarrollo en sección 10; revisión y activación remota pendientes |
| [REN-83](https://rentsmartpsf.atlassian.net/browse/REN-83) | Notificaciones de CI/CD a Slack | Pendiente |
| [REN-77](https://rentsmartpsf.atlassian.net/browse/REN-77) | Documentación, video y cierre versionado | Registro iniciado; cierre pendiente |

Conservamos GitFlow, claves Jira en ramas/commits/PR y revisión del compañero. Registramos los casos y resultados de HU-14 en Jira y completamos CP/Testing de HU-16 con nueve CP lógicos. Los CP agrupan comportamientos; su cantidad no es la de tests automatizados.

## 4. HU-14 — Reservas recibidas del propietario

Rama: `feature/REN-14-reservas-recibidas`. Commit de implementación: `7722ae3`. [PR #20](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/pull/20), integrado en `develop` mediante `2538702`.

1. Implementamos `GET /api/reservations/received`, con filtro opcional `space_id` y propiedad aplicada en SQL, incluso para administradores. Un espacio ajeno o inexistente devuelve el mismo `404`.
2. Incorporamos nombre del arrendatario, contrato económico y estados de reserva/pago, sin exponer correos ni credenciales. Conservamos publicaciones inactivas/retiradas y reservas antiguas sin pago.
3. Conectamos **Consultar reservas** y **Ver todas las reservas recibidas** desde Mis espacios, con filtro, próximas/historial, vacío, error y reintento. Conservamos la ruta al iniciar sesión y descartamos respuestas tardías.
4. Reutilizamos los estados temporales de HU-13, sin nuevas migraciones. CA-01/02/03/04/06 están cubiertos; CA-05 conserva la acción de cancelar deshabilitada hasta HU-15.
5. Agregamos 8 pruebas backend y 15 frontend. La regresión de esa revisión aprobó 122 Pytest y 113 Jest, además de TypeScript/Vite. [CI #40616793213](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/40616793213) verificó los mismos resultados. El PR recibió revisión de JorgeJaceval antes de integrarse.

Actualizamos README, requisitos y documentos de las historias relacionadas. Contrato y límites: [HU-14](HU-14.md). Las subtareas están integradas; la historia conserva la dependencia de cancelación.

## 5. HU-16 — Pago simulado

Rama: `feature/REN-16-pago-simulado`. Commits: `f6ecd87` (funcionalidad) y `6e40119` (integración de HU-14). [PR #21](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/pull/21), aceptado por el usuario e integrado en `develop` mediante `3a4824e`.

1. Implementamos `POST /api/reservations/{id}/payment` con resultado aprobado/rechazado, solo para el arrendatario. El backend decide importe, vigencia y estado.
2. Guardamos pago y reserva de forma atómica y bloqueamos espacio → reserva → pago. Un rechazo permite reintentar dentro del plazo; una aprobación repetida conserva referencia, importe y fecha, y un rechazo posterior no la revierte.
3. Añadimos `0006_payment_simulation`, con importe y fecha opcionales para conservar registros históricos. No inventamos fechas ni pagos anteriores. Compose migra al iniciar; en local se aplica `uv run alembic upgrade head`.
4. Construimos `#pago/{id}`, con aviso de simulación sin dinero real ni tarjetas, control de doble envío, recuperación ante errores y descarte de respuestas tardías. Los paneles del arrendatario/propietario y el resumen leen el resultado persistido.
5. Agregamos 22 pruebas backend y 21 frontend. Verificamos límites, autorización, rollback, idempotencia, migración y bloqueos reales. La carrera con cancelación usa un escritor de prueba; no demuestra una API pública de HU-15.
6. La regresión integrada con HU-14 aprobó 144 Pytest y 134 Jest, build y Alembic upgrade/check. [CI #40618704683](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/40618704683) aprobó sobre `6e4011954968ba92b9c6679fe93aa19525b51fa5`. Se conserva una advertencia existente de Starlette/TestClient, sin fallos.

Actualizamos documentación y CP/Testing en Jira. CA-01 a CA-09 de HU-16 están cubiertos; la cancelación continúa en HU-15. Detalle: [HU-16](HU-16.md).

## 6. REN-81 — Ampliación de CI

Rama: `feature/REN-81-ampliar-ci`, desde `develop` con HU-14 y HU-16 integradas. [PR #22](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/pull/22), aceptado por el usuario e integrado en `develop` mediante `965cc58ef2c546e056ebaee9691aaeb70dcbfa11`. La implementación del workflow se verifica en `3fbe0eb043a928993395925ad24eddead2bab118`; los siguientes cambios documentales incorporan la evidencia obtenida.

1. Conservamos los eventos automáticos `pull_request` y `push` para `develop`/`main`, y `workflow_dispatch` para ejecución manual. No hay filtros por ruta que omitan cambios de documentación o configuración. GitHub Actions recibe los eventos del repositorio directamente; no requiere un webhook de Jenkins ni Ngrok.
2. Mantenemos instalaciones congeladas, Node.js 24, Python 3.12 y PostgreSQL 17. Frontend comprueba tipos/build y ejecuta Jest; backend aplica/verifica migraciones y ejecuta Pytest.
3. Guardamos el reporte JSON de Jest y JUnit XML de Pytest como artefactos `frontend-tests` y `backend-tests`. Intentamos conservarlos incluso tras un fallo; si la instalación/build impidió producirlos, los logs conservan el error y la carga informa que no existe reporte.
4. Conservamos el frontend compilado en `frontend-build` cuando ese trabajo termina correctamente. Los artefactos se retienen 7 días; no son una aprobación de release por sí solos.
5. Incorporamos `quality`, dependiente de ambos trabajos y ejecutado con `always()`. Solo aprueba con los dos resultados `success`; falla ante `failure`, `cancelled`, `skipped` o un resultado ausente. Publica un resumen de estados. REN-81 dejó el despliegue para REN-84, desarrollado en la sección 10.
6. Añadimos `failure_probe` a la ejecución manual: `none` por defecto, `frontend` o `backend` para forzar un fallo controlado después de las pruebas. La sonda identifica explícitamente el fallo artificial, conserva reportes y permite comprobar el bloqueo. Los PR y push normales no activan esta sonda.
7. Enlazamos este registro desde README, CONTRIBUTING y la plantilla de PR para actualizarlo en los siguientes cambios.

### Operación y evidencia

En **Actions → Pruebas RentSmart**, abre una ejecución para ver sus jobs, resumen, logs y artefactos. Los checks se asocian al commit/PR. Puede ejecutarse manualmente desde **Run workflow**, eligiendo rama y `failure_probe: none`.

Para validar un fallo controlado, selecciona `frontend` o `backend` en `failure_probe`. Esa ejecución debe terminar roja, con el job seleccionado y `quality` fallidos. Es evidencia de control del pipeline, no de un defecto de la aplicación. Registra rama, SHA y enlace; antes de revisar/integrar un cambio, usa una revisión cuyo CI normal esté aprobado.

La obligatoriedad de `quality` como check de protección se configura en los ajustes del repositorio. Esta implementación define el control del workflow; no modifica reglas de protección ni publica una release de entrega 2. La automatización específica de entrega 1 se conserva como evidencia de ese hito.

Referencias técnicas: [artefactos oficiales de GitHub](https://github.com/actions/upload-artifact), [condiciones de jobs](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-jobs-with-conditions).

## 7. Problemas encontrados y soluciones

1. Al iniciar esta etapa, Atlassian estaba instalado pero sus acciones no aparecían en la sesión. Continuamos al habilitarse las herramientas y consultamos el sitio y las cuentas asignables antes de escribir tarjetas.
2. El aislamiento local impedía escribir referencias de Git y acceder al Docker/PostgreSQL temporal. Ejecutamos esas operaciones con la autorización del entorno, conservando los archivos y volúmenes existentes.
3. SWC no podía materializar su módulo nativo en la caché por los permisos del entorno. Usamos una caché temporal y la ejecución autorizada de Jest; no cambiamos dependencias ni lockfiles para sortearlo.
4. `gh pr edit` falló por su consulta a Projects Classic. Actualizamos las descripciones de PR con la API REST y archivos JSON temporales, conservando los saltos de línea.
5. HU-14 se integró mientras desarrollábamos HU-16. Incorporamos `develop`, resolvimos las rutas, contratos y documentos compartidos y repetimos la regresión integrada: 134 pruebas frontend y 144 backend aprobadas.

## 8. Verificaciones y forma de registrar cambios

En cada avance conservamos Jira, rama/PR, revisión del código, comandos, resultados y dependencias. Las pruebas frontend simulan HTTP; backend integra PostgreSQL real. No convertimos esas ejecuciones en aceptación de usuario ni en E2E.

Para REN-81 verificamos la sintaxis con **actionlint 1.7.12**, sin errores. Ejecutamos el bloque real de `quality` extraído del YAML: `success/success` termina con código 0; fallo de cualquiera de los jobs, cancelación, omisión o un resultado ausente terminan con código 1. El resumen se genera también en los casos fallidos. `git diff --check` aprobó.

Sobre `3fbe0eb043a928993395925ad24eddead2bab118` comprobamos:

| Ejecución | Resultado | Evidencia |
| --- | --- | --- |
| [CI normal #40621692138](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/40621692138) | `frontend`, `backend` y `quality` aprobados | 134 Jest y 144 Pytest aprobadas; build y migraciones correctos; tres artefactos publicados |
| [Sonda #40621708589](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/40621708589) | Fallo artificial de frontend; backend aprobado; `quality` fallido | Los reportes se conservaron y el build de frontend no se publicó en esta sonda. Las pruebas de aplicación sí aprobaron: 134 Jest y 144 Pytest |

Descargamos los artefactos de ambas ejecuciones y verificamos el JSON de Jest y el XML de Pytest: cantidades correctas, cero errores/fallos de pruebas. En la normal comprobamos `index.html` y los assets compilados de `frontend-build`. La sonda demuestra el bloqueo por un resultado de job fallido; no representa un defecto funcional. Estos controles de CI no se cuentan como tests nuevos de la aplicación ni duplican la cantidad de tests de regresión.

El PR conserva los checks de su revisión vigente. La evidencia histórica identifica su SHA y permanece separada de la aceptación/revisión humana.

## 9. Pendientes para cerrar la entrega

1. Revisar e integrar la PR de REN-84.
2. Completar datos del VPS, DNS, secretos y ambiente; activar y demostrar el despliegue real después de `quality` y `production` — REN-84.
3. Configurar Slack y demostrar notificaciones de éxito/fallo — REN-83.
4. Resolver la dependencia de cancelación de CA-05 de HU-14 mediante HU-15 o acordar explícitamente su alcance pendiente con el equipo docente.
5. Completar Wiki, arquitectura del ambiente real, instrucciones, problemas/soluciones y cápsula de video — REN-77.
6. Preparar el PR de release hacia `main`, tag y GitHub Release `v2.0-entrega2` desde una versión estable.

El uso del asistente apoyó planificación, implementación, pruebas y documentación. Contrastamos las propuestas con el código y los criterios Jira y verificamos los resultados con pruebas locales y CI; la revisión del equipo se realiza por PR. La entrega 2 no se considera cerrada por tener las dos funcionalidades integradas.

## 10. REN-84 — Despliegue con Linux, Docker Compose y Caddy

Rama: `feature/REN-84-despliegue-docker-caddy`, creada desde `develop` con PR #22 integrado. REN-84 permanece asignada a Joaquín Viveros y en curso: la preparación del código no completa la publicación real. El equipo eligió conservar GitHub Actions y usar un servidor/VPS Linux existente con Docker y acceso SSH.

1. Creamos `compose.production.yaml`, independiente del Compose local, con PostgreSQL 17 persistente, FastAPI/Uvicorn y frontend estático servido por Caddy. Solo Caddy publica puertos al host. Conservamos volúmenes para datos y certificados y reinicio de servicios permanentes.
2. Incorporamos `frontend/Dockerfile.production` con build de React/TypeScript/Vite en Node.js 24 y etapa final Caddy. Configuramos proxy `/api` sin quitar el prefijo, fallback de SPA separado de API/assets, healthcheck interno y `/version.json` con el SHA completo. Etiquetamos ambas imágenes con la revisión del código.
3. Separamos Alembic en un servicio temporal: migramos antes de reemplazar API/frontend. El script espera healthchecks, verifica las etiquetas de revisión y consulta públicamente versión y conexión API/PostgreSQL antes de registrar éxito.
4. Añadimos transferencia SSH del código versionado mediante `git archive`, directorios de release por SHA, validación de parámetros, host SSH verificado, clave dedicada temporal y bloqueo de despliegues simultáneos. Los secretos de aplicación quedan en `shared/.env` del servidor con permisos 600. Excluimos también `.env.*` de los contextos Docker.
5. Incorporamos `production` después de `quality` para comprobar contenedores temporales y `deploy` dependiente de ambos. Solo desplegamos desde `main`, en push/manual y con `DEPLOY_ENABLED=true`. Evitamos cancelaciones automáticas de ejecuciones en `main` y mantenemos concurrencia de producción. PR y `develop` no publican.
6. Añadimos un smoke HTTP de infraestructura: compila imágenes, valida Caddy, aplica/comprueba Alembic, verifica interfaz/proxy/readiness/SHA, rechaza una versión incorrecta y comprueba persistencia tras recrear contenedores. Usa contraseñas y recursos temporales, sin navegador ni E2E/UI de entrega 3.
7. Documentamos arquitectura, preparación Linux/SSH/DNS, variables y secretos, activación, verificación, fallos y recuperación en [la guía de despliegue](despliegue.md). Actualizamos README, CONTRIBUTING y la fuente de arquitectura de Wiki, sin publicar esa fuente antes de revisar la PR.
8. Registramos el cierre de REN-81: [PR #22](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/pull/22) integrado y [CI de develop #40623000873](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/40623000873) aprobado. El correo de frontend fallido en 32 segundos correspondió a la sonda artificial #40621708589, no a un fallo de las pruebas de aplicación.

### Verificación y límites de REN-84

La primera ejecución local de `bash scripts/smoke-production.sh` aprobó sobre la base `965cc58` con los cambios de trabajo de REN-84: build de ambas imágenes, validación de Caddy, Alembic upgrade/check, HTTP y persistencia. El SHA identifica la base del checkout; esa ejecución previa al commit no se presenta como evidencia del commit final de la PR. ShellCheck 0.11.0 y actionlint 1.7.12 verificaron scripts y workflow sin errores después de corregir sus observaciones iniciales.

La regresión local aprobó `npm run build`, **134 Jest** y **144 Pytest**, Alembic upgrade/check contra PostgreSQL temporal y `git diff --check`. Conservamos la advertencia existente de Starlette/TestClient, sin fallos. Agregamos **seis comprobaciones de infraestructura** con `python3 -m unittest discover -s scripts/tests -v`: ejecutan el script real con Docker simulado y verifican que build/migración fallidos no inicien/reemplacen la aplicación, y que fallos de arranque, revisión incorrecta, secretos con permisos abiertos o un despliegue concurrente no registren una release exitosa. No sumamos estas comprobaciones a los tests funcionales ni las presentamos como prueba SSH al VPS.

**Pendiente:** host/usuario/puerto SSH, dominio y DNS, disponibilidad de Docker/proxy, `shared/.env`, ambiente y secretos GitHub, activación y evidencia pública del servidor. El smoke usa HTTP temporal y no demuestra HTTPS público ni acceso SSH al VPS. No configuramos credenciales ficticias ni damos por cumplida la publicación remota. Un fallo posterior al reemplazo requiere inspección: `current` registra la última publicación verificada y no ejecuta rollback automático de contenedores o esquema. Slack permanece en REN-83; Wiki publicada, video y release final en REN-77.
