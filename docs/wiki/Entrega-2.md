# Entrega 2 — CI/CD de RentSmart

Estado al **28 de octubre de 2026**. La implementación de HU-14, HU-16, CI y Slack está integrada en `develop`. El despliegue del VPS, la publicación de esta actualización de Wiki, la grabación del video y el tag/Release final permanecen pendientes. Esta página es una fuente preparada para revisión; su presencia en el repositorio no acredita publicación en la Wiki.

## 1. Objetivo y herramienta elegida

Automatizamos compilación, migraciones y pruebas para detectar fallos antes de publicar, conservar evidencia asociada al commit/PR y notificar al equipo. Incorporamos consulta de reservas recibidas y pago simulado sobre el MVP de entrega 1.

Utilizamos **GitHub Actions**, alternativa admitida en la sección 3.3 de la pauta, y conservamos su integración existente con GitHub. Los eventos del repositorio activan el workflow directamente; no instalamos Jenkins ni necesitamos un túnel Ngrok para recibir esos eventos.

## 2. Qué implementamos y cuál es el alcance

| Elemento | Implementación y límite |
| --- | --- |
| HU-14 / REN-14 | API y panel de reservas recibidas, filtros por publicación propia, estados e historial. CA-01/02/03/04/06 cubiertos; CA-05 conserva cancelación deshabilitada porque depende de HU-15 |
| HU-16 / REN-16 | Pago simulado aprobado/rechazado, persistencia atómica, reintentos e idempotencia. Sin dinero real ni tarjetas; CA-01 a CA-09 cubiertos |
| REN-81 | Build, Jest, Pytest/PostgreSQL, Alembic, reportes, artefactos y control `quality` |
| REN-84 | Compose/Caddy de producción y despliegue por SSH preparados; publicación real pendiente |
| REN-83 | Avisos reales de éxito y fallo a `#rentsmart-ci`, aceptados por Slack y recibidos según confirmación del usuario |
| REN-77 | Fuentes de Wiki, registro, guion de video y borrador de notas de versión; cierre pendiente |

La entrega 2 no autoriza completar el backlog. HU-15 no se incorpora automáticamente por su dependencia con HU-14. Registramos esa limitación para la evaluación; las funcionalidades finales y las pruebas E2E/UI quedan fuera de este hito.

## 3. Arquitectura e infraestructura

| Ubicación | Qué corre y cómo se conecta |
| --- | --- |
| Equipo de desarrollo | React/TypeScript/Vite, FastAPI y PostgreSQL con `compose.yaml`; Vite dirige `/api` a la API |
| GitHub Actions, runners Ubuntu | Node.js 24, Python 3.12, dependencias congeladas y PostgreSQL 17 temporal para Pytest. `production` construye y comprueba los contenedores con HTTP en loopback |
| Slack | Incoming Webhook de la app RentSmart CI, workspace Rent-Smart-aceval-viveros, canal `#rentsmart-ci`; secreto de repositorio `SLACK_WEBHOOK_URL` |
| Servidor Linux previsto | `compose.production.yaml`: Caddy sirve React compilado y dirige `/api` a FastAPI/Uvicorn; PostgreSQL y API sin puertos públicos. Volúmenes persistentes para datos y certificados |

**El VPS todavía no está conectado ni publicado.** Faltan host, usuario/puerto SSH, dominio/DNS, configuración del ambiente y secretos SSH. El smoke temporal no demuestra HTTPS público ni disponibilidad del servidor. [[Arquitectura]] y la [guía de despliegue](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/develop/docs/despliegue.md) detallan servicios, migraciones, verificaciones y recuperación.

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
| Publicación remota | Pendiente: aún no existe evidencia de una versión desplegada en el VPS |

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

La regresión integrada suma **278 pruebas de aplicación: 134 Jest y 144 Pytest**. Las **26 comprobaciones de infraestructura** se cuentan por separado: seis guardas del despliegue con Docker simulado y veinte del notificador, incluyendo HTTP temporal. Los tests de componentes simulan HTTP; backend usa PostgreSQL real. Ninguno de esos conteos constituye porcentaje de cobertura ni una suite E2E/UI.

Detalles: [HU-14](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/develop/docs/HU-14.md), [HU-16](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/develop/docs/HU-16.md) y [[Estrategia-y-resultados-de-pruebas]].

## 8. Problemas y soluciones

| Problema | Solución y límite |
| --- | --- |
| El correo de frontend fallido podía interpretarse como defecto | Identificamos las sondas artificiales y sus outputs; si build/tests fallan antes, el aviso indica sonda solicitada pero no ejecutada |
| Slack todavía no tenía webhook | Creamos app/canal, guardamos el secreto y comprobamos recepción real; conservamos el historial de ejecuciones anteriores sin envío |
| El frontend Docker usaba el servidor de desarrollo | Preparamos build multietapa y Caddy para servir `dist`; el servidor real sigue pendiente de configuración |
| Un control agregado podía omitir etapas fallidas | `quality` exige ambos resultados `success`; comprobamos fallo, cancelación, omisión y ausencia de resultado |
| Wiki describía solo el MVP | Separamos el hito de entrega 1 de la evolución de entrega 2 y conservamos evidencias con su SHA |

El [registro acumulativo](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/develop/docs/entrega-2.md) detalla también restricciones del entorno local, conflictos resueltos y verificaciones de cada PR.

## 9. Pendientes y cierre

1. Revisar/integrar estas fuentes y publicar la Wiki desde el código revisado.
2. Completar la configuración/publicación del VPS y registrar URL, SHA y disponibilidad reales.
3. Mantener explícita la dependencia de CA-05 de HU-14, sin implementar HU-15 dentro de esta tarea ni afirmar que el criterio está completo.
4. Grabar/publicar la cápsula usando el [guion preparado](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/develop/docs/guion-video-entrega-2.md) e incorporar su enlace real.
5. Preparar la release revisada hacia `main`, crear `v2.0-entrega2` y su GitHub Release usando las [notas en borrador](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/develop/docs/releases/entrega-2.md). El tag y la release todavía no están publicados.

La [lista de cierre](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/develop/docs/cierre-entrega-2.md) mapea la pauta a sus evidencias y pendientes. Conservamos REN-77 en curso hasta completar los entregables reales.
