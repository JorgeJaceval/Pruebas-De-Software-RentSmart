# Organización e identidad de RentSmart

## Identidad del proyecto

Definimos la siguiente identidad para nuestro proyecto:

- Nombre visible: **RentSmart**.
- Descripción: **Proyecto académico de arriendo de espacios entre particulares. React + FastAPI, con pruebas automatizadas.**
- Avatar: [logo.svg](identidad/logo.svg); [avatar.png](identidad/avatar.png) es la versión para subir a GitHub.
- Colores: azul `#123047`, verde `#40D6A0` y blanco `#FFFFFF`.
- Integrantes: Jorge Aceval y Joaquín Viveros.
- Contacto público: [issues del repositorio](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/issues).

## Roles y responsabilidades

Nos distribuimos las responsabilidades de la siguiente manera:

Jorge Aceval es el líder de equipo y responsable de backend e integración. Coordina tareas y entregas, administra el repositorio y GitFlow, desarrolla la API con FastAPI y la persistencia con SQLModel/PostgreSQL, implementa las pruebas con Pytest y configura GitHub Actions.

Joaquín Viveros es responsable de frontend y pruebas de interfaz. Desarrolla la interfaz con React, TypeScript y Vite, integra la API e implementa las pruebas con Jest y React Testing Library. Playwright queda preparado para las E2E de la entrega 3.

Entre ambos mantenemos la documentación, verificamos los criterios de aceptación y revisamos los pull requests del otro antes de integrarlos.

## Comunicación y composición del equipo

Usamos **Discord** para coordinar tareas, dudas y preparación de la entrega. **Jira** concentra las historias de usuario, los criterios de aceptación, la prioridad y los casos/resultados de prueba. **GitHub** conserva el código, las ramas, los pull requests y la ejecución automatizada mediante Actions.

El docente autorizó el equipo de **dos integrantes: Jorge Aceval y Joaquín Viveros**. El proyecto **RentSmart** y la herramienta **Jest** están inscritos en Aula/Moodle.

## Flujo de trabajo

Planificamos las historias en el tablero Kanban de Jira, incluyendo criterios de aceptación, prioridades, estimaciones y pruebas. Desarrollamos las funcionalidades en ramas y revisamos los pull requests entre ambos integrantes antes de integrarlos. GitHub Actions ejecuta las pruebas y el build en las ramas `develop` y `main` y en los pull requests.

## Recursos del equipo

- [Repositorio público](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart).
- [Proyecto Jira REN](https://rentsmartpsf.atlassian.net/jira/software/projects/REN).
- [Wiki del proyecto](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/wiki), con fuentes en [wiki/Home.md](wiki/Home.md).
- [Documentación de Entrega 1](entrega-1.md) y [Resumen de Entrega 1](resumen-entrega-1.md).
- [Video de presentación](https://drive.google.com/file/d/17H2e4SKm3GOre0F0W0TxGIGKeGdF53n1/view?usp=sharing).
- [Release v1.0-entrega1](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/releases/tag/v1.0-entrega1) y [notas de versión](releases/entrega-1.md).

## Materiales para el perfil de GitHub

El repositorio está alojado en la cuenta `JorgeJaceval`. Conservamos el [avatar](identidad/avatar.png) y una [portada institucional](organizacion/profile/README.md) para configurar el perfil de una organización. La portada se publica en `profile/README.md` de un repositorio público llamado `.github` perteneciente a esa organización.
