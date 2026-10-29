# RentSmart v2.0-entrega2 — Borrador de notas

**No publicado.** Preparamos estas notas el 28 de octubre de 2026 para revisar antes del tag y GitHub Release de entrega 2. Todavía faltan la publicación y evidencia del VPS, la cápsula de video y el candidato final estable en `main`. El nombre de este archivo no acredita la existencia de `v2.0-entrega2`.

## Cambios respecto de entrega 1

- Reservas recibidas del propietario: API autenticada, panel, filtro por publicación propia, próximas/historial y estados, con privacidad e importes conservados — HU-14, [PR #20](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/pull/20).
- Pago simulado del arrendatario: aprobación/rechazo, reintento, referencia y fecha persistidas, transacción atómica e idempotencia — HU-16, [PR #21](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/pull/21).
- CI ampliada con reportes, artefactos, `quality` y sonda artificial; comprobaciones de contenedores y notificaciones reales de éxito/fallo a `#rentsmart-ci` — PR #22 a #25.
- Despliegue preparado para Linux, Docker Compose y Caddy, con SSH, migraciones previas y verificación pública de revisión/readiness. Su activación real permanece pendiente.

## Instalación y actualización

Seguimos [la instalación local](../wiki/Instalacion-y-ejecucion.md) para desarrollo y [la guía de despliegue](../despliegue.md) para el servidor. Usamos Node.js 24, Python 3.12 y PostgreSQL 17, con dependencias congeladas. Nunca copiamos secretos de desarrollo al repositorio o a estas notas.

Aplicamos `0006_payment_simulation` mediante Alembic antes de iniciar la API actualizada. Agrega importe y fecha de procesamiento opcionales al pago sin inventar valores históricos. Antes de migrar una base con datos relevantes conservamos un respaldo verificado; no implementamos rollback automático del esquema. El frontend de producción se compila y sirve con Caddy, mientras `compose.yaml` conserva el ambiente local con Vite.

## Pruebas y evidencia disponible

La [ejecución normal #40796675009](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/40796675009), sobre el PR de `d3553a8`, aprobó 134 Jest, 144 Pytest y 26 pruebas de infraestructura, además de build, migraciones y smoke. Son resultados históricos; al cerrar la release agregaremos los resultados del SHA final entregado.

La [sonda #40796674640](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/40796674640) conservó las 134 Jest y 144 Pytest aprobadas y falló deliberadamente después de los tests de frontend. Verificamos el bloqueo y el aviso de FALLO artificial. El usuario confirmó recepción real de ambos avisos en Slack.

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
