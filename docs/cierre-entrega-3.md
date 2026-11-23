# Cierre de entrega 3 — REN-92

**Actualización: 22 de noviembre de 2026, al cierre del release `v3.0-entrega3`.** Relaciona cada exigencia de la [pauta de entrega 3](https://github.com/Pruebas-de-Software/HandsOnProject/blob/main/semestres/2026-2/entrega3.md) y de las [reglas generales](https://github.com/Pruebas-de-Software/HandsOnProject/blob/main/semestres/2026-2/entregas.md) con su evidencia y su estado real. El [registro acumulativo](entrega-3.md) conserva el historial de cada PR, y las [notas del release](releases/entrega-3.md), el resultado final.

## Definition of Done (§3)

| Ítem | Estado | Evidencia |
| --- | --- | --- |
| Set de pruebas E2E/UI (mínimo 5; recomendado 10) | Cumplido | 19 casos integrados en [`frontend/e2e/`](../frontend/e2e), incluido E3-16 (IA) de [PR #46](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/pull/46). Aprobados en el head final de PR #46 ([CI #44947226199](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/44947226199)) y en la [CI de `main`](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/workflows/ci.yml?query=branch%3Amain) del release. Listado en la [Wiki](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/wiki/Entrega-3) §3. |
| Cubren escenarios críticos, explicados | Cumplido | Wiki §3 relaciona cada caso con el escenario de la pauta; la [guía E2E](testing/e2e.md), con sus criterios. |
| Se ejecutan automáticamente en el pipeline | Cumplido, con GitHub Actions en lugar de Jenkins; aceptación docente pendiente | Job `e2e` en cada PR/push; [primera ejecución completa #44822253194](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/44822253194). La pauta nombra Jenkins: justificación en la Wiki §2, aceptación docente pendiente. |
| El pipeline falla si falla una prueba E2E | Cumplido | [Sonda #44828331317](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/44828331317): `e2e` y `quality` en rojo, deploy omitido. |
| Evidencia (logs, reportes, screenshots) | Cumplido | Artefacto `e2e-results` (HTML, JUnit, capturas, trazas) y [registro de la sonda con captura](evidencias/REN-90-fallo-e2e-2026-11-20.md). Los artefactos de Actions vencen a los 7 días (los de la sonda, el 27 de noviembre de 2026); el registro versionado conserva lo esencial. |
| Notificaciones a Slack | Cumplido | `notify` informa `e2e`; avisos ÉXITO y FALLO aceptados por Slack en las ejecuciones normal y de sonda. |

## Requisitos de la pauta (§2) y anexos

| Exigencia | Estado | Evidencia |
| --- | --- | --- |
| §2.1 herramienta E2E (Selenium por defecto) | Cumplido, con Playwright | Justificación de la elección en la Wiki §2. |
| §2.3 headless, `BASE_URL`, datos | Cumplido, con GitHub Actions en lugar de Jenkins; aceptación docente pendiente | `scripts/run-e2e.sh` y `frontend/playwright.config.ts`; Wiki §3–§5. |
| §2.4 scripts en GitHub, ejecución automática, Slack | Cumplido, con GitHub Actions en lugar de Jenkins; aceptación docente pendiente | Mismas evidencias del DoD. |
| §4.1 GitFlow y Kanban | Cumplido | Ramas `feature/REN-*`, `ci/REN-*` y `release/REN-92-v3.0-entrega3`, y épica REN-85 con REN-86 a REN-92. La revisión de cada PR se trata en la fila §4.4 de las reglas generales. |
| §4.1 estimación en horas o Story Points | **Parcial** | Estimaciones en las descripciones y en el [registro §4](entrega-3.md); falta habilitar el campo estructurado en Jira. |
| §5.1 código actualizado | Cumplido | `main` integra todo el código de la entrega, incluida HU-17, mediante [PR #49](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/pull/49); la versión rehecha `v3.0-entrega3` suma la documentación final y el video (PR #50 a #58). |
| §5.2 cápsula de video | Cumplido | [Video](https://drive.google.com/file/d/1aF9g9xhNt11qjysnjtm-2q3I-7NNRERH/view?usp=sharing), 14 min 6 s, abre sin sesión ([ficha](evidencias/REN-91-video-2026-11-23.md)). Sigue el [guion](guion-video-entrega-3.md). |
| §5.3 documento completo | Cumplido | [Wiki Entrega 3](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/wiki/Entrega-3) y [registro](entrega-3.md). |
| Anexo A: selectores estables, evidencia en fallos, aislar externos | Cumplido | Selectores por rol y etiqueta; capturas y trazas en fallos; imagen externa y Gemini fuera de la CI. |
| Anexo B: página "Entrega 3" con 8 apartados | Cumplido | [Publicada](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/wiki/Entrega-3) desde las fuentes de PR #47; se vuelve a publicar desde `main` (ver [Estado de la Wiki](#estado-de-la-wiki)). |

## Reglas generales (`entregas.md`)

| Exigencia | Estado | Evidencia |
| --- | --- | --- |
| §4.3 trazabilidad | Cumplido | Clave REN en rama, commits y PR; cada HU enlaza sus pruebas en `docs/HU-*.md`; cada PR tiene su ejecución de CI; el release `v3.0-entrega3` cierra la cadena. |
| §4.4 revisión de otro integrante antes de fusionar | Cumplido en la entrega 3 hasta PR #47; **incumplido desde PR #48** | En la entrega 3, cada PR integrada hasta #47 tuvo la aprobación del otro integrante: Jorge aprobó #38 a #44 (de Joaquín) y Joaquín aprobó #45 y #47 (de Jorge). Desde el 21 de noviembre de 2026 Joaquín no está disponible. Por decisión de Jorge bajamos a 0 la aprobación obligatoria en `develop` y `main`; siguen obligatorios el PR, los checks y `enforce_admins`, y no hay pushes directos. PR #48 y #46 recibieron revisiones adversarias de subagentes de IA sin el historial de la conversación, publicadas en la PR, que no reemplazan la revisión de un integrante. Joaquín aprobó PR #49 sobre `91d9724`; esa aprobación quedó descartada automáticamente al subir el guion actualizado del video (`9c41919`, solo documentación), y la integramos sin repetirla ni con revisión adversaria publicada, porque esa revisión se cortó por un límite de uso. Las revisiones de Joaquín con cambios solicitados siguen bloqueando el merge aunque no se exijan aprobaciones; las descartamos dejando el motivo en la PR. Así ocurrió en PR #46, donde pidió la evidencia real de CA-08 antes de aprobar. |
| §4.6 repositorio mínimo | Cumplido | `README.md`, `.gitignore`, `.env.example`, `LICENSE`, `CONTRIBUTING.md` y `docs/`, vigentes desde la entrega 1. |
| Requisitos finales | Cumplido | HU-09, HU-15, HU-18 y HU-17 integradas en `main`. CA-08 de HU-17 se cumplió el 22 de noviembre con una [llamada real a Gemini](evidencias/REN-17-ia-real-2026-11-22.md). Falta cargar la clave en producción; mientras tanto, la app publicada avisa que la sugerencia no está disponible. |
| §4.5 tag `v3.0-entrega3` y GitHub Release | Cumplido | [Tag](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/tree/v3.0-entrega3) y [GitHub Release](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/releases/tag/v3.0-entrega3) con las [notas](releases/entrega-3.md). Creados el 22 de noviembre sobre `54d64a1` y rehechos el 23 sobre la última revisión de `main`; el Release registra el SHA, la CI, el despliegue y los artefactos permanentes. |
| §4.7 Wiki actualizada con Home como índice | Cumplido | Home enlaza la página Entrega 3; la republicación del cierre se registra en [Estado de la Wiki](#estado-de-la-wiki). |
| §4.8 uso de IA documentado | Cumplido | Wiki Entrega 3 y Supuestos; cada sección del registro; revisiones adversarias publicadas en las PR. |
| Pauta §4.2 y reglas §4.10: presentación en clases | Por confirmar en Aula | Exponen los grupos que no lo hicieron en la presentación 1, según la selección en Aula; no registramos aquí si a RentSmart le corresponde. |

## Procedimiento de cierre

1. **Hecho.** Integramos PR #46 (HU-17) con sus cuatro rondas adversarias publicadas (tres pruebas y una verificación final). Sin clave para la llamada real, quedó integrada con CA-08 pendiente.
2. **Hecho.** Creamos `release/REN-92-v3.0-entrega3` desde `develop`, completamos estas notas y la matriz, y abrimos [PR #49](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/pull/49) hacia `main`.
3. **Hecho.** Con CI verde sobre el head `9c41919` integramos con merge commit, `54d64a1`. Joaquín aprobó PR #49 sobre `91d9724`; esa aprobación quedó descartada automáticamente al subir el guion actualizado del video (`9c41919`, solo documentación), y la integramos sin repetirla ni con revisión adversaria publicada, porque esa revisión se cortó por un límite de uso. La aprobación obligatoria está relajada desde el 21 de noviembre (fila §4.4).
4. **Hecho.** La [CI de `main` #45093776011](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/45093776011) aprobó todos sus jobs, incluido el despliegue automático a Azure (19 E2E, 185 Jest, 273 Pytest). `scripts/verify-deployment.sh` confirmó que la versión pública es `54d64a13bdef0059ed5cb871f695328945f5524d` y que la API y PostgreSQL están disponibles.
5. **Hecho.** Creamos el tag `v3.0-entrega3` y el GitHub Release con funcionalidades, defectos, pruebas, limitaciones e instrucciones.
6. **Hecho.** Sincronizamos `develop` (PR #50), atendimos la corrección de la entrega 2 (PR #51) y registramos la llamada real a Gemini (PR #53); llevamos todo a `main` (PR #52 y #55) y publicamos la Wiki.
7. **Hecho.** Rehicimos el tag `v3.0-entrega3` sobre la última revisión de `main`, después de comprobar su CI y su despliegue; actualizamos el Release.
8. **Hecho.** Publicamos el video, comprobamos que abre sin sesión y lo enlazamos en el README, la Wiki, las notas y el Release; volvimos a hacer la versión con él (PR #56 a #58).
9. **Pendiente.** Entregar en Aula.

## Estado de la Wiki

Publicada el 20 de noviembre de 2026 desde `develop` `8243e17` (PR #47): commit de Wiki `de43207`. Comprobamos que las nueve páginas remotas coinciden con sus fuentes (sin contar finales de línea) y que `Entrega-3` y la portada cargan sin sesión.

**Republicaciones del cierre:** 22 y 23 de noviembre de 2026, desde `develop` después de cada integración (commits de Wiki `b7d806f`, `b199c0d` y `5869e6d`, y el de esta versión). En cada una comprobamos que las nueve páginas remotas coinciden con sus fuentes.
