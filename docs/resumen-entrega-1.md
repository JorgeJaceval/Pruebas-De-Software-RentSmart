# Resumen de Entrega 1

**RentSmart — Pruebas de Software, semestre 2026-2.** Versión: [`v1.0-entrega1`](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/releases/tag/v1.0-entrega1), publicada el 12 de octubre de 2026.

## Contexto y objetivo

RentSmart conecta a propietarios que ofrecen espacios con personas que necesitan arrendarlos por horas. Centraliza la publicación, la búsqueda y la solicitud de reservas, con información de tarifas, horarios y condiciones. La primera entrega desarrolla el flujo principal y verifica sus reglas mediante pruebas automatizadas y un recorrido integrado.

## Equipo y organización

| Integrante | Responsabilidad principal |
| --- | --- |
| Jorge Aceval | Liderazgo, backend, persistencia, integración y pruebas Pytest |
| Joaquín Viveros | Frontend, integración de interfaz y pruebas Jest/React Testing Library |

El equipo de dos integrantes cuenta con autorización docente. Coordinamos el trabajo mediante Discord, gestionamos historias y casos de prueba en Jira y mantenemos código y revisiones en GitHub. RentSmart y Jest están inscritos en Aula/Moodle.

## Alcance entregado

- Registro, inicio y cierre de sesión, con validaciones y permisos de acceso.
- CRUD de espacios propios: publicar, listar, consultar, editar y eliminar publicaciones sin reservas históricas; activar y desactivar conservando el historial.
- Catálogo público, búsqueda textual, filtros básicos, orden por precio, detalle y galería.
- Horario diario en la zona de Santiago y tarifas por hora en CLP.
- Solicitud de reservas con cálculo del contrato, validación de disponibilidad y persistencia transaccional de reserva y pago pendiente.
- Mis espacios y Mis reservas, con datos, estados y operaciones correspondientes al alcance implementado.

El recorrido principal permite publicar un espacio, encontrarlo en el catálogo, consultar sus condiciones y reservarlo desde otra cuenta. El servidor impide reservar espacios propios y resuelve solicitudes simultáneas del mismo intervalo mediante una única reserva y una respuesta de conflicto.

## Arquitectura

La interfaz utiliza React, TypeScript y Vite. La API se desarrolla con FastAPI y SQLModel, y PostgreSQL 17 almacena cuentas, espacios, reservas y pagos. Alembic administra las migraciones; Docker Compose permite iniciar el entorno local. GitHub Actions compila el frontend, comprueba las migraciones y ejecuta las pruebas.

## Estrategia y resultados de pruebas

Probamos validaciones, permisos, estados de interfaz, operaciones CRUD, persistencia, reglas de reservas y concurrencia. Aplicamos particiones de equivalencia, valores límite, tablas de decisión y transiciones de estado. Los casos se relacionan con historias y criterios de aceptación en Jira.

| Evidencia | Resultado |
| --- | --- |
| Jest y React Testing Library | 98 pruebas aprobadas en 11 suites |
| Pytest con PostgreSQL real | 114 pruebas aprobadas |
| TypeScript y build Vite | Aprobados |
| Migraciones y comprobación de esquema Alembic | Aprobadas |
| Recorrido integrado en navegador, API y PostgreSQL | 13 pasos verificados |

La [ejecución CI 38494150710](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/38494150710) registra las **212 pruebas automatizadas aprobadas**. Jira contiene **99 CP lógicos**; tres corresponden a funcionalidades planificadas. El [recorrido integrado](testing/recorrido-final-entrega-1.md) documenta por separado el procedimiento manual, los resultados y el registro HTTP.

## Alcance futuro

Las siguientes iteraciones contemplan reservas recibidas por el propietario, filtros de disponibilidad por fecha y horario, cancelación, pago simulado, sugerencias con IA y administración de publicaciones. La creación de una reserva registra un pago pendiente; la ejecución del pago corresponde a ese alcance futuro. Las pruebas E2E con Playwright se planifican para Entrega 3.

## Material de entrega

- [Instalación, uso y ejecución de pruebas](../README.md).
- [Alcance y evidencias](entrega-1.md).
- [Wiki del proyecto](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/wiki).
- [Video de presentación](https://drive.google.com/file/d/17H2e4SKm3GOre0F0W0TxGIGKeGdF53n1/view?usp=sharing).
- [Release y notas de versión](releases/entrega-1.md).
- [Supuestos y dependencias](wiki/Supuestos-y-dependencias.md).
