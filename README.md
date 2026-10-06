# RentSmart

Arriendo de espacios entre particulares. Proyecto académico de Pruebas de Software para conectar personas que ofrecen espacios con quienes necesitan arrendarlos.

![Identidad de RentSmart](docs/identidad/logo.svg)

## Equipo

| Integrante | Rol | Responsabilidades |
| --- | --- | --- |
| Jorge Aceval | Líder de equipo y responsable de backend e integración | Coordinar tareas y entregas; administrar el repositorio y GitFlow; desarrollar la API con FastAPI, los modelos con SQLModel y la persistencia en PostgreSQL; implementar pruebas con Pytest y configurar CI/CD con GitHub Actions. |
| Joaquín Viveros | Responsable de frontend y pruebas de interfaz | Desarrollar la interfaz con React, TypeScript y Vite; integrar el frontend con la API; implementar pruebas con Jest y React Testing Library y pruebas E2E con Playwright. |

Ambos integrantes mantienen la documentación, verifican los criterios de aceptación y revisan los pull requests del otro antes de integrarlos.

## Tecnologías seleccionadas

| Área | Tecnología |
| --- | --- |
| Frontend | React, TypeScript y Vite |
| Backend | Python y FastAPI |
| Base de datos | PostgreSQL y SQLModel ORM |
| Pruebas frontend | Jest y React Testing Library |
| Pruebas backend | Pytest |
| Pruebas E2E | Playwright |
| CI/CD | GitHub Actions |

## Estado e instalación

El repositorio está en la etapa de configuración inicial. Todavía no contiene la aplicación ni dependencias instalables; los comandos de instalación, ejecución y pruebas se incorporarán junto con el frontend y el backend.

Para obtener el repositorio:

```bash
git clone https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart.git
cd Pruebas-De-Software-RentSmart
```

## Flujo de trabajo

Usamos GitFlow: `main` contiene versiones estables, `develop` integra el desarrollo y las ramas `feature/REN-<numero>-<descripcion>` parten desde `develop`. Cada cambio se propone mediante un pull request y lo revisa el otro integrante. Las ramas `release/*` preparan entregas y `hotfix/*` corrigen versiones estables.

La clave exacta de la tarea Jira debe aparecer en el nombre de la rama, los mensajes de commit y el título del PR. La descripción del PR incluye el enlace a la tarea. Por ejemplo, la configuración del repositorio corresponde a [REN-27](https://rentsmartpsf.atlassian.net/browse/REN-27).

Consulta la [guía de contribución](CONTRIBUTING.md) para los comandos, revisión y criterios de integración.

## Documentación y enlaces

- [Repositorio](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart)
- [Wiki](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/wiki) — pendiente de contenido.
- [Identidad y configuración de la organización](docs/organizacion.md).
- [Requisitos de entrega 1](https://github.com/Pruebas-de-Software/HandsOnProject/blob/main/semestres/2026-1/entrega1.md).
- [Tema RentSmart](https://github.com/Pruebas-de-Software/HandsOnProject/blob/main/semestres/2026-2/tema1.md).
- Video de entrega 1: pendiente de grabación y publicación.

## Contacto y contribución

Para consultas, propuestas y reportes de errores, abre un [issue](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/issues). Jorge Aceval y Joaquín Viveros son los responsables del proyecto. Para contribuir, sigue [CONTRIBUTING.md](CONTRIBUTING.md).

## Licencia

Distribuido bajo la [licencia MIT](LICENSE). Copyright © 2026 Jorge Aceval y Joaquín Viveros.
