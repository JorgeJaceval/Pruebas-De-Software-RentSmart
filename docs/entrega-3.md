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
| [REN-9 / HU-09](https://rentsmartpsf.atlassian.net/browse/REN-9) | Jira Finalizada, pero [HU-09](HU-09.md) mantiene CA-04/06 y parte temporal de CA-05 pendientes; `Catalog.tsx` solo filtra texto, tipo, comuna, precio y capacidad. | Consulta/filtro por fecha e intervalo, validación completa y reglas compartidas de bloqueo/expiración. Conciliar estado con criterios antes de declarar historia completa. |
| [REN-13 / HU-13](https://rentsmartpsf.atlassian.net/browse/REN-13) | Jira Finalizada, pero [HU-13](HU-13.md) declara CA-03 parcial; `MyReservations.tsx` presenta Cancelar deshabilitado. | Completar el criterio mediante REN-15, sin reconstruir el panel ni duplicar la historia. |
| [REN-15 / HU-15](https://rentsmartpsf.atlassian.net/browse/REN-15) | En curso; API compartida y cancelación del propietario ya implementadas en entrega 2. | Conectar cancelación del arrendatario, confirmación, errores, actualización y reembolso simulado; probar elegibilidad y persistencia. |
| [REN-17 / HU-17](https://rentsmartpsf.atlassian.net/browse/REN-17) | Por hacer. | Integración real de IA para sugerir descripción, aceptación explícita, límites/errores y claves solo en backend. Proveedor simulado en pruebas y evidencia real independiente. |
| [REN-18 / HU-18](https://rentsmartpsf.atlassian.net/browse/REN-18) | Por hacer. | Moderación: listado privado, retiro con motivo/auditoría y restitución a inactivo, preservando reservas y contratos. |
| [REN-66](https://rentsmartpsf.atlassian.net/browse/REN-66) | En curso con descripción antigua de dependencia de HU-14. `OwnedSpaces.tsx` ya enlaza reservas recibidas y `OwnedSpaces.test.tsx` verifica el destino. | Conciliar descripción y estado con evidencia revisada; no desarrollar otra vez el acceso ni contabilizarlo como función nueva. |

Estas son discrepancias comprobadas, no transiciones ya realizadas en las tarjetas antiguas. Las épicas antiguas también requieren conciliación según sus hijos; no son funciones adicionales. Conservamos sus vínculos y criterios originales.

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

La matriz partió sin casos automatizados. REN-87 incorpora E3-01 y E3-02 en su candidato; los resultados se registran en §9.2 y no se confunden con ejecución automática en CI. Los demás escenarios siguen pendientes. El diseño se concreta al implementar cada caso; estas filas por sí solas no son evidencia ni conteo acreditado. Los flujos verifican UI real con API/PostgreSQL reales; permitimos API para preparar datos sin sustituir las acciones de usuario que se evalúan.

| Caso | Historia relacionada | Acción y resultado observable | Dependencia |
| --- | --- | --- | --- |
| E3-01 | REN-1/2 | Registrar cuenta e iniciar sesión; llegar a vista privada con identidad correcta. | Entorno y datos únicos. |
| E3-02 | REN-2 | Credenciales incorrectas y acceso privado sin sesión no conceden acceso. | Sesión aislada. |
| E3-03 | REN-3/8 | Publicar espacio válido y encontrarlo en catálogo/detalle. | Propietario ficticio. |
| E3-04 | REN-4/7 | Editar publicación propia y comprobar datos guardados tras consultar de nuevo. | Espacio propio. |
| E3-05 | REN-6 | Eliminar publicación sin reservas y comprobar que desaparece. | Espacio exclusivo desechable. |
| E3-06 | REN-3 | Formulario incompleto/inválido muestra errores y no anuncia creación. | Validaciones existentes. |
| E3-07 | REN-9 | Combinar filtros existentes, ordenar y limpiar sin perder coherencia del catálogo. | Datos con precios/capacidades distintos. |
| E3-08 | REN-9/11/12 | Fecha/horario muestra solo espacios compatibles y no acepta intervalo incompleto. | Filtro temporal terminado. |
| E3-09 | REN-12/13 | Reservar bloque libre; comprobar total contratado y aparición en Mis reservas. | Bloque futuro según reloj real. |
| E3-10 | REN-12 | Otra cuenta intenta el mismo bloque y encuentra conflicto. No se presenta como ensayo de carga o carrera coordinada. | Dos sesiones y reserva bloqueante vigente. |
| E3-11 | REN-16 | Rechazar pago y aprobar reintento vigente; consultar estado e importe persistidos. | Crear reserva justo antes del pago. |
| E3-12 | REN-14 | Propietario consulta reservas recibidas y filtra por publicación propia. | Dos espacios y reservas identificables. |
| E3-13 | REN-14/15 | Propietario cancela reserva pagada futura; historial muestra cancelación y reembolso simulado. | Reserva propia del ensayo, sin afectar otros casos. |
| E3-14 | REN-13/15 | Arrendatario cancela y el bloque vuelve a admitir reserva; comprobar resultado tras recargar. | Interfaz REN-15 integrada. |
| E3-15 | REN-18 | Administrador retira con motivo, propietario ve restricción y restitución deja el espacio inactivo. | Moderación integrada y cuenta administrativa de prueba. |

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
