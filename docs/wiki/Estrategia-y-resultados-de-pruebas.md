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

1. Para el avance de entrega 2 usar `develop` y registrar su SHA; para el hito histórico de entrega 1 usar `git switch --detach v1.0-entrega1`. Configurar los `.env`, iniciar PostgreSQL e instalar con `npm ci` y `uv sync --frozen`.
2. En `frontend`, ejecutar `npm run build` y `npm run test:ci`.
3. En `backend`, ejecutar `uv run alembic upgrade head`, `uv run alembic check` y `uv run pytest -q`.
4. Revisar fallos y comparar el comportamiento con el CA/CP correspondiente; conservar revisión de código, fecha, comando y enlace a resultados en Jira.
5. Comprobar frontend, backend, quality, production y notify en los checks vigentes de Actions; verificar deploy según la rama/configuración. Para scripts de infraestructura ejecutar `python3 -m unittest discover -s scripts/tests -v`.

[[Instalacion-y-ejecucion]] contiene la configuración necesaria y los comandos completos.

## Resultado histórico de entrega 1

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

## Resultados de entrega 2

La [CI normal #40796675009](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/40796675009), del PR sobre `d3553a8`, aprobó **134 Jest y 144 Pytest**: 278 pruebas de aplicación. `production` aprobó además **26 pruebas de infraestructura** y el smoke de contenedores. Frontend usa HTTP simulado; backend utiliza PostgreSQL real. Las seis guardas de despliegue simulan Docker; las veinte pruebas de notificación incluyen un servidor HTTP temporal y no contactan Slack.

La [sonda #40796674640](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/40796674640) aprobó los mismos tests de aplicación y falló deliberadamente en la etapa artificial de frontend; quality bloqueó las etapas posteriores y notify envió el aviso. El webhook real aceptó los avisos ÉXITO/FALLO y el usuario confirmó recepción en `#rentsmart-ci`. Esto se conserva separado de los tests HTTP simulados.

HU-14 agregó 8 comprobaciones backend y 15 frontend; HU-16 agregó 22 backend y 21 frontend. El [registro acumulativo](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/develop/docs/entrega-2.md) relaciona esos incrementos con PR/SHA y sus verificaciones. La revisión inicial conservaba CA-05 de HU-14 parcial. El candidato del 29 de octubre agrega pruebas de cancelación del propietario, auditoría, reembolso simulado y concurrencia real con pago; los resultados de esa ampliación se registran por separado.

Estos resultados no son porcentajes de cobertura ni CP lógicos nuevos por suma automática. Los artefactos tienen retención limitada y cada candidato final de release necesita sus propios checks. Los 13 pasos manuales de entrega 1 permanecen como evidencia histórica de aquella revisión.

## Límite del hito y trabajo futuro

La consulta de reservas recibidas y el pago simulado ya forman parte de entrega 2. Cancelación, filtros temporales y otros requisitos fuera del alcance acordado no se implementan por completar esta documentación. Las pruebas E2E/UI se reservan para entrega 3 y no se ejecutan en este pipeline.


### Candidato de CA-05 de HU-14 — 29 de octubre de 2026

La regresión local de cancelación aprobó 150 Jest y 165 Pytest, TypeScript/Vite y Alembic upgrade/check. Incorporamos 16 pruebas frontend y 21 backend; sustituimos además las dos carreras existentes del escritor de prueba por solicitudes reales a pago/cancelación. Probamos reembolso y auditoría atómicos, rollback, permisos, límites, legados y liberación del horario. Es evidencia local del candidato, pendiente de CI/revisión/integración; no acredita actualización de la Wiki pública ni del VPS. La [justificación](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/develop/docs/cancelacion-ca05-entrega-2.md) delimita el acceso del propietario y mantiene E2E/UI para entrega 3.
