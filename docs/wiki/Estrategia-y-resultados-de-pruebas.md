# Estrategia y resultados de pruebas

Priorizamos comportamientos del MVP y riesgos de pérdida de datos, acceso ajeno y reservas simultáneas. Para cada HU relacionamos sus criterios de aceptación con CP lógicos y comprobaciones automatizadas. Los campos **CP** y **Testing** de Jira registran escenario, resultado esperado, resultado observado y evidencia; una prueba aprobada no completa un criterio que mantiene funcionalidades pendientes.

## Qué probamos y con qué herramientas

| Nivel | Herramientas y alcance |
| --- | --- |
| Componentes y funciones frontend | Jest, React Testing Library y jsdom: formularios, mensajes, navegación, validación de respuestas y estados de carga/vacío/error |
| Integración de componentes | Interacción de las vistas con `App` y el cliente HTTP; `fetch` simulado permite controlar errores, demoras, vencimiento y respuestas tardías |
| API y reglas backend | Pytest y FastAPI TestClient: contratos HTTP, validaciones, autenticación, permisos, filtros privados y cálculos |
| Integración con persistencia | PostgreSQL real y Alembic: restricciones, datos guardados, compatibilidad de migraciones y rollback |
| Concurrencia | Solicitudes coordinadas y bloqueos reales de PostgreSQL: unicidad de cuentas y protección de reservas frente a operaciones competidoras |
| Regresión y verificación de build | GitHub Actions ejecuta las suites, TypeScript/Vite y comprobaciones Alembic en PR/push hacia `develop` o `main` |

Cada caso backend que necesita persistencia recibe un esquema exclusivo con las migraciones de la aplicación. Se elimina al terminar. La simulación HTTP frontend no demuestra un recorrido real navegador–API–base de datos. Las pruebas E2E con Playwright corresponden a Entrega 3; no hay casos ejecutados actualmente.

## Técnicas aplicadas

- **Particiones de equivalencia:** datos válidos/invalidos; sesión válida, ausente o vencida; recurso propio/ajeno; publicación activa/inactiva/retirada.
- **Valores límite:** longitudes de nombre y contraseña, precios/capacidad, duración de 1–8 horas, inicio futuro, máximo exacto de 90 días y vencimiento de pago.
- **Combinaciones y decisiones:** filtros unidos con AND; permiso, estado y existencia de reservas antes de modificar/eliminar.
- **Estados y transiciones:** carga, vacío, error, éxito y reintento; sesión vigente/vencida; pendiente vigente/expirada y reserva pagada/finalizada.
- **Intervalos y concurrencia:** superposición rechazada, horarios consecutivos admitidos y dos solicitudes del mismo intervalo con una sola reserva final.

## Procedimiento reproducible

1. Obtener `develop`, configurar los `.env`, iniciar PostgreSQL e instalar con `npm ci` y `uv sync --frozen`.
2. En `frontend`, ejecutar `npm run build` y `npm run test:ci`.
3. En `backend`, ejecutar `uv run alembic upgrade head`, `uv run alembic check` y `uv run pytest -q`.
4. Revisar fallos y comparar el comportamiento con el CA/CP correspondiente; conservar revisión de código, fecha, comando y enlace a resultados en Jira.
5. Comprobar ambos trabajos de GitHub Actions antes de integrar el cambio.

[[Instalacion-y-ejecucion]] contiene la configuración necesaria y los comandos completos.

## Resultado registrado

Evidencia verificada el 9 de octubre de 2026: [GitHub Actions, ejecución 37877845587](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/37877845587), código `2472f04bb1bb024de13c30afa667fc3c898c3d77`. Su árbol coincide con el integrado en `develop` mediante `8b7abf0f0f95a3336e7044ffe2b9715192fd7a4b`.

| Comprobación | Resultado |
| --- | --- |
| Jest / React Testing Library | 11 suites, 98 pruebas aprobadas |
| Pytest / PostgreSQL | 114 pruebas aprobadas |
| TypeScript y build Vite | Aprobados |
| Alembic upgrade y check | Aprobados, sin diferencias de esquema pendientes |
| Total de ejecuciones automatizadas | **212 aprobadas** |

La suite backend mantiene una advertencia existente de deprecación de Starlette/TestClient–httpx. No produjo fallos. Los resultados anteriores de cada HU describen su versión histórica; esta tabla reúne la regresión de la versión integrada.

**212 no es el número de CP de Jira.** Un CP lógico puede verificarse con varias pruebas, variantes parametrizadas y niveles frontend/backend. Tampoco medimos un porcentaje de cobertura de líneas: describimos cobertura funcional por comportamiento y criterio.

En Jira quedan **99 CP lógicos documentados**: los 75 de HU-01 a HU-08 y HU-11/12, más 8 de HU-09, 6 de HU-10 y 10 de HU-13. Tres casos están planificados y no ejecutados: HU-09 CP-07/08 (filtro temporal) y HU-13 CP-10 (pagar/cancelar). Los resultados del alcance actual no completan los criterios parciales de HU-07/09/13. El detalle nuevo está en [HU-09](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/feature/REN-32-completar-documentacion/docs/testing/HU-09.md), [HU-10](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/feature/REN-32-completar-documentacion/docs/testing/HU-10.md) y [HU-13](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/feature/REN-32-completar-documentacion/docs/testing/HU-13.md).

## Ejemplos de trazabilidad y límites

HU-12, CA-06 → CP de concurrencia en [REN-12](https://rentsmartpsf.atlassian.net/browse/REN-12) → `test_ca06_dos_solicitudes_simultaneas_por_api_generan_una_reserva_y_un_pago` en [test_reservations.py](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/develop/backend/tests/test_reservations.py) → CI aprobada. Se verifica una respuesta `201`, otra `409`, una reserva y un pago pendiente.

HU-07 → [OwnedSpaces.test.tsx](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/develop/frontend/src/OwnedSpaces.test.tsx) y [test_owned_spaces.py](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/develop/backend/tests/test_owned_spaces.py) → listado y gestión propios, estados, privacidad y errores. CA-02 continúa parcial por la consulta de reservas recibidas pendiente de HU-14.

También permanecen parciales HU-09 por disponibilidad temporal y CA-03 de HU-13 por pago/cancelación. No afirmamos aceptación formal del producto, ejecución manual documentada, pruebas de carga ni cobertura completa de esas funciones pendientes.
