# RentSmart

RentSmart conecta personas que ofrecen espacios con quienes necesitan arrendarlos por horas. Centraliza publicaciones, búsqueda, horarios y reservas para reducir la coordinación dispersa y evitar comprometer un mismo horario a más de una persona.

La entrega 1 estableció el MVP con CRUD de espacios, acceso por cuenta y reglas de reserva verificables. La entrega 2 incorpora reservas recibidas, pago simulado y CI/CD con notificaciones Slack. Una cuenta puede actuar como propietaria de sus publicaciones y como arrendataria de espacios ajenos; las operaciones privadas requieren sesión.

PR #34 integró y publicó CA-05 de HU-14 junto con los avances de entrega 2. [RentSmart está disponible por HTTPS](https://rentsmart-usm-viveros.chilecentral.cloudapp.azure.com), revisión `27ba058`; la migración 0007, versión/readiness y contenedores sanos están verificados. [[Entrega-2]] enlaza CI y evidencia. El video y el tag/Release finales siguen pendientes. Las fuentes de Wiki se sincronizan después de revisar/integrar cada actualización.

## Equipo y organización

| Integrante | Responsabilidad |
| --- | --- |
| Jorge Aceval | Líder; backend, persistencia, integración y CI |
| Joaquín Viveros | Frontend y pruebas de interfaz |

El equipo utiliza GitFlow y pull requests en GitHub, un tablero Kanban en Jira y Discord para la comunicación. La integración de GitHub con Jira relaciona ramas, commits y PR con las claves `REN-*`. La conformación de dos integrantes cuenta con autorización docente. RentSmart y Jest están inscritos en Aula/Moodle.

## Navegación

- [[Entrega-1]]: trabajo realizado, alcance y evidencias.
- [[Entrega-2]]: objetivo, CI/CD, infraestructura, Slack, funcionalidades, pruebas y pendientes.
- [[Instalacion-y-ejecucion]]: instalación y comandos para iniciar el sistema.
- [[Arquitectura]]: componentes, tecnologías y decisiones.
- [[Estrategia-y-resultados-de-pruebas]]: tipos, técnicas, ejecución y resultados.
- [[Supuestos-y-dependencias]]: reglas adoptadas y factores externos.

## Recursos

- [Repositorio](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart).
- [Código de entrega en main](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/tree/main).
- [Avance de entrega 2 en develop](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/tree/develop) y [registro acumulativo](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/develop/docs/entrega-2.md).
- [Versión y Release v1.0-entrega1](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/releases/tag/v1.0-entrega1).
- [Video de presentación de Entrega 1](https://drive.google.com/file/d/17H2e4SKm3GOre0F0W0TxGIGKeGdF53n1/view?usp=sharing).
- [Tablero y tareas Jira](https://rentsmartpsf.atlassian.net/jira/software/projects/REN/boards).
- [Requerimientos detallados](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/main/docs/requerimientos.md).
- [Pruebas y CI verificadas: ejecución 38326696945, 12 de octubre de 2026](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/38326696945).
- [Pauta de Entrega 1, semestre 2026-2](https://github.com/Pruebas-de-Software/HandsOnProject/blob/main/semestres/2026-2/entrega1.md).

La versión `v1.0-entrega1` reúne el código de la primera entrega. El [informe de entrega](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/main/docs/entrega-1.md), [[Entrega-1]] y [[Estrategia-y-resultados-de-pruebas]] presentan su alcance, los casos de prueba y los resultados.

Para entrega 2, [[Entrega-2]] enlaza la CI normal y la sonda artificial con recepción real en `#rentsmart-ci`. El tag `v2.0-entrega2` y su video todavía no están publicados.
