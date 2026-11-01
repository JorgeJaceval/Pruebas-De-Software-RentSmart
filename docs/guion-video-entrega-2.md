# Guion de la cápsula de entrega 2

**Material de preparación; video todavía no grabado ni publicado.** Somos Jorge Aceval y Joaquín Viveros. El guion cubre lo que la pauta pide para la cápsula: alcances de la herramienta, trabajo realizado y dependencias entre herramienta y aplicación, uso del pipeline, problemas y soluciones, e infraestructura y su relación con las pruebas. Proponemos unos nueve a diez minutos; la pauta no fija una duración. El reparto de voces es una sugerencia.

## Antes de grabar

1. **Grabamos antes del 8 de noviembre de 2026 a las 17:20 (Santiago)** si mostramos los reportes descargables de [#41346512876](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/41346512876). Los de la sonda y la ejecución normal de Slack vencen antes, el 4 de noviembre a las 21:50. Después siguen disponibles los logs y los resúmenes.
2. Grabamos la demostración funcional en la [aplicación publicada en Azure](https://rentsmart-usm-viveros.chilecentral.cloudapp.azure.com), con los [datos ficticios preparados](demo-video-entrega-2.md). Las credenciales están en `.cache/demo-entrega2/cuentas-azure.txt`, fuera de Git; no las mostramos en pantalla. La copia local queda como respaldo.
3. Iniciamos sesión justo antes de grabar, en dos ventanas independientes: la propietaria en una normal y el arrendatario en una privada. En producción la sesión dura 30 minutos; si vence, volvemos a iniciarla.
4. Creamos la reserva nueva durante la escena 5, no antes: el plazo de pago es de 15 minutos. Elegimos un bloque futuro libre de Sala Demo CI, por ejemplo 6 de noviembre de 11:00 a 13:00.
5. Abrimos las pestañas en este orden:
   - [Wiki Entrega-2](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/wiki/Entrega-2) y [Arquitectura](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/wiki/Arquitectura).
   - [`ci.yml`](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/main/.github/workflows/ci.yml), [`compose.production.yaml`](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/main/compose.production.yaml) y [`Caddyfile`](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/main/frontend/Caddyfile).
   - [Actions #41346512876](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/41346512876), despliegue de `27ba058` del 1 de noviembre.
   - Aplicación en Azure: propietaria y arrendatario.
   - [Sonda #40796674640](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/40796674640), [ejecución normal #40796675009](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/40796675009) y [Run workflow](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/workflows/ci.yml).
   - Canal `#rentsmart-ci` en Slack.
   - [Despliegue #40944029052, intento 1](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/40944029052/attempts/1) e [intento 2](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/40944029052/attempts/2).
   - [Aplicación pública](https://rentsmart-usm-viveros.chilecentral.cloudapp.azure.com), [versión](https://rentsmart-usm-viveros.chilecentral.cloudapp.azure.com/version.json) y [readiness](https://rentsmart-usm-viveros.chilecentral.cloudapp.azure.com/api/health/ready).
   - [Tablero Jira](https://rentsmartpsf.atlassian.net/browse/REN-74) y [lista de PR](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/pulls?q=is%3Apr+is%3Aclosed).
6. Cerramos `.env`, Settings → Secrets y terminales con credenciales. Comprobamos audio y legibilidad.

## Guion

### Escena 1 · 0:00–0:40 · Presentación — Jorge

**Pantalla:** Wiki, página Entrega 2.

> Hola, somos Jorge Aceval y Joaquín Viveros, y este es RentSmart, una aplicación para arrendar espacios entre particulares. En la entrega 1 construimos el MVP: cuentas, publicación de espacios, catálogo, detalle, horarios y reservas. En esta entrega llevamos el proyecto a un flujo de integración y despliegue continuo, y sumamos dos requerimientos: la consulta de reservas recibidas del propietario, la HU-14, y el pago simulado, la HU-16.

### Escena 2 · 0:40–1:40 · La herramienta y sus alcances — Jorge

**Pantalla:** repositorio, `ci.yml` y pestaña Actions.

> La pauta propone Jenkins, pero admite otras herramientas como GitHub Actions, y esa fue la que elegimos. Ya la usábamos en la entrega 1 y vive junto al código. En la práctica, GitHub dispara el pipeline directamente con cada push o pull request hacia develop y main: no necesitamos instalar un servidor Jenkins, configurar un webhook ni exponerlo con Ngrok. El resultado de cada ejecución queda asociado al commit y al PR, en verde o en rojo.
>
> Actions nos da runners Ubuntu temporales, servicios como PostgreSQL dentro del job, artefactos, resúmenes, ambientes protegidos y secretos. Lo que no hace por sí sola es desplegar ni avisar al equipo: eso lo construimos con scripts versionados en el repositorio. También tiene límites: los runners no guardan nada entre ejecuciones y los artefactos duran siete días.

### Escena 3 · 1:40–2:50 · Infraestructura — Jorge

**Pantalla:** Wiki Arquitectura, `compose.production.yaml` y `Caddyfile`.

> La infraestructura está en cuatro lugares. En el equipo de desarrollo levantamos todo con Docker Compose: React con Vite, FastAPI y PostgreSQL. En los runners de GitHub corren Node 24, Python 3.12 y un PostgreSQL 17 temporal para las pruebas. Slack recibe los avisos mediante un Incoming Webhook. Y producción es una máquina virtual Ubuntu 24.04 en Azure, región Chile Central, con Docker y Compose.
>
> En producción hay tres contenedores. Caddy es el único que expone puertos, el 80 y el 443: sirve el build de React con HTTPS y reenvía `/api` a FastAPI, que se conecta a PostgreSQL. Ni la API ni la base son accesibles desde fuera. Los datos y certificados quedan en volúmenes, y las claves de la aplicación están en un `.env` del servidor con permisos 600, fuera del repositorio.

### Escena 4 · 2:50–4:10 · El pipeline y su relación con las pruebas — Jorge

**Pantalla:** jobs de `ci.yml`; en #41346512876, grafo de jobs, resumen de `quality`, artefactos y log del smoke.

> El workflow se llama Pruebas RentSmart y tiene seis jobs. Frontend instala con `npm ci`, compila con TypeScript y Vite y ejecuta Jest. Backend instala con `uv sync --frozen`, aplica las migraciones de Alembic sobre un PostgreSQL limpio, verifica que modelos y esquema coincidan y ejecuta Pytest. Los dos corren en paralelo y guardan sus reportes como artefactos.
>
> Después viene `quality`, nuestra compuerta: solo aprueba si frontend y backend terminaron en success. Un fallo, una cancelación o un job omitido la dejan en rojo. `production` construye las mismas imágenes que vamos a publicar y hace un smoke: migraciones, proxy, la aplicación, el SHA de `version.json` y que los datos sobrevivan al recrear los contenedores. `deploy` solo corre en main, después de esos dos y con el despliegue habilitado; en PR y en develop aparece omitido a propósito. Al final, `notify` avisa a Slack siempre, falle lo que falle.
>
> Así se relacionan la infraestructura y las pruebas: el backend se prueba contra un PostgreSQL real, con las mismas migraciones que producción, y lo que se publica es exactamente lo que pasó el smoke. Esta es la última ejecución sobre main, que volvió a desplegar la versión actual, el commit 27ba058: 150 pruebas de Jest y 165 de Pytest aprobadas, más 26 comprobaciones de infraestructura que contamos por separado, y el despliegue verificado.

### Escena 5 · 4:10–5:30 · HU-16, pago simulado — Joaquín

**Pantalla:** arrendatario: Explorar catálogo → Sala Demo CI → Ver espacio → Solicitar reserva → Pagar reserva.

> Esta demostración la hacemos en la aplicación publicada en Azure, con datos ficticios. Con la cuenta del arrendatario entro a Explorar catálogo, abro Sala Demo CI y elijo una fecha y un horario libres. Al solicitar la reserva queda pendiente de pago: el horario se bloquea por quince minutos o hasta que empiece.
>
> Entro a Pagar reserva. Como dice la pantalla, es una simulación: no hay movimiento de dinero ni pedimos datos de tarjeta. Primero elijo rechazar el pago y lo confirmo… y el sistema me deja reintentar mientras el plazo siga vigente. Ahora elijo aprobar: la reserva queda pagada, con su importe, fecha y referencia.
>
> El importe y el plazo los decide el backend, no el navegador. Pago y reserva se guardan en una sola transacción, y si el pago se aprueba dos veces se conserva el mismo registro. Para esta historia agregamos 22 pruebas de backend y 21 de frontend.

### Escena 6 · 5:30–6:50 · HU-14, reservas recibidas y cancelación — Joaquín

**Pantalla:** propietaria: Mis espacios → Ver todas las reservas recibidas → Actualizar reservas recibidas → Filtrar por espacio → Cancelar reserva → Confirmar cancelación → Historial.

> En la otra sesión está la propietaria. Desde Mis espacios abro sus reservas recibidas y actualizo. Aquí ve sus arriendos: el arrendatario, la fecha y el horario en hora de Santiago, el precio contratado, el total y el pago simulado; la reserva que acabamos de pagar ya aparece aprobada. Puedo filtrar por espacio y separar próximas e historial.
>
> Cada propietario ve solo las reservas de sus espacios. Si alguien consulta un espacio ajeno, recibe el mismo 404 que para uno inexistente, y no mostramos el correo del arrendatario.
>
> También completamos el criterio de cancelación. Al usar Cancelar reserva, la confirmación muestra el espacio y el horario, y avisa que se registrará un reembolso simulado. Confirmo… La reserva pasa al historial como cancelada, el pago queda reembolsado y el horario vuelve a estar disponible. En el backend la cancelación queda auditada con su autor y su fecha. En total, HU-14 sumó 29 pruebas de backend y 31 de frontend.

### Escena 7 · 6:50–7:50 · Fallo controlado y Slack — Joaquín

**Pantalla:** Run workflow con el selector `failure_probe`, sin ejecutarlo; sonda #40796674640; normal #40796675009; canal `#rentsmart-ci`.

> Para comprobar que el pipeline frena cuando algo falla, agregamos una sonda a la ejecución manual: al lanzar el workflow se puede elegir `failure_probe`. Esta ejecución usó la sonda de frontend. Las pruebas aprobaron; lo que falla es un paso artificial al final. Con eso `quality` queda en rojo, `production` y `deploy` se omiten, y `notify` igual se ejecuta.
>
> En el canal rentsmart-ci están los dos avisos: ÉXITO de la ejecución normal y FALLO de la sonda, que aclara que fue un fallo artificial después de las pruebas. Cada mensaje trae la rama, el SHA, el estado de cada etapa y el botón Ver ejecución. La URL del webhook es un secreto del repositorio, y el script nunca la imprime en los logs.

### Escena 8 · 7:50–8:40 · Despliegue real y verificación — Jorge

**Pantalla:** #40944029052, intento 1 con el error e intento 2 aprobado; aplicación pública, `version.json` y readiness.

> El despliegue lo hace `deploy-ssh.sh`. Se conecta por SSH con un usuario dedicado sin sudo, verificando la huella del servidor. Envía el código del commit aprobado, construye las imágenes, aplica las migraciones antes de reemplazar los servicios y consulta la URL pública para confirmar el SHA y la conexión con la base.
>
> Este fue el primer despliegue. En el intento 1 las pruebas pasaron, pero `deploy` falló con "error in libcrypto": el secreto con la clave SSH no se podía interpretar. No cambiamos el workflow ni el servidor. Volvimos a cargar la clave completa, con sus saltos de línea, y el intento 2 publicó el mismo commit. Ese rojo sí fue un fallo real, a diferencia de la sonda.
>
> Esta es la aplicación publicada por HTTPS, la misma que usamos en la demostración: `version.json` muestra el commit 27ba058 y readiness confirma la base conectada.

### Escena 9 · 8:40–9:40 · Problemas, metodología y cierre — Jorge y Joaquín

**Pantalla:** Problemas y soluciones en la Wiki; tablero Jira con REN-74; lista de PR.

**Jorge:**

> Además de la clave, tuvimos otros problemas. Azure for Students no permitía crear la máquina en Central US por política de la suscripción, así que usamos Chile Central. La cuenta de Joaquín tenía permiso de escritura pero no de administración, y GitHub respondió 403 al crear el ambiente production; lo configuró el propietario del repositorio. El frontend en Docker usaba el servidor de desarrollo, y lo cambiamos por un build multietapa servido por Caddy. Por último, una primera versión de la compuerta podía dejar pasar un job omitido; por eso `quality` exige success explícito en ambos.

**Joaquín:**

> Trabajamos con Kanban en Jira. El epic REN-74 agrupa las tareas de CI/CD, y cada rama, commit y PR lleva su clave, por ejemplo feature/REN-16-pago-simulado. Seguimos GitFlow: las features van a develop, las releases a main, y todo se integra mediante pull requests revisados. La documentación completa está en la Wiki, en la página Entrega 2. Quedan fuera de esta entrega la cancelación desde el lado del arrendatario, que es la HU-15, y las pruebas end-to-end con Playwright, que corresponden a la entrega 3. Gracias.

## Cobertura de la pauta

| Contenido pedido para la cápsula | Escenas |
| --- | --- |
| Alcances de la herramienta | 2 |
| Trabajo realizado: proyecto | 1, 5, 6 |
| Dependencias entre herramienta y aplicación | 3, 4, 8 |
| Uso de la herramienta de CI/CD | 4, 7, 8 |
| Problemas encontrados y soluciones | 8, 9 |
| Infraestructura y relación con las pruebas | 3, 4 |

## Ficha que completamos al publicar

| Dato | Registro pendiente |
| --- | --- |
| URL del video de entrega 2 | Pendiente de grabación y publicación |
| Fecha y duración real | Pendientes |
| SHA y entorno de la demostración funcional | Preparado: Azure con `27ba058` y datos ficticios; reconfirmar al grabar |
| SHA público y ejecución de despliegue mostrados | Referencia actual: `27ba058`, #41346512876 del 1 de noviembre; reconfirmar al grabar |
| Acceso del evaluador | Pendiente de comprobar con otra sesión |
| Enlaces incorporados en README, Wiki y notas | Pendientes después de disponer de la URL real |

## Al terminar

Publicamos el archivo con acceso para el evaluador, por ejemplo como video no listado, y comprobamos el enlace desde una sesión sin cuenta. Incorporamos esa URL en README, Wiki y notas de versión y completamos la ficha. La grabación no se marca completada por disponer de este guion.
