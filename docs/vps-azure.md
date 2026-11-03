# VPS de Azure for Students — REN-84

Estado al **29 de octubre de 2026**. RentSmart está publicado en el VPS de entrega 2 mediante GitHub Actions, Docker Compose y Caddy. La [evidencia del primer despliegue](evidencias/REN-84-despliegue-2026-10-29.md) identifica ejecución, reintento, SHA y verificaciones independientes. El proveedor no es una exigencia del ramo: elegimos Azure for Students para aprovechar el crédito disponible del equipo.

## 1. Ambiente y acceso comprobados

| Dato | Estado |
| --- | --- |
| Suscripción, grupo y VM | Azure for Students; `rg-rentsmart`; `vm-rentsmart`, según la configuración proporcionada por el equipo |
| Región y tamaño elegidos | Chile Central; `Standard_B2ls_v2`, 2 vCPU y 4 GiB, según el portal |
| Sistema observado por SSH | Ubuntu 24.04.5 LTS, `x86_64`; aproximadamente 3,8 GiB de RAM y 61 GiB de disco del sistema |
| IPv4 y puerto SSH | `57.156.63.29`, TCP `22` |
| Administración | `rentsmartadmin`, con la clave administrativa descargada de Azure |
| Automatización | `rentsmartdeploy`, clave Ed25519 independiente y pertenencia al grupo `docker` |
| Docker observado | Engine/CLI `29.9.2`, Compose plugin `v5.6.1`, Buildx `v0.38.1` |
| Directorio de despliegue | `/opt/rentsmart`, con `shared` y `releases`, propiedad del usuario de despliegue |
| Configuración de aplicación | `shared/.env` con permisos `600`, `SITE_ADDRESS` confirmado y secretos nuevos generados dentro del servidor |
| DNS | `rentsmart-usm-viveros.chilecentral.cloudapp.azure.com` resuelve a `57.156.63.29` |
| URL verificada | [RentSmart](https://rentsmart-usm-viveros.chilecentral.cloudapp.azure.com), HTTPS público con versión/readiness comprobados |
| Revisión publicada | `27ba0580232774fc65750c1974485381a1fcffa4`, `main` revisado en PR #34; CA-05 y 0007 verificados |

El equipo contrastó mediante **Azure → Ejecutar comando → RunShellScript** la huella pública del servidor con la observada desde el cliente:

```text
ED25519 SHA256:oW9/WpaATiR1T+X3BSmdgTqlkr7Ll2R/pjF1lYV4y+A
```

Después iniciamos sesión con `StrictHostKeyChecking=yes`, `BatchMode=yes` e `IdentitiesOnly=yes`, utilizando un archivo exclusivo de hosts verificados. La clave administrativa local tiene permisos `600`. Conservamos la clave de automatización en `~/.ssh/rentsmart-deploy` y el host verificado en `~/.ssh/rentsmart-known-hosts`, fuera del repositorio. Nunca copiamos valores privados en este documento, Jira o el PR.

```bash
ssh -T -i ~/.ssh/rentsmart-deploy \
  -o IdentitiesOnly=yes -o BatchMode=yes -o StrictHostKeyChecking=yes \
  -o UserKnownHostsFile=~/.ssh/rentsmart-known-hosts \
  rentsmartdeploy@57.156.63.29
```

La cuenta de automatización no pertenece a `sudo`; su acceso a Docker otorga privilegios amplios sobre el host. Su clave pública usa la opción `restrict` de OpenSSH para deshabilitar forwarding y terminal interactiva, conservando la ejecución de comandos y transferencia necesarias para el pipeline. La administración se realiza con la cuenta separada.

## 2. Preparación ejecutada

1. Consultamos distribución, arquitectura, RAM, disco, privilegios y listeners. No había Docker ni servicios en 80/443.
2. Instalamos Docker desde su repositorio APT oficial para Ubuntu Noble/amd64, con clave de firma, Engine, CLI, containerd, Buildx y Compose. Habilitamos los servicios Docker/containerd al arrancar. No ejecutamos una actualización general ni reemplazamos un proxy existente.
3. Creamos el usuario y la clave exclusivos de automatización. Probamos SSH con esa identidad y ejecutamos `docker version`, `docker compose version` y `docker run --rm hello-world` **sin sudo**. El contenedor temporal terminó y se eliminó correctamente.
4. Creamos los directorios de despliegue y `shared/.env` sin sobrescribir archivos anteriores. Generamos los dos secretos dentro del VPS y, después de verificar el DNS, completamos únicamente `SITE_ADDRESS`, conservando esos secretos y permisos `600`.
5. Comprobamos desde el equipo de trabajo los puertos TCP 80 y 443 con una sonda temporal de texto fijo. Respondieron ambos y cerramos los listeners. La sonda no prueba TLS ni publica la aplicación; tampoco permite deducir qué NSG está asociado en Azure.
6. Configuramos las variables no secretas `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_PORT`, `DEPLOY_ROOT` y `DEPLOY_URL` del repositorio, y dejamos **`DEPLOY_ENABLED=false`**. Después de la configuración por el propietario, verificamos `production`, su regla exclusiva para `main` y los nombres de los dos secretos SSH; su contenido sigue pendiente de validación durante la conexión del pipeline.

### Smoke real en el VPS

Transferimos mediante `git archive` exclusivamente el código versionado y revisado de `8b76c3335e7c28abf8f37d4f7c67edcc4d51f0bf` (`develop`, PR #26 integrado) a un directorio temporal del VPS. Ejecutamos como `rentsmartdeploy`:

```bash
bash scripts/smoke-production.sh 8b76c3335e7c28abf8f37d4f7c67edcc4d51f0bf
```

El comando terminó con código **0** y confirmó **«Smoke aprobado: build, migraciones, proxy, SPA, versión y persistencia»**. Comprobó las imágenes, configuración Caddy, Alembic upgrade/check, healthchecks, API/PostgreSQL, fallback de SPA, respuesta 404 de API y rechazo de un SHA incorrecto. Recreó los contenedores y comprobó que persistiera el dato de prueba.

La ejecución utilizó un proyecto `rentsmart-smoke-*`, secretos aleatorios y puertos asignados en **127.0.0.1**. Su limpieza eliminó sus contenedores, red, volúmenes e imágenes de aplicación, y retiramos el directorio de código temporal. No utilizó `shared/.env`, no creó `current` y no ejecutó el job `deploy`. Es evidencia real de compatibilidad del VPS/Docker/Compose con la infraestructura revisada; no acredita HTTPS público, despliegue automático o aceptación E2E/UI. Conservamos el log de trabajo local fuera del repositorio; el resultado y SHA quedan registrados aquí y en Testing de Jira.

## 3. Nombre DNS de Azure

El equipo eligió el nombre asociado a la IP pública de Azure. No necesitamos contratar un dominio ni crear una zona de Azure DNS para esta opción:

1. Abrimos la VM y su recurso **IP pública**.
2. En **Configuración → Etiqueta de nombre DNS**, indicamos una etiqueta disponible y guardamos.
3. Copiamos el **nombre DNS completo mostrado por Azure**; puede contener un segmento adicional de ámbito/reutilización. No lo reconstruimos concatenando la etiqueta y la región.
4. Comprobamos que ese nombre resuelve a la IPv4 del VPS antes de completar `SITE_ADDRESS` y `DEPLOY_URL`.

La primera dirección comunicada todavía no resolvía durante la consulta inicial. El equipo confirmó después que guardó los cambios y verificamos la resolución pública IPv4 de `rentsmart-usm-viveros.chilecentral.cloudapp.azure.com` hacia `57.156.63.29`. Completamos `SITE_ADDRESS` y `DEPLOY_URL`; la resolución no acredita disponibilidad de HTTPS ni de la aplicación.

## 4. GitHub y activación

**Configuración actual comprobada:** el ambiente `production` existe, con selección explícita por nombre de rama y una única regla: `main`, tipo `branch`. Los secretos `SSH_PRIVATE_KEY` y `SSH_KNOWN_HOSTS` están configurados y el segundo intento validó la conexión SSH. No hay variables de ambiente que sobrescriban las seis variables de repositorio consultadas; sus valores coinciden con el VPS y `DEPLOY_ENABLED=true`.

La consulta de metadatos no revela ni valida valores de secretos. El primer intento demostró esa limitación y el segundo comprobó realmente autenticación y host SSH. Antes de preparar la release `main` todavía no contenía `deploy`; PR #28 incorporó el workflow revisado y su publicación conserva el SHA.

La cuenta conectada `JoacoCajo` conserva escritura, sin administración. GitHub había respondido **HTTP 403: Must have admin rights to Repository** al intentar crear el ambiente y pedimos al propietario configurarlo en **Settings → Environments → production → Deployment branches and tags → Selected branches and tags → rama `main`**. El repositorio pertenece a una cuenta personal: no existe un rol Admin delegable a otro colaborador; el propietario realizó la configuración necesaria sin trasladar el proyecto a una organización.

El usuario coordinó el paso con Jorge; no se enviaron mensajes al compañero desde herramientas. Conservamos estos comandos de carga/rotación para una sesión administrativa autorizada, ejecutados en el equipo donde se guardaron los archivos; **no los ejecutamos con la cuenta sin administración**:

```bash
gh secret set SSH_PRIVATE_KEY --env production \
  --repo JorgeJaceval/Pruebas-De-Software-RentSmart < ~/.ssh/rentsmart-deploy
gh secret set SSH_KNOWN_HOSTS --env production \
  --repo JorgeJaceval/Pruebas-De-Software-RentSmart < ~/.ssh/rentsmart-known-hosts
```

Estos comandos envían archivos al almacén de secretos de GitHub sin imprimirlos. No usamos la clave administrativa de Azure para el pipeline. Si el propietario trabaja en otro equipo, coordinamos un mecanismo protegido para cargar la clave dedicada; no copiamos su contenido al chat, Jira o repositorio.

La selección por nombre de rama no equivale a protección de `main`: la consulta actual devolvió `protected=false`. No modificamos protecciones de ramas. Tampoco usamos «Protected branches only» como sustituto: GitHub permite todas las ramas si no existe ninguna protegida. El workflow conserva además su condición explícita de `main` y dependencias `quality`/`production`.

Una revisión automática inicial rechazó la creación del ambiente al interpretar el selector de políticas como una relajación de seguridad. Contrastamos su significado con la documentación oficial y comprobamos el estado del repositorio antes de reintentar con la lista explícita de `main`; GitHub rechazó esa operación por falta de permisos. No creamos un ambiente alternativo ni cambiamos el contrato de secretos para eludirlo.

DNS, `SITE_ADDRESS`, URL y ambiente están configurados. PR #28 quedó integrado en `main` y, después de corregir la carga del secreto, publicamos esa revisión mediante el segundo intento del workflow. Verificamos Actions, SSH, HTTPS, `/version.json` y `/api/health/ready`, siguiendo [la guía de despliegue](despliegue.md). El tag y GitHub Release finales siguen pendientes de los entregables de REN-77.

### Incidencia del primer intento y corrección

PR #28 quedó aprobado e integrado en `main` mediante `ff19bc37918b10402779c9f8647798b6eff707d6`, con su CI normal aprobada. Activamos el workflow desde esa revisión en [#40944029052](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/40944029052): aprobaron suites y smoke, pero `deploy` falló durante la lectura de `SSH_PRIVATE_KEY`, con `error in libcrypto`, antes de conectar al VPS. Slack notificó el fallo real y restauramos `DEPLOY_ENABLED=false`.

El archivo dedicado local era válido y autenticaba por SSH. Confirmamos que ese intento no creó una release ni contenedores de producción. El usuario confirmó que reemplazó el secreto con la clave completa; comprobamos su actualización y repetimos los jobs necesarios con `DEPLOY_ENABLED=true`. El intento 2 terminó aprobado y creó la publicación verificada. Conservamos el fallo original como historial, sin imprimir claves ni cambiar la validación del workflow.

## 5. Incidencia de regiones y límites

Azure rechazó el intento en Central US con `InvalidTemplateDeployment` y `RequestDisallowedByAzure`: la política limitaba las regiones de la suscripción. El equipo consultó **Azure Policy → Asignaciones → Allowed resource deployment regions → Parámetros** y obtuvo `northcentralus`, `westus2`, `southafricanorth`, `brazilsouth` y `chilecentral`. Cambiamos a Chile Central y recreamos la selección de red/tamaño. Esta lista corresponde a esta cuenta, no a todas las cuentas estudiantiles.

El precio comunicado por el portal para B2ls_v2 fue USD 0,0582/h, aproximadamente USD 41,90 por 720 horas de cómputo; disco, IP y otros recursos pueden consumir crédito adicional. Es una estimación del formulario, no una factura ni garantía de saldo. No modificamos el apagado automático, el firewall de Azure o el plan de facturación desde SSH.

Mantenemos esta preparación dentro de entrega 2. No implementamos HU-15 ni pruebas E2E/UI de entrega 3. La [lista de cierre](cierre-entrega-2.md) conserva Wiki, video, despliegue y release como entregables distintos.

Referencias: [Docker en Ubuntu](https://docs.docker.com/engine/install/ubuntu/), [permisos de Docker](https://docs.docker.com/engine/install/linux-postinstall/), [nombre DNS de la VM](https://learn.microsoft.com/en-us/azure/virtual-machines/create-fqdn), [Run Command](https://learn.microsoft.com/en-us/azure/virtual-machines/linux/run-command), [restricciones de despliegue de GitHub](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments).

La actualización de CA-05 del 29 de octubre quedó publicada por PR #34 y Actions #40967124896. [Registramos respaldo previo, migración, salud y revisión pública](evidencias/REN-14-despliegue-ca05-2026-10-29.md); el historial del primer despliegue de PR #28 permanece conservado.
