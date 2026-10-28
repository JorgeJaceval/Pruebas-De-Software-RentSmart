# Notificaciones de CI/CD a Slack — REN-83

Preparamos avisos de GitHub Actions mediante un **Incoming Webhook de Slack**, con el resultado de `frontend`, `backend`, `quality`, `production` y `deploy`. El equipo confirmó que todavía debe crear el canal y el webhook: **no hay mensajes reales enviados ni evidencia de recepción en Slack**.

## 1. Crear el canal y el webhook

1. Elegimos el workspace Slack del equipo y [creamos un canal para CI/CD](https://slack.com/intl/es-la/help/articles/201402297-Crear-un-canal). Proponemos **`#rentsmart-ci`**; es un nombre sugerido, no un canal ya creado. Si el equipo no tiene workspace, debe crearlo primero.
2. En [Slack Apps](https://api.slack.com/apps), seleccionamos **Create New App → From scratch**, damos un nombre como **RentSmart CI** y elegimos el workspace.
3. En la app abrimos **Incoming Webhooks**, activamos **Activate Incoming Webhooks** y elegimos **Add New Webhook to Workspace**.
4. Seleccionamos el canal y autorizamos la integración. Si es privado, quien autoriza debe pertenecer al canal. Seguimos las aprobaciones que requiera el workspace.
5. Guardamos la URL generada directamente en GitHub; no la copiamos al chat, documentación, capturas o commits.

Referencia del procedimiento: [guía oficial de Incoming Webhooks de Slack](https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks/).

## 2. Guardar el secreto en GitHub

En [Settings → Secrets and variables → Actions del repositorio](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/settings/secrets/actions), creamos un **New repository secret**:

| Nombre | Valor |
| --- | --- |
| `SLACK_WEBHOOK_URL` | URL del Incoming Webhook, guardada únicamente como secreto |

Usamos un secreto **del repositorio**, separado de los secretos SSH del ambiente `production`: el job `notify` también corre en CI de `develop` y en los PR autorizados para acceder a secretos. No necesitamos un token de bot, una variable con el canal ni un plugin de Slack en Actions. El webhook determina el canal de destino; el código no lo cambia.

La implementación admite webhooks estándar HTTPS de `hooks.slack.com`. Si no hay secreto disponible, por ejemplo antes de configurar Slack o en PR de un fork, registramos **omitido; no se envió ningún mensaje** en logs y resumen de Actions. No lo contamos como entrega exitosa a Slack.

## 3. Cuándo y qué notificamos

`notify` depende de los cinco jobs anteriores y usa `if: always()`. Espera que terminen antes de ejecutarse, aunque alguna etapa falle o quede omitida por una dependencia. No es una condición previa del despliegue ni modifica los resultados ya obtenidos por `quality` o `deploy`.

Cada aviso contiene repositorio, evento, rama, SHA completo, ejecución/intento, resultado de cada job y botón **Ver ejecución**. En PR mostramos el SHA de la rama de origen; Actions puede probarlo combinado con la base mediante un commit de merge temporal.

| Situación | Resultado del mensaje |
| --- | --- |
| Frontend, backend, quality y production aprobados; deploy omitido | ÉXITO, con **Despliegue: omitido (sin publicación)** |
| Los cuatro anteriores y deploy aprobados | ÉXITO, con despliegue aprobado |
| Algún job falló | FALLO, conservando el detalle por etapa |
| Algún job se canceló, sin otros fallos | CANCELADO |
| Una etapa obligatoria quedó omitida, sin fallos/cancelaciones | INCOMPLETO; no se anuncia éxito |

Si elegimos `failure_probe=frontend` o `backend`, el mensaje identifica la **sonda de fallo controlado**. Los jobs publican si la etapa de sonda llegó a ejecutarse: solo entonces anunciamos **fallo artificial ejecutado**. Si el build o los tests fallan antes, indicamos **solicitada, no ejecutada**, sin atribuir ese fallo previo a la sonda.

Los avisos de cancelación dependen de que GitHub permita ejecutar el job final; una cancelación forzada del workflow o indisponibilidad del runner puede impedirlos. `always()` cubre los fallos normales de las etapas, no garantiza entrega cuando se interrumpe la propia ejecución del notificador.

## 4. Entrega, fallos y secreto

`scripts/notify_slack.py` genera JSON con la biblioteca estándar de Python y envía un POST con espera máxima de 15 segundos. Confirma entrega solo con HTTP 200 y cuerpo `ok`. No imprime webhook, payload ni cuerpo de error de Slack. Los metadatos se pasan por variables de entorno, se serializan como JSON y se muestran como texto literal en los bloques de Slack.

Validamos el dominio HTTPS de Slack, mantenemos la validación TLS y rechazamos redirecciones. No implementamos reintentos automáticos para evitar duplicados ante un resultado de entrega incierto. Si Slack rechaza la solicitud o falla la red/TLS, `notify` queda rojo con un diagnóstico genérico; el resultado de las pruebas o de una publicación anterior no se reescribe. El workflow completo puede quedar fallido por esa entrega: inspeccionamos el job concreto antes de atribuirlo a la aplicación.

Un timeout puede ocurrir después de que Slack haya aceptado el mensaje. Reejecutar manualmente un job puede duplicar un aviso; registramos el intento para distinguirlo. Si se filtra el webhook, lo revocamos en Slack y reemplazamos el secreto; no dejamos la URL antigua en el historial.

## 5. Demostrar éxito y fallo reales

Después de configurar Slack y tener este cambio en la rama que ejecutaremos:

1. Ejecutamos **Pruebas RentSmart** con `failure_probe=none`, o dejamos correr el push revisado a `develop`. Comprobamos los jobs, el resumen de `notify` y la recepción del aviso de éxito en el canal. El despliegue debe aparecer omitido cuando no corresponda publicar.
2. Ejecutamos manualmente el mismo workflow en `develop` con `failure_probe=frontend` o `backend`. Se espera una ejecución roja por la sonda, con el aviso **FALLO** y su aclaración de fallo artificial. No agregamos código defectuoso ni desplegamos para demostrarlo.
3. Conservamos fecha, SHA, enlace a Actions, número de intento, nombre del canal y evidencia del mensaje de ambos casos. Evitamos capturar la configuración del webhook o secretos.
4. Volvemos a una ejecución normal aprobada antes de preparar la release de entrega 2. Los tests locales con HTTP simulado no sustituyen estas dos recepciones reales.

Estado de la evidencia:

| Elemento | Estado |
| --- | --- |
| Canal real y workspace | Pendientes de crear/confirmar; `#rentsmart-ci` es una propuesta |
| Webhook y secreto del repositorio | Pendientes de configurar |
| Pruebas locales del notificador | 20 aprobadas; servidor HTTP temporal y respuestas simuladas |
| Aviso recibido de éxito / fallo | Pendientes; registrar ambos enlaces y mensajes reales |

## 6. Verificación del código

Desde la raíz, en Linux con Python 3:

```bash
python3 -m unittest discover -s scripts/tests -v
```

La suite reúne las seis guardas existentes de despliegue y veinte comprobaciones del notificador. Verificamos estados, contenido, falta de secreto, metadatos, fallos de red/HTTP, ausencia de filtraciones en logs y entrega JSON a un servidor temporal en loopback. También comprobamos respuesta inesperada, rechazo de redirecciones y falta de reintentos automáticos. No usa un webhook real ni contacta Slack; se ejecuta además en el job `production` de CI.

Referencias: [webhooks de Slack](https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks/), [dependencias y ejecución de jobs en Actions](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#jobsjob_idneeds).
