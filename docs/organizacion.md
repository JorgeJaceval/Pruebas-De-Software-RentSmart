# Organización e identidad de RentSmart

## Identidad preparada

Definimos la siguiente identidad para nuestro proyecto:

- Nombre visible: **RentSmart**.
- Identificador propuesto: **rentsmart-aceval-viveros**, sujeto a disponibilidad en GitHub.
- Descripción: **Proyecto académico de arriendo de espacios entre particulares. React + FastAPI, con pruebas automatizadas.**
- Avatar: [logo.svg](identidad/logo.svg); [avatar.png](identidad/avatar.png) es la versión para subir a GitHub.
- Colores: azul `#123047`, verde `#40D6A0` y blanco `#FFFFFF`.
- Integrantes: Jorge Aceval y Joaquín Viveros.
- Contacto público: issues del repositorio.

## Roles y responsabilidades

Nos distribuimos las responsabilidades de la siguiente manera:

Jorge Aceval es el líder de equipo y responsable de backend e integración. Coordina tareas y entregas, administra el repositorio y GitFlow, desarrolla la API con FastAPI y la persistencia con SQLModel/PostgreSQL, implementa las pruebas con Pytest y configura GitHub Actions.

Joaquín Viveros es responsable de frontend y pruebas de interfaz. Desarrolla la interfaz con React, TypeScript y Vite, integra la API e implementa las pruebas con Jest y React Testing Library. Playwright queda preparado para las E2E de la entrega 3.

Entre ambos mantenemos la documentación, verificamos los criterios de aceptación y revisamos los pull requests del otro antes de integrarlos.

## Comunicación y composición del equipo

Usamos **Discord** para coordinar tareas, dudas y preparación de la entrega. **Jira** concentra las historias de usuario, los criterios de aceptación, la prioridad y los casos/resultados de prueba. **GitHub** conserva el código, las ramas, los pull requests y la ejecución automatizada mediante Actions.

El docente autorizó un equipo de **dos integrantes: Jorge Aceval y Joaquín Viveros**. Esta constancia recoge la confirmación expresada por Jorge el **9 de octubre de 2026**. El uso de Discord y la excepción de integrantes quedan documentados aquí y en la Wiki; los acuerdos se acreditan con esa confirmación del equipo. Una captura o enlace al servidor puede incorporarse como evidencia adicional cuando el equipo lo facilite.

El **12 de octubre de 2026**, Jorge confirmó que **RentSmart y Jest están inscritos en Aula/Moodle** y que el equipo usa Discord. No se proporcionó un enlace al servidor/canal ni evidencia de una integración de notificaciones con GitHub o Jira. La comunicación por Discord está confirmada; la automatización de notificaciones no se declara completada.

## Configurar la organización en GitHub

Actualmente alojamos el repositorio en la cuenta personal `JorgeJaceval`. Tenemos preparados los archivos de identidad y la portada. Para configurar la organización y trasladar el repositorio, seguiremos estos pasos:

El **12 de octubre de 2026** se intentó crear la organización con una sesión GitHub autenticada y datos válidos. GitHub rechazó los intentos con el mensaje **«You can’t perform that action at this time.»**. La organización y su portada pública siguen pendientes por ese rechazo; no falta iniciar sesión. El repositorio conserva su propietario actual.

1. Crear una organización desde <https://github.com/organizations/plan> y elegir el identificador disponible acordado por el equipo.
2. En el perfil de la organización, establecer nombre, descripción y avatar usando los materiales anteriores.
3. Invitar a ambos integrantes usando sus cuentas GitHub. Confirmar la cuenta de Joaquín antes de enviar la invitación; no está registrada en este repositorio.
4. Asignar a Jorge Aceval los permisos de administración como líder del equipo y a Joaquín Viveros los permisos de escritura y revisión del repositorio.
5. Si se decide alojar el proyecto en la organización, transferir el repositorio desde **Settings → General → Danger Zone → Transfer ownership**. Confirmar el destino antes de transferirlo.
6. Crear un repositorio **público** llamado `.github` dentro de la organización. Copiar [la portada preparada](organizacion/profile/README.md) a `profile/README.md` en ese repositorio. La ruta `.github/profile/README.md` de un repositorio de aplicación no sustituye al repositorio `.github` de la organización.
7. Actualizar los enlaces de README, CONTRIBUTING y portada al repositorio definitivo. Si hubo transferencia, actualizar el remoto local con `git remote set-url origin https://github.com/IDENTIFICADOR/Pruebas-De-Software-RentSmart.git`, reemplazando `IDENTIFICADOR` por el destino real.

## Proteger el flujo de trabajo

Nuestro flujo de desarrollo requiere pull request, una aprobación del otro integrante, resolución de conversaciones y bloqueo de force push y eliminación de `main` y `develop`. Para aplicar estas reglas, debemos configurarlas en **Settings → Rules → Rulesets** o **Branches** e incluir los checks del pipeline. Confirmaremos su activación en GitHub antes de darlas por aplicadas. El cierre documental de Entrega 1 tiene una excepción explícita del equipo, registrada el **12 de octubre de 2026**: commit y push directos, sin crear otro PR, para preparar la versión de entrega.

## Evidencia para cerrar la tarea

- Enlaces a las ramas `main`, `develop` y la feature de configuración.
- PR de la feature hacia `develop`, con revisión del otro integrante.
- Licencia, `.gitignore` y documentación de contacto/contribución visibles tras integrar el PR.
- Organización real con nombre, identificador, avatar, descripción y los miembros del equipo.
- Portada pública visible en el perfil de la organización.
- Captura o evidencia de las protecciones de ramas si se habilitan.

## Estado de los artefactos de entrega

La documentación de Entrega 1 está en [entrega-1.md](entrega-1.md). La [Wiki pública](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/wiki) está publicada con sus siete páginas; la publicación inicial de contenido corresponde al commit `1f4868c`. Conservamos su fuente en [wiki/Home.md](wiki/Home.md) y el procedimiento de actualización en [wiki/README.md](wiki/README.md).

La entrega incluye el [video de presentación](https://drive.google.com/file/d/17H2e4SKm3GOre0F0W0TxGIGKeGdF53n1/view?usp=sharing) aportado por el equipo y la versión [`v1.0-entrega1`](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/releases/tag/v1.0-entrega1), sobre `main`, con [notas de versión](releases/entrega-1.md). La Wiki está publicada; la organización continúa pendiente por el rechazo de GitHub descrito arriba.
