# Demostración local para el video de entrega 2 — REN-77

Esta guía acompaña al [guion](guion-video-entrega-2.md). La demostración funcional corre en una copia local del merge revisado `27ba0580232774fc65750c1974485381a1fcffa4` de PR #34, el mismo SHA publicado en Azure. La grabación y su publicación siguen pendientes.

El 29 de octubre de 2026 preparamos una primera copia en otro entorno: partió de `ff19bc3`, ensayó CA-05 con `9103718` y se actualizó a `27ba058`. Ese ensayo conserva su registro en la [evidencia de preparación](evidencias/REN-14-preparacion-publicacion-ca05-2026-10-29.md). El 1 de noviembre recreamos la copia en el equipo de grabación, porque la anterior no estaba disponible allí, con cuentas y datos ficticios nuevos.

## Abrir la copia preparada

- Aplicación: <http://127.0.0.1:18080>; inicio de sesión en <http://127.0.0.1:18080/#sesion>.
- Directorio local: `.cache/demo-entrega2/`, excluido de Git. Contiene el código exportado de `27ba058`, el `.env` de la copia, el lanzador `demo-compose`, el script de datos y el manifiesto `demo-datos.json`.
- Credenciales ficticias: `.cache/demo-entrega2/cuentas-demo.txt`. Las abrimos fuera de la grabación. No son cuentas del VPS.

Usamos el Compose de producción existente con el proyecto Docker exclusivo `rentsmart-demo-e2` y volúmenes propios. Caddy escucha solo en loopback por HTTP; backend y PostgreSQL no publican puertos del host. Los secretos de la copia se generaron de forma independiente. Para alargar la grabación, la sesión dura 240 minutos (`AUTH_TOKEN_MINUTES`); producción conserva 30. Para mostrar HTTPS abrimos [RentSmart en Azure](https://rentsmart-usm-viveros.chilecentral.cloudapp.azure.com), su [versión](https://rentsmart-usm-viveros.chilecentral.cloudapp.azure.com/version.json) y su [readiness](https://rentsmart-usm-viveros.chilecentral.cloudapp.azure.com/api/health/ready).

## Datos preparados y ensayo

Creamos los datos mediante la API existente, sin modificar la base directamente:

| Elemento | Datos ficticios |
| --- | --- |
| Propietaria | Propietaria Demo E2; `propietario.e2@example.com` |
| Arrendatario | Arrendatario Demo E2; `arrendatario.e2@example.com` |
| Sala Demo CI | Sala de reuniones en Providencia; 8 personas; 10.000 CLP/h; 09:00–18:00 |
| Estudio Demo E2 | Sala multiuso en Ñuñoa; 12 personas; 15.000 CLP/h; 09:00–18:00 |
| Reserva próxima | Estudio Demo E2, 10 de noviembre de 2026, 10:00–12:00, pagada (30.000 CLP) |
| Ensayo del recorrido | Sala Demo CI, 3 de noviembre de 2026, 15:00–16:00: pago rechazado, reintento aprobado, cancelada por la propietaria y reembolsada (10.000 CLP) |

El ensayo HTTP del 1 de noviembre comprobó siete resultados:

- El rechazo permite reintentar.
- El pago aprobado deja la reserva pagada.
- La propietaria ve el pago con el nombre del arrendatario.
- La cancelación registra el reembolso.
- Repetir la cancelación desde el arrendatario devuelve el mismo resultado.
- Un espacio ajeno responde 404.
- La reserva del estudio queda pagada.

En un navegador comprobamos el inicio de sesión de la propietaria, el panel de reservas recibidas (la reserva pagada en próximas, la cancelada en historial y las opciones del filtro por espacio) y las fotos del catálogo. No ejecutamos navegador automatizado como prueba, no agregamos pruebas E2E/UI ni sumamos el ensayo a Jest/Pytest.

Las fotos son URL HTTPS públicas de Unsplash. Los estados cambian con el reloj real: al terminar su horario, una reserva pagada pasa al historial.

## Recorrido para grabar

1. Iniciamos sesión en dos ventanas independientes: propietaria en una normal y arrendatario en una privada. La sesión se guarda por pestaña.
2. **HU-16:** arrendatario → Explorar catálogo → Sala Demo CI → Ver espacio. Elegimos una fecha futura dentro de 90 días y un bloque libre de 09:00–18:00, por ejemplo 6 de noviembre de 11:00 a 13:00, y solicitamos la reserva justo antes del segmento. En Pagar reserva elegimos Rechazar pago simulado y lo confirmamos; luego elegimos Aprobar pago simulado. El plazo es de 15 minutos desde la creación o hasta el inicio, si ocurre antes. Si vence, creamos otra en un bloque libre.
3. **HU-14:** propietaria → Mis espacios → Ver todas las reservas recibidas → Actualizar reservas recibidas. Mostramos la reserva recién pagada junto a la del estudio, el filtro por espacio y el historial con el ensayo cancelado.
4. **CA-05:** en la reserva recién pagada usamos Cancelar reserva → Confirmar cancelación. La reserva pasa al historial como Cancelada con pago Reembolsado.
5. Seguimos con las pestañas de Actions, Slack, despliegue, Jira y PR indicadas en el guion.

## Iniciar, consultar y detener

Con Docker Desktop abierto, los contenedores vuelven a iniciar solos, salvo que los hayamos detenido. Desde la raíz del repositorio, en Git Bash:

```bash
.cache/demo-entrega2/demo-compose ps
.cache/demo-entrega2/demo-compose up -d --no-build --wait --wait-timeout 180 db backend frontend
bash .cache/demo-entrega2/codigo/scripts/verify-deployment.sh http://127.0.0.1:18080 27ba0580232774fc65750c1974485381a1fcffa4
```

Desde PowerShell, el equivalente es:

```powershell
docker compose --project-name rentsmart-demo-e2 --env-file .cache/demo-entrega2/.env -f .cache/demo-entrega2/codigo/compose.production.yaml up -d --no-build --wait db backend frontend
```

Para detener sin borrar los datos:

```bash
.cache/demo-entrega2/demo-compose stop
```

Conservamos los volúmenes hasta terminar la grabación. El directorio no llega al clonar el repositorio. En otro equipo exportamos el mismo SHA con `git -c core.autocrlf=false archive`, creamos un `.env` con valores nuevos (`SITE_ADDRESS=:80`, `HTTP_BIND=127.0.0.1`, `HTTP_PORT=18080`), construimos, aplicamos `migrate` y `alembic check`, y creamos los datos ficticios con la API. La [guía de despliegue](despliegue.md) y el [Compose existente](../compose.production.yaml) describen esos componentes.
