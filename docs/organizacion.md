# Organización e identidad de RentSmart

## Identidad preparada

- Nombre visible: **RentSmart**.
- Identificador propuesto: **rentsmart-aceval-viveros**, sujeto a disponibilidad y confirmación del equipo.
- Descripción: **Proyecto académico de arriendo de espacios entre particulares. React + FastAPI, con pruebas automatizadas.**
- Avatar: [logo.svg](identidad/logo.svg); [avatar.png](identidad/avatar.png) es la versión para subir a GitHub.
- Colores: azul `#123047`, verde `#40D6A0` y blanco `#FFFFFF`.
- Integrantes: Jorge Aceval y Joaquín Viveros.
- Contacto público: issues del repositorio.

## Configurar la organización en GitHub

El repositorio actual pertenece a la cuenta personal `JorgeJaceval`. Los archivos de identidad no crean una organización ni transfieren el repositorio.

1. Crear una organización desde <https://github.com/organizations/plan> y elegir el identificador disponible acordado por el equipo.
2. En el perfil de la organización, establecer nombre, descripción y avatar usando los materiales anteriores.
3. Invitar a ambos integrantes usando sus cuentas GitHub. Confirmar la cuenta de Joaquín antes de enviar la invitación; no está registrada en este repositorio.
4. Acordar el líder y los permisos de administración y escritura.
5. Si se decide alojar el proyecto en la organización, transferir el repositorio desde **Settings → General → Danger Zone → Transfer ownership**. Confirmar el destino antes de transferirlo.
6. Crear un repositorio **público** llamado `.github` dentro de la organización. Copiar [la portada preparada](organizacion/profile/README.md) a `profile/README.md` en ese repositorio. La ruta `.github/profile/README.md` de un repositorio de aplicación no sustituye al repositorio `.github` de la organización.
7. Actualizar los enlaces de README, CONTRIBUTING y portada al repositorio definitivo. Si hubo transferencia, actualizar el remoto local con `git remote set-url origin https://github.com/IDENTIFICADOR/Pruebas-De-Software-RentSmart.git`, reemplazando `IDENTIFICADOR` por el destino real.

## Proteger el flujo de trabajo

En **Settings → Rules → Rulesets** o **Branches**, configurar reglas para `main` y `develop`: exigir pull request, una aprobación del otro integrante, resolución de conversaciones y bloqueo de force push y eliminación de ramas. Añadir checks obligatorios cuando exista un pipeline. Verificar que las reglas estén activas y que el equipo tenga acceso; no se consideran aplicadas por estar documentadas aquí.

## Evidencia para cerrar la tarea

- Enlaces a las ramas `main`, `develop` y la feature de configuración.
- PR de la feature hacia `develop`, con revisión del otro integrante.
- Licencia, `.gitignore` y documentación de contacto/contribución visibles tras integrar el PR.
- Organización real con nombre, identificador, avatar, descripción y los miembros del equipo.
- Portada pública visible en el perfil de la organización.
- Captura o evidencia de las protecciones de ramas si se habilitan.

La Wiki, el video, la aplicación y el Release de entrega se completan en sus respectivas tareas.
