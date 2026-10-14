# Estrategia y resultados de pruebas

[Resumen de Entrega 1](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/main/docs/resumen-entrega-1.md).

La estrategia prioriza los comportamientos del MVP y los riesgos de pérdida de datos, acceso ajeno y reservas simultáneas. Cada HU relaciona sus criterios de aceptación con CP lógicos y comprobaciones automatizadas. Los campos **CP** y **Testing** de Jira registran el escenario, el resultado esperado, el resultado observado y la evidencia.

## Qué probamos y con qué herramientas

| Nivel | Herramientas y alcance |
| --- | --- |
| Componentes y funciones frontend | Jest, React Testing Library y jsdom: formularios, mensajes, navegación, validación de respuestas y estados de carga/vacío/error |
| Integración de componentes | Interacción de las vistas con `App` y el cliente HTTP; `fetch` simulado permite controlar errores, demoras, vencimiento y respuestas tardías |
| API y reglas backend | Pytest y FastAPI TestClient: contratos HTTP, validaciones, autenticación, permisos, filtros privados y cálculos |
| Integración con persistencia | PostgreSQL real y Alembic: restricciones, datos guardados, compatibilidad de migraciones y rollback |
| Concurrencia | Solicitudes coordinadas y bloqueos reales de PostgreSQL: unicidad de cuentas y protección de reservas frente a operaciones competidoras |
| Regresión y verificación de build | GitHub Actions ejecuta las suites, TypeScript/Vite y comprobaciones Alembic en PR/push hacia `develop` o `main` |
| Recorrido manual de integración | Navegador conectado con API y PostgreSQL reales: 13 pasos de CRUD, validaciones, persistencia y reserva, documentados el 12 de octubre |

Cada caso backend que necesita persistencia recibe un esquema exclusivo con las migraciones de la aplicación, que se elimina al finalizar. Las pruebas frontend controlan respuestas HTTP simuladas; el recorrido manual verifica la integración del navegador, la API y la base de datos.

## Técnicas aplicadas

- **Particiones de equivalencia:** datos válidos/inválidos; sesión válida, ausente o vencida; recurso propio/ajeno; publicación activa/inactiva/retirada.
- **Valores límite:** longitudes de nombre y contraseña, precios/capacidad, duración de 1–8 horas, inicio futuro, máximo exacto de 90 días y vencimiento de pago.
- **Combinaciones y decisiones:** filtros unidos con AND; permiso, estado y existencia de reservas antes de modificar/eliminar.
- **Estados y transiciones:** carga, vacío, error, éxito y reintento; sesión vigente/vencida; pendiente vigente/expirada y reserva pagada/finalizada.
- **Intervalos y concurrencia:** superposición rechazada, horarios consecutivos admitidos y dos solicitudes del mismo intervalo con una sola reserva final.

## Procedimiento reproducible

1. Obtener la versión `v1.0-entrega1` mediante `git switch --detach v1.0-entrega1`, configurar los `.env`, iniciar PostgreSQL e instalar con `npm ci` y `uv sync --frozen`.
2. En `frontend`, ejecutar `npm run build` y `npm run test:ci`.
3. En `backend`, ejecutar `uv run alembic upgrade head`, `uv run alembic check` y `uv run pytest -q`.
4. Revisar fallos y comparar el comportamiento con el CA/CP correspondiente; conservar revisión de código, fecha, comando y enlace a resultados en Jira.
5. Comprobar ambos trabajos de GitHub Actions antes de integrar el cambio.

[[Instalacion-y-ejecucion]] contiene la configuración necesaria y los comandos completos.

## Resultado registrado

Los resultados de la versión `v1.0-entrega1` corresponden a la [ejecución 38326696945 de GitHub Actions](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/38326696945), sobre el código `5c0fabc`, del **12 de octubre de 2026**.

| Comprobación | Resultado |
| --- | --- |
| Jest / React Testing Library | 11 suites, 98 pruebas aprobadas |
| Pytest / PostgreSQL | 114 pruebas aprobadas |
| TypeScript y build Vite | Aprobados |
| Alembic upgrade y check | Aprobados, sin diferencias de esquema pendientes |
| Total de ejecuciones automatizadas | **212 aprobadas** |

El catálogo de Jira contiene **99 CP lógicos documentados**: 75 de HU-01 a HU-08 y HU-11/12, 8 de HU-09, 6 de HU-10 y 10 de HU-13. Un CP puede verificarse mediante varias pruebas automatizadas, variantes parametrizadas y comprobaciones frontend/backend; por ello, los 99 CP y las 212 pruebas corresponden a medidas distintas. La cobertura se describe por comportamiento y criterio de aceptación.

Tres CP permanecen planificados para funcionalidades futuras: HU-09 CP-07/08 (filtro temporal) y HU-13 CP-10 (pago/cancelación). El detalle está en [HU-09](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/main/docs/testing/HU-09.md), [HU-10](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/main/docs/testing/HU-10.md) y [HU-13](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/main/docs/testing/HU-13.md).

## Recorrido manual integrado

El [informe del recorrido final](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/main/docs/testing/recorrido-final-entrega-1.md) documenta **13 pasos ejecutados el 12 de octubre de 2026** sobre `v1.0-entrega1`, mediante formularios en el navegador contra FastAPI y PostgreSQL reales. Se verificaron registro y sesión, contraseña incorrecta, publicación, búsqueda y detalle, edición persistente, activación/desactivación, eliminación con cancelación previa, reserva y consulta en Mis reservas.

Los 13 resultados observados fueron satisfactorios. La repetición secuencial del mismo intervalo produjo `409`; una consulta a PostgreSQL confirmó una reserva y un pago, además de la eliminación de la publicación auxiliar. El informe incluye el registro HTTP y el procedimiento reproducible. La concurrencia simultánea se verifica mediante Pytest.

## Ejemplos de trazabilidad

HU-12, CA-06 → CP de concurrencia en [REN-12](https://rentsmartpsf.atlassian.net/browse/REN-12) → `test_ca06_dos_solicitudes_simultaneas_por_api_generan_una_reserva_y_un_pago` en [test_reservations.py](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/main/backend/tests/test_reservations.py) → CI aprobada. Se verifica una respuesta `201`, otra `409`, una reserva y un pago pendiente.

HU-07 → [OwnedSpaces.test.tsx](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/main/frontend/src/OwnedSpaces.test.tsx) y [test_owned_spaces.py](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/main/backend/tests/test_owned_spaces.py) → listado y gestión de publicaciones propias, estados, privacidad y errores.

## Alcance futuro

La ampliación de pruebas acompañará la consulta de reservas recibidas de HU-14, los filtros temporales de HU-09 y las operaciones de cancelación y pago de HU-15/16. La Entrega 3 contempla pruebas E2E automatizadas con Playwright.
