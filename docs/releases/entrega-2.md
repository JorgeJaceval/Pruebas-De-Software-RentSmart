# RentSmart v2.0-entrega2 — Borrador de notas

**Tag/GitHub Release no publicados.** PR #28 integró el candidato revisado de entrega 2 en `main` mediante `ff19bc3`. El 29 de octubre de 2026 publicamos esa revisión de la aplicación y verificamos HTTPS/SHA/readiness; [la evidencia](../evidencias/REN-84-despliegue-2026-10-29.md) conserva intento, corrección y resultado. La [Wiki de entrega 2](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/wiki/Entrega-2) ya está publicada desde las fuentes revisadas de PR #29. Todavía faltan cápsula de video y cierre sobre el SHA definitivo. Este archivo no acredita la existencia del tag o GitHub Release `v2.0-entrega2`.

## Cambios respecto de entrega 1

- Reservas recibidas del propietario: API autenticada, panel, filtro por publicación propia, próximas/historial y estados, con privacidad e importes conservados — HU-14, [PR #20](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/pull/20).
- Cancelación confirmada del propietario para CA-05 de HU-14, API compartida con reglas de HU-15, auditoría y reembolso simulado atómico — [PR #33](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/pull/33), integrada en `develop` mediante `66e5f87`, pendiente de publicación hacia `main` por PR #34.
- Pago simulado del arrendatario: aprobación/rechazo, reintento, referencia y fecha persistidas, transacción atómica e idempotencia — HU-16, [PR #21](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/pull/21).
- CI ampliada con reportes, artefactos, `quality` y sonda artificial; comprobaciones de contenedores y notificaciones reales de éxito/fallo a `#rentsmart-ci` — PR #22 a #25.
- Despliegue en Linux, Docker Compose y Caddy, con SSH, migraciones previas y verificación pública de revisión/readiness. VPS Azure en Chile Central; ambiente `production` limitado a `main`, autenticación desde Actions y primera publicación HTTPS comprobadas. `DEPLOY_ENABLED=true`.

## Instalación y actualización

Seguimos [la instalación local](../wiki/Instalacion-y-ejecucion.md) para desarrollo y [la guía de despliegue](../despliegue.md) para el servidor. Usamos Node.js 24, Python 3.12 y PostgreSQL 17, con dependencias congeladas. Nunca copiamos secretos de desarrollo al repositorio o a estas notas.

El candidato de cancelación agrega `0007_cancellation_audit`, con autor/fecha opcionales para conservar legados sin inventar auditoría. Aplicamos `0006_payment_simulation` mediante Alembic antes de iniciar la API actualizada. Agrega importe y fecha de procesamiento opcionales al pago sin inventar valores históricos. Antes de migrar una base con datos relevantes conservamos un respaldo verificado; no implementamos rollback automático del esquema. El frontend de producción se compila y sirve con Caddy, mientras `compose.yaml` conserva el ambiente local con Vite.

## Pruebas y evidencia disponible

La [ejecución normal #40796675009](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/40796675009), sobre el PR de `d3553a8`, aprobó 134 Jest, 144 Pytest y 26 pruebas de infraestructura, además de build, migraciones y smoke. Son resultados históricos; al cerrar la release agregaremos los resultados del SHA final entregado.

La [sonda #40796674640](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/40796674640) conservó las 134 Jest y 144 Pytest aprobadas y falló deliberadamente después de los tests de frontend. Verificamos el bloqueo y el aviso de FALLO artificial. El usuario confirmó recepción real de ambos avisos en Slack.

El [PR #27](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/pull/27), sobre `c86cd2f`, aprobó [CI #40892264192](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/40892264192): 134 Jest, 144 Pytest, 26 comprobaciones de infraestructura, smoke y aviso de ÉXITO; despliegue omitido. El smoke ejecutado realmente en el VPS sobre `8b76c33` también aprobó y limpió sus recursos temporales, según [el registro de Azure](../vps-azure.md). Ninguna ejecución sustituye los checks del PR de este candidato ni acredita el despliegue público final.

## Integración del candidato y primera publicación

1. Revisamos el PR hacia `main`, su alcance y sus checks; integramos mediante merge commit, sin crear el tag. Conservamos el historial de PR #20 a #27 y los artefactos históricos de entrega 1.
2. Comprobamos el SHA de `main` y su CI normal, activamos `DEPLOY_ENABLED` y ejecutamos el workflow manual normal desde `main`. Validamos la clave/host SSH y la publicación real HTTPS mediante `/version.json` y readiness.
3. Registramos esa evidencia y completamos Wiki/video por el flujo revisado. Verificamos el SHA definitivo antes de crear el tag y GitHub Release; sincronizamos después `main` con `develop` por PR.

Esta preparación documental no activa el despliegue ni publica el tag. El workflow de release de entrega 1 y sus notas no cambian respecto de `main`; su automatización no publica la entrega 2.

## Límites conocidos

- CA-05 de HU-14 incorpora cancelación del propietario en el candidato actual, con auditoría y reembolso simulado atómico; [justificamos su inclusión](../cancelacion-ca05-entrega-2.md) en entrega 2. Falta revisar/integrar y desplegar este cambio. HU-15 conserva pendiente la interfaz del arrendatario.
- El pago es simulado, sin dinero real ni datos de tarjetas.
- La primera publicación está verificada sobre `ff19bc3`; cualquier revisión final posterior debe comprobar su propio SHA y disponibilidad. La evidencia del smoke temporal permanece separada de la publicación real.
- Las pruebas E2E/UI corresponden a entrega 3 y no forman parte de los resultados de este hito.

## Completar antes de publicar

- SHA final de `main`, PR de release revisado y checks de esa revisión.
- Revisión/integración y verificación del candidato de CA-05 de HU-14; no contamos la preparación como funcionalidad ya desplegada.
- Confirmar que la URL pública y el SHA publicado coinciden con la revisión final que se etiquetará; existe evidencia del primer despliegue de `ff19bc3`.
- Mantener la Wiki publicada sincronizada con las fuentes finales revisadas e incorporar la URL accesible del video de entrega 2.
- Tag `v2.0-entrega2` apuntando al commit estable y notas revisadas sin marcadores de borrador.

La [lista de cierre](../cierre-entrega-2.md) organiza estas acciones. No creamos el tag ni publicamos el Release con esta preparación documental.


## Preparación de publicación de CA-05

Rama `release/REN-14-publicacion-ca05`: partimos de `develop` en `d17e752` e incorporamos por avance rápido el candidato `9103718`. El usuario confirmó inicialmente que faltaba el merge de PR #33; después verificamos su integración `66e5f87` y CI del merge #40964591135 aprobada. Incorporamos ese historial a la release y preparamos [PR #34](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/pull/34) para revisión hacia `main`. La publicación requiere su integración revisada, con CI aprobada.

El código funcional coincide con el candidato comprobado en [CI #40963284631](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/40963284631): 150 Jest, 165 Pytest, 26 comprobaciones de infraestructura y smoke aprobados. Los cambios propios de esta preparación son documentales; la CI de la nueva PR verificará su revisión concreta contra `main`.

La demostración local ya ejecuta `9103718` con migración 0007, datos preservados y ensayo de cancelación/reembolso. El VPS sigue en `ff19bc3`. Conservamos un respaldo privado de producción previo a 0007 y verificamos formato/listado y permisos, según [la evidencia](../evidencias/REN-14-preparacion-publicacion-ca05-2026-10-29.md). Después del merge de la release comprobaremos SHA/HTTPS/readiness del despliegue resultante. Esta preparación no crea `v2.0-entrega2`, GitHub Release ni video.
