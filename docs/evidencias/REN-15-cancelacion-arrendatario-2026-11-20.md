# REN-15 — cancelación desde Mis reservas

Fecha: 20 de noviembre de 2026, America/Santiago. Rama `feature/REN-15-cancelacion-arrendatario`, base `develop` `9292a9a5c892695b37b3b8c27e0473cbdd7c8ae2`.

## Ensayo local del candidato

- TypeScript/Vite aprobados; Jest **162/162** en 13 suites, incluidas doce comprobaciones nuevas de integración del control compartido con Mis reservas.
- Chromium headless, **14/14 E2E**, dos workers, cero reintentos, 0 fallos/errores/omitidos, JUnit 10,980252 s de tests, sin incluir preparación/build.
- Reporte local ignorado: `frontend/test-results/e2e/run-GEtKUM19/`; HTML/JUnit, logs y metadatos conservados. No se versionan credenciales efímeras ni trazas.
- `source_head=9292a9a5c892695b37b3b8c27e0473cbdd7c8ae2`, `source_dirty=true`: se ensayó el árbol candidato, posteriormente guardado en `c93347e`, no el contenido puro del HEAD base. Los cambios posteriores solo documentan resultados.
- Proyecto exclusivo `rentsmart-e2e-059cb2c3a92b`, aplicación/API/PostgreSQL reales y datos ficticios por caso. Cuentas distintas, contextos limpios y fechas futuras calculadas desde el reloj real en Santiago.
- Al finalizar no quedan contenedores ni volúmenes de ese proyecto. Los tres servicios de `rentsmart-demo-e2-y7mmicts` siguen healthy; no se usó el VPS.

## Comportamientos observados

E3-14 tiene dos variantes independientes: pendiente sin devolución y pagada con devolución total simulada. El usuario abre la confirmación, comprueba horario y aviso, vuelve sin cancelar y después confirma. La reserva aparece cancelada en historial y conserva el resultado del pago tras recargar. La repetición de la API devuelve cancelada con la misma referencia y estado de pago. Una nueva reserva por UI del mismo intervalo llega a su resumen con identificador nuevo; el contrato anterior permanece cancelado.

Jest verifica además pago rechazado, errores 409/404/503/red, contrato conservado ante error, orden del historial, prevención de doble envío y descarte de respuestas al navegar, cerrar sesión o vencer la sesión. El primer intento local detectó identificadores duplicados en el fixture nuevo de historial; se corrigieron y la regresión completa posterior aprobó.

Auditoría en base de datos, límites exactos de tiempo, permisos de terceros y concurrencia pago/cancelación pertenecen a las pruebas PostgreSQL existentes; no se atribuyen al recorrido de navegador. La API compartida y la migración no cambiaron.

## Seguimiento remoto

La PR y su CI identifican el candidato publicado. Se registran los resultados remotos reales en la PR/Jira y en el registro de entrega 3; el ensayo local por sí solo no acredita CI, revisión, integración ni despliegue. [Contrato y criterios de HU-15](../HU-15.md), [registro acumulativo](../entrega-3.md#31-registro-funcional-ren-15--cancelación-del-arrendatario-20-de-noviembre-de-2026).
