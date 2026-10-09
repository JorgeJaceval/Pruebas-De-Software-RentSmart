# Supuestos y dependencias

Estas decisiones delimitan el MVP y permiten definir resultados de prueba. Son reglas acordadas para el proyecto académico; no constituyen un estudio comercial ni demuestran aceptación formal del producto. Sus contratos detallados están en [requerimientos](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/develop/docs/requerimientos.md) y los documentos de cada HU.

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
| Pago simulado futuro | HU-16 todavía no ejecuta pagos. Crear una reserva registra un pendiente, sin cobro real ni aprobación de pago |
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

Según confirmación de Jorge Aceval del 9 de octubre de 2026, docencia permitió el equipo de **dos integrantes**. La adopción de Discord está permitida por la [pauta 2026-2](https://github.com/Pruebas-de-Software/HandsOnProject/blob/main/semestres/2026-2/entrega1.md).

## Dependencias de funcionalidades pendientes

HU-07 depende de HU-14 para consultar reservas recibidas. HU-09 debe conectar su filtro temporal con las reglas de HU-11/12. HU-13 depende de HU-15/16 para ejecutar cancelación y pago. Sugerencias con IA y administración corresponden a HU-17/18.

La aplicación se ejecuta localmente; no declaramos despliegue productivo, integración de pagos reales, notificaciones automáticas ni metas verificadas de carga o rendimiento. El video y el tag/Release de Entrega 1 siguen pendientes.
