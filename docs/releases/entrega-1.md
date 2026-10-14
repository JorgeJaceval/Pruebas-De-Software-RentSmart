# RentSmart v1.0-entrega1

**Primera entrega académica — 12 de octubre de 2026.** RentSmart es un MVP para publicar y arrendar espacios por horas, desarrollado para Pruebas de Software, semestre 2026-2.

## Funcionalidades

- Registro, inicio y cierre de sesión, validación de datos y acceso según los permisos de la cuenta.
- CRUD de espacios propios: publicación, listado, consulta, edición y eliminación de publicaciones sin reservas históricas.
- Activación y desactivación de espacios, conservando el historial.
- Mis espacios, catálogo público, búsqueda textual, filtros básicos, detalle y galería.
- Horario diario uniforme en `America/Santiago`, tarifas en CLP y protección de reservas vigentes al editar.
- Solicitud de reservas con cálculo del contrato en el servidor, validación del intervalo y guardado conjunto de reserva y pago pendiente.
- Control de superposición y concurrencia: dos solicitudes simultáneas para el mismo intervalo generan una reserva y un conflicto.
- Mis reservas con contrato, próximos horarios, historial y estados efectivos.

## Arquitectura

React, TypeScript y Vite para el frontend; FastAPI y SQLModel para la API; PostgreSQL 17 para persistencia. Alembic administra las migraciones, Docker Compose inicia el entorno local y GitHub Actions ejecuta la compilación y las pruebas.

## Pruebas y resultados

La [ejecución CI 38494150710](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/38494150710), sobre el commit `28c5978`, registra:

| Comprobación | Resultado |
| --- | --- |
| Jest y React Testing Library | 98 pruebas aprobadas en 11 suites |
| Pytest con PostgreSQL real | 114 pruebas aprobadas |
| TypeScript y build Vite | Aprobados |
| Migraciones Alembic y comprobación de esquema | Aprobadas |
| Total automatizado | **212 pruebas aprobadas** |

La [CI de la versión etiquetada](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/38326696945), sobre `5c0fabc`, registra los mismos resultados. Jira contiene **99 CP lógicos**, de los cuales tres corresponden a funcionalidades planificadas: HU-09 CP-07/08 y HU-13 CP-10.

El [recorrido integrado del 12 de octubre](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/main/docs/testing/recorrido-final-entrega-1.md) verificó **13 pasos** de registro, acceso, CRUD, reserva y conflicto desde el navegador, con API y PostgreSQL reales. Su procedimiento y registro HTTP complementan la evidencia automatizada.

## Alcance futuro

Las próximas iteraciones contemplan reservas recibidas por el propietario, filtros por disponibilidad temporal, cancelación, pago simulado, sugerencias con IA y administración de publicaciones. La reserva crea un pago pendiente; pagar y cancelar permanecen deshabilitados hasta integrar sus operaciones. Las pruebas E2E con Playwright se planifican para Entrega 3.

## Documentación y presentación

- [Resumen de Entrega 1](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/main/docs/resumen-entrega-1.md).
- [Alcance y evidencias](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/main/docs/entrega-1.md).
- [Instalación y ejecución](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/main/README.md).
- [Wiki del proyecto](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/wiki).
- [Estrategia y resultados de pruebas](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/wiki/Estrategia-y-resultados-de-pruebas).
- [Video de presentación](https://drive.google.com/file/d/17H2e4SKm3GOre0F0W0TxGIGKeGdF53n1/view?usp=sharing).

**Equipo:** Jorge Aceval y Joaquín Viveros. Coordinación mediante Discord, planificación y trazabilidad en Jira, y código y revisiones en GitHub.
