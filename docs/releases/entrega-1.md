# RentSmart v1.0-entrega1

Fecha de preparación: **12 de octubre de 2026**. Primera entrega académica de RentSmart, un MVP para publicar y arrendar espacios por horas. La versión se identifica con el tag `v1.0-entrega1` sobre `main`.

La publicación del tag activa el [workflow de Release](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/v1.0-entrega1/.github/workflows/entrega-1-release.yml), que comprueba que el commit pertenezca a `main` y usa estas notas para crear el Release. El estado público se verifica en el enlace del Release; la preparación de este archivo por sí sola no acredita que el workflow haya terminado.

- [Video de presentación: Video_final_psf.mp4](https://drive.google.com/file/d/17H2e4SKm3GOre0F0W0TxGIGKeGdF53n1/view?usp=sharing).
- [Release v1.0-entrega1](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/releases/tag/v1.0-entrega1).
- [Alcance y evidencias](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/v1.0-entrega1/docs/entrega-1.md).
- [Instalación y ejecución](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/v1.0-entrega1/README.md).
- [Contenido versionado de la Wiki](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/v1.0-entrega1/docs/wiki/README.md).

## Funcionalidades incluidas

- Registro e inicio/cierre de sesión, validaciones, contraseña con hash Argon2 y acceso según cuenta y permisos (HU-01/02).
- CRUD de espacios: publicar, listar, buscar, consultar detalle, editar y eliminar publicaciones propias. La eliminación exige ausencia de cualquier reserva histórica; activar/desactivar conserva el historial (HU-03 a HU-10).
- Mis espacios con estados y acciones de gestión. Catálogo público de publicaciones activas, búsqueda textual, filtros básicos, galería y detalle. HU-07/09 conservan límites parciales documentados.
- Horario diario uniforme en `America/Santiago`, tarifas en CLP y protección de reservas vigentes al editar (HU-11).
- Solicitud de reservas con cálculo del contrato en el servidor, validación de intervalos, bloqueo del espacio y guardado transaccional de reserva y pago pendiente. Dos solicitudes simultáneas del mismo intervalo producen una reserva y un conflicto (HU-12).
- Mis reservas con contrato, próximos horarios, historial y estados efectivos. Pagar y cancelar permanecen deshabilitados hasta implementar sus operaciones (HU-13, parcial).
- React/TypeScript/Vite, FastAPI, SQLModel/PostgreSQL 17, migraciones Alembic, Docker Compose, lockfiles y pipeline GitHub Actions.

## Pruebas y evidencia

La [CI #36, ejecución 37982210048](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/37982210048), correspondiente al commit `1d5e027` del **9 de octubre de 2026**, registra:

| Comprobación | Resultado |
| --- | --- |
| Jest y React Testing Library | 98 pruebas aprobadas en 11 suites |
| Pytest con PostgreSQL | 114 pruebas aprobadas |
| TypeScript y build Vite | Aprobados |
| Migraciones Alembic y comprobación de esquema | Aprobadas |
| Total de comprobaciones automatizadas | **212 aprobadas** |

Hay **99 CP lógicos documentados** en Jira, independientes del número de pruebas automatizadas. Tres están planificados y no ejecutados: HU-09 CP-07/08 (disponibilidad temporal) y HU-13 CP-10 (pagar/cancelar). Las HU-07/09/13 mantienen criterios parciales. Los detalles están en [la estrategia de pruebas](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/v1.0-entrega1/docs/wiki/Estrategia-y-resultados-de-pruebas.md) y [HU-09](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/v1.0-entrega1/docs/testing/HU-09.md), [HU-10](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/v1.0-entrega1/docs/testing/HU-10.md) y [HU-13](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/v1.0-entrega1/docs/testing/HU-13.md).

Estos son resultados de la ejecución enlazada. El cierre documental de la entrega no constituye una ejecución nueva, una aceptación manual ni una medición de cobertura porcentual. No hay resultados E2E ni de carga; Playwright se reserva para Entrega 3. La advertencia existente de deprecación de Starlette/TestClient no produjo fallos.

## Pendientes y límites

- HU-07: falta consultar reservas recibidas, dependiente de HU-14.
- HU-09: falta filtrar por fecha y horario disponibles, conectando las reglas de HU-11/12.
- HU-13: falta ejecutar pago/cancelación, dependiente de HU-16/15.
- HU-14 a HU-18: reservas del propietario, cancelación, pago simulado, sugerencias con IA y administración de publicaciones.
- Crear una reserva solo registra un **pago pendiente**; no ejecuta pago simulado ni cobro real.
- La aplicación se ejecuta localmente. La publicación efectiva de la Wiki y la configuración de la organización GitHub se registran por separado en [el estado de entrega](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/v1.0-entrega1/docs/entrega-1.md).

El equipo trabaja con Discord y Jira, y docencia autorizó los dos integrantes: Jorge Aceval y Joaquín Viveros. El cierre documental se realiza mediante commit y push directos, sin crear un PR nuevo, por indicación del equipo del 12 de octubre de 2026. El video enlazado fue aportado por el equipo; estas notas no afirman una revisión completa de su contenido.
