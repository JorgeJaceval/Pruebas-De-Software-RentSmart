# REN-14 — Preparación de publicación de CA-05

Estado del 29 de octubre de 2026. PR #33 quedó integrada en `develop` mediante `66e5f87e6a1d03feb7f9f8176dfb638818a8d863`, con [CI del merge aprobada](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/40964591135). [PR #34](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/pull/34) prepara su publicación revisada hacia `main`. El VPS conserva `ff19bc3`; el cambio todavía no está publicado allí.

## Demostración local actualizada

- URL: `http://127.0.0.1:18080`, SHA `91037189b95fd626a98b402f8a703e898d5e25cb`.
- Conservamos cuentas y volúmenes, generamos respaldo previo privado, aplicamos 0007 y Alembic check y verificamos tres contenedores sanos y versión/readiness.
- Ensayo HTTP: nueva reserva pagada → cancelación del propietario → reembolso simulado → repetición idempotente desde el arrendatario. Referencia/importe conservados; las dos reservas originales siguen pagadas.
- [La guía de demostración](../demo-video-entrega-2.md) explica acceso, respaldo y datos ficticios. No ejecutamos navegador automatizado ni sumamos el ensayo a los conteos de tests.

## Inspección y respaldo de producción

Inspeccionamos por SSH con la clave dedicada y comprobación estricta de host. Los tres contenedores de `rentsmart-production` estaban sanos, la base estaba en `0006_payment_simulation`, las cuatro tablas de aplicación tenían cero filas y quedaban 57 GiB disponibles en el volumen raíz. No leímos ni imprimimos contraseñas ni claves.

| Dato | Valor comprobado |
| --- | --- |
| Archivo en el VPS | `/opt/rentsmart/shared/backups/pre-ca05-20261029T222345Z-107118.dump` |
| Formato | PostgreSQL custom, generado con `pg_dump` dentro del contenedor |
| Tamaño | 12.102 bytes |
| Permisos | 600, usuario de despliegue |
| SHA-256 | `75b87f1435dfe2edd13fa73280f2b8d94ff0b8566912d10b9703cfc81f60dc2d` |
| Verificación | `pg_restore --list` aprobó; conservamos listado privado junto al archivo |

El respaldo representa ese instante. La verificación de formato/listado no acredita una restauración completa ensayada. Si entran datos nuevos antes de la migración, generamos un respaldo actualizado. No descargamos el archivo ni modificamos esquema, servicios o datos al respaldar.

## Wiki sincronizada

Copiamos exactamente las siete páginas y barra lateral desde `66e5f87`, conservando las otras páginas de Wiki. Publicamos `bf380a1d7f6577ecd68a40477490700b5c3a8086` sobre `748debd03d09363102c34c9da8d88e64369f10ca`: cambiaron Entrega-2, estrategia de pruebas y supuestos. Verificamos navegación, SHA remoto, HTTP 200/contenido esperado de siete páginas y el enlace de la justificación en `develop`.

La Wiki describe el candidato integrado y su justificación, sin acreditar una publicación del VPS. No publicamos las modificaciones nuevas de la release antes de su revisión.

## Límites y siguientes pasos

Después de aprobar e integrar PR #34 mediante merge commit, Actions podrá aplicar 0007 y publicar la revisión de `main` tras calidad y smoke. Comprobaremos el SHA público, HTTPS/readiness y el resultado de esa ejecución antes de declarar CA-05 disponible en producción.

Esta preparación no crea tag/GitHub Release ni video. El video sigue pospuesto por el equipo. Conservamos la exclusión de E2E/UI y el acceso de cancelación del arrendatario pendiente en HU-15.
