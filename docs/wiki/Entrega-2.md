# Entrega 2 — CI/CD de RentSmart

Estado al **29 de octubre de 2026**. PR #28 incorporó HU-14/HU-16 y CI/CD revisados en `main`; publicamos [RentSmart por HTTPS](https://rentsmart-usm-viveros.chilecentral.cloudapp.azure.com), revisión `ff19bc3`, mediante el intento 2 de Actions. Comprobamos SSH, versión/readiness y contenedores sanos. `DEPLOY_ENABLED=true`. Publicamos estas fuentes de Wiki desde PR #29 integrada, revisión `b5a5864`, mediante el commit de Wiki `9d1e175`. El video y el tag/Release final permanecen pendientes. La [evidencia de publicación](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/develop/docs/evidencias/REN-77-wiki-2026-10-29.md) registra el contenido publicado y las actualizaciones posteriores que requieren revisión/sincronización.

## 1. Objetivo y herramienta elegida

Automatizamos compilación, migraciones y pruebas para detectar fallos antes de publicar, conservar evidencia asociada al commit/PR y notificar al equipo. Incorporamos consulta de reservas recibidas y pago simulado sobre el MVP de entrega 1.

Utilizamos **GitHub Actions**, alternativa admitida en la sección 3.3 de la pauta, y conservamos su integración existente con GitHub. Los eventos del repositorio activan el workflow directamente; no instalamos Jenkins ni necesitamos un túnel Ngrok para recibir esos eventos.

## 2. Qué implementamos y cuál es el alcance

| Elemento | Implementación y límite |
| --- | --- |
| HU-14 / REN-14 | API y panel de reservas recibidas, filtros por publicación propia, estados e historial. CA-01/02/03/04/06 integrados; candidato de CA-05 incorpora cancelación confirmada del propietario con reglas de HU-15, pendiente de revisión/integración/despliegue |
| HU-16 / REN-16 | Pago simulado aprobado/rechazado, persistencia atómica, reintentos e idempotencia. Sin dinero real ni tarjetas; CA-01 a CA-09 cubiertos |
| REN-81 | Build, Jest, Pytest/PostgreSQL, Alembic, reportes, artefactos y control `quality` |
| REN-84 | Despliegue por Actions/SSH a Azure publicado; HTTPS, SHA y readiness verificados después de corregir el secreto del primer intento |
| REN-83 | Avisos reales de éxito y fallo a `#rentsmart-ci`, aceptados por Slack y recibidos según confirmación del usuario |
| REN-77 | Fuentes de Wiki, registro, guion de video y borrador de notas de versión; cierre pendiente |

La entrega 2 no autoriza completar el backlog. El 29 de octubre autorizamos la cancelación necesaria para completar CA-05 de HU-14 y cumplir los dos requerimientos elegidos sin excepción docente. [Justificamos la decisión y delimitamos el candidato](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/develop/docs/cancelacion-ca05-entrega-2.md); HU-15 conserva pendiente la interfaz del arrendatario; las funcionalidades finales y las pruebas E2E/UI quedan fuera de este hito.

## 3. Arquitectura e infraestructura

| Ubicación | Qué corre y cómo se conecta |
| --- | --- |
| Equipo de desarrollo | React/TypeScript/Vite, FastAPI y PostgreSQL con `compose.yaml`; Vite dirige `/api` a la API |
| GitHub Actions, runners Ubuntu | Node.js 24, Python 3.12, dependencias congeladas y PostgreSQL 17 temporal para Pytest. `production` construye y comprueba los contenedores con HTTP en loopback |
| Slack | Incoming Webhook de la app RentSmart CI, workspace Rent-Smart-aceval-viveros, canal `#rentsmart-ci`; secreto de repositorio `SLACK_WEBHOOK_URL` |
| VPS Azure, Chile Central | Ubuntu 24.04, Docker 29.9.2 y Compose v5.6.1. Aplicación publicada por Caddy → FastAPI/Uvicorn → PostgreSQL, con API/base internas y volúmenes persistentes; usuario SSH dedicado |

**Publicación real comprobada:** el ambiente `production` permite únicamente la rama `main`, y el intento 2 validó realmente SSH, migraciones y publicación. El primero falló al interpretar la clave privada aunque el nombre del secreto existía; corregimos su carga sin leerlo ni modificar el workflow. La [evidencia del despliegue](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/develop/docs/evidencias/REN-84-despliegue-2026-10-29.md), [[Arquitectura]] y la [guía de despliegue](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/develop/docs/despliegue.md) separan el smoke temporal de HTTPS/SHA/readiness públicos.

## 4. Disparadores y etapas del pipeline

Fuente: [`.github/workflows/ci.yml`](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/develop/.github/workflows/ci.yml), workflow **Pruebas RentSmart**.

| Etapa | Dependencia y comportamiento |
| --- | --- |
| `frontend` | `npm ci`, tipos/build Vite y Jest. Conserva reporte JSON y, al aprobar, `frontend-build` |
| `backend` | `uv sync --frozen`, PostgreSQL temporal, Alembic upgrade/check y Pytest. Conserva reporte JUnit XML |
| `quality` | Espera ambos jobs con `always()`; solo aprueba con ambos en `success`. Genera resumen y rechaza fallos/cancelaciones/omisiones |
| `production` | Después de `quality`: Bash/ShellCheck, 26 pruebas de infraestructura y smoke de contenedores con migraciones, proxy, versión y persistencia |
| `deploy` | Después de `quality` y `production`; requiere `main`, evento push/manual y `DEPLOY_ENABLED=true`. Migra antes de reemplazar servicios y verifica SHA/readiness públicos |
| `notify` | Espera los cinco anteriores con `always()`; informa resultados reales, incluyendo despliegue omitido y sondas artificiales |

Los disparadores automáticos son PR y push hacia `develop`/`main`; también admitimos `workflow_dispatch`. Los reportes y artefactos se conservan 7 días, sujetos a la retención de GitHub. Logs, resumen y checks identifican la ejecución y revisión de código. El secreto de Slack es independiente de los secretos del ambiente `production`.

## 5. Integraciones y evidencia real

GitHub relaciona los checks con commits/PR. Jira enlaza historias, tareas, ramas y PR mediante claves `REN-*`; conservamos GitFlow y revisión del compañero. Slack recibe estado, rama, SHA completo, intento y botón para abrir la ejecución.

| Evidencia | Resultado comprobado |
| --- | --- |
| [CI normal #40796675009](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/40796675009) | 134 Jest, 144 Pytest, 26 pruebas de infraestructura y smoke aprobados; `notify` envió ÉXITO; `deploy` omitido |
| [Sonda #40796674640](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/40796674640) | 134 Jest y 144 Pytest aprobadas; frontend falla deliberadamente después de sus tests, `quality` bloquea, `production`/`deploy` se omiten y `notify` envía FALLO artificial |
| Recepción Slack | HTTP 200 y cuerpo `ok` en ambos casos; el usuario confirmó los dos mensajes en `#rentsmart-ci` el 28 de octubre |
| [Publicación #40944029052](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/40944029052) | Intento 1: pruebas/smoke aprobados, fallo real de clave privada y aviso FALLO. Intento 2: deploy/notify aprobados sobre el mismo `ff19bc3`, HTTPS/SHA/readiness comprobados y aviso ÉXITO |

Ambas ejecuciones de Slack verifican `d3553a886aab1c913658d57bc676e66ec9e861b0`, de la rama de evidencia de Slack: la normal se activó por PR y la sonda manualmente. Los resultados históricos identifican su revisión; para evaluar un cambio posterior también revisamos sus checks vigentes. La [guía de Slack](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/develop/docs/notificaciones-slack.md) conserva configuración, límites y procedimiento.

## 6. Cómo ejecutar y verificar el trigger

[[Instalacion-y-ejecucion]] describe la configuración local. Para validar el disparador automático usamos un cambio revisable en una feature y abrimos PR hacia `develop`; comprobamos que Actions muestra esa ejecución asociada al SHA del PR. No necesitamos un webhook externo de GitHub hacia Jenkins.

En **Actions → Pruebas RentSmart → Run workflow**, elegimos la rama y `failure_probe=none`. Con GitHub CLI autenticado, desde un checkout del repositorio, el equivalente es:

```bash
gh workflow run ci.yml --ref develop -f failure_probe=none
```

Para demostrar el bloqueo, usamos una ejecución manual independiente:

```bash
gh workflow run ci.yml --ref develop -f failure_probe=frontend
```

La segunda ejecución debe quedar roja por la etapa **Forzar fallo controlado**, con tests de aplicación aprobados y aviso explícito de sonda. Comprobamos logs, reportes, resumen y mensaje en Slack. No lanzamos ambas simultáneamente en la misma referencia: la concurrencia de `develop` puede cancelar la anterior. Al terminar dejamos una ejecución normal aprobada. Los pasos no publican al VPS desde `develop`.

## 7. Funcionalidades y pruebas asociadas

HU-14 agrega `GET /api/reservations/received` y el panel del propietario, con 8 pruebas backend y 15 frontend nuevas. HU-16 agrega `POST /api/reservations/{id}/payment`, la pantalla de simulación y la migración `0006_payment_simulation`, con 22 pruebas backend y 21 frontend nuevas. Conservamos permisos, contratos e historial.

La regresión histórica integrada sumaba 278 pruebas de aplicación. El candidato de CA-05 agrega 16 Jest y 21 Pytest y aprueba localmente **315 pruebas: 150 Jest y 165 Pytest**; actualiza además las dos carreras de pago existentes para usar cancelación real. La revisión/CI vigente del candidato se registra por separado. Las **26 comprobaciones de infraestructura** se cuentan por separado: seis guardas del despliegue con Docker simulado y veinte del notificador, incluyendo HTTP temporal. Los tests de componentes simulan HTTP; backend usa PostgreSQL real. Ninguno de esos conteos constituye porcentaje de cobertura ni una suite E2E/UI.

Detalles: [HU-14](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/develop/docs/HU-14.md), [HU-16](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/develop/docs/HU-16.md) y [[Estrategia-y-resultados-de-pruebas]].

## 8. Problemas y soluciones

| Problema | Solución y límite |
| --- | --- |
| El correo de frontend fallido podía interpretarse como defecto | Identificamos las sondas artificiales y sus outputs; si build/tests fallan antes, el aviso indica sonda solicitada pero no ejecutada |
| Slack todavía no tenía webhook | Creamos app/canal, guardamos el secreto y comprobamos recepción real; conservamos el historial de ejecuciones anteriores sin envío |
| El frontend Docker usaba el servidor de desarrollo | Compilamos con build multietapa y publicamos `dist` mediante Caddy en Azure |
| Un control agregado podía omitir etapas fallidas | `quality` exige ambos resultados `success`; comprobamos fallo, cancelación, omisión y ausencia de resultado |
| Wiki describía solo el MVP | Separamos el hito de entrega 1 de la evolución de entrega 2 y conservamos evidencias con su SHA |
| Azure rechazó Central US por política de la suscripción | Consultamos las ubicaciones permitidas y creamos la VM en Chile Central; no suponemos que la lista sea universal |
| La cuenta GitHub conectada no administra el repositorio | El propietario configuró `production`; comprobamos la regla de `main` y nombres de secretos, conservando `DEPLOY_ENABLED=false` hasta revisar el candidato |
| El primer deploy no pudo interpretar la clave del secreto | El archivo local funcionaba; el usuario cargó la clave completa y el segundo intento autenticó/publicó, conservando la evidencia del fallo original |

El [registro acumulativo](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/develop/docs/entrega-2.md) detalla también restricciones del entorno local, conflictos resueltos y verificaciones de cada PR.

## 9. Pendientes y cierre

1. Mantener la Wiki publicada sincronizada con las fuentes revisadas; la primera publicación de entrega 2 está verificada en `9d1e175`. Esta actualización del estado requiere su propia revisión e integración antes de sincronizarla.
2. Conservar la evidencia del despliegue ya verificado y comprobar de nuevo el SHA definitivo que se etiquete al cerrar la entrega.
3. Revisar/integrar el candidato de CA-05 de HU-14 y publicar/verificar esa revisión antes del cierre. La cancelación del propietario forma parte de entrega 2; las E2E/UI siguen para entrega 3.
4. Grabar/publicar la cápsula usando el [guion preparado](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/develop/docs/guion-video-entrega-2.md) e incorporar su enlace real.
5. PR #28 ya está integrado en `main`. Después de completar Wiki/video y comprobar la publicación de la revisión final, marcar ese SHA con `v2.0-entrega2` y publicar el GitHub Release usando las [notas en borrador](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/develop/docs/releases/entrega-2.md). El tag y la release todavía no están publicados.

La [lista de cierre](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/develop/docs/cierre-entrega-2.md) mapea la pauta a sus evidencias y pendientes. Conservamos REN-77 en curso hasta completar los entregables reales.
