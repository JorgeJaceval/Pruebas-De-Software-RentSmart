# RentSmart

RentSmart conecta personas que ofrecen espacios con quienes necesitan arrendarlos por horas. Centraliza publicaciones, búsqueda, horarios y reservas para reducir la coordinación dispersa y evitar comprometer un mismo horario a más de una persona.

La entrega 1 estableció el MVP con CRUD de espacios, acceso por cuenta y reglas de reserva verificables. La entrega 2 incorpora reservas recibidas, pago simulado y CI/CD con notificaciones Slack. La entrega 3 suma pruebas E2E con Playwright integradas al pipeline e integra los requisitos finales: cancelación del arrendatario, filtro por fecha y horario, moderación administrativa y sugerencia de descripción con IA mediante la API gratuita de Gemini. De esta última falta la evidencia de una llamada real (CA-08). Una cuenta puede actuar como propietaria de sus publicaciones y como arrendataria de espacios ajenos; las operaciones privadas requieren sesión.

El [Release v3.0-entrega3](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/releases/tag/v3.0-entrega3) reúne el código de la entrega 3 sobre el merge en `main` de [PR #{{RELEASE_PR}}](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/pull/{{RELEASE_PR}}). [RentSmart está disponible por HTTPS](https://rentsmart-usm-viveros.chilecentral.cloudapp.azure.com); el Release registra la verificación del despliegue. [[Entrega-3]] enlaza la CI y la evidencia. La entrega 3 todavía no está completa: siguen pendientes el video, la evidencia real de Gemini, la clave de Gemini en el servidor, el campo estructurado de estimación en Jira y la aceptación docente de GitHub Actions en lugar de Jenkins. Las fuentes de Wiki se sincronizan después de revisar/integrar cada actualización.

## Equipo y organización

| Integrante | Responsabilidad |
| --- | --- |
| Jorge Aceval | Líder; backend, persistencia, integración y CI |
| Joaquín Viveros | Frontend y pruebas de interfaz |

El equipo utiliza GitFlow y pull requests en GitHub, un tablero Kanban en Jira y Discord para la comunicación. La integración de GitHub con Jira relaciona ramas, commits y PR con las claves `REN-*`. Hasta PR #47, el otro integrante revisó y aprobó cada PR. Desde PR #48, Joaquín no está disponible: las PR reciben revisiones adversarias de subagentes de IA, publicadas en cada PR, y Jorge bajó a 0 la aprobación obligatoria en `develop` y `main`. Esto incumple §4.4 de las reglas generales; [[Entrega-3]] lo registra en sus pendientes. La conformación de dos integrantes cuenta con autorización docente. RentSmart y Jest están inscritos en Aula/Moodle.

## Navegación

- [[Entrega-1]]: trabajo realizado, alcance y evidencias.
- [[Entrega-2]]: objetivo, CI/CD, infraestructura, Slack, funcionalidades, pruebas y pendientes.
- [[Entrega-3]]: pruebas E2E con Playwright, integración al pipeline, requisitos finales, evidencias, problemas y pendientes.
- [[Instalacion-y-ejecucion]]: instalación y comandos para iniciar el sistema.
- [[Arquitectura]]: componentes, tecnologías y decisiones.
- [[Estrategia-y-resultados-de-pruebas]]: tipos, técnicas, ejecución y resultados.
- [[Supuestos-y-dependencias]]: reglas adoptadas y factores externos.

## Recursos

- [Repositorio](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart).
- [Código de entrega en main](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/tree/main) y [código etiquetado v3.0-entrega3](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/tree/v3.0-entrega3).
- [Versión y Release v3.0-entrega3](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/releases/tag/v3.0-entrega3).
- [CI de entrega 3 sobre main](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/workflows/ci.yml?query=branch%3Amain).
- Video de entrega 3: **pendiente**; el enlace se agrega al publicarlo.
- [Registro acumulativo de entrega 3](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/develop/docs/entrega-3.md), [matriz de cierre](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/develop/docs/cierre-entrega-3.md) y [pauta de Entrega 3](https://github.com/Pruebas-de-Software/HandsOnProject/blob/main/semestres/2026-2/entrega3.md).
- [Registro acumulativo de entrega 2](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/develop/docs/entrega-2.md).
- [Versión y Release v2.0-entrega2](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/releases/tag/v2.0-entrega2).
- [Video de entrega 2](https://drive.google.com/file/d/1bSMNsGrb_MBqMZ_D4iOy18PT9qu68TKA/view?usp=sharing), 22 min 44 s.
- [Versión y Release v1.0-entrega1](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/releases/tag/v1.0-entrega1).
- [Video de presentación de Entrega 1](https://drive.google.com/file/d/17H2e4SKm3GOre0F0W0TxGIGKeGdF53n1/view?usp=sharing).
- [Tablero y tareas Jira](https://rentsmartpsf.atlassian.net/jira/software/projects/REN/boards).
- [Requerimientos detallados](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/main/docs/requerimientos.md).
- [Pruebas y CI de entrega 1: ejecución 38326696945, 12 de octubre de 2026](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/38326696945).
- [Pauta de Entrega 1, semestre 2026-2](https://github.com/Pruebas-de-Software/HandsOnProject/blob/main/semestres/2026-2/entrega1.md).

La versión `v1.0-entrega1` reúne el código de la primera entrega. El [informe de entrega](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/main/docs/entrega-1.md), [[Entrega-1]] y [[Estrategia-y-resultados-de-pruebas]] presentan su alcance, los casos de prueba y los resultados.

Para entrega 2, [[Entrega-2]] enlaza la CI normal y la sonda artificial con recepción real en `#rentsmart-ci`, y la publicación de CA-05 de HU-14 (PR #34, revisión `27ba058`). El [video](https://drive.google.com/file/d/1bSMNsGrb_MBqMZ_D4iOy18PT9qu68TKA/view?usp=sharing) y el [Release v2.0-entrega2](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/releases/tag/v2.0-entrega2) son los enlaces de este hito; conservamos entrega 1 como registro histórico.

Para entrega 3, [[Entrega-3]] enlaza la primera ejecución E2E automática, una ejecución aprobada, el fallo controlado que bloquea el despliegue y se informa en Slack, y la CI final sobre `main`. El [Release v3.0-entrega3](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/releases/tag/v3.0-entrega3) reúne funcionalidades, defectos corregidos, pruebas y limitaciones. El video sigue pendiente; agregamos su enlace al publicarlo.
