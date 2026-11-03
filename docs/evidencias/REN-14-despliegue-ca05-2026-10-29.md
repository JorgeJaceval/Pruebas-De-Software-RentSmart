# REN-14 — CA-05 publicado y verificado

El 29 de octubre de 2026 verificamos la publicación de la cancelación del propietario de HU-14. [RentSmart](https://rentsmart-usm-viveros.chilecentral.cloudapp.azure.com) sirve `27ba0580232774fc65750c1974485381a1fcffa4`, merge revisado de [PR #34](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/pull/34). La [ejecución automática #40967124896](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/40967124896) aprobó sus seis jobs, incluido despliegue y notificación de ÉXITO.

## CI, migración y publicación

- 150 Jest y 165 Pytest aprobadas, build y Alembic upgrade/check; conservamos la advertencia existente de Starlette/TestClient.
- 26 comprobaciones de infraestructura y smoke aprobados, sin contarlas como pruebas nuevas de aplicación.
- Actions autenticó SSH, construyó imágenes, aplicó `0006_payment_simulation → 0007_cancellation_audit`, reemplazó servicios y verificó SHA/readiness.
- `DEPLOY_ENABLED=true` permanece condicionado a `main`, calidad, smoke y ambiente `production`. No lanzamos un workflow adicional para duplicar la publicación.

## Verificación pública independiente

```bash
bash scripts/verify-deployment.sh https://rentsmart-usm-viveros.chilecentral.cloudapp.azure.com 27ba0580232774fc65750c1974485381a1fcffa4
```

Resultado: versión verificada y API/PostgreSQL disponibles. Comprobamos HTTPS con validación TLS normal, raíz React HTTP 200 y redirección HTTP → HTTPS. `GET /version.json` devuelve el SHA revisado; `GET /api/health/ready` informa base conectada.

`POST /api/reservations/00000000-0000-0000-0000-000000000000/cancel`, cuerpo `{}` y sin sesión, devolvió `401` y `Cache-Control: no-store`. Esta solicitud solo comprueba la ruta publicada y su protección; no ejecuta una cancelación ni crea cuentas o reservas de producción.

## Verificación del VPS por SSH estricto

| Elemento | Resultado observado |
| --- | --- |
| `current` | `/opt/rentsmart/releases/27ba0580232774fc65750c1974485381a1fcffa4.tUQThWsK` |
| Frontend/backend | Imágenes etiquetadas con el SHA publicado; contenedores `healthy` |
| PostgreSQL | Contenedor `healthy`; API/base solo publican puertos internos |
| Revisión Alembic | `0007_cancellation_audit` |
| Campos de auditoría | `cancelled_at` y `cancelled_by`, ambos nullable para legados |
| Restricciones | `ck_reservations_cancellation_audit` y `fk_reservations_cancelled_by_users` presentes |
| Tablas de aplicación | Usuarios, espacios, reservas y pagos: cero filas antes y después |
| Configuración | `/opt/rentsmart/shared/.env` conserva permisos 600 |

Antes del despliegue generamos el respaldo privado `/opt/rentsmart/shared/backups/pre-ca05-deploy-20261029T223708Z-116385.dump`, 12.102 bytes, permisos 600. `pg_restore --list` aprobó; SHA-256 `7c626f2b036d0cc5e96988bba6e68d65f446a95bf931e3b71ab5f2545b59bfba`. Se conserva en el VPS; no descargamos datos ni afirmamos haber ensayado una restauración completa. Complementa el [respaldo de preparación](REN-14-preparacion-publicacion-ca05-2026-10-29.md).

## Demostración y límites

Actualizamos la copia local a `27ba058` con respaldo previo y volúmenes/credenciales conservados. Migraciones/check, versión/readiness y acceso por ambas cuentas aprobaron. Las dos reservas pagadas originales y la cancelada/reembolsada del ensayo siguen intactas. El ensayo inicial de cancelación se realizó sobre `9103718`; la actualización a `main` comprobó la preservación de esos estados sin crear reservas adicionales. El código funcional coincide.

El SHA publicado identifica el código, no la existencia de un tag/Release de entrega 2. Video y `v2.0-entrega2` siguen pendientes. Las fuentes de Wiki actualizadas con esta publicación requieren revisión/integración y sincronización; el sitio público conserva su commit anterior `bf380a1` hasta ejecutar ese paso. No ejecutamos navegador ni pruebas E2E/UI y no completamos la interfaz del arrendatario de HU-15.
