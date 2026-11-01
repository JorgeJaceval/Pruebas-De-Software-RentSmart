# Demostración para el video de entrega 2 — REN-77

Esta guía acompaña al [guion](guion-video-entrega-2.md). Grabamos la demostración funcional en la [aplicación publicada en Azure](https://rentsmart-usm-viveros.chilecentral.cloudapp.azure.com), que corre el merge revisado `27ba0580232774fc65750c1974485381a1fcffa4` de PR #34. Una copia local del mismo SHA queda como respaldo. La grabación y su publicación siguen pendientes.

El 29 de octubre de 2026 preparamos una primera copia local en otro entorno: partió de `ff19bc3`, ensayó CA-05 con `9103718` y se actualizó a `27ba058`. Ese ensayo conserva su registro en la [evidencia de preparación](evidencias/REN-14-preparacion-publicacion-ca05-2026-10-29.md). El 1 de noviembre recreamos la copia en el equipo de grabación. Ese mismo día volvimos a desplegar `27ba058` en Azure con el pipeline normal desde `main`, [Actions #41346512876](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/41346512876), y cargamos allí los datos ficticios.

## Abrir la demostración en Azure

- Aplicación: <https://rentsmart-usm-viveros.chilecentral.cloudapp.azure.com>; inicio de sesión en `#sesion`.
- Credenciales ficticias: `.cache/demo-entrega2/cuentas-azure.txt`, en el equipo de grabación y excluido de Git. Las abrimos fuera de la grabación.
- Manifiesto sin secretos: `.cache/demo-entrega2/datos-azure.json`, con identificadores, SHA y resultado del ensayo.
- La sesión de producción dura 30 minutos: iniciamos sesión justo antes de cada segmento.

El catálogo público también conserva una publicación previa ajena a esta demostración. No la modificamos ni la usamos en el recorrido.

## Copia local de respaldo

- Aplicación: <http://127.0.0.1:18080>; inicio de sesión en <http://127.0.0.1:18080/#sesion>.
- Directorio local: `.cache/demo-entrega2/`, excluido de Git. Contiene el código exportado de `27ba058`, el `.env` de la copia, el lanzador `demo-compose`, el script de datos y el manifiesto `demo-datos.json`.
- Credenciales ficticias: `.cache/demo-entrega2/cuentas-demo.txt`, distintas de las de Azure.

Usamos el Compose de producción existente con el proyecto Docker exclusivo `rentsmart-demo-e2` y volúmenes propios. Caddy escucha solo en loopback por HTTP; backend y PostgreSQL no publican puertos del host. Los secretos de la copia se generaron de forma independiente. En esta copia la sesión dura 240 minutos (`AUTH_TOKEN_MINUTES`); producción conserva 30.

## Datos preparados y ensayo

Creamos los mismos datos en Azure y en la copia local mediante la API existente, sin modificar la base directamente:

| Elemento | Datos ficticios |
| --- | --- |
| Propietaria | Propietaria Demo E2; `propietario.e2@example.com` |
| Arrendatario | Arrendatario Demo E2; `arrendatario.e2@example.com` |
| Sala Demo CI | Sala de reuniones en Providencia; 8 personas; 10.000 CLP/h; 09:00–18:00 |
| Estudio Demo E2 | Sala multiuso en Ñuñoa; 12 personas; 15.000 CLP/h; 09:00–18:00 |
| Reserva próxima | Estudio Demo E2, 10 de noviembre de 2026, 10:00–12:00, pagada (30.000 CLP) |
| Ensayo del recorrido | Sala Demo CI, 3 de noviembre de 2026, 15:00–16:00: pago rechazado, reintento aprobado, cancelada por la propietaria y reembolsada (10.000 CLP) |

El ensayo HTTP del 1 de noviembre, ejecutado en ambos entornos, comprobó siete resultados:

- El rechazo permite reintentar.
- El pago aprobado deja la reserva pagada.
- La propietaria ve el pago con el nombre del arrendatario.
- La cancelación registra el reembolso.
- Repetir la cancelación desde el arrendatario devuelve el mismo resultado.
- Un espacio ajeno responde 404.
- La reserva del estudio queda pagada.

En un navegador, también en ambos entornos, comprobamos el inicio de sesión de la propietaria, el panel de reservas recibidas (la reserva pagada en próximas y la cancelada y reembolsada en historial) y las fotos del catálogo. No ejecutamos navegador automatizado como prueba, no agregamos pruebas E2E/UI ni sumamos el ensayo a Jest/Pytest.

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
