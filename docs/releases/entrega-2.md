# RentSmart v2.0-entrega2 — Borrador de notas

**No publicado.** Actualizamos estas notas el 29 de octubre de 2026 para el candidato `release/REN-77-v2.0-entrega2`, desde `develop` con PR #27 integrado (`7ba9f25`). El PR hacia `main` reúne el trabajo revisado de entrega 2 y prepara el primer despliegue. Todavía faltan la publicación real y su evidencia, Wiki, cápsula de video y revisión final estable en `main`. El nombre de esta rama o archivo no acredita la existencia del tag o GitHub Release `v2.0-entrega2`.

## Cambios respecto de entrega 1

- Reservas recibidas del propietario: API autenticada, panel, filtro por publicación propia, próximas/historial y estados, con privacidad e importes conservados — HU-14, [PR #20](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/pull/20).
- Pago simulado del arrendatario: aprobación/rechazo, reintento, referencia y fecha persistidas, transacción atómica e idempotencia — HU-16, [PR #21](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/pull/21).
- CI ampliada con reportes, artefactos, `quality` y sonda artificial; comprobaciones de contenedores y notificaciones reales de éxito/fallo a `#rentsmart-ci` — PR #22 a #25.
- Despliegue preparado para Linux, Docker Compose y Caddy, con SSH, migraciones previas y verificación pública de revisión/readiness. VPS Azure en Chile Central con SSH/Docker/DNS y smoke remoto comprobados; ambiente `production` limitado a `main` y nombres de secretos presentes. La autenticación desde el pipeline y la publicación real permanecen pendientes.

## Instalación y actualización

Seguimos [la instalación local](../wiki/Instalacion-y-ejecucion.md) para desarrollo y [la guía de despliegue](../despliegue.md) para el servidor. Usamos Node.js 24, Python 3.12 y PostgreSQL 17, con dependencias congeladas. Nunca copiamos secretos de desarrollo al repositorio o a estas notas.

Aplicamos `0006_payment_simulation` mediante Alembic antes de iniciar la API actualizada. Agrega importe y fecha de procesamiento opcionales al pago sin inventar valores históricos. Antes de migrar una base con datos relevantes conservamos un respaldo verificado; no implementamos rollback automático del esquema. El frontend de producción se compila y sirve con Caddy, mientras `compose.yaml` conserva el ambiente local con Vite.

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

- CA-05 de HU-14 sigue parcial: la cancelación depende de HU-15 y permanece deshabilitada. Esta entrega no incorpora automáticamente esa historia ni otros requisitos finales del proyecto.
- El pago es simulado, sin dinero real ni datos de tarjetas.
- La infraestructura del VPS está preparada, con publicación real pendiente. La comprobación HTTP temporal no equivale a HTTPS público ni a disponibilidad del servidor.
- Las pruebas E2E/UI corresponden a entrega 3 y no forman parte de los resultados de este hito.

## Completar antes de publicar

- SHA final de `main`, PR de release revisado y checks de esa revisión.
- Estado explícito del alcance parcial de HU-14 y cualquier acuerdo de evaluación.
- URL pública real, ejecución de despliegue, SHA publicado y comprobación de disponibilidad.
- Wiki actualizada/publicada y URL accesible del video de entrega 2.
- Tag `v2.0-entrega2` apuntando al commit estable y notas revisadas sin marcadores de borrador.

La [lista de cierre](../cierre-entrega-2.md) organiza estas acciones. No creamos el tag ni publicamos el Release con esta preparación documental.
