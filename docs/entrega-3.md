# Entrega 3 — planificación y registro de trabajo

Fecha de inicio: **20 de noviembre de 2026**, America/Santiago. Épica: [REN-85](https://rentsmartpsf.atlassian.net/browse/REN-85). Responsable inicial de las tarjetas nuevas: Joaquín Viveros. Revisión de PR: Jorge Aceval.

**Plazo informado por el usuario:** entrega el **20 de noviembre de 2026**, hoy; hora límite no informada. Por su indicación dejamos presentación y video para el final y priorizamos trabajo técnico. No eliminamos el video obligatorio del cierre ni declaramos que los requisitos pendientes estén aceptados por el profesor.

## 1. Objetivo y base verificada

Incorporamos pruebas E2E/UI headless a la aplicación y al pipeline heredados, completamos los requisitos finales comprometidos y conservamos evidencia reproducible de éxito, fallo y bloqueo de publicación.

Partimos de [v2.0-entrega2](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/releases/tag/v2.0-entrega2), sobre `main` `e3d25fbd603e8dd3e1f753ca065cfba70404339b`. [PR #36](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/pull/36) está integrada; el Release incluye video, CI y despliegue final. [PR #37](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/pull/37) sincronizó `develop` mediante `bd599ac34110aff10d1d168851c14f592e2d228d`, base de esta planificación. No presentamos las comprobaciones de noviembre como una nueva ejecución de las pruebas de octubre.

La base documentada tiene 150 Jest y 165 Pytest, más 26 comprobaciones de infraestructura separadas. Son casos aprobados, no cobertura porcentual. Playwright y `test:e2e` ya están configurados, pero `frontend/e2e` no existe en la base y el workflow no contiene una etapa E2E. La configuración actual fija localhost; falta `BASE_URL` por entorno.

## 2. Fuentes y decisiones de alcance

Contrastamos los documentos `entregas.md` y `entrega3.md` proporcionados por el equipo, las historias de Jira y el código integrado. Sus archivos originales están en Descargas del equipo; no son necesarios para ejecutar el repositorio. Los títulos de sección siguientes permiten contrastar la planificación con la pauta recibida.

| Exigencia / fuente | Decisión y evidencia requerida |
| --- | --- |
| Entrega 3, §2.1: herramienta E2E o alternativa admitida | Proponemos Playwright/TypeScript con Chromium, ya incorporado como dependencia, sin afirmar que la suite exista. |
| §2.2 recomienda 10 pruebas; §3 menciona 5 | Adoptamos **al menos 10 casos**; proponemos 15 escenarios trazados en §5. No contamos reintentos o navegadores como casos funcionales nuevos. |
| §2.3: headless, BASE_URL, app/dependencias y datos | Entorno temporal aislado, migraciones y fixtures reproducibles. Sin datos ni volúmenes del VPS. |
| §2.3–2.4 y DoD: automatización, OK/FAIL y Slack | E2E debe bloquear publicación, conservar reportes y participar en el resultado notificado. |
| §4: Kanban, GitFlow y estimación | Tarjetas con responsable, prioridad y criterios; rama/commit/PR con clave. Falta habilitar campo estructurado de estimación; horas provisionales en descripciones no sustituyen ese requisito. |
| §5 y Anexo B: código, video y documento/Wiki | Wiki Entrega 3, instrucciones, problemas/soluciones, evidencia y cápsula accesible. |
| Reglas generales, §3 y §4.5/4.10 | Requisitos finales, main estable por PR, tag/Release `v3.0-entrega3`; confirmar fecha y selección de presentación en Aula. |

**Decisión de CI — 20 de noviembre de 2026:** por instrucción explícita del usuario mantenemos GitHub Actions para entrega 3 y justificaremos posteriormente la continuidad al profesor. Esto resuelve la elección técnica del equipo y permite implementar REN-89 sin esperar una consulta; no equivale a aceptación docente.

La justificación combina la alternativa explícita de GitHub Actions en §3.3 de entrega 2 con la continuidad del pipeline utilizado desde entrega 1 y ampliado en entrega 2. Reutilizamos build, pruebas, migraciones, smoke, despliegue, reportes y Slack para incorporar E2E como control obligatorio. Migrar a Jenkins exigiría instalar y mantener un controlador/agente, integrar GitHub y credenciales, trasladar las etapas y volver a verificar disparadores, resultados, artefactos, Slack y bloqueo de publicación. Es trabajo adicional de infraestructura y verificación para el plazo de hoy; no afirmamos que sea imposible ni atribuimos horas de migración medidas.

La equivalencia que debemos demostrar es observable: ejecución automática ante cambios, navegador headless, entorno aislado, resultado OK/FAIL, fallo E2E que bloquea deploy, evidencia y avisos Slack. Entrega 3 menciona Jenkins expresamente en §2.3, §2.4 y DoD; conservamos esa discrepancia para la justificación docente y no presentamos la equivalencia técnica como autorización ya concedida.

**Fuera del alcance añadido:** pagos reales, nueva infraestructura de alta disponibilidad, pruebas de carga y funcionalidades no vinculadas al backlog final. La entrega E2E no demuestra esos atributos.

## 3. Requisitos finales y discrepancias de trazabilidad

| Historia / tarea existente | Estado contrastado con código y documentación | Trabajo restante propuesto |
| --- | --- | --- |
| [REN-9 / HU-09](https://rentsmartpsf.atlassian.net/browse/REN-9) | Reabierta En curso para completar CA-04/06 y parte temporal de CA-05. Candidato verificado en §9.6. | Revisión/integración del filtro temporal y publicación final; no se declara cierre por estado Jira antiguo. |
| [REN-13 / HU-13](https://rentsmartpsf.atlassian.net/browse/REN-13) | En la base, CA-03 era parcial; PR #43 integrada completa cancelación mediante REN-15. | Publicación y evidencia final de entrega 3; no duplicamos la historia. |
| [REN-15 / HU-15](https://rentsmartpsf.atlassian.net/browse/REN-15) | Finalizada tras integración de PR #43 mediante e991caf; ensayos en §3.1. | Publicación final en main/VPS, sin repetir implementación. |
| [REN-17 / HU-17](https://rentsmartpsf.atlassian.net/browse/REN-17) | Por hacer. | Integración real de IA para sugerir descripción, aceptación explícita, límites/errores y claves solo en backend. Proveedor simulado en pruebas y evidencia real independiente. |
| [REN-18 / HU-18](https://rentsmartpsf.atlassian.net/browse/REN-18) | Por hacer. | Moderación: listado privado, retiro con motivo/auditoría y restitución a inactivo, preservando reservas y contratos. |
| [REN-66](https://rentsmartpsf.atlassian.net/browse/REN-66) | En curso con descripción antigua de dependencia de HU-14. `OwnedSpaces.tsx` ya enlaza reservas recibidas y `OwnedSpaces.test.tsx` verifica el destino. | Conciliar descripción y estado con evidencia revisada; no desarrollar otra vez el acceso ni contabilizarlo como función nueva. |

Estas son discrepancias comprobadas, no transiciones ya realizadas en las tarjetas antiguas. Las épicas antiguas también requieren conciliación según sus hijos; no son funciones adicionales. Conservamos sus vínculos y criterios originales.

### 3.1. Registro funcional REN-15 — cancelación del arrendatario, 20 de noviembre de 2026

1. Creamos `feature/REN-15-cancelacion-arrendatario` desde `develop` `9292a9a`, independiente de PR #42 (REN-90), que continúa pendiente de revisión/integración. No integramos PR por nuestra cuenta. Conservamos la responsabilidad de Joaquín y el estado En curso de REN-15.
2. Conectamos Mis reservas con `ReservationCancelControl` y la API compartida de entrega 2. Reutilizamos confirmación accesible, reembolso simulado, prevención de doble envío y descarte de respuestas tardías. No cambiamos backend, migraciones ni reglas transaccionales.
3. El resultado confirmado actualiza el contrato/pago de la tarjeta, retira pagar/cancelar, la mueve a historial ordenado por inicio descendente/UUID y anuncia el horario liberado. Actualizar vuelve a consultar al servidor y limpia el aviso; no inventamos una nueva hora `as_of` del listado completo por modificar una sola fila.
4. Añadimos doce comprobaciones Jest sobre confirmación, pendientes/rechazados/aprobados, errores, doble envío, historial y navegación/cierre/vencimiento de sesión. Ajustamos el test anterior que exigía un botón deshabilitado. El primer ensayo detectó un UUID duplicado en los datos ficticios del nuevo test; corregimos ese fixture. La regresión final aprueba **162 Jest**, TypeScript y Vite.
5. E3-14 añade dos casos de navegador real: pendiente sin reembolso y pagada con reembolso. Ambos consultan tras recargar, contrastan idempotencia por API y solicitan por UI una nueva reserva del mismo intervalo. La suite local completa aprueba **14 casos**, 0 fallos/errores/omitidos, dos workers y cero reintentos, reporte `run-GEtKUM19` (10,98 s de tests). Metadatos: `source_head=9292a9a`, `source_dirty=true`; es el árbol candidato, no el contenido puro del HEAD base. La limpieza eliminó el proyecto propio y la demo previa conserva sus tres servicios healthy.
6. Documentamos [HU-15](HU-15.md), completamos la trazabilidad de CA-03 en HU-13 y actualizamos README/guía/matriz. Las pruebas existentes de PostgreSQL comprueban auditoría, permisos, límites exactos y carreras transaccionales; los E2E no se atribuyen esas comprobaciones internas. La [PR #43](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/pull/43) publica `c93347e` hacia develop. La CI ejecuta la regresión backend y el candidato identificado por su SHA; sus resultados finales se registran en PR/Jira. Conservamos [evidencia local y límites](evidencias/REN-15-cancelacion-arrendatario-2026-11-20.md).
7. Avance estimado de entrega 3: **54%**, incluyendo candidatos verificados pendientes de revisión; no equivale a nota ni cobertura. Permanecen filtro temporal, IA, moderación, conciliación/Wiki, video y release, además de integración/publicación. La aceptación docente de Actions y el campo estructurado de estimación siguen pendientes.

**Uso de IA:** Codex apoyó integración, tests y documentación. Contrastamos con criterios de Jira y ensayos reales; revisión humana, integración y despliegue no se dan por realizados.

## 4. Backlog técnico, estimación y secuencia

Creamos las siguientes tareas bajo REN-85, todas asignadas a Joaquín y con etiqueta `entrega-3`. Son estimaciones iniciales de horas-persona, incluyen verificación/revisión y no son horas trabajadas ni compromisos de fecha.

| Orden | Tarea | Estimación | Dependencias / salida |
| --- | --- | --- | --- |
| 1 | [REN-86: alcance y matriz](https://rentsmartpsf.atlassian.net/browse/REN-86) | 2 h | Esta planificación y PR revisada; conciliación explícita de inconsistencias. |
| 2 | [REN-87: entorno Playwright](https://rentsmartpsf.atlassian.net/browse/REN-87) | 4 h | Entorno aislado, BASE_URL, fixtures y primer recorrido real. |
| 3 | [REN-88: suite crítica](https://rentsmartpsf.atlassian.net/browse/REN-88) | 10 h | Inicia con funciones existentes; se amplía al integrar requisitos finales. |
| 4 | [REN-89: control E2E de CI/CD](https://rentsmartpsf.atlassian.net/browse/REN-89) | 4 h | Entorno estable; GitHub Actions elegido por el equipo, con suite básica antes de ampliar. |
| 5 | [REN-90: evidencias y fallo controlado](https://rentsmartpsf.atlassian.net/browse/REN-90) | 3 h | Suite/CI; fallo de una aserción E2E, bloqueo y aviso comprobados. |
| 6 | [REN-91: Wiki y video](https://rentsmartpsf.atlassian.net/browse/REN-91) | 4 h | Documentación incremental; grabación sobre candidato verificable. |
| 7 | [REN-92: release final](https://rentsmartpsf.atlassian.net/browse/REN-92) | 3 h | Requisitos, CI, revisión, video y evidencia completos. |

Subtotal técnico/editorial: **30 h-persona**, sin sumar nuevamente la épica. Para el trabajo funcional restante proponemos una reestimación inicial: REN-9 5 h, REN-15/criterio de REN-13 4 h, REN-17 6 h y REN-18 6 h: **21 h-persona**. Son propuestas de este documento, todavía no actualizadas como estimación estructurada en esas historias. Total inicial **51 h-persona**, sujeto a revisión tras el primer E2E, la decisión CI y el análisis de cada historia; no es una fecha de entrega.

Secuencia de implementación: REN-86 → REN-87 → primeros casos REN-88/CI REN-89 → requisitos finales en ramas propias con sus pruebas → completar REN-88 → REN-90 → REN-91/92. Documentamos en cada paso. REN-15 es el primer requisito funcional propuesto porque reutiliza API y control del propietario existentes.

Con el plazo del mismo día confirmado, priorizamos una suite mínima de al menos 10 casos sobre flujos ya implementados y el control de publicación/evidencias. Después abordamos los requisitos funcionales pendientes, comenzando por REN-15, sin contarlos como terminados ni excluirlos unilateralmente. Las 51 h-persona son una estimación inicial del alcance completo, no una promesa de terminarlo en el día; registramos cualquier recorte con su decisión explícita. Video/presentación quedan al final por indicación del usuario.

## 5. Matriz inicial de escenarios E2E

La matriz partió sin casos automatizados. REN-87 incorporó E3-01 y E3-02; REN-88 amplía el candidato a doce casos: E3-01–07 y E3-09–13. REN-15 incorpora dos variantes de E3-14, llevando el candidato a catorce casos ejecutables. REN-9 incorpora dos recorridos E3-08 y lleva el candidato a dieciséis casos. REN-18 incorpora dos recorridos E3-15 y completa la matriz con dieciocho casos ejecutables. Los resultados se registran en §9 y no se confunden con ejecución automática en CI. El diseño se concreta al implementar cada caso; estas filas por sí solas no son evidencia ni conteo acreditado. Los flujos verifican UI real con API/PostgreSQL reales; permitimos API para preparar datos sin sustituir las acciones de usuario evaluadas y aislamos únicamente una foto ficticia externa para no depender de terceros.

| Caso | Historia relacionada | Acción y resultado observable | Dependencia |
| --- | --- | --- | --- |
| E3-01 | REN-1/2 | Registrar cuenta e iniciar sesión; llegar a vista privada con identidad correcta. | Entorno y datos únicos. |
| E3-02 | REN-2 | Credenciales incorrectas y acceso privado sin sesión no conceden acceso. | Sesión aislada. |
| E3-03 | REN-3/8 | Publicar espacio válido y encontrarlo en catálogo/detalle. | Propietario ficticio. |
| E3-04 | REN-4/7 | Editar publicación propia y comprobar datos guardados tras consultar de nuevo. | Espacio propio. |
| E3-05 | REN-6 | Eliminar publicación sin reservas y comprobar que desaparece. | Espacio exclusivo desechable. |
| E3-06 | REN-3 | Formulario incompleto/inválido muestra errores y no anuncia creación. | Validaciones existentes. |
| E3-07 | REN-9 | Combinar filtros existentes, ordenar y limpiar sin perder coherencia del catálogo. | Datos con precios/capacidades distintos. |
| E3-08 (dos recorridos) | REN-9/11/12 | Intervalo completo filtra bloqueos/horario y acepta consecutivos; una reserva posterior a la búsqueda produce conflicto al solicitar por UI. | Candidato REN-9 verificado, revisión/integración pendientes. |
| E3-09 | REN-12/13 | Reservar bloque libre; comprobar total contratado y aparición en Mis reservas. | Bloque futuro según reloj real. |
| E3-10 | REN-12 | Otra cuenta intenta el mismo bloque y encuentra conflicto. No se presenta como ensayo de carga o carrera coordinada. | Dos sesiones y reserva bloqueante vigente. |
| E3-11 | REN-16 | Rechazar pago y aprobar reintento vigente; consultar estado e importe persistidos. | Crear reserva justo antes del pago. |
| E3-12 | REN-14 | Propietario consulta reservas recibidas y filtra por publicación propia. | Dos espacios y reservas identificables. |
| E3-13 | REN-14/15 | Propietario cancela reserva pagada futura; historial muestra cancelación y reembolso simulado. | Reserva propia del ensayo, sin afectar otros casos. |
| E3-14 (dos variantes) | REN-13/15 | Arrendatario cancela pendiente/pagada, recarga historial, repite idempotentemente y vuelve a reservar el mismo intervalo. | REN-15 integrada mediante PR #43; publicación final pendiente. |
| E3-15 (dos recorridos) | REN-18 | Administrador retira con motivo, propietario ve restricción y restitución deja el espacio inactivo; una cuenta común no accede. | REN-18 integrada mediante PR #45. |

REN-17 agrega pruebas específicas con proveedor aislado y evidencia de una llamada real sin secretos; podemos incorporar un E2E de aceptación/descarte de sugerencia con proveedor de prueba controlado. No subordinamos toda la CI a disponibilidad/coste de una API externa.

## 6. Contrato propuesto del entorno y del pipeline

- Chromium headless y `BASE_URL` configurable. Preferimos comprobar el ensamblaje con Caddy, API y PostgreSQL en un proyecto Compose temporal del runner, reutilizando el contrato de producción sin reutilizar sus datos.
- Esperamos readiness antes de ejecutar navegador. Aplicamos migraciones y preparamos datos ficticios identificables por ejecución. Cada prueba tiene sus recursos y sesión; ninguna exige que otra se ejecute primero.
- El arranque y la limpieza solo afectan al proyecto temporal propio, también ante fallo. No fijamos el reloj del VPS ni ejecutamos pruebas destructivas contra él.
- Usamos selectores accesibles estables o `data-testid` cuando haga falta; esperamos estados observables, sin pausas arbitrarias que oculten fallos.
- La futura etapa E2E debe preceder a deploy como dependencia obligatoria. Conservamos quality, smoke, Jest/Pytest, migraciones y verificaciones posteriores existentes.
- Reportes HTML/JUnit, logs y trazas/capturas de fallo se conservan como artefactos con retención documentada. Un error no impide intentar recolectar evidencia y limpiar recursos.
- Un fallo E2E controlado debe producir FAIL, impedir deploy y quedar identificado en Slack. Evitamos presentar un simple `exit 1` del job como si fuese una prueba UI fallida.
- Registramos reintentos e inestabilidad; no contamos una prueba como evidencia de estabilidad solo porque pasó en un reintento. El equipo decidió continuar con GitHub Actions; la aceptación docente se justificará después y no se presume concedida.

## 7. Insumos pendientes del equipo

| Insumo | Cuándo lo necesitamos | Estado al iniciar |
| --- | --- | --- |
| Justificación docente de continuidad con Actions | Presentamos la decisión y evidencias de equivalencia funcional al profesor. | El usuario decidió mantener Actions y justificarlo posteriormente. Implementamos REN-89 sin esperar esa consulta; aceptación docente pendiente, sin afirmar una excepción concedida. |
| Campo de estimación en Jira | Para completar la planificación exigida por la pauta. Un administrador debe habilitar horas o Story Points en los tipos pertinentes. | Los metadatos de creación de Tarea/Epic no exponen estimación. Horas en descripción son provisionales. |
| Fecha de entrega y selección de presentación | Para calendarizar revisión/cierre. | El usuario informa entrega hoy, 20 de noviembre de 2026; falta hora límite. Presentación y video se postergan al final por su indicación. |
| Proveedor/credencial de IA y presupuesto | Antes de verificar la integración real de REN-17. | Se solicitarán al abordar esa historia; no enviar claves por chat. |
| Video y aprobación de PR | Durante REN-91/92 y cada integración. | El video de entrega 2 no sustituye al de entrega 3. |

No necesitamos un VPS adicional para comenzar E2E. Los secretos existentes de producción no se copian a fixtures.

## 8. Cierre y medición de avance

El porcentaje comunicado corresponde **solo a entrega 3**, incluye video y release y no equivale a nota, cobertura, cantidad de pruebas ni porcentaje de historias Jira finalizadas.

| Bloque | Peso orientativo |
| --- | --- |
| Planificación y trazabilidad reconciliada | 10% |
| Requisitos finales y regresión correspondiente | 35% |
| Entorno E2E reproducible | 10% |
| Suite E2E crítica completa | 15% |
| Integración de CI/CD | 10% |
| Evidencias y Slack | 5% |
| Wiki y documentación | 5% |
| Video / preparación de presentación si corresponde | 5% |
| Release y verificación final | 5% |

Avance estimado al preparar REN-86: **8%**, con plan y tarjetas creados, pero revisión/integración, conciliación final y campo de estimación pendientes. El scaffolding existente no acredita E2E ejecutadas.

Para cerrar: criterios funcionales terminados o decisión de alcance explícita, al menos 10 E2E críticas automatizadas, ejecución automática que falle y bloquee correctamente, evidencias de éxito/fallo y Slack, Wiki publicada desde fuentes revisadas, video accesible, PR final aprobada hacia main, despliegue comprobado y tag/Release `v3.0-entrega3`. La entrega a Aula debe registrarse separadamente de la publicación técnica.

## 9. Registro acumulativo

### 9.1. REN-86 — planificación inicial, 20 de noviembre de 2026

1. Verificamos cierre de entrega 2 en GitHub y su sincronización con develop. Actualizamos referencias remotas y creamos `feature/REN-86-planificacion-entrega3` desde `bd599ac`.
2. Contrastamos pautas, configuración Playwright, workflow y código de catálogo/paneles. Identificamos las discrepancias REN-9/13/66; todavía no cambiamos su estado ni afirmamos nuevas pruebas funcionales.
3. Creamos REN-85 y REN-86 a REN-92, con criterios, prioridad, responsable y estimación descriptiva. REN-85/86 están En curso; las restantes Por hacer. No duplicamos historias funcionales.
4. Definimos matriz de 15 escenarios, secuencia, límites, insumos y medición que incluye video/release. El usuario confirmó pendiente la consulta sobre Actions.
5. Añadimos enlace de entrada en README y extendemos la convención de registro en CONTRIBUTING a entrega 3. La Wiki pública se documentará/publicará en REN-91, no mediante esta planificación.
6. Verificamos 69 destinos locales de Markdown en los tres documentos afectados, bloques de código, 15 identificadores de escenarios, pesos que suman 100% y estimaciones 30 + 21 = 51 h-persona. `git diff --check` aprobó antes del commit. No ejecutamos regresión funcional local por tratarse solo de documentación; la CI remota conserva su ejecución habitual y su resultado se registra en REN-86/PR. Este cambio no modifica código, workflow, datos, contenedores ni producción; no presentamos este documento como prueba E2E implementada.
7. El usuario confirmó plazo para hoy y pidió dejar video/presentación al final. Repriorizamos entorno, suite mínima crítica, CI y evidencia; no eliminamos requisitos ni atribuimos una excepción docente.
8. El usuario decidió mantener GitHub Actions y justificarlo posteriormente al profesor. Actualizamos decisión, dependencia de REN-89 y Jira con continuidad, coste de migración y evidencia funcional requerida. No cambiamos el workflow ni afirmamos aceptación docente. La [CI previa #44810353559](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/44810353559) aprobó frontend/backend/quality/production/notify y omitió deploy sobre `fd6bf8c`; ese resultado no se atribuye automáticamente a commits posteriores.

**Uso de IA:** utilizamos Codex como apoyo para analizar pautas/código y redactar planificación y tarjetas. Contrastamos el resultado con fuentes locales, metadatos/estados de Jira y GitHub; la revisión humana de PR sigue pendiente.

### 9.2. REN-87 — entorno y primeros recorridos E2E, 20 de noviembre de 2026

1. Creamos `feature/REN-87-entorno-e2e` desde el candidato de REN-86 `9203ba2`, con el mismo código funcional que `develop`. PR #38 de planificación seguía abierta al iniciar; este cambio depende de su integración y no la reemplaza ni la integra autónomamente.
2. Preparamos `scripts/run-e2e.sh`: proyecto Compose aleatorio, secretos temporales, imágenes y volúmenes propios, puerto loopback automático, migraciones/check y readiness antes del navegador. Conservamos logs y reportes por ejecución y limpiamos solo los recursos propios, también ante fallo.
3. Configuramos `BASE_URL` obligatoria y limitada a HTTP local, Chromium headless, límites de tiempo, reportes HTML/JUnit, trazas/capturas ante fallo y cero reintentos iniciales. Eliminamos el arranque automático de Vite/API y la reutilización de servidores por puertos fijos.
4. Agregamos fixtures de cuentas distintas por caso y contexto limpio. E3-01 registra e inicia sesión por UI y recarga; E3-02 comprueba acceso privado y contraseña incorrecta de una cuenta preparada por API. No simulamos las respuestas del backend.
5. Documentamos instalación, ciclo de vida, datos y límites en [la guía E2E](testing/e2e.md) y actualizamos README. La etapa de CI E2E sigue pendiente de REN-89 y la suite mínima de REN-88.
6. Problemas locales: la primera ejecución no pudo preparar PostgreSQL con el disco lleno. Liberamos caché Docker sin uso y regenerable, sin eliminar imágenes/volúmenes de la demo. El siguiente intento aplicó migraciones/readiness pero no abrió navegador porque Chromium instalado era de otra revisión; instalamos el correspondiente al lockfile y añadimos preflight de navegador antes de crear recursos. Esos intentos fallidos limpiaron sus proyectos y no acreditan una E2E aprobada ni el bloqueo de deploy.
7. Verificación previa: TypeScript/Vite y 150 Jest aprobados. Jest requirió ejecución fuera del sandbox local por la validación de caché del binding nativo SWC. Descubrimos dos casos y comprobamos que BASE_URL ausente o externa se rechaza antes de iniciar navegador/contactar servidor; `bash -n` y `git diff --check` aprobaron. Los resultados completos de navegador se registrarán al finalizar su ejecución.
8. Primer recorrido completo local: **2 E2E aprobadas, 0 fallos**, Chromium con dos workers y sin reintentos, reporte `run-Ys84ePET` (2,4 s de tests, excluye preparación/build). Conservamos HTML/JUnit/logs; `source_head=9203ba2` y `source_dirty=true` identifican que ensayamos el árbol candidato aún sin commit, no el contenido puro de ese HEAD. Comprobamos ausencia de contenedores/volúmenes de `rentsmart-e2e-5f38fe4328b1` tras limpiar y los tres servicios de demo existentes siguen healthy. ShellCheck del lanzador aprobó. Avance estimado entrega 3: **18%**, sin acreditar suite mínima, integración E2E de CI, revisión humana ni release.
9. Repetimos los dos casos con dos workers sobre **`36e1b5bf397a808ffff47eeb2fbad8aedc5a8f99`**, `source_dirty=false`: cuatro ejecuciones aprobadas, 0 fallos, sin reintentos; son dos casos, no cuatro casos nuevos. Conservamos [la evidencia local](evidencias/REN-87-e2e-2026-11-20.md), reportes y limpieza comprobada. PR #38 quedó aprobada e integrada en `develop` mediante `beaad6e`; la PR de REN-87 no necesita incorporar nuevamente su planificación.

**Uso de IA:** Codex apoyó código de infraestructura, configuración, fixtures, pruebas y documentación. Verificamos el resultado con build, regresión y ejecuciones reales aisladas; no atribuimos revisión humana ni publicación a código todavía en candidato.

### 9.3. REN-88 — suite E2E crítica, 20 de noviembre de 2026

1. Verificamos aprobación e integración de PR #39 mediante `bcbe109bbcb08627487000711b56362d95d5fd30` en `develop`; creamos `feature/REN-88-suite-e2e` desde esa revisión. REN-87 queda finalizada en Jira e iniciamos REN-88; no integramos PR autónomamente.
2. Añadimos diez casos a los dos iniciales: publicar/consultar, editar, eliminar, validar formulario, buscar/ordenar/filtrar/limpiar, reservar, rechazar superposición, pagar con rechazo/reintento, consultar recibidas y cancelar como propietario. Las acciones evaluadas se realizan en Chromium contra API/PostgreSQL reales.
3. Ampliamos fixtures con cuentas propietaria/arrendataria y espacios/reservas independientes. Calculamos fechas futuras en Santiago con el reloj real. La API solo prepara datos o contrasta persistencia; no reemplaza la acción UI que se evalúa. Aislamos una imagen ficticia externa con SVG fijo, sin interceptar respuestas de aplicación.
4. Primer ensayo sobre árbol candidato `source_dirty=true`: **12 casos aprobados, 0 fallos/omitidos, dos workers y sin reintentos**, 9,3 s de tests, reporte `run-PZTuB3NO`. TypeScript/Vite y `git diff --check` aprobaron. No atribuimos este ensayo al contenido puro del HEAD base `bcbe109`.
5. Documentamos criterios y límites por caso en [la guía](testing/e2e.md). E3-08/14/15 y la etapa Actions siguen pendientes. Alcanzar doce casos no completa las funciones finales, el pipeline, video ni release. Avance estimado entrega 3: **32%**, sujeto a revisión/integración.
6. Repetición sobre **`c4f63725119cfeccc816430898f713e6e106be2b`**, `source_dirty=false`: **24 ejecuciones aprobadas de 12 casos únicos**, dos workers y sin reintentos, fallos u omisiones (27,3 s de tests). Conservamos [evidencia y límites](evidencias/REN-88-e2e-2026-11-20.md). Comprobamos ausencia de contenedores/volúmenes del proyecto temporal y demo previa healthy. Los cambios posteriores solo documentan estos resultados.

**Uso de IA:** Codex apoyó fixtures, helpers, pruebas y documentación. Contrastamos criterios con Jira y verificamos comportamiento real del navegador; los escenarios no ejecutados y las limitaciones se conservan explícitos.

### 9.4. REN-89 — integración E2E en Actions, 20 de noviembre de 2026

1. Verificamos PR #40 aprobada e integrada a `develop` mediante `43a01dc0b66eeb614c259bab640fe284ef670fbd`; creamos `ci/REN-89-e2e-github-actions` desde esa revisión. Cerramos REN-88 en Jira e iniciamos REN-89, conservando pendientes E3-08/14/15.
2. Añadimos job `e2e` después de frontend/backend y en paralelo al smoke: Node.js 24, `npm ci`, Chromium/dependencias y lanzador aislado existente. Actions establece CI y Playwright utiliza un worker headless sin reintentos. No pasamos credenciales del VPS ni usamos su base.
3. Deploy depende de quality, smoke y E2E y exige sus tres resultados success, además de main/evento/flag. No añadimos tolerancia de errores ni eliminamos controles anteriores. Esta configuración no equivale a haber ejecutado todavía una aserción fallida: REN-90 demostrará el caso negativo real.
4. Conservamos `e2e-results` con always() y siete días de retención, y enlazamos el artefacto en el resumen del job cuando exista. Puede faltar reporte Playwright si falla la preparación antes de crearlo; no ocultamos ese fallo.
5. Extendemos notify/Slack con resultado e2e obligatorio. Agregamos dos pruebas del notificador: ausencia de ese resultado impide anunciar éxito; failure/skipped/cancelled no se reportan como éxito. Aprobamos **33 comprobaciones locales de infraestructura**: 6 de despliegue, 22 de Slack y 5 de quality, sin contactar Slack real. Las guardas ejecutan el script quality real ante E2E fallida/cancelada/omitida/vacía/ausente y fallos de las otras etapas, sin copiar su lógica.
6. Observamos que main ya exige quality pero no e2e como check individual. Movimos quality al final, con always(), para recoger frontend/backend/smoke/E2E y propagar su fallo a la protección existente, sin modificar reglas de ramas. Validamos YAML/dependencias y actionlint v1.7.12 (descarga del mantenedor con checksum comprobado); `git diff --check` aprobó. Actualizamos guías E2E, notificaciones, despliegue, README y CONTRIBUTING. La ejecución E2E automática y su resultado remoto se registrarán en PR/Jira; no reutilizamos los ensayos locales de REN-88 como si fueran CI.
7. [CI #44822253194](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/44822253194), HEAD b3d2bfc y merge temporal 61bb48c: **12 E2E aprobadas automáticamente**, un worker, sin reintentos, JUnit con 0 fallos/errores/omitidas. Aprobaron también 150 Jest, 165 Pytest, 33 comprobaciones de infraestructura, smoke, quality final y notify; deploy omitido por PR. Descargamos y verificamos HTML/JUnit/metadatos y limpieza de `e2e-results`, retención siete días. [Registramos la evidencia](evidencias/REN-89-ci-e2e-2026-11-20.md) y distinguimos aceptación de Slack de recepción visual. La API confirmó quality requerido también en develop. Avance estimado: **42%**, pendiente de revisión/integración, prueba negativa real y restantes entregables.

**Uso de IA:** Codex apoyó workflow, notificador, pruebas y documentación. Contrastamos semántica de dependencias con documentación de Actions/Playwright, ejecutamos las guardas y verificaremos la ejecución real en Actions; revisión humana e integración siguen pendientes.

### 9.5. REN-90 — aserción E2E fallida controlada, 20 de noviembre de 2026

1. Verificamos PR #41 aprobada e integrada a develop mediante `9292a9a5c892695b37b3b8c27e0473cbdd7c8ae2`; creamos `ci/REN-90-fallo-e2e-controlado` desde esa revisión. REN-89 Finalizada y REN-90 En curso.
2. Añadimos `failure_probe=e2e` a la ejecución manual. La suite normal de doce casos corre primero; después una sonda separada abre el catálogo y realiza una aserción deliberadamente incorrecta sobre su encabezado. No modificamos producto ni contamos la sonda como un caso funcional nuevo. El modo normal excluye su archivo y no registra tests omitidos por ese motivo.
3. Verificamos marcador y JUnit para anunciar que la aserción artificial se ejecutó; preparación fallida o reporte inconsistente no acredita el ensayo. Conservamos el fallo del step/job y usamos siempre la guarda quality existente. Slack identifica la aserción E2E separada y los artefactos incluyen los dos ensayos cuando se generan.
4. Excluimos cualquier ejecución manual con sonda de deploy independientemente del resultado, además de la restricción a main y los checks previos. No publicamos durante los ensayos. Distinguimos la omisión por varias condiciones de atribuirla exclusivamente a una guarda.
5. Ensayo local sobre árbol candidato `source_head=9292a9a`, `source_dirty=true`: una sonda fallida como se esperaba, salida 1, JUnit tests1/failures1/errors0/skipped0, PNG y trace.zip generados, verificador confirmó la aserción y se eliminaron contenedores/volúmenes del proyecto. La captura muestra el catálogo real con su título esperado por el producto. Artefactos locales `run-fqn64xfl`; no lo atribuimos al contenido puro del HEAD base.
6. Aprobamos TypeScript/Vite y **40 comprobaciones locales de infraestructura** (6 deploy, 23 Slack, 5 quality y 6 del verificador E2E), sin Slack real. Descubrimiento normal=12 casos y modo sonda=1; bash, ShellCheck, actionlint y diff aprobados. Los resultados reales normal/negativo en Actions se registrarán con SHA y enlaces; todavía no acreditamos esa ejecución remota por el ensayo local.
7. Sobre b32df21 comprobamos [ejecución normal #44828334713](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/44828334713) y [sonda #44828331317](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/44828331317). La normal aprobó doce casos. La manual aprobó primero los doce y luego falló la aserción separada: e2e/quality failure, deploy skipped y notify success con CI_PROBE_EXECUTED=true/Slack FALLO. Ambas aprobaron 150 Jest, 165 Pytest, 40 comprobaciones de infraestructura y smoke; Slack aceptó ÉXITO/FALLO. Verificamos [JUnit, HTML, marcador, captura y traza](evidencias/REN-90-fallo-e2e-2026-11-20.md), limpieza registrada y árbol idéntico entre HEAD y merge temporal normal. La omisión de deploy tiene varias condiciones; no la atribuimos exclusivamente a una ni publicamos en main para ensayarla. Avance estimado: **47%**; pendientes revisión/integración y demás alcance final. La PR se deja lista solo tras comprobar el último commit normal verde.

**Uso de IA:** Codex apoyó la sonda, verificador, workflow, pruebas y documentación. Contrastamos el formato con JUnit real, ejecutamos la aserción en Chromium y verificamos artefactos/limpieza; la revisión humana sigue pendiente.

### 9.6. REN-9 — catálogo por fecha y horario, 20 de noviembre de 2026

1. Verificamos PR #42 integrada mediante `8c59c6f`; cerramos REN-90 en Jira e iniciamos `feature/REN-9-filtro-temporal-catalogo` desde esa revisión. PR #43 seguía abierta. Reabrimos REN-9 porque su estado Finalizada no reflejaba CA-04/06 y parte temporal de CA-05 pendientes documentados; conservamos la historia y criterios originales.
2. Ampliamos `GET /api/spaces` con `date`, `start_hour` y `end_hour` opcionales pero conjuntos. Sin parámetros conserva contrato/orden. Con intervalo exige fecha válida, horas enteras, duración 1–8 h, inicio futuro hasta 90 días y horas reales no ambiguas en Santiago. La misma validación temporal se usa al crear reservas.
3. Compartimos el predicado de superposición/bloqueo con HU-12. Una consulta SQL `NOT EXISTS` combina visibilidad, apertura/cierre y ausencia de reservas bloqueantes, sin consultas por tarjeta ni datos privados en navegador. Intervalos consecutivos no se superponen; pendientes vencidas no bloquean aunque su fila no haya cambiado. La búsqueda no toma bloqueos ni promete adjudicación: crear sigue revalidando bajo bloqueo del espacio.
4. Añadimos campos de disponibilidad y Aplicar horario. Identificamos el intervalo aplicado y cambios aún sin aplicar; mantenemos filtros básicos AND/orden, carga, errores/reintento, ausencia de coincidencias y limpieza completa. Las respuestas abandonadas no reemplazan la consulta más reciente. No modificamos tablas, migraciones ni condiciones de CI/deploy.
5. Incorporamos ocho comprobaciones Jest, 34 variantes backend y dos recorridos E3-08. El primer ensayo detectó una expectativa incorrecta del test a 90 días: el cambio DST hace que la hora local del límite sea distinta a la inicial. Corregimos el fixture para comprobar el instante exacto, no alteramos la regla de negocio. También cubrimos horas inexistentes y repetidas.
6. Primera suite local independiente: **14 E2E aprobadas**, reporte `run-58QXNIGr`, antes de integrar HU-15. GitHub confirmó después PR #43 integrada mediante `e991cafabb402622956af2061e1d20a84aaeb6bf`; sincronizamos esta rama por fast-forward conservando el trabajo independiente, cerramos REN-15 en Jira y verificamos la combinación.
7. Regresión conjunta local aprobada: **170 Jest**, **199 Pytest** (una advertencia de Starlette existente), TypeScript/Vite, `alembic upgrade head` y `alembic check` sin operaciones nuevas. **16 E2E** aprobadas, 0 fallos/errores/omitidos, cuatro workers, cero reintentos, reporte `run-1Zd5flvW` (16,1 s de tests). Metadatos `source_head=e991caf`, `source_dirty=true`: ensayo del árbol candidato, no contenido puro de ese HEAD. Limpieza de recursos propios comprobada y tres servicios de demo previos healthy.
8. Actualizamos HU-09, CP/Testing, guía E2E, README y matriz; conservamos los resultados históricos de octubre sin atribuirles el trabajo actual. [Evidencia y límites del candidato](evidencias/REN-9-filtro-temporal-2026-11-20.md). CI remota y PR identifican el commit publicado y sus resultados reales; revisión/integración y producción no se acreditan mediante ensayos locales.
9. Avance estimado entrega 3: **62%**, incluye candidatos verificados pendientes de revisión y todos los entregables finales. Permanecen IA, moderación, conciliación/Wiki, video y release; aceptación docente de Actions y estimación estructurada siguen pendientes. Video/presentación se mantienen para el final.

**Uso de IA:** Codex apoyó integración, pruebas y documentación; contrastamos con Jira, código existente, PostgreSQL real y Chromium. Revisión humana, integración del candidato y despliegue siguen pendientes.

### 9.7. REN-18 — moderación de publicaciones, 20 de noviembre de 2026

1. Verificamos PR #44 integrada mediante `bc1bd19`; creamos `feature/REN-18-moderacion-admin` desde esa revisión. Jorge Aceval implementa esta historia y Joaquín Viveros revisa la PR, invirtiendo la asignación inicial de la tarjeta.
2. Reutilizamos la base existente: bandera `is_withdrawn` y bloqueo de reactivación de HU-05, permiso `is_admin`/`require_admin` y vista **Administración** de HU-02. Sustituimos el texto provisional de esa vista por el panel de moderación. Detalle y contrato en [HU-18](HU-18.md).
3. Migración `0008_space_moderation`: `withdrawal_reason`, `withdrawn_by` y `withdrawn_at` en `spaces`, con restricción que los exige juntos solo en publicaciones retiradas, y tabla `space_moderations` con cada retiro y restitución. Los retiros anteriores conservan campos nulos; no inventamos su motivo. Comprobamos `upgrade`, `downgrade` a `0007`, nuevo `upgrade` y `alembic check` sin operaciones pendientes.
4. Endpoints `GET /api/admin/spaces`, `POST` y `DELETE /api/admin/spaces/{id}/withdrawal`, con permiso leído desde PostgreSQL, motivo de 1–200 caracteres, `409` ante estados incompatibles, rollback ante fallos y el mismo bloqueo del espacio que reservas, pagos y cancelaciones. El retiro no modifica reservas ni pagos; restituir deja la publicación inactiva.
5. `SpaceRead` incorpora `withdrawal_reason` y `withdrawn_at` para que el propietario vea el motivo; ajustamos los tres tests que fijaban el contrato exacto de campos. No exponemos al propietario qué administrador actuó.
6. Pruebas nuevas: **8 Pytest** (CA-01 a CA-07, retiros anteriores, cascada al eliminar y fallo de persistencia), **6 Jest** (listado, motivo obligatorio, doble envío, errores del servidor, restitución, carga/vacío/error y vista del propietario) y **2 recorridos E3-15**. El lanzador E2E promueve una cuenta administrativa ficticia en su base temporal; el registro público sigue sin conceder privilegios.
7. Regresión local: **207 Pytest** (199 + 8), **176 Jest** (170 + 6), TypeScript/Vite y **18 E2E aprobadas**, 0 fallos/errores/omitidos, sin reintentos, reporte `run-DXBDRKPO` (8,7 s de tests). Metadatos `source_head=bc1bd19`, `source_dirty=true`: ensayo del árbol candidato antes del commit. Limpieza comprobada sin contenedores ni volúmenes E2E restantes; la demo previa siguió activa.
8. Problemas resueltos al ejecutar el lanzador desde Git Bash en Windows: la conversión automática de rutas de MSYS transformaba `/app/.venv/bin/alembic`; ejecutamos con `MSYS2_ARG_CONV_EXCL=/app` (CI usa Linux y no lo necesita). El nombre con tilde de la cuenta administrativa llegaba con otra codificación y producía `400`; lo enviamos como escape JSON `\u00f3`.
9. Avance estimado entrega 3: **70%**, con el candidato pendiente de revisión. Permanecen IA (HU-17), Wiki/documento final, video y release; aceptación docente de Actions y estimación estructurada en Jira siguen pendientes.

### 9.8. REN-17 — sugerencia de descripción con IA, 20 de noviembre de 2026

1. Creamos `feature/REN-17-sugerencia-ia` desde `develop` `bc1bd19`, independiente de PR #45 (REN-18), que sigue en revisión. Jorge Aceval implementa y Joaquín Viveros revisa.
2. Elegimos la API de Gemini en su nivel gratuito para cumplir la integración real sin generar costos. El modelo es configurable (`GEMINI_MODEL`, por defecto el alias `gemini-flash-lite-latest`) porque los límites y modelos gratuitos cambian con frecuencia. Detalle y contrato en [HU-17](HU-17.md).
3. Backend: adaptador `app/ai.py` con la biblioteca estándar (sin dependencias nuevas), clave en cabecera, instrucciones de no inventar y datos del propietario delimitados como JSON; endpoint autenticado `POST /api/spaces/description-suggestion` que no guarda ni publica. Cada fallo (sin clave, tiempo, límite, error, respuesta inútil) tiene su estado y mensaje, sin reenviar el cuerpo del proveedor.
4. Frontend: **Sugerir descripción con IA** en publicar y editar, habilitado con los datos mínimos; recuadro marcado como generado con IA para usar, editar o descartar, aviso antes de reemplazar una descripción manual, sin doble envío y con espera máxima de 15 s.
5. Pruebas nuevas: **21 Pytest** (endpoint con proveedor simulado y adaptador real contra un servidor HTTP local que imita la API, incluidos `429`, errores, respuestas bloqueadas o vacías y tiempo agotado), **6 Jest** y **E3-16**. El lanzador E2E fuerza `GEMINI_API_KEY` vacía: la CI no depende de la red ni de la cuota.
6. Regresión local: **220 Pytest** (199 + 21), **176 Jest** (170 + 6), TypeScript/Vite y **17 E2E aprobadas**, 0 fallos/errores/omitidos, sin reintentos, reporte `run-9sUqKo8y` (7,3 s de tests). Metadatos `source_head=bc1bd19`, `source_dirty=true`: árbol candidato antes del commit. Limpieza comprobada sin recursos E2E restantes.
7. **Pendiente:** la evidencia de una ejecución real (CA-08 y la confirmación de que el alias de modelo responde con la clave). Requiere configurar una clave de Google AI Studio en local y en `shared/.env` del servidor; no la versionamos ni la compartimos por chat.
8. Joaquín Viveros revisó la PR y pidió la evidencia real de CA-08 antes de aprobar. Integramos `develop` con HU-18 (PR #45) resolviendo conflictos solo de documentación y de `space_schemas.py`. Agregamos `python -m app.ai_evidence`, que registra una llamada real con datos ficticios (fecha, modelo solicitado y el que respondió, texto) sin imprimir la clave, su prueba y la configuración operativa de producción en [HU-17](HU-17.md). Regresión combinada: **229 Pytest**, **182 Jest** y TypeScript/Vite. E2E: la primera ejecución local (`run-38DqQtXh`) aprobó 16 de 19; tres casos de reservas fallaron a la vez en su preparación porque la API rechazó con `401` sesiones recién emitidas. La repetición sin cambios (`run-fxeJ1GIv`) aprobó **19 de 19** sin ningún `401`. No confirmamos la causa; la hipótesis es un ajuste del reloj de la máquina virtual de Docker Desktop en Windows, que haría ver los tokens como emitidos en el futuro. No modificamos la validación de sesión dentro de esta historia; la CI en Linux es la referencia. La evidencia real sigue pendiente de una clave.
10. 21 de noviembre: como Joaquín no está disponible, un subagente de IA sin el historial de la conversación hizo una prueba adversaria sobre `1b54003` con pruebas propias y PostgreSQL real. Encontró un defecto alto: al vencer los 15 s el navegador no mostraba ningún mensaje, porque `authRequest` resuelve `undefined` al cancelar y la prueba anterior simulaba un rechazo que no ocurre. También encontró que el plazo de 12 s era por operación del socket y no total, que la respuesta se leía sin tope, que una redirección reenviaba la clave, que no se revisaba `finishReason`, que el delimitador `<datos>` se podía cerrar, que no había límite por usuario, y otros detalles de limpieza y codificación. Dos subagentes los corrigieron en paralelo, frontend y backend, con una prueba de regresión por defecto que falla sin la corrección. Resultado: **253 Pytest**, **185 Jest**, TypeScript y Vite. Integramos `develop` con REN-92 (PR #48). CA-08 sigue pendiente: integramos HU-17 sin la llamada real, por decisión registrada en la [matriz](cierre-entrega-3.md).
11. Una segunda prueba adversaria sobre `cefcd76` (con la E2E local: 19 de 19) encontró que la nueva limpieza de Markdown tardaba un tiempo cuadrático ante respuestas hostiles grandes. También vio que Compose no pasaba a la API `AI_TIMEOUT_SECONDS`, `AI_USER_REQUESTS` ni `AI_USER_WINDOW_SECONDS`, que sin clave el sexto intento mostraba el mensaje de límite en lugar del de no disponible, que la limpieza alteraba `3*4`, `2**3` y comillas internas, y que un 422 de la ubicación se informaba como si fallaran los otros campos. Lo corregimos con regresiones nuevas: **259 Pytest**, **185 Jest** y TypeScript.
12. Una tercera prueba adversaria sobre `0350b4c` no encontró hallazgos bloqueantes ni altos. Detectó que la sesión de base de datos que autentica al usuario quedaba abierta durante la espera al proveedor: 15 sugerencias lentas agotaban el pool y frenaban todos los endpoints. Ahora la cerramos antes de llamar a Gemini, con una prueba que falla sin el cambio. También corregimos la negrita pegada a una palabra, las comillas envolventes mixtas, más Markdown (bloques sin salto de línea, listas numeradas, citas, separadores y enlaces), los caracteres invisibles y las variables de IA vacías. Además, el error de ubicación muestra el motivo que da la API. Resultado: **270 Pytest**, **185 Jest** y TypeScript.
13. Una verificación adversaria final sobre `4b889e6` aprobó la PR, sin hallazgos bloqueantes, altos ni medios. Comprobó que, sin el cierre de la sesión, 3 sugerencias con un pool de 1 conexión fallaban con `503`, y que con el cierre responden `200`. De sus hallazgos bajos corregimos tres: comillas envolventes con un apóstrofo interno (O'Higgins), un número suelto al inicio de una línea que se tomaba como lista, y exponentes como `2**3` repetidos. Aceptamos los demás (paréntesis en URL, rellenos invisibles poco realistas) porque el propietario siempre revisa la sugerencia. Resultado: **273 Pytest**.
9. Avance estimado entrega 3: **80%**, con REN-17 pendiente de su evidencia real y de revisión (REN-18 ya integrada). Permanecen la evidencia real de IA, Wiki/documento final, video y release; aceptación docente de Actions y estimación estructurada en Jira siguen pendientes.

**Uso de IA:** Claude Code apoyó el diseño, la implementación, las pruebas y la documentación. Contrastamos con los criterios de `Historias de usuario.pdf`, el código existente, PostgreSQL real y Chromium. Joaquín revisó la primera versión; las pruebas adversarias y las correcciones posteriores las hicieron subagentes de Claude Code, y su resultado está publicado en la PR.

### 9.9. REN-91 — Wiki Entrega 3, documento y guion del video, 20 de noviembre de 2026

1. Creamos `feature/REN-91-wiki-entrega-3` desde `develop` `bc1bd19`. PR #45 (REN-18) y #46 (REN-17) siguen en revisión con CI aprobada; la página los presenta como tales y no como integrados.
2. Redactamos [la página Entrega 3](wiki/Entrega-3.md) con los ocho apartados del Anexo B en orden: objetivo, herramienta elegida y por qué, set de casos con su escenario de la pauta, ejecución local, integración con CI/CD (job, disparadores, variables, artefactos y Slack), evidencias enlazadas, problemas y soluciones, y pendientes. Incluimos la estrategia de datos (§2.3), la justificación de mantener GitHub Actions y el uso de IA (§4.8).
3. Actualizamos Home (navegación y recursos), la barra lateral, Estrategia (nivel E2E y resultados), Arquitectura, Instalación (cómo correr E2E), Supuestos (dependencias E2E y Gemini, continuidad del pipeline) y el README de la Wiki. Agregamos `Entrega-3.md` a la lista de páginas de `scripts/publicar-wiki.ps1`.
4. Preparamos el [guion del video](guion-video-entrega-3.md) con los cinco puntos de la pauta (§5.2), tiempos orientativos y las evidencias para abrir. No es la grabación.
5. Verificación documental: comprobamos que existen los destinos locales de los enlaces de los archivos modificados y que las ejecuciones de CI citadas corresponden a sus resultados (consultadas en GitHub). La Wiki pública **no** se modifica en esta PR: se publica con `scripts/publicar-wiki.ps1` después de revisar e integrar, y se vuelve a sincronizar en el cierre con el Release.
6. Atendimos la revisión de Joaquín Viveros: Home ya no afirma que la entrega completa los requisitos finales y describe su avance. Tras su aprobación integramos PR #45 mediante `64e3943`, sincronizamos esta rama y presentamos HU-18 como integrada (18 E2E en `develop`); HU-17 sigue en revisión.
7. Avance estimado entrega 3: **86%**. Permanecen la integración de PR #46 y esta PR, la evidencia real de IA, la publicación de la Wiki, el video y el release; aceptación docente de Actions y estimación estructurada en Jira siguen pendientes.

**Uso de IA:** Claude Code apoyó la redacción de la página, el guion y la revisión de coherencia y enlaces; contrastamos cada cifra y enlace con GitHub Actions, el código y los registros previos. La revisión humana de la PR sigue pendiente.

### 9.10. REN-92 — preparación del cierre, 20 y 21 de noviembre de 2026

1. Joaquín Viveros aprobó PR #47 tras la corrección de Home; la integramos mediante `8243e17`.
2. Publicamos la Wiki desde esa revisión con los mismos pasos de `scripts/publicar-wiki.ps1`, en una copia temporal y revisando el diff antes de publicar: commit de Wiki `de43207`, que agrega `Entrega-3` y actualiza seis páginas sin tocar Entrega 1 ni 2. Comprobamos que las nueve páginas remotas coinciden con sus fuentes en `develop` (sin contar finales de línea) y que `Entrega-3` y la portada cargan sin sesión.
3. Sincronizamos PR #46 con `develop` sin conflictos (`1b54003`).
4. Creamos `feature/REN-92-cierre-entrega-3` desde `8243e17` con la [matriz de la pauta](cierre-entrega-3.md) (DoD, §2, anexos y reglas generales, con su estado real) y el [borrador de notas de la versión](releases/entrega-3.md) con los contenidos que exige §4.5. El SHA final, la CI de `main`, el despliegue, el tag, el Release y el video se completan en el release; no los damos por hechos.
5. Joaquín Viveros pidió distinguir lo integrado del candidato combinado. Corregimos la matriz y las notas: `develop` integra 18 E2E, 176 Jest y 207 Pytest ([CI #44857577109](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/44857577109)); con PR #46 serían 19, 182 y 229 ([CI #44857687248](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/44857687248), head `1b54003`). Las notas ya no afirman que todas las historias estén completas.
6. Joaquín dejó de estar disponible para revisar. Desde esta PR, subagentes de IA que reciben el encargo sin el historial de la conversación hacen revisiones adversarias de cada PR, y publicamos su resultado como comentario. Por decisión de Jorge, el 21 de noviembre bajamos a 0 la aprobación obligatoria de `develop` y `main`; los checks y el PR siguen siendo obligatorios. Esto incumple la revisión de otro integrante que exige §4.4 de las reglas generales, y así lo registra la [matriz](cierre-entrega-3.md).
7. Avance estimado entrega 3: **88%**. Permanecen la evidencia real de HU-17 y su integración, el release a `main` con tag y GitHub Release, la nueva sincronización de Wiki, el video, la estimación estructurada en Jira y la aceptación docente de Actions.

**Uso de IA:** Claude Code apoyó la preparación de la matriz y las notas y la verificación de la Wiki publicada; contrastamos cada estado con GitHub, Actions y el código. Joaquín revisó la primera versión; un subagente de Claude Code revisó `3d2e811`, `5dd1ddb` y `5087ca0`, y publicamos cada resultado como comentario en la PR.

### 9.11. REN-92 — release v3.0-entrega3, 21 de noviembre de 2026

1. Integramos PR #48 (`9e41723`) y PR #46 (`8a14646`) con merge commit, después de su CI verde y sus revisiones adversarias publicadas. En las dos descartamos la revisión de Joaquín y dejamos el motivo en la PR. En #48 su observación estaba atendida; en #46 pedía la llamada real a Gemini, que sigue pendiente (CA-08).
2. PR #46 pasó por cuatro rondas adversarias de subagentes de IA sin el historial de la conversación: tres pruebas y una verificación final que aprobó. Su CI final, [#44947226199](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/44947226199) sobre `cc4de4c`, aprobó **19 E2E, 185 Jest y 273 Pytest**.
3. Creamos `release/REN-92-v3.0-entrega3` desde `develop`. Dos subagentes prepararon en paralelo, en archivos separados, las notas y la matriz por un lado y las fuentes de la Wiki por otro. Revisamos e integramos ambos trabajos. Lo que depende del merge en `main` (SHA, CI, despliegue) queda en el GitHub Release y en la PR de sincronización posterior.
4. 22 de noviembre: actualizamos el guion del video a 10 minutos e integramos PR #49 en `main` con merge commit, `54d64a1`. Joaquín aprobó PR #49 sobre `91d9724`; esa aprobación quedó descartada automáticamente al subir el guion actualizado del video (`9c41919`, solo documentación), y la integramos sin repetirla ni con revisión adversaria publicada, porque esa revisión se cortó por un límite de uso.
5. La [CI de `main` #45093776011](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/45093776011) aprobó todos sus jobs, incluido el despliegue: 19 E2E, 185 Jest y 273 Pytest. `scripts/verify-deployment.sh` confirmó `54d64a13bdef0059ed5cb871f695328945f5524d` en producción con API y PostgreSQL disponibles. Creamos el tag anotado y el [GitHub Release `v3.0-entrega3`](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/releases/tag/v3.0-entrega3) sobre ese commit, y sincronizamos `develop` con esta PR.
6. Avance estimado entrega 3: **97%**. Permanecen el video, CA-08 de HU-17 (requiere clave), el campo de estimación en Jira y la aceptación docente de Actions.

**Uso de IA:** Claude Code coordinó el release. Subagentes de Claude Code prepararon notas, matriz y Wiki, e hicieron las pruebas y revisiones adversarias. Contrastamos cada cifra con GitHub Actions.

### 9.12. REN-91 — retroalimentación de la entrega 2, 22 de noviembre de 2026

Aplicamos lo que pidió el profesor en la corrección de la entrega 2:

1. **Textos más breves:** reescribimos el README (de 308 a unas 100 líneas), la portada de la Wiki y la página Entrega 3, con las mismas secciones para que el guion del video siga sirviendo.
2. **Justificación de Actions frente a Jenkins:** la Wiki §2 explica el costo de migrar y compara cada pieza de Jenkins con su equivalente en nuestro pipeline.
3. **Trazabilidad visible:** badge de la CI en el README y la Wiki; capturas de la CI del release, del fallo controlado y de los reportes de Playwright en `docs/evidencias/capturas/`.
4. **Artefactos que no caducan:** subimos los artefactos de la CI del release y del fallo controlado al GitHub Release `v3.0-entrega3`, y subimos la retención de Actions de 7 a 90 días (el máximo de un repositorio público).

Faltan las capturas del canal de Slack y del tablero de Jira, que requieren sesión.
