# Supuestos y dependencias

Estas decisiones delimitan el MVP y su ampliación de entrega 2. Las reglas detalladas están en [requerimientos](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/develop/docs/requerimientos.md) y los documentos de cada HU.

## Supuestos y reglas principales

| Decisión | Aplicación actual |
| --- | --- |
| Una cuenta, dos formas de participar | Puede publicar sus espacios y arrendar espacios ajenos; el registro público no concede administración |
| Precio por hora en CLP | Entero entre 500 y 500.000; el backend calcula duración y total y conserva el precio contratado |
| Fotos externas | De una a tres URLs HTTPS; mostramos un reemplazo si la imagen no carga. No alojamos archivos subidos |
| Horario diario uniforme | Una apertura y un cierre se aplican todos los días en `America/Santiago`; no hay calendario semanal ni excepciones por feriados |
| Horas enteras y un mismo día | Nuevas reservas de 1–8 horas, dentro del horario del espacio; apertura menor que cierre, máximo cierre a las 23:00 |
| Inicio futuro | El instante debe ser posterior al actual y no superar el instante actual más 90 días; el servidor decide el límite |
| Intervalos consecutivos válidos | Usamos `[inicio, término)`: 10:00–12:00 y 12:00–13:00 no se superponen |
| Bloqueo provisional | Reserva y pago quedan pendientes; bloquean hasta `min(creación + 15 minutos, inicio)`. Al vencer, la lectura informa expiración efectiva |
| Pago simulado | Crear una reserva registra un pago pendiente; HU-16 permite rechazar/reintentar o aprobar de forma atómica e idempotente, sin dinero real |
| Protección de contratos e historial | Editar tarifa conserva importes anteriores; editar horario protege reservas vigentes; eliminar requiere ausencia de cualquier reserva histórica |
| Catálogo de demostración pequeño | Filtros básicos en el cliente sobre el listado completo; búsqueda temporal y paginación no están implementadas |
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
- **Notificaciones:** Slack, app RentSmart CI y canal `#rentsmart-ci`; `SLACK_WEBHOOK_URL` está en los secretos del repositorio. El usuario confirmó recepción real de éxito/fallo.
- **Producción prevista:** VPS Azure en Chile Central, Ubuntu, Docker Compose y Caddy. Host, SSH, Docker y DNS comprobados; ambiente `production` limitado a `main` y nombres de secretos presentes. Autenticación desde el pipeline y publicación real pendientes después de revisar el candidato de release; la prueba temporal de contenedores no demuestra HTTPS público.

## Alcance futuro

HU-07 ya enlaza la consulta de reservas recibidas de HU-14 y HU-13 integra el pago simulado de HU-16. La cancelación de HU-15 conserva su dependencia: CA-05 de HU-14 sigue parcial y la acción permanece deshabilitada. Esa dependencia no amplía automáticamente el alcance autorizado de entrega 2.

Filtros temporales, cancelación, sugerencias y otros requisitos finales fuera de lo acordado permanecen pendientes. Las pruebas E2E/UI corresponden a entrega 3. [[Entrega-2]] identifica el trabajo actual y sus límites sin completar el backlog general.

La versión `v1.0-entrega1` utiliza un entorno de ejecución local. El video, las notas y las evidencias están disponibles en [[Entrega-1]].
