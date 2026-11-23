# Supuestos y dependencias

Estas decisiones delimitan el MVP y sus ampliaciones de las entregas 2 y 3. Las reglas detalladas están en [requerimientos](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/develop/docs/requerimientos.md) y los documentos de cada HU.

## Supuestos y reglas principales

| Decisión | Aplicación actual |
| --- | --- |
| Una cuenta, dos formas de participar | Puede publicar sus espacios y arrendar espacios ajenos; el registro público no concede administración. Una cuenta administradora se promueve directamente en PostgreSQL (HU-18) |
| Precio por hora en CLP | Entero entre 500 y 500.000; el backend calcula duración y total y conserva el precio contratado |
| Fotos externas | De una a tres URLs HTTPS; mostramos un reemplazo si la imagen no carga. No alojamos archivos subidos |
| Horario diario uniforme | Una apertura y un cierre se aplican todos los días en `America/Santiago`; no hay calendario semanal ni excepciones por feriados |
| Horas enteras y un mismo día | Nuevas reservas de 1–8 horas, dentro del horario del espacio; apertura menor que cierre, máximo cierre a las 23:00 |
| Inicio futuro | El instante debe ser posterior al actual y no superar el instante actual más 90 días; el servidor decide el límite |
| Intervalos consecutivos válidos | Usamos `[inicio, término)`: 10:00–12:00 y 12:00–13:00 no se superponen |
| Bloqueo provisional | Reserva y pago quedan pendientes; bloquean hasta `min(creación + 15 minutos, inicio)`. Al vencer, la lectura informa expiración efectiva |
| Pago simulado | Crear una reserva registra un pago pendiente; HU-16 permite rechazar/reintentar o aprobar de forma atómica e idempotente, sin dinero real |
| Protección de contratos e historial | Editar tarifa conserva importes anteriores; editar horario protege reservas vigentes; eliminar requiere ausencia de cualquier reserva histórica |
| Catálogo de demostración pequeño | Filtros básicos en el cliente sobre el listado completo; el filtro por fecha y horario (HU-09) consulta al servidor. No hay paginación |
| Retiro administrativo | La administración retira con un motivo de 1–200 caracteres y restituye como inactiva; el propietario decide si vuelve a activarla y las reservas se conservan (HU-18) |
| Sugerencia con IA | Opcional y revisada por la persona: se puede usar, editar o descartar y nunca se publica sola. Solo envía datos textuales del espacio, sin precio, fotos ni datos de la cuenta (HU-17) |
| Sesión de duración limitada | 30 minutos por defecto y almacenamiento en `sessionStorage`; cerrar sesión elimina el acceso de esa pestaña, sin revocar un token ya copiado |

Santiago cambia su desfase UTC según la fecha. Interpretamos el horario con `America/Santiago` y rechazamos horas locales inexistentes o ambiguas por cambios de hora. Los registros antiguos se preservan, aunque incluyan minutos, fracciones de hora o ausencia de pago; las restricciones de creación nueva no alteran su historia.

## Dependencias externas y operativas

- **Runtime y paquetes:** Node.js 24, Python 3.12 y dependencias fijadas por `package-lock.json`/`uv.lock`. Su instalación requiere acceso a los registros de npm/Python o cachés disponibles.
- **Base de datos:** PostgreSQL 17, usuario con permisos adecuados y migraciones Alembic. La concurrencia depende de mantener el protocolo de bloqueo del espacio en las operaciones que lo modifican.
- **Contenedores:** Docker Engine y Compose; en Windows usamos Docker Desktop con contenedores Linux. Puertos locales 5173, 8000 y 15432 disponibles.
- **Configuración:** variables de entorno y una `AUTH_SECRET_KEY` de al menos 32 caracteres. Conservar la clave mantiene válidos los tokens; los secretos no se versionan.
- **Hora y zonas horarias:** reloj del servidor y datos `tzdata`. El backend es la fuente para vencimiento y elegibilidad; el reloj del navegador no confirma estados.
- **Imágenes:** disponibilidad de los servidores externos que alojan cada URL; una falla no elimina la publicación.
- **Colaboración:** GitHub para código y CI, Jira para Kanban/trazabilidad y Discord para comunicación. No publicamos claves, tokens ni webhooks en la documentación.
- **Pruebas E2E:** Playwright y Chromium (instalados con `npx playwright install --with-deps chromium`) y Docker para el entorno temporal.
- **IA (HU-17):** API de Gemini en su nivel gratuito, opcional y solo desde el backend con `GEMINI_API_KEY`. Sus límites gratuitos cambian con frecuencia; sin clave o con el límite alcanzado, la aplicación lo informa y se escribe la descripción a mano. La CI corre sin clave a propósito. La llamada real (CA-08) se probó el 22 de noviembre de 2026. En producción, el despliegue escribe la clave desde un secreto de GitHub. El límite de 5 sugerencias por minuto se cuenta en la memoria de cada proceso de la API.
- **Notificaciones:** Slack, app RentSmart CI y canal `#rentsmart-ci`; `SLACK_WEBHOOK_URL` está en los secretos del repositorio. El usuario confirmó recepción real de éxito/fallo.
- **Producción publicada:** VPS Azure en Chile Central, Ubuntu, Docker Compose y Caddy. Ambiente `production` limitado a `main`; en entrega 2 comprobamos autenticación desde Actions, HTTPS, revisión `27ba058`, esquema `0007_cancellation_audit` y readiness. El primer intento falló al interpretar la clave y el segundo publicó después de corregir el secreto; la evidencia temporal del smoke se conserva por separado. El release `v3.0-entrega3` despliega con `0008_space_moderation`; el Release registra la verificación.

## Alcance futuro

HU-07 ya enlaza la consulta de reservas recibidas de HU-14 y HU-13 integra el pago simulado de HU-16. Ampliamos explícitamente el alcance para completar CA-05 de HU-14 con confirmación del propietario, auditoría y reembolso simulado atómico. Está integrada por PR #33 y publicada por PR #34 en `27ba058`. En entrega 3, HU-15 agregó el acceso de interfaz del arrendatario.

En entrega 2 autorizamos la cancelación necesaria para CA-05 de HU-14: backend compartido y confirmación del propietario, integrados y publicados. [[Entrega-2]] identifica ese alcance y sus límites.

La entrega 3 integró las pruebas E2E/UI y los requisitos finales: HU-15 (cancelación del arrendatario), HU-09 (filtro por fecha y horario), HU-18 (moderación administrativa) y HU-17 (sugerencia con IA). CA-08 de HU-17, la llamada real a Gemini, se probó el 22 de noviembre de 2026. HU-17 deja fuera de alcance analizar fotografías, garantizar que la IA nunca invente y recomendar espacios; tampoco implementamos paginación ni pagos reales. [[Entrega-3]] detalla los pendientes.

La versión `v1.0-entrega1` utiliza un entorno de ejecución local. El video, las notas y las evidencias están disponibles en [[Entrega-1]].

## Apoyo de inteligencia artificial

Utilizamos ChatGPT, Codex y, en la entrega 3, Claude Code como apoyo en planificación, análisis de requisitos, propuestas de implementación y pruebas, revisión de cambios y documentación. En el cierre de entrega 3, ese apoyo incluyó el guion del video, la matriz de la pauta, las notas del release y la revisión de coherencia y enlaces.

Validamos los resultados mediante lectura de código/diff, pruebas locales o CI identificadas por revisión, verificación de enlaces y, hasta PR #47, revisión del compañero antes de integrar. Desde PR #48, con Joaquín no disponible, subagentes de IA que reciben el encargo sin el historial de la conversación hacen revisiones adversarias de cada PR, y publicamos su resultado en la PR. En HU-17 encontraron defectos que corregimos con pruebas de regresión. No sustituyen la revisión de otro integrante: incumplimos §4.4 de las reglas generales, como registra [[Entrega-3]]. Los conteos y despliegues se atribuyen a su evidencia; una propuesta no constituye una prueba ejecutada. El equipo conserva responsabilidad de comprender, revisar y explicar el trabajo. Los registros de [entrega 2](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/main/docs/entrega-2.md) y [entrega 3](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/develop/docs/entrega-3.md) detallan las verificaciones.

## Continuidad del pipeline en entrega 3

La pauta de entrega 3 menciona Jenkins. Mantenemos GitHub Actions, la herramienta admitida y usada desde la entrega 2, porque ya integra build, pruebas, migraciones, smoke, despliegue y Slack; [[Entrega-3]] muestra que cumple los mismos efectos exigidos (ejecución automática, entorno levantado por el pipeline, headless, OK/FAIL, bloqueo, evidencia y Slack). El profesor confirmó que podemos usar GitHub Actions.
