# Entrega 3

Pruebas de interfaz E2E integradas al pipeline de RentSmart. Actualización del **21 de noviembre de 2026**, cierre del release [`v3.0-entrega3`](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/releases/tag/v3.0-entrega3). Fuente versionada: [`docs/wiki/Entrega-3.md`](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/develop/docs/wiki/Entrega-3.md); el [registro acumulativo](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/develop/docs/entrega-3.md) conserva cada paso con su PR, commit y verificación. Pauta: [Entrega 3, semestre 2026-2](https://github.com/Pruebas-de-Software/HandsOnProject/blob/main/semestres/2026-2/entrega3.md).

## 1. Objetivo de la Entrega 3

Sumamos pruebas E2E/UI a la aplicación construida en la entrega 1 e integrada a CI/CD en la entrega 2, y las dejamos corriendo automáticamente en el pipeline. Cada cambio en el repositorio levanta la aplicación completa en un entorno temporal, ejecuta un navegador real sin interfaz visible y marca el build como **OK** o **FAIL**. Un fallo E2E bloquea el despliegue, deja reportes descargables y se informa en Slack.

También integramos los **requisitos finales** del backlog:

| Historia | Estado al cierre |
| --- | --- |
| HU-15 / REN-15 — cancelación del arrendatario | Integrada (PR #43); completa CA-03 de HU-13. |
| HU-09 / REN-9 — filtro por fecha y horario | Integrada (PR #44). |
| HU-18 / REN-18 — moderación administrativa | Integrada ([PR #45](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/pull/45)). |
| HU-17 / REN-17 — sugerencia de descripción con IA (API gratuita de Gemini) | Integrada ([PR #46](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/pull/46)). **CA-08 sigue pendiente:** falta la evidencia de una llamada real a Gemini, porque no tenemos clave. Sin clave, la aplicación informa que la sugerencia no está disponible. |

## 2. Herramienta E2E elegida

Usamos **Playwright con TypeScript y Chromium**. Es una de las alternativas a Selenium que admite la pauta (§1) y el equipo no la había utilizado: en las entregas 1 y 2 solo dejamos la dependencia instalada, sin casos.

Elegimos Playwright porque:
- **Mismo lenguaje:** comparte TypeScript con el frontend, así que reutilizamos sus tipos (`Space`, `Reservation`) en los datos de prueba.
- **Esperas automáticas:** espera los estados observables de la página sin pausas fijas, lo que reduce pruebas inestables.
- **Selectores accesibles:** localiza los elementos por rol y nombre accesible (`getByRole`, `getByLabel`) en vez de clases CSS. Así las pruebas se apoyan en lo que el usuario ve y obligan a mantener la interfaz accesible (Anexo A).
- **Evidencia incluida:** produce reportes HTML y JUnit, capturas y trazas en los fallos, y corre en modo headless en Linux sin configuración adicional.

**Pipeline:** mantenemos **GitHub Actions**, la herramienta de CI/CD de la entrega 2. La pauta de entrega 3 menciona Jenkins (§2.3, §2.4 y DoD). Decidimos continuar con Actions porque ya concentra build, pruebas, migraciones, smoke de infraestructura, despliegue y Slack; migrar exigía montar y mantener un controlador Jenkins y volver a verificar todo el flujo. Cumplimos lo mismo que la pauta exige: ejecución automática ante cambios, entorno levantado por el pipeline, navegador headless, resultado OK/FAIL, bloqueo del despliegue, evidencia y Slack. Presentamos esta decisión al profesor; su aceptación sigue pendiente.

## 3. Set de pruebas E2E

**19 casos integrados** (E3-16 llegó con PR #46), por encima del mínimo de 10 recomendado (§2.2). Código en [`frontend/e2e/`](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/tree/develop/frontend/e2e); la [guía E2E](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/develop/docs/testing/e2e.md) relaciona cada caso con sus criterios de aceptación.

| Caso | Qué valida | Escenario de la pauta |
| --- | --- | --- |
| E3-01 | Registrar una cuenta, iniciar sesión y conservarla al recargar. | Login / permisos |
| E3-02 | Una vista privada exige sesión; una contraseña incorrecta no da acceso. | Login / permisos |
| E3-03 | Publicar un espacio y encontrarlo en el catálogo y su detalle. | CRUD: crear, listar, ver |
| E3-04 | Editar nombre y precio y comprobar que persisten al recargar. | CRUD: editar |
| E3-05 | Eliminar un espacio sin reservas; desaparece del panel y del catálogo. | CRUD: eliminar |
| E3-06 | Campos obligatorios vacíos y precio bajo el mínimo muestran errores y no publican. | Validaciones / errores |
| E3-07 | Buscar, combinar tipo, comuna, precio y capacidad, ordenar y limpiar filtros. | Búsqueda / filtro |
| E3-08 (×2) | Filtrar por fecha y horario excluye bloqueos y admite horarios consecutivos; reservar revalida el conflicto. | Búsqueda / filtro |
| E3-09 | Reservar por la interfaz; el total contratado aparece en Mis reservas. | Flujo crítico de negocio |
| E3-10 | Otra cuenta no puede reservar un horario ocupado. | Validaciones / errores |
| E3-11 | Pago simulado rechazado y luego aprobado; el estado persiste al recargar. | Flujo crítico de negocio |
| E3-12 | El propietario consulta reservas recibidas y filtra por publicación. | Navegación clave |
| E3-13 | El propietario cancela una reserva pagada con reembolso simulado. | Flujo crítico de negocio |
| E3-14 (×2) | El arrendatario cancela una reserva pendiente o pagada y el horario queda libre. | Flujo crítico de negocio |
| E3-15 (×2) | La administración retira con motivo y restituye; una cuenta común no accede. | Login / permisos |
| E3-16 | Sin proveedor de IA, la sugerencia lo explica y se publica escribiendo a mano. | Validaciones / errores |

**Estrategia de datos (§2.3):** cada prueba crea sus propias cuentas, espacios y reservas ficticias con identificadores aleatorios, por lo que ninguna depende del orden ni de otra. La API solo prepara datos o contrasta lo guardado; la acción evaluada siempre pasa por el navegador. Toda la ejecución usa una base PostgreSQL temporal que se destruye al terminar. Solo aislamos una imagen externa ficticia (Anexo A); la aplicación, la API y la base de datos son reales.

## 4. Cómo ejecutar local

**Requisitos:** Docker con Compose (en Windows, Docker Desktop con contenedores Linux), Node.js 24, Git Bash o una terminal Linux/macOS.

```bash
cd frontend
npm ci
npx playwright install --with-deps chromium
cd ..
bash scripts/run-e2e.sh
```

El lanzador:
1. Crea un proyecto Compose con nombre aleatorio y contraseñas aleatorias.
2. Construye las imágenes de producción y aplica las migraciones.
3. Levanta Caddy, la API y PostgreSQL en un puerto local libre y comprueba versión y readiness.
4. Exporta `BASE_URL` y ejecuta Playwright en modo headless.
5. Al terminar, con éxito o con fallo, guarda los registros y elimina contenedores, volúmenes e imágenes del proyecto.

Opciones útiles: `bash scripts/run-e2e.sh --repeat-each=2 --workers=2` comprueba la independencia entre casos; `npx playwright show-report <carpeta>/report` abre el reporte HTML. Los reportes quedan en `frontend/test-results/e2e/run-*/` (ignorado por Git).

En Git Bash para Windows ejecutamos `MSYS2_ARG_CONV_EXCL=/app bash scripts/run-e2e.sh`, para que MSYS no convierta las rutas de los contenedores (ver §7).

## 5. Integración con CI/CD

| Elemento | Detalle |
| --- | --- |
| Dónde está | Job `e2e` de [`.github/workflows/ci.yml`](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/develop/.github/workflows/ci.yml), workflow **Pruebas RentSmart**. |
| Qué lo gatilla | Pull request y push hacia `develop` o `main`; ejecución manual (`workflow_dispatch`) con la opción `failure_probe=e2e` para el fallo controlado. |
| Orden | `frontend` y `backend` → `e2e` en paralelo con `production` (smoke de infraestructura) → `quality` → `deploy` (solo `main`) → `notify`. |
| OK / FAIL | `quality`, check obligatorio de la protección de ramas, falla si `e2e` no termina en `success`; `deploy` también exige `e2e` aprobado. Un E2E fallido bloquea el merge y la publicación. |
| Pasos del job | Instala dependencias congeladas y Chromium, ejecuta `scripts/run-e2e.sh`, sube el artefacto `e2e-results` siempre (también ante fallo) y escribe un resumen en la ejecución. |
| Variables | `BASE_URL` (el lanzador la toma del puerto temporal; Playwright rechaza destinos que no sean locales, para no correr nunca contra producción), `E2E_ARTIFACTS_DIR`, `E2E_FAILURE_PROBE` y `GEMINI_API_KEY` forzada vacía para que la CI no dependa de la IA externa. |
| Evidencia | Artefacto `e2e-results` con HTML, JUnit, registros de servicios y, en fallos, capturas y trazas; retención de 7 días. |
| Slack | `notify` informa el resultado de cada job, incluido `e2e`, en `#rentsmart-ci`; un E2E fallido, omitido o cancelado nunca se informa como éxito. |

## 6. Evidencias

| Evidencia | Enlace |
| --- | --- |
| Primera ejecución automática (12 casos) | [CI #44822253194](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/44822253194) · [registro](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/develop/docs/evidencias/REN-89-ci-e2e-2026-11-20.md) |
| Ejecución exitosa comparable | [CI #44828334713](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/44828334713): 12 E2E aprobadas, quality y notify en verde. |
| **Fallo controlado** | [CI #44828331317](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/44828331317): los 12 casos aprueban y una aserción real deliberadamente falsa falla; `e2e` y `quality` en rojo, deploy omitido, Slack informa FALLO. [Registro con captura y trazas](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/develop/docs/evidencias/REN-90-fallo-e2e-2026-11-20.md). |
| Estado integrado en `develop` | [CI #44842992822](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/44842992822) sobre `bc1bd19`: **16 E2E**, 170 Jest y 199 Pytest aprobadas; Slack ÉXITO. Artefacto `e2e-results` 14682535029. |
| HU-18 integrada | [PR #45, CI #44848349056](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/44848349056): 18 E2E, 176 Jest, 207 Pytest. |
| HU-17 integrada | [PR #46, CI #44947226199](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/44947226199), head final: **19 E2E, 185 Jest y 273 Pytest**. Las tres pruebas adversarias están publicadas como comentarios en la PR. |
| Release sobre `main` | Merge en `main` de [PR #{{RELEASE_PR}}](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/pull/{{RELEASE_PR}}): la [CI de `main`](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/workflows/ci.yml?query=branch%3Amain) repite las suites, despliega y notifica. El [Release](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/releases/tag/v3.0-entrega3) registra el SHA y la verificación del despliegue. |
| GitHub Release | [v3.0-entrega3](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/releases/tag/v3.0-entrega3): funcionalidades, defectos corregidos, pruebas, limitaciones e instrucciones de actualización. |
| Historias integradas | Evidencias de [REN-15](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/develop/docs/evidencias/REN-15-cancelacion-arrendatario-2026-11-20.md) y [REN-9](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/develop/docs/evidencias/REN-9-filtro-temporal-2026-11-20.md); detalle y verificación de [HU-18](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/develop/docs/HU-18.md) y [HU-17](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/develop/docs/HU-17.md). |

![Captura de la sonda de fallo en GitHub Actions: el catálogo real con su encabezado correcto](https://raw.githubusercontent.com/JorgeJaceval/Pruebas-De-Software-RentSmart/develop/docs/evidencias/REN-90-fallo-e2e-2026-11-20.png)

Los artefactos de Actions caducan a los 7 días; los registros versionados conservan qué contenían y cómo los verificamos. El [Release `v3.0-entrega3`](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/releases/tag/v3.0-entrega3) también registra la ejecución final sobre `main`.

## 7. Problemas encontrados y soluciones

| Problema | Solución |
| --- | --- |
| La configuración de Playwright apuntaba a `localhost` fijo y podía usarse contra cualquier servidor. | `BASE_URL` obligatorio por variable de entorno; la configuración rechaza destinos que no sean HTTP local, de modo que nunca corre contra producción. |
| Las pruebas compartían datos y dependían del orden. | Cuentas y datos ficticios únicos por prueba y una base temporal por ejecución; comprobamos la independencia con `--repeat-each=2 --workers=2`. |
| Las fotos de los espacios dependen de servidores externos. | Interceptamos solo esa imagen ficticia con un SVG fijo; la aplicación y la API siguen siendo reales. |
| Un `exit 1` en el job habría demostrado un paso rojo, no una prueba E2E fallida. | La sonda es una aserción real de Playwright contra la interfaz; `scripts/e2e_probe.py` solo la acredita si el JUnit muestra esa aserción fallida y no un error de preparación. |
| Al llegar a un límite de 90 días, el cambio de horario de verano hacía fallar la expectativa de una prueba (REN-9). | Corregimos el dato de prueba para comprobar el instante exacto; no cambiamos la regla de negocio. |
| Un UUID repetido en los datos de una prueba nueva (REN-15). | Corregimos el dato de prueba. |
| El registro público no puede crear administradores, pero E3-15 los necesita (REN-18). | El lanzador registra una cuenta ficticia y la promueve **solo en la base temporal**. |
| La IA externa haría la CI dependiente de la red y de una cuota (REN-17). | La CI corre sin clave: E3-16 cubre el caso sin proveedor y las sugerencias exitosas se prueban con un proveedor simulado. |
| Al vencer los 15 s de espera, el navegador no mostraba ningún mensaje; la prueba previa simulaba un rechazo que no ocurre (REN-17). | Se informa el tiempo agotado cuando la señal está abortada; nueva prueba con `App` y el `authRequest` real. |
| El plazo de 12 s era por operación del socket y no total, la respuesta se leía sin tope y una redirección reenviaba la clave (REN-17). | Plazo total de 12 s que cierra el socket, lectura de 64 KiB como máximo y ninguna redirección seguida. |
| Se aceptaban respuestas cortadas o bloqueadas, un campo podía cerrar el delimitador del prompt y no había límite por usuario (REN-17). | Solo se acepta `finishReason` `STOP`; `<` y `>` se escapan; límite de 5 sugerencias por minuto por usuario, con `429` y mensaje propio. |
| La limpieza de Markdown alteraba textos válidos (`_`, `#`, `3*4`) y con 64 KiB hostiles tardaba unos 9 s (REN-17). | Reglas con límites de palabra y rechazo de textos de más de 4.000 caracteres antes de las expresiones regulares. |
| La conexión a la base de datos quedaba retenida mientras se esperaba a Gemini; con 15 sugerencias lentas se agotaba el pool (REN-17). | La ruta libera esa conexión antes de llamar al proveedor. |
| Compose no pasaba a la API las variables `AI_*` (REN-17). | Se agregaron a ambos Compose y a los dos `.env*.example`; lo comprobamos con `docker compose config`. |
| En Git Bash para Windows, MSYS convertía `/app/.venv/bin/alembic` en una ruta de Windows y el nombre con tilde del administrador llegaba con otra codificación (`400`). | `MSYS2_ARG_CONV_EXCL=/app` al correr localmente y escape JSON `ó` en el nombre. En la CI (Linux) no ocurre. |
| Desde PR #48, Joaquín no está disponible para revisar. | Cada PR recibe revisiones adversarias de subagentes de IA, publicadas en la PR, y Jorge bajó a 0 la aprobación obligatoria en `develop` y `main`. No reemplaza la revisión de un integrante (ver §8). |

Las filas de REN-17, salvo la primera, vienen de las cuatro rondas adversarias de subagentes de IA sobre PR #46. Cada corrección tiene una prueba de regresión que falla sin ella.

## 8. Pendientes y mejoras futuras

- **Video de entrega 3 (§5.2): pendiente**; el enlace se agrega al publicarlo. Lo grabamos a partir del [guion](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/develop/docs/guion-video-entrega-3.md).
- **Evidencia real de IA (HU-17, CA-08):** configurar una clave gratuita de Google AI Studio y registrar una llamada real sin exponerla, con `app.ai_evidence` (ver [HU-17](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/develop/docs/HU-17.md)).
- **Clave de Gemini en el servidor:** producción tampoco tiene clave, así que la aplicación publicada informa que la sugerencia no está disponible. El resto de la publicación funciona igual.
- **Jira:** habilitar un campo estructurado de estimación (horas o Story Points); hoy la estimación está en las descripciones.
- **Validación docente** de la continuidad con GitHub Actions en lugar de Jenkins.
- **Revisión de otro integrante (§4.4 de las reglas generales): incumplida desde PR #48.** Hasta PR #47, el otro integrante aprobó cada PR. Desde PR #48, Joaquín no está disponible y Jorge bajó a 0 la aprobación obligatoria en `develop` y `main`; siguen obligatorios el PR, los checks y `enforce_admins`. Las PR reciben revisiones adversarias de subagentes de IA publicadas en cada PR, que no reemplazan esa revisión. En PR #46, Joaquín había pedido la evidencia real de CA-08 antes de aprobar; la integramos sin ella. La [matriz de cierre](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/develop/docs/cierre-entrega-3.md) lo registra.
- **Mejoras:** ejecutar también en Firefox y WebKit, sumar pruebas visuales y de accesibilidad automatizadas, medir la duración de la suite en el tiempo y compartir el límite de sugerencias entre procesos de la API (hoy se cuenta en la memoria de cada uno).

## Uso de inteligencia artificial

Usamos Codex y Claude Code como apoyo para planificar, implementar, probar y documentar; el [registro acumulativo](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/blob/develop/docs/entrega-3.md) detalla qué se generó en cada tarea. Validamos el resultado ejecutando las pruebas localmente y en CI y revisando el diff. Hasta PR #47, además, el compañero revisó cada PR antes del merge.

Desde PR #48, sin el compañero disponible, subagentes de IA de Claude Code hacen revisiones adversarias de cada PR. Reciben el encargo sin el historial de la conversación y publicamos su resultado como comentario en la PR. En HU-17, tres de esas revisiones encontraron los defectos de §7, que corregimos con sus pruebas de regresión. No sustituyen la revisión de otro integrante que exige §4.4, como registramos en §8. Somos responsables de entender, probar y explicar todo el código entregado.
