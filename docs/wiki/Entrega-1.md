# Entrega 1

Estado documental: **12 de octubre de 2026**. La primera entrega reúne un MVP de RentSmart con gestión de espacios y pruebas automatizadas de los comportamientos prioritarios. Versión de entrega: [`v1.0-entrega1`](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/releases/tag/v1.0-entrega1), sobre `main`; [notas de la versión](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/main/docs/releases/entrega-1.md).

**[Ver el video de presentación](https://drive.google.com/file/d/17H2e4SKm3GOre0F0W0TxGIGKeGdF53n1/view?usp=sharing)** (`Video_final_psf.mp4`), aportado por el equipo. Esta página no acredita una revisión completa del video ni aceptación formal del producto.

## Trabajo realizado y alcance

| HU / Jira | Resultado disponible |
| --- | --- |
| HU-01 / REN-1 | Registro persistente, correo único y contraseña como hash |
| HU-02 / REN-2 | Inicio/cierre de sesión, vencimiento y permisos |
| HU-03 / REN-3 | Publicación de espacios propios con fotos, tarifa y horario |
| HU-04 / REN-4 | Edición validada y protección de reservas vigentes |
| HU-05 / REN-5 | Activación/desactivación y reglas de visibilidad |
| HU-06 / REN-6 | Eliminación confirmada de publicaciones sin reservas históricas |
| HU-07 / REN-7 | Mis espacios y acciones de gestión; **CA-02 parcial:** falta consultar reservas recibidas, dependiente de HU-14 |
| HU-08 / REN-8 | Catálogo público de publicaciones activas y no retiradas |
| HU-09 / REN-9 | Búsqueda, filtros básicos, orden y limpieza; **parcial:** faltan CA-04/06 y la parte temporal de CA-05 |
| HU-10 / REN-10 | Detalle completo, galería y acceso según sesión/propiedad |
| HU-11 / REN-11 | Horario diario en Santiago y validación de intervalos |
| HU-12 / REN-12 | Reserva y pago pendiente guardados conjuntamente; control de superposición y concurrencia |
| HU-13 / REN-13 | Mis reservas, historial, contrato y estados efectivos; **CA-03 parcial:** pagar/cancelar dependen de HU-16/15 |

El CRUD principal permite listar, buscar, consultar detalle, agregar, editar y eliminar espacios. Para demostrar eliminación se usa una publicación auxiliar sin reservas: conservar el historial es una regla del sistema.

También configuramos Docker Compose, migraciones Alembic, dependencias con lockfiles, validaciones de servidor, errores controlados y GitHub Actions. Mantenemos criterios y límites en los [documentos de cada HU](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/tree/main/docs).

## Ejecución y pruebas

[[Instalacion-y-ejecucion]] explica cómo iniciar la aplicación y PostgreSQL. [[Estrategia-y-resultados-de-pruebas]] describe los comandos, los tipos de pruebas y la relación HU → criterio → CP → automatización → resultado.

La ejecución CI verificada aprobó **98 pruebas frontend en 11 suites y 114 pruebas backend: 212 ejecuciones automatizadas**, además del build y las migraciones. Hay **99 CP lógicos documentados**, de los cuales tres permanecen planificados y no ejecutados. La cifra de automatización no representa 212 CP de Jira ni un porcentaje de cobertura de código.

## Evidencias y problema técnico resuelto

- [GitHub Actions: CI #36, ejecución 37982210048](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/37982210048), sobre el código `1d5e027`, del **9 de octubre de 2026**. Los resultados corresponden a esa ejecución; el cierre documental del 12 de octubre no se registra como una ejecución nueva.
- [Pruebas de reservas](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/main/backend/tests/test_reservations.py): dos solicitudes simultáneas del mismo intervalo producen un `201` y un `409`, con una sola reserva y un pago pendiente.
- [Implementación y criterios de HU-12](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/main/docs/HU-12.md): bloqueo de la fila del espacio y validación dentro de la misma transacción; también protege frente a edición, desactivación y eliminación concurrentes.
- [Pruebas de Mis espacios](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/main/frontend/src/OwnedSpaces.test.tsx) y [aislamiento en PostgreSQL](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/main/backend/tests/conftest.py).
- [HU-12 en Jira](https://rentsmartpsf.atlassian.net/browse/REN-12): criterios, CP y resultados de verificación.

## Pendientes y límites

Quedan pendientes el filtro temporal de HU-09, reservas recibidas de HU-14, cancelación de HU-15, pago simulado de HU-16, sugerencias con IA de HU-17 y administración de publicaciones de HU-18. Crear una reserva no realiza un pago. Las acciones preparadas en HU-13 permanecen deshabilitadas hasta implementar sus operaciones.

No tenemos resultados formales de aceptación, recorridos E2E ni pruebas de carga; Playwright se reserva para Entrega 3. La advertencia existente de deprecación de Starlette/TestClient no produjo fallos en la ejecución registrada.

La creación/configuración de la organización y la publicación efectiva de la Wiki se verifican por separado en [el estado de los artefactos](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/main/docs/entrega-1.md). El cierre documental de esta entrega usa commit y push directos por indicación del equipo del 12 de octubre de 2026. Los [[Supuestos-y-dependencias]] delimitan las decisiones usadas para este MVP.
