# Demostración local para el video de entrega 2 — REN-77

El 29 de octubre de 2026 preparamos inicialmente una copia de `ff19bc3`, el mismo SHA de la primera publicación HTTPS. Después ensayamos CA-05 con `9103718` y actualizamos al merge revisado `27ba0580232774fc65750c1974485381a1fcffa4` de PR #34. Es el mismo SHA publicado en Azure y verificado el 29 de octubre; todavía falta el video y el tag/Release final. Esta guía acompaña al [guion](guion-video-entrega-2.md); la grabación y su publicación siguen pendientes.

## Abrir la copia preparada

- Aplicación: <http://127.0.0.1:18080> en el equipo donde se preparó el proyecto.
- Inicio de sesión: <http://127.0.0.1:18080/#sesion>.
- Directorio local: `.cache/demo-entrega2/`, excluido de Git y con permisos 700.
- Credenciales ficticias: `.cache/demo-entrega2/cuentas-demo.txt`, permisos 600. Las abrimos fuera de la grabación. No son cuentas del VPS.
- Código actual: copia exportada de `27ba058`, independiente del checkout que se utiliza para documentar. Los cambios de rama del repositorio no alteran esa copia.

Usamos el Compose de producción existente con un proyecto Docker exclusivo, `rentsmart-demo-e2-y7mmicts`, y volúmenes propios. El frontend escucha únicamente en loopback; backend y PostgreSQL no publican puertos del host. La URL de demostración usa HTTP local. Para mostrar HTTPS público abrimos [RentSmart en Azure](https://rentsmart-usm-viveros.chilecentral.cloudapp.azure.com), su [versión](https://rentsmart-usm-viveros.chilecentral.cloudapp.azure.com/version.json) y su [readiness](https://rentsmart-usm-viveros.chilecentral.cloudapp.azure.com/api/health/ready).

## Datos preparados y resultado del ensayo

Creamos los datos mediante la API existente, sin modificar aplicación ni base directamente:

| Elemento | Datos ficticios |
| --- | --- |
| Propietaria | Propietaria Demo E2; `propietario.e2@example.com` |
| Arrendatario | Arrendatario Demo E2; `arrendatario.e2@example.com` |
| Espacio 1 | Sala Demo CI; 8 personas, 10.000 CLP/h, 09:00–18:00 |
| Espacio 2 | Estudio Demo E2; 8 personas, 15.000 CLP/h, 09:00–18:00 |
| Reservas iniciales | Una por espacio, 30 de octubre de 2026 de 10:00 a 12:00, ambas pagadas; preservadas en la actualización |
| Ensayo de CA-05 | Una reserva adicional de Sala Demo CI, 30 de octubre de 2026 de 15:00 a 16:00: pagada, cancelada por la propietaria y reembolsada de forma simulada |
| Importe | 20.000 CLP y 30.000 CLP respectivamente, pagos simulados |

Ensayamos por HTTP el rechazo de pago de Sala Demo CI, su reintento aprobado, la lectura persistida y la consulta del propietario filtrada por cada espacio. Verificamos nombre ficticio del arrendatario, importes y dos reservas recibidas. El manifiesto local `demo-datos.json` conserva sus identificadores, SHA y fecha, sin contraseñas ni tokens.

Las fechas y estados evolucionan con el reloj real. Al terminar el horario reservado, las reservas pagadas pasan al historial; no fijamos ni alteramos la hora del sistema. Para una grabación posterior creamos reservas nuevas desde la interfaz.

## Recorrido para grabar

1. Abrimos dos sesiones independientes de navegador, por ejemplo una normal y otra privada. En una iniciamos sesión como propietaria y en la otra como arrendatario con las credenciales locales.
2. **HU-14:** propietaria → Mis espacios → Consultar reservas. Mostramos las dos reservas, el nombre del arrendatario, estados, importes y filtro por publicación. Abrimos también Historial; puede estar vacío si ninguna reserva ha finalizado. La copia actual permite cancelar con confirmación y ya conserva una reserva cancelada/reembolsada para mostrar el historial. Antes de grabar comprobamos la revisión definitiva de la demostración y la revisión pública: PR #34 ya publicó CA-05 en el VPS con el mismo SHA.
3. **HU-16:** arrendatario → catálogo → Sala Demo CI → nueva reserva. Elegimos una fecha futura dentro de 90 días y un bloque libre dentro de 09:00–18:00; por ejemplo 13:00–14:00 del 30 de octubre solo si sigue siendo futuro y está libre al grabar.
4. Creamos la reserva justo antes del segmento de pago. El plazo real es de 15 minutos desde su creación o hasta su inicio, si ocurre antes. En Pagar reserva elegimos rechazo; mostramos que puede reintentarse. Luego aprobamos y mostramos estado, importe, fecha y referencia persistidos.
5. Volvemos al panel de la propietaria y actualizamos la consulta para mostrar el pago recibido. No reutilizamos una reserva ya pagada para representar un pago nuevo. Si una reserva expira, elegimos otro bloque y creamos una nueva.
6. Seguimos con las pestañas de Actions, Slack, Jira, PR y arquitectura indicadas en el guion. La demostración local de funciones y la comprobación pública de despliegue identifican sus respectivos entornos.

Este ensayo preparatorio utiliza solicitudes HTTP y las funcionalidades existentes. No ejecutamos navegador automatizado, no agregamos pruebas E2E/UI ni lo sumamos a los conteos de Jest/Pytest o a la cobertura. El recorrido de interfaz está preparado para ejecución manual por los integrantes, todavía no grabado.

## Iniciar, consultar y detener

Desde la raíz del repositorio, con Docker disponible:

```bash
.cache/demo-entrega2/demo-compose ps
.cache/demo-entrega2/demo-compose up -d --no-build --wait --wait-timeout 180 db backend frontend
bash scripts/verify-deployment.sh http://127.0.0.1:18080 27ba0580232774fc65750c1974485381a1fcffa4
```

Para detener sin borrar los datos:

```bash
.cache/demo-entrega2/demo-compose stop
```

El directorio y su lanzador se prepararon localmente; no llegan al clonar el repositorio. En otro equipo exportamos el mismo SHA, configuramos el Compose con un nombre de proyecto exclusivo, credenciales nuevas y puertos loopback libres, aplicamos migraciones y creamos los datos ficticios mediante registro, publicación y reserva de la aplicación. La [guía de despliegue](despliegue.md) y el [Compose existente](../compose.production.yaml) describen esos componentes.

Conservamos los volúmenes de esta demostración hasta terminar la grabación. La preparación deja los tres contenedores locales sanos y no crea cuentas ni reservas en el VPS. Los secretos de la copia local se generaron de forma independiente y permanecen fuera de Git.


## Actualización preparatoria de CA-05

Conservamos un respaldo previo de PostgreSQL en `.cache/demo-entrega2/respaldos/antes-ca05-2026-10-29.dump`, permisos 600. Verificamos la cabecera/listado y presencia de las tablas mediante `pg_restore --list`; esto no equivale a ensayar una restauración completa.

Exportamos el candidato sin copiar credenciales del repositorio ni modificar `main`/`develop`, construimos imágenes, aplicamos `0007_cancellation_audit`, ejecutamos Alembic check y esperamos los tres contenedores sanos. Conservamos las credenciales y los volúmenes existentes. Version/readiness identifican `9103718` y PostgreSQL conectado.

Ensayamos mediante HTTP real una reserva nueva de una hora, pago aprobado, cancelación del propietario y reembolso con referencia/importe conservados. La repetición desde la cuenta del arrendatario devolvió el mismo resultado; las dos reservas originales siguen pagadas. `demo-datos.json` y `ensayo-ca05.json` conservan la evidencia local sin tokens o contraseñas. No ejecutamos navegador automatizado ni sumamos este ensayo a Jest/Pytest.

El usuario confirmó inicialmente que faltaba el merge de PR #33; durante la preparación verificamos su integración mediante `66e5f87`. Incorporamos ese historial a la release. La [PR #34](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/pull/34) prepara su publicación revisada hacia `main`. No presentamos esta actualización local como despliegue público ni como video grabado.


## Misma revisión que la publicación de PR #34

Respaldamos nuevamente la base local en `.cache/demo-entrega2/respaldos/antes-main-27ba058-2026-10-29.dump` (600), verificamos formato/listado y exportamos `27ba058`. Construimos, aplicamos migraciones/check y esperamos los servicios sanos. Comprobamos versión/readiness, acceso de ambas cuentas y conservación de las dos reservas pagadas y la cancelada/reembolsada, sin crear otras reservas. El ensayo inicial de cancelación de `9103718` permanece identificado como histórico; `demo-datos.json` registra el SHA actual y `ensayo-ca05.json` conserva la comprobación de preservación tras actualizar a `main`.

La [evidencia pública](evidencias/REN-14-despliegue-ca05-2026-10-29.md) corresponde a ese mismo código. Antes de grabar reconfirmamos fecha/estados, revisión pública y acceso a evidencias; si los metadatos finales cambian el SHA, registramos la revisión mostrada y su relación con la entregada.
