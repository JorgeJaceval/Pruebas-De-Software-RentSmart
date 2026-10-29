# Demostración local para el video de entrega 2 — REN-77

El 29 de octubre de 2026 preparamos una copia local del código revisado `ff19bc37918b10402779c9f8647798b6eff707d6`, el mismo SHA de la primera publicación HTTPS. Esta guía acompaña al [guion](guion-video-entrega-2.md); la grabación y su publicación siguen pendientes.

## Abrir la copia preparada

- Aplicación: <http://127.0.0.1:18080> en el equipo donde se preparó el proyecto.
- Inicio de sesión: <http://127.0.0.1:18080/#sesion>.
- Directorio local: `.cache/demo-entrega2/`, excluido de Git y con permisos 700.
- Credenciales ficticias: `.cache/demo-entrega2/cuentas-demo.txt`, permisos 600. Las abrimos fuera de la grabación. No son cuentas del VPS.
- Código: copia exportada de `ff19bc3`, independiente del checkout que se utiliza para documentar. Los cambios de rama del repositorio no alteran esa copia.

Usamos el Compose de producción existente con un proyecto Docker exclusivo, `rentsmart-demo-e2-y7mmicts`, y volúmenes propios. El frontend escucha únicamente en loopback; backend y PostgreSQL no publican puertos del host. La URL de demostración usa HTTP local. Para mostrar HTTPS público abrimos [RentSmart en Azure](https://rentsmart-usm-viveros.chilecentral.cloudapp.azure.com), su [versión](https://rentsmart-usm-viveros.chilecentral.cloudapp.azure.com/version.json) y su [readiness](https://rentsmart-usm-viveros.chilecentral.cloudapp.azure.com/api/health/ready).

## Datos preparados y resultado del ensayo

Creamos los datos mediante la API existente, sin modificar aplicación ni base directamente:

| Elemento | Datos ficticios |
| --- | --- |
| Propietaria | Propietaria Demo E2; `propietario.e2@example.com` |
| Arrendatario | Arrendatario Demo E2; `arrendatario.e2@example.com` |
| Espacio 1 | Sala Demo CI; 8 personas, 10.000 CLP/h, 09:00–18:00 |
| Espacio 2 | Estudio Demo E2; 8 personas, 15.000 CLP/h, 09:00–18:00 |
| Reservas iniciales | Una por espacio, 30 de octubre de 2026 de 10:00 a 12:00, ambas pagadas |
| Importe | 20.000 CLP y 30.000 CLP respectivamente, pagos simulados |

Ensayamos por HTTP el rechazo de pago de Sala Demo CI, su reintento aprobado, la lectura persistida y la consulta del propietario filtrada por cada espacio. Verificamos nombre ficticio del arrendatario, importes y dos reservas recibidas. El manifiesto local `demo-datos.json` conserva sus identificadores, SHA y fecha, sin contraseñas ni tokens.

Las fechas y estados evolucionan con el reloj real. Al terminar el horario reservado, las reservas pagadas pasan al historial; no fijamos ni alteramos la hora del sistema. Para una grabación posterior creamos reservas nuevas desde la interfaz.

## Recorrido para grabar

1. Abrimos dos sesiones independientes de navegador, por ejemplo una normal y otra privada. En una iniciamos sesión como propietaria y en la otra como arrendatario con las credenciales locales.
2. **HU-14:** propietaria → Mis espacios → Consultar reservas. Mostramos las dos reservas, el nombre del arrendatario, estados, importes y filtro por publicación. Abrimos también Historial; puede estar vacío si ninguna reserva ha finalizado. La copia inicial ff19bc3 muestra la cancelación deshabilitada. Para grabar el CA-05 completado, actualizamos primero la copia a una revisión aprobada que incluya esa ampliación y volvemos a comprobar migraciones, SHA y datos; no mostramos el comportamiento antiguo como evidencia del criterio nuevo.
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
bash scripts/verify-deployment.sh http://127.0.0.1:18080 ff19bc37918b10402779c9f8647798b6eff707d6
```

Para detener sin borrar los datos:

```bash
.cache/demo-entrega2/demo-compose stop
```

El directorio y su lanzador se prepararon localmente; no llegan al clonar el repositorio. En otro equipo exportamos el mismo SHA, configuramos el Compose con un nombre de proyecto exclusivo, credenciales nuevas y puertos loopback libres, aplicamos migraciones y creamos los datos ficticios mediante registro, publicación y reserva de la aplicación. La [guía de despliegue](despliegue.md) y el [Compose existente](../compose.production.yaml) describen esos componentes.

Conservamos los volúmenes de esta demostración hasta terminar la grabación. La preparación deja los tres contenedores locales sanos y no crea cuentas ni reservas en el VPS. Los secretos de la copia local se generaron de forma independiente y permanecen fuera de Git.
