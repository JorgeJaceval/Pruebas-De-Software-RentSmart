# Guion propuesto para la cápsula de entrega 3

Cubre los cinco puntos que pide la pauta (§5.2): alcances de la solución, herramienta E2E y cómo corre, paso a paso del trabajo, integración con el pipeline y ejecución automática, y problemas con sus soluciones. Duración objetivo: **10–12 minutos**. El video publicado y su comprobación de acceso se registran al cerrar; este guion no es la grabación.

## Antes de grabar

- Usar la revisión final integrada en `main` y confirmar que su CI terminó en verde; anotar el SHA y la ejecución.
- Tener abiertos: la [Wiki Entrega 3](wiki/Entrega-3.md), `frontend/e2e/`, `scripts/run-e2e.sh`, `.github/workflows/ci.yml`, una ejecución aprobada, la [sonda de fallo #44828331317](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/44828331317), el canal `#rentsmart-ci` y el tablero de Jira.
- Dejar listo un reporte HTML local (`npx playwright show-report frontend/test-results/e2e/run-*/report`) para mostrarlo sin esperar el build.
- No mostrar `.env`, `shared/.env`, claves, el webhook de Slack ni cabeceras de autenticación. Usar solo cuentas ficticias.

## Recorrido y narración

| Tiempo | Pantalla y narración |
| --- | --- |
| 0:00–0:45 | **Objetivo y alcances.** «En la entrega 3 sumamos pruebas de interfaz E2E a RentSmart y las integramos al pipeline: cada cambio levanta la aplicación, corre un navegador real y bloquea el despliegue si algo falla. Además completamos los requisitos finales: cancelación del arrendatario, filtro por fecha y horario, moderación administrativa y sugerencia de descripción con IA.» Mostrar la tabla de la §1 de la Wiki. |
| 0:45–2:00 | **Herramienta E2E y por qué.** «Elegimos Playwright con TypeScript y Chromium, una alternativa a Selenium que la pauta admite y que no habíamos usado. Comparte lenguaje con el frontend, espera los estados de la página sin pausas fijas y produce reportes, capturas y trazas.» Abrir `spaces.spec.ts` y señalar los selectores por rol y etiqueta. Explicar por qué seguimos con GitHub Actions en vez de Jenkins (§2 de la Wiki). |
| 2:00–3:30 | **Set de pruebas.** Recorrer la tabla de casos E3-01 a E3-16 y agruparlos según la pauta: login y permisos, CRUD completo de espacios, validaciones, búsqueda y filtros, reserva, pago y cancelación, moderación e IA. «Cada prueba crea sus propias cuentas y datos y usa una base de datos temporal; ninguna depende de otra.» |
| 3:30–5:30 | **Cómo corre en local (paso a paso).** Mostrar `scripts/run-e2e.sh`: proyecto Compose aleatorio, contraseñas aleatorias, migraciones, readiness y `BASE_URL`. Ejecutarlo o mostrar una ejecución grabada: los casos en verde y la limpieza final. Abrir el reporte HTML y un caso con sus pasos. |
| 5:30–7:15 | **Integración con el pipeline.** Abrir `ci.yml`: el job `e2e` después de frontend y backend, en paralelo con el smoke; `quality` exige los cuatro y `deploy` exige E2E. Abrir una ejecución aprobada, el resumen del job y el artefacto `e2e-results`. Mostrar que el trigger es cada PR y push a `develop`/`main`. |
| 7:15–8:45 | **Fallo controlado y Slack.** Abrir la sonda #44828331317: los 12 casos aprueban, una aserción real deliberadamente falsa falla, `e2e` y `quality` quedan en rojo y el despliegue se omite. Abrir la captura y la traza del artefacto. Mostrar en `#rentsmart-ci` el mensaje de ÉXITO de una ejecución normal y el de FALLO de la sonda. |
| 8:45–10:15 | **Problemas y soluciones.** Recorrer la §7 de la Wiki: `BASE_URL` fijo y protección contra producción, datos compartidos y base temporal, imagen externa aislada, sonda real en vez de `exit 1`, horario de verano en una prueba, cuenta administrativa en base temporal, IA fuera de la CI y rutas de Git Bash en Windows. |
| 10:15–11:30 | **Metodología y cierre.** Mostrar Jira (épica REN-85 y tarjetas REN-86 a REN-92), las ramas y PR con su clave y la revisión cruzada antes de cada merge. Mostrar `main`, el tag y el Release `v3.0-entrega3`. Mencionar los pendientes de la §8 y el uso de IA declarado. |

## Evidencias para abrir

| Evidencia | Enlace |
| --- | --- |
| Primera ejecución automática | [#44822253194](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/44822253194) |
| Ejecución normal comparable | [#44828334713](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/44828334713) |
| Fallo controlado | [#44828331317](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/44828331317) y [registro con captura](evidencias/REN-90-fallo-e2e-2026-11-20.md) |
| Estado integrado de `develop` | [#44842992822](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/44842992822) (16 E2E) |
| Revisión final en `main` | Completar al cerrar: SHA, ejecución y Release. |

Si se graba antes de integrar PR #46, se dice explícitamente que HU-17 está en revisión y se muestra su ejecución de CI, sin presentarla como integrada.
