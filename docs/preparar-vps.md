# Cómo obtener los datos del VPS — REN-84

Necesitaremos estos datos **antes de conectar el servidor y activar `DEPLOY_ENABLED` para la primera publicación**. Podemos preparar y revisar la documentación de REN-77 mientras tanto. El 28 de octubre de 2026 el equipo confirmó que todavía no dispone de esta información; no hemos conectado ni publicado RentSmart en un VPS.

La pauta no obliga a contratar un proveedor específico. Primero identificamos un servidor existente del equipo o institución; si no existe uno disponible, definimos el ambiente antes de continuar con REN-84. Tener Docker en el computador de desarrollo no significa disponer de un VPS accesible desde GitHub Actions.

## 1. Identificar servidor y host/IP

Entramos al panel del proveedor, servicio de infraestructura o plataforma de la institución y buscamos el servidor asignado. En su ficha anotamos:

- Nombre/identificador del servidor y sistema operativo.
- **IPv4 pública** o hostname SSH accesible desde Internet.
- Método de acceso inicial: consola web o conexión SSH indicada por el administrador.

La IPv4 pública debe proceder del panel o del administrador. Una dirección privada como `192.168.x.x`, `10.x.x.x` o `172.16.x.x`–`172.31.x.x` no identifica por sí sola un destino accesible desde el runner. La implementación actual acepta hostname o IPv4; no acepta IPv6 literal.

## 2. Obtener usuario y puerto SSH

El panel o administrador suele indicar el usuario inicial. Desde la **consola del servidor**, no la terminal del computador personal, comprobamos:

```bash
whoami
cat /etc/os-release
```

`whoami` identifica la cuenta actual. Si la consola entra como `root`, todavía debemos definir el usuario que usaremos para desplegar; no asumimos que sea el usuario del computador local.

Para consultar los puertos configurados de OpenSSH en un servidor Linux con permisos administrativos:

```bash
sudo /usr/sbin/sshd -T | awk '$1 == "port" {print $2}'
sudo ss -ltnp
```

`sshd -T` valida y muestra la configuración efectiva; el filtro imprime únicamente el puerto. `ss` permite comprobar dónde está escuchando el proceso. El administrador debe confirmar también el puerto **externo** y las reglas de acceso del proveedor: si hay redirección/NAT, el puerto publicado puede diferir del interno. No cambiamos SSH ni el firewall durante esta consulta.

Cuando tengamos host/usuario/puerto y el método de autenticación autorizado, probamos desde el computador de trabajo:

```bash
ssh -p PUERTO USUARIO@HOST
```

Antes de aceptar la identidad del host contrastamos su huella con la consola o administrador. Para un host que use Ed25519, la consola puede mostrar su huella pública con:

```bash
sudo ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
```

Si ese archivo no existe, pedimos la huella del tipo de clave usado por ese servidor. La huella pública no es una clave privada. No necesitamos compartir contraseñas o claves privadas por chat para identificar el ambiente.

## 3. Comprobar Docker y Compose

Conectados **como el usuario previsto de despliegue**, ejecutamos:

```bash
docker version
docker compose version
docker info
```

Necesitamos respuesta tanto del cliente como del daemon y permiso para ejecutar Docker sin interacción. Si aparece permiso denegado, falta habilitar el acceso de ese usuario; que Docker funcione solo con otra cuenta no lo demuestra. El permiso de administrar Docker otorga control amplio sobre los contenedores y el host, por lo que lo prepara el administrador del servidor.

Si no está instalado, conservamos la distribución/versión de `/etc/os-release` y seguimos después el [procedimiento oficial de Docker para esa distribución](https://docs.docker.com/engine/install/). RentSmart requiere Docker Engine y Compose plugin v2.24 o superior. No ejecutamos una instalación genérica antes de conocer el sistema y sus permisos.

## 4. Elegir dominio y comprobar DNS

Elegimos un dominio o subdominio que el equipo o institución pueda administrar, por ejemplo `rentsmart.example.org` como **ejemplo**, no como dirección real del proyecto. En el panel DNS correspondiente configuraremos su registro A hacia la IPv4 pública del VPS. Un registro AAAA solo corresponde si el servidor realmente admite y publica IPv6.

Podemos revisar la resolución IPv4 desde una terminal Linux:

```bash
getent ahostsv4 DOMINIO_REAL
```

Anotamos el dominio y la URL prevista `https://DOMINIO_REAL`. Con Caddy necesitamos DNS correcto, puertos TCP 80/443 accesibles y almacenamiento persistente para certificados. Hasta comprobarlo, no presentamos esa URL como una aplicación publicada.

## 5. Revisar si ya existe un proxy HTTPS

En el VPS, con permisos de consulta:

```bash
sudo ss -ltnp '( sport = :80 or sport = :443 )'
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}'
```

Anotamos si hay Nginx, Caddy, Traefik u otro servicio ocupando esos puertos, y qué aplicación utiliza. No detenemos ni reemplazamos un proxy existente. Si lo hay, definimos con su administrador cómo integrar RentSmart antes de activar el Compose preparado. Si no aparece un listener, aún debemos confirmar las reglas de firewall/red del proveedor.

## 6. Datos para compartir y siguiente configuración

Completa solo los datos conocidos; `pendiente` es un valor válido mientras los obtienes:

```text
Servidor/proveedor o institución:
Distribución Linux y versión:
Host o IPv4 pública:
Usuario SSH de despliegue:
Puerto SSH externo:
Dominio y URL prevista:
Docker funciona con ese usuario sin sudo: sí / no / pendiente
Versión de Docker Compose:
Proxy existente en 80/443: ninguno / nombre / pendiente
DNS y acceso externo a 80/443: confirmados / pendiente
```

Después prepararemos el directorio exclusivo de RentSmart, `shared/.env`, la clave SSH dedicada y el host verificado en los secretos de GitHub, siguiendo [la guía de despliegue](despliegue.md). El chat puede recibir la ficha anterior; contraseñas, claves privadas, `AUTH_SECRET_KEY` y secretos se guardan por sus mecanismos protegidos.

**Esta guía consulta/prepara información; no instala servicios, no abre puertos ni publica la aplicación automáticamente.** Cuando iniciemos REN-84 volveremos a señalar qué dato falta y qué comprobación necesitamos antes de la activación.

Referencias: [Docker Engine](https://docs.docker.com/engine/install/), [OpenSSH `sshd`](https://man.openbsd.org/sshd.8), [requisitos de HTTPS automático de Caddy](https://caddyserver.com/docs/automatic-https).
