# Completar CA-05 de HU-14 en entrega 2

## Justificación y decisión de alcance

El 29 de octubre de 2026 acordamos completar la cancelación necesaria para CA-05 de HU-14. La pauta de entrega 2 exige **dos requerimientos funcionales nuevos con sus pruebas**. Elegimos HU-14 (reservas recibidas) y HU-16 (pago simulado); dejar la cancelación deshabilitada mantenía HU-14 parcial. Desarrollamos este criterio para cumplir el requerimiento seleccionado sin depender de una excepción docente.

La pauta de entrega 3 incorpora automatización E2E/UI y su integración al pipeline. No asigna específicamente HU-15 a ese hito. La separación anterior de cancelación era una decisión de planificación del equipo, que modificamos con autorización explícita del usuario. Conservamos ese historial y la justificación en el [registro de entrega 2](entrega-2.md).

La ampliación se limita a las reglas compartidas de cancelación y al acceso del propietario desde HU-14. No incorpora el filtro temporal del catálogo, IA, administración ni pruebas E2E/UI. HU-15 conserva pendiente el acceso de cancelación desde el panel del arrendatario; su endpoint admite ambos participantes para mantener una única regla de autorización. Esa historia permanece en curso y no se presenta como completada por cerrar CA-05 del propietario.

## Comportamiento implementado

1. Desde Reservas recibidas, el propietario puede solicitar la cancelación de una reserva pendiente vigente o pagada cuyo inicio siga siendo futuro. La confirmación identifica espacio, fecha y horario en Santiago.
2. Si hay un pago aprobado, advertimos el reembolso total **simulado**, sin dinero real. Si no existe un pago aprobado registrado, no inventamos un reembolso. Volver o Escape cierra sin enviar la cancelación.
3. El servidor vuelve a verificar sesión, participación, estado y hora después de adquirir los bloqueos. Un tercero, incluido un administrador sin relación con la reserva, recibe la misma respuesta que para un identificador inexistente.
4. Tras confirmar el commit, la reserva aparece cancelada en el historial conservando el filtro, arrendatario y contrato económico; el horario queda liberado. Un error o una respuesta incompleta no anuncia éxito. Se permite actualizar el panel para comprobar un resultado incierto.
5. Bloqueamos envíos duplicados mientras esperamos, conservamos el foco dentro de la confirmación y descartamos respuestas tardías al navegar o terminar la sesión.

## API, consistencia y compatibilidad

`POST /api/reservations/{id}/cancel`, con sesión y cuerpo `{}`, devuelve el contrato común de lectura de reserva. El servidor obtiene identidad, fecha, estado e importe de sus propios datos; campos adicionales son rechazados con `422`. El detalle individual continúa reservado al arrendatario y la operación no concede al propietario permisos de pago.

- `200`: cancelación confirmada o repetición de una cancelación existente.
- `401`: falta sesión válida; `404`: reserva ajena/inexistente; `409`: vencida, finalizada o ya iniciada; `503`: fallo controlado de persistencia.
- Los límites temporales son estrictos: al llegar el vencimiento de la pendiente o la hora de inicio ya no se cancela. Una repetición de una cancelación previa sigue devolviendo su estado sin alterar autor, fecha o pago, incluso después del inicio.
- Compartimos el orden de bloqueo de pago y reserva: **espacio → reserva → pago**. Guardamos `cancelled`, autor/fecha y el cambio `approved → refunded` en una sola transacción. Un fallo revierte todo. Las carreras se verifican con solicitudes HTTP reales y contención en PostgreSQL, en ambos órdenes.
- Conservamos referencia, importe y fecha originales del pago. Las reservas sin pago no generan uno; un pago aprobado legado sin importe/fecha conserva esos valores nulos al reembolsarse. El historial y los precios contratados permanecen intactos.

La migración `0007_cancellation_audit` agrega `reservations.cancelled_by` (FK a cuentas) y `cancelled_at`, ambos opcionales. Exige que la auditoría nueva esté completa y corresponda a una reserva cancelada, pero conserva las cancelaciones históricas sin inventar quién ni cuándo. Persistimos esos datos para auditoría y no ampliamos la respuesta del panel con identificadores de usuarios.

## Verificación y publicación

Agregamos pruebas Pytest/PostgreSQL de permisos, límites, idempotencia, auditoría, rollback, legados, migración y liberación real del horario. Sustituimos la simulación de un escritor de cancelación por la API real en las dos pruebas de concurrencia de pago. Jest/RTL verifica confirmación, reembolso, errores, contrato de respuesta, doble envío y sesión/navegación; HTTP permanece simulado en frontend.

La regresión local aprobó **150 Jest y 165 Pytest**: 315 pruebas de aplicación. Agregamos 16 comprobaciones frontend y 21 backend, y actualizamos las dos carreras de pago existentes para utilizar la API real de cancelación. TypeScript/Vite y Alembic upgrade/check aprobaron con PostgreSQL 17 temporal. Conservamos la advertencia existente de Starlette/TestClient. El smoke local aprobó sobre `577df480f40b88a0a89ce29dbce244933c4deb99`: build, migraciones, proxy/API/SPA, SHA y persistencia, con limpieza de recursos temporales. Los resultados remotos y la revisión se conservan en [PR #33](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/pull/33), el registro y Jira. Este documento describe el candidato de `feature/REN-14-cancelacion-ca05`: necesita revisión/integración y despliegue posterior. El VPS y la copia local de video preparados sobre `ff19bc3` todavía muestran el comportamiento anterior. Actualizaremos esa copia después de integrar el cambio; no afirmamos que CA-05 esté disponible en la aplicación pública por haberlo implementado en esta rama.

Fuentes de alcance: `entrega2.md` (sección 2.2), `entrega3.md` (objetivo y sección 2) proporcionados por el equipo, [REN-14](https://rentsmartpsf.atlassian.net/browse/REN-14) y [REN-15](https://rentsmartpsf.atlassian.net/browse/REN-15). No enviamos consultas al profesor ni atribuimos esta decisión a una autorización docente.
