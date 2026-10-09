# RentSmart — Entrega 1

## Propósito y alcance implementado

RentSmart conecta personas que ofrecen espacios con quienes necesitan arrendarlos para una actividad. En esta primera entrega priorizamos la gestión CRUD de publicaciones, exploración y un primer flujo de reserva, respaldados por pruebas automatizadas.

La referencia de evaluación es la [pauta de Entrega 1 de 2026-2](https://github.com/Pruebas-de-Software/HandsOnProject/blob/main/semestres/2026-2/entrega1.md). Los requisitos del producto completo están en el [tema RentSmart](https://github.com/Pruebas-de-Software/HandsOnProject/blob/main/semestres/2026-2/tema1.md) y en [requerimientos.md](requerimientos.md). Esta página describe lo construido y los pendientes; las historias parciales conservan sus criterios pendientes.

| Historia | Alcance disponible | Pendiente explícito |
| --- | --- | --- |
| HU-01 / HU-02 | Registro, inicio/cierre y restauración de sesión; permisos privados | — |
| HU-03 / HU-04 | Publicar y editar espacios propios, con validaciones y persistencia | — |
| HU-05 / HU-06 | Activar/desactivar y eliminar espacios propios sin historial de reservas | — |
| HU-07, parcial | Consultar Mis espacios y acceder a acciones de gestión | Consultar reservas recibidas, dependencia de HU-14 |
| HU-08 | Explorar el catálogo público de publicaciones activas | — |
| HU-09, parcial | Búsqueda textual y filtros por tipo, comuna, precio y capacidad; orden y limpieza | Disponibilidad por fecha y horario |
| HU-10 | Consultar detalle, galería, horario y contexto de la cuenta | — |
| HU-11 | Horario diario de Santiago y protección de reservas vigentes al editar | — |
| HU-12 | Solicitar reserva, validar disponibilidad, evitar superposiciones y guardar contrato/pago pendiente | Ejecutar el pago depende de HU-16 |
| HU-13, parcial | Consultar reservas propias, historial, importes y estados efectivos | Pagar/cancelar: HU-16 / HU-15 |
| HU-14 a HU-18 | Backlog del producto completo | Reservas del propietario, cancelación, pago simulado, IA y administración |

El CRUD se demuestra listando y buscando el catálogo, consultando un detalle y publicando, editando y eliminando un espacio auxiliar de la propia cuenta que nunca haya recibido reservas.

## Estimaciones iniciales de las historias implementadas

La fuente es **Historias de usuario — Proyecto RentSmart**, propuesta inicial, páginas 5–6. Los siguientes rangos son **horas-persona estimadas inicialmente**, e incluyen implementación, pruebas de la historia y revisión breve. No representan tiempo real registrado ni una validación actual de la duración; deben revisarse con la experiencia del equipo.

| Historia | Estimación inicial |
| --- | --- |
| HU-01 | 1–1,5 h |
| HU-02 | 1–1,5 h |
| HU-03 | 2–3 h |
| HU-04 | 1–1,5 h |
| HU-05 | 0,5–0,75 h |
| HU-06 | 0,5–1 h |
| HU-07 | 0,5–0,75 h |
| HU-08 | 0,75–1 h |
| HU-09 | 1–2 h |
| HU-10 | 0,5–1 h |
| HU-11 | 1–1,5 h |
| HU-12 | 3–4 h |
| HU-13 | 1–1,5 h |

## Arquitectura y dependencias

La interfaz usa React, TypeScript y Vite; la API usa FastAPI y Python; la persistencia usa PostgreSQL y SQLModel, con migraciones Alembic. Docker Compose inicia los servicios. Versionamos `package-lock.json` y `uv.lock`; los comandos de instalación y ejecución están en el [README](../README.md).

Para desarrollo local usamos Node.js 24, Python 3.12 instalado por uv y PostgreSQL. Se requiere una clave `AUTH_SECRET_KEY` de al menos 32 caracteres en el ambiente del backend. Cada publicación incorpora entre una y tres fotos mediante URL HTTPS. La ejecución de pruebas backend requiere una base PostgreSQL y permiso para crear esquemas aislados.

## Supuestos y decisiones

- Una cuenta puede actuar como propietaria o arrendataria según la operación. La autorización se verifica en el servidor.
- Las tarifas son por hora en CLP; el servidor calcula y conserva el precio contratado de cada reserva.
- Cada espacio tiene un horario diario uniforme en `America/Santiago`, con horas enteras y sin cruce de medianoche.
- Las nuevas reservas duran entre 1 y 8 horas, comienzan en el futuro y tienen un horizonte máximo de 90 días.
- Una reserva pendiente bloquea el intervalo hasta el menor instante entre creación + 15 minutos e inicio. Una pendiente vencida deja de bloquear según la hora del servidor.
- Dos solicitudes superpuestas concurrentes se resuelven bajo el bloqueo del espacio y una transacción. La reserva y su pago pendiente se guardan conjuntamente.
- El pago disponible es un **registro pendiente**. Aprobar/rechazar un pago simulado pertenece a HU-16.
- Eliminar exige que no exista ninguna reserva histórica. Una publicación con reservas puede desactivarse para conservar el historial.
- El catálogo de demostración es pequeño y usa filtros básicos en la interfaz. El filtro temporal continúa pendiente.

## Estrategia, ejecución y resultados de pruebas

Probamos reglas de negocio y permisos, API y persistencia, formularios e interacción, mensajes de error, estados temporales y concurrencia. Usamos particiones de equivalencia, valores límite, combinaciones de condiciones y transiciones de estado. Las condiciones de carrera se comprueban con solicitudes coordinadas y PostgreSQL real.

| Herramienta | Uso | Ejecución |
| --- | --- | --- |
| Jest + React Testing Library | Componentes y flujos de interfaz en jsdom, con HTTP simulado | Desde `frontend`: `npm ci` y `npm run test:ci` |
| Pytest | API, reglas, migraciones y concurrencia con PostgreSQL; esquema aislado por prueba | Desde `backend`: `uv sync --frozen` y `uv run pytest -q` |
| GitHub Actions | Automatizar instalación, build y comprobaciones en PR/push a `develop` y `main` | [Workflow](../.github/workflows/ci.yml) y [ejecuciones](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions) |
| Playwright | Preparación de pruebas E2E de la entrega 3 | Sin casos E2E ejecutados en esta entrega |

La evidencia automatizada referenciada es la [CI #34](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/37877845587), correspondiente al commit `2472f04bb1bb024de13c30afa667fc3c898c3d77`: **98 pruebas Jest en 11 suites y 114 pruebas Pytest aprobadas**, además del build y la comprobación Alembic. Estos 212 resultados son comprobaciones automatizadas; el número de CP documentados se cuenta por separado.

Los campos **CP** y **Testing** del [proyecto Jira REN](https://rentsmartpsf.atlassian.net/jira/software/projects/REN) vinculan criterios con casos y evidencia. Conservamos el detalle de las historias previamente sin documentación de testing en [HU-09](testing/HU-09.md), [HU-10](testing/HU-10.md) y [HU-13](testing/HU-13.md). Un criterio pendiente debe permanecer identificado como pendiente aunque pasen las pruebas del alcance implementado. Esta actualización documental referencia resultados existentes; no constituye una nueva ejecución ni una aceptación manual.

Hay **99 CP lógicos documentados**. La actualización suma 24 a los 75 anteriores: HU-09 tiene 8, HU-10 tiene 6 y HU-13 tiene 10. HU-09 CP-07/08 y HU-13 CP-10 están planificados y no ejecutados. Las HU-07/09/13 continúan parciales aunque sus comprobaciones del alcance disponible aprueben.

## Equipo y organización

Jorge Aceval lidera el equipo y se encarga de backend e integración. Joaquín Viveros se encarga de frontend y pruebas de interfaz. Ambos mantienen documentación, criterios y revisiones. Nos coordinamos por **Discord**, gestionamos las historias en **Jira** y conservamos código/revisiones/CI en **GitHub**.

El docente permitió un equipo de **dos integrantes**, según la confirmación recibida de Jorge el **9 de octubre de 2026**. La constancia y los materiales de identidad están en [organizacion.md](organizacion.md). El identificador propuesto para la organización sigue siendo `rentsmart-aceval-viveros`, sujeto a disponibilidad y configuración efectiva en GitHub.

## Lista de artefactos

| Artefacto | Estado documentado al 9 de octubre de 2026 |
| --- | --- |
| Instalación, ejecución, stack y miembros | Documentados en el [README](../README.md) |
| Requerimientos, supuestos y alcance parcial | Documentados en esta página, [requerimientos.md](requerimientos.md) y las páginas de HU |
| Wiki | Contenido preparado en [el índice versionado](wiki/README.md); publicación pendiente de crear la primera página con sesión autenticada. El [script](../scripts/publicar-wiki.ps1) publica las siete páginas sin modificar la aplicación |
| CP y Testing | Jira y páginas de testing; mantienen explícitos los criterios fuera del alcance implementado |
| Licencia, contacto y contribución | [MIT](../LICENSE), [issues](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/issues) y [CONTRIBUTING](../CONTRIBUTING.md) |
| Discord y excepción de dos integrantes | Confirmados por el equipo y documentados en [organización](organizacion.md) |
| Organización y portada GitHub | Materiales preparados; la creación/configuración efectiva se verifica por separado |
| Video de presentación | **Pendiente de grabación y publicación**; su enlace se añadirá al README |
| Integración a `main`, tag `v1.0-entrega1` y Release | **Pospuestos por indicación del equipo**; la versión de trabajo permanece en `develop` |

## Próximos pasos

Grabar y publicar el video. Después de revisar la documentación y el alcance final, preparar la versión estable y el Release de Entrega 1. Mantener las historias parciales y HU-14 a HU-18 en el backlog con sus dependencias visibles; incorporar los flujos de pago, cancelación, propietario, IA y administración en el alcance de trabajo posterior.
