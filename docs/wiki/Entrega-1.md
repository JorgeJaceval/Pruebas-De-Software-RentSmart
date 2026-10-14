# Entrega 1

La primera entrega presenta un MVP de RentSmart con gestión de espacios, reservas y pruebas de los comportamientos prioritarios. La versión de aplicación es [`v1.0-entrega1`](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/releases/tag/v1.0-entrega1), publicada el 12 de octubre de 2026. Se complementa con las [notas de la versión](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/main/docs/releases/entrega-1.md) y el [Resumen de Entrega 1](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/main/docs/resumen-entrega-1.md).

**[Video de presentación](https://drive.google.com/file/d/17H2e4SKm3GOre0F0W0TxGIGKeGdF53n1/view?usp=sharing)** (`Video_final_psf.mp4`).

## Trabajo realizado y alcance

| HU / Jira | Resultado disponible |
| --- | --- |
| HU-01 / REN-1 | Registro persistente, correo único y contraseña como hash |
| HU-02 / REN-2 | Inicio/cierre de sesión, vencimiento y permisos |
| HU-03 / REN-3 | Publicación de espacios propios con fotos, tarifa y horario |
| HU-04 / REN-4 | Edición validada y protección de reservas vigentes |
| HU-05 / REN-5 | Activación/desactivación y reglas de visibilidad |
| HU-06 / REN-6 | Eliminación confirmada de publicaciones sin reservas históricas |
| HU-07 / REN-7 | Mis espacios y acciones de gestión de publicaciones propias |
| HU-08 / REN-8 | Catálogo público de publicaciones activas y no retiradas |
| HU-09 / REN-9 | Búsqueda, filtros básicos, orden y limpieza de filtros |
| HU-10 / REN-10 | Detalle completo, galería y acceso según sesión/propiedad |
| HU-11 / REN-11 | Horario diario en Santiago y validación de intervalos |
| HU-12 / REN-12 | Reserva y pago pendiente guardados conjuntamente; control de superposición y concurrencia |
| HU-13 / REN-13 | Mis reservas, historial, contrato y estados efectivos |

El CRUD principal permite listar, buscar, consultar detalle, agregar, editar y eliminar espacios. Para demostrar eliminación se usa una publicación auxiliar sin reservas: conservar el historial es una regla del sistema.

La solución incorpora Docker Compose, migraciones Alembic, dependencias con lockfiles, validaciones de servidor, errores controlados y GitHub Actions. Los [documentos de cada HU](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/tree/main/docs) detallan sus criterios y el comportamiento implementado.

## Ejecución y pruebas

[[Instalacion-y-ejecucion]] explica cómo iniciar la aplicación y PostgreSQL. [[Estrategia-y-resultados-de-pruebas]] describe los comandos, los tipos de pruebas y la relación HU → criterio → CP → automatización → resultado.

La ejecución de integración continua aprobó **98 pruebas frontend en 11 suites y 114 pruebas backend: 212 pruebas automatizadas**, además del build y las migraciones. El catálogo contiene **99 CP lógicos documentados**, de los cuales tres corresponden a funcionalidades futuras y permanecen planificados. Un CP puede verificarse mediante varias pruebas y variantes automatizadas.

El [recorrido manual integrado del 12 de octubre](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/main/docs/testing/recorrido-final-entrega-1.md) verificó **13 pasos de CRUD y reserva** desde el navegador contra API y PostgreSQL reales. Los resultados fueron satisfactorios e incluyen validaciones, persistencia, eliminación y rechazo secuencial de una reserva duplicada. El informe contiene el procedimiento, el registro HTTP y la comprobación de datos.

## Evidencias y problema técnico resuelto

- [GitHub Actions: ejecución 38326696945](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/38326696945), sobre el código `5c0fabc` del **12 de octubre de 2026**: 98 pruebas Jest y 114 Pytest aprobadas.
- [Pruebas de reservas](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/main/backend/tests/test_reservations.py): dos solicitudes simultáneas del mismo intervalo producen un `201` y un `409`, con una sola reserva y un pago pendiente.
- [Implementación y criterios de HU-12](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/main/docs/HU-12.md): bloqueo de la fila del espacio y validación dentro de la misma transacción; también protege frente a edición, desactivación y eliminación concurrentes.
- [Pruebas de Mis espacios](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/main/frontend/src/OwnedSpaces.test.tsx) y [aislamiento en PostgreSQL](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/main/backend/tests/conftest.py).
- [HU-12 en Jira](https://rentsmartpsf.atlassian.net/browse/REN-12): criterios, CP y resultados de verificación.

## Alcance futuro

Las siguientes etapas incorporarán disponibilidad temporal en los filtros de HU-09, consulta de reservas recibidas de HU-14, cancelación de HU-15, pago simulado de HU-16, sugerencias con IA de HU-17 y administración de publicaciones de HU-18. En esta versión, crear una reserva registra un pago pendiente y las acciones de pago y cancelación permanecen deshabilitadas. Las pruebas E2E automatizadas con Playwright se contemplan para la Entrega 3.

Los [[Supuestos-y-dependencias]] establecen las reglas adoptadas para el MVP.
