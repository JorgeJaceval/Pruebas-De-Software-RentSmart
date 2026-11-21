# Cierre de entrega 3 — REN-92

**Actualización: 21 de noviembre de 2026.** Relaciona cada exigencia de la [pauta de entrega 3](https://github.com/Pruebas-de-Software/HandsOnProject/blob/main/semestres/2026-2/entrega3.md) y de las [reglas generales](https://github.com/Pruebas-de-Software/HandsOnProject/blob/main/semestres/2026-2/entregas.md) con su evidencia y su estado real. El [registro acumulativo](entrega-3.md) conserva el historial de cada PR.

## Definition of Done (§3)

| Ítem | Estado | Evidencia |
| --- | --- | --- |
| Set de pruebas E2E/UI (mínimo 5; recomendado 10) | Cumplido | 18 casos integrados en `develop` en [`frontend/e2e/`](../frontend/e2e) ([CI #44857577109](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/44857577109)); E3-16 (IA) entra con [PR #46](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/pull/46), para 19 en el candidato combinado ([CI #44857687248](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/44857687248)). Listado en la [Wiki](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/wiki/Entrega-3) §3. |
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
| §4.1 GitFlow y Kanban | Cumplido | Ramas `feature/REN-*` y `ci/REN-*`, y épica REN-85 con REN-86 a REN-92. La revisión de cada PR se trata en la fila §4.4 de las reglas generales. |
| §4.1 estimación en horas o Story Points | **Parcial** | Estimaciones en las descripciones y en el [registro §4](entrega-3.md); falta habilitar el campo estructurado en Jira. |
| §5.1 código actualizado | En curso | `develop` integra todo salvo HU-17 ([PR #46](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/pull/46)); pasa a `main` con el release. |
| §5.2 cápsula de video | **Pendiente** | [Guion](guion-video-entrega-3.md) listo; falta grabar y publicar. |
| §5.3 documento completo | Cumplido | [Wiki Entrega 3](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/wiki/Entrega-3) y [registro](entrega-3.md). |
| Anexo A: selectores estables, evidencia en fallos, aislar externos | Cumplido | Selectores por rol y etiqueta; capturas y trazas en fallos; imagen externa y Gemini fuera de la CI. |
| Anexo B: página "Entrega 3" con 8 apartados | Cumplido | [Publicada](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/wiki/Entrega-3) desde las fuentes de PR #47. |

## Reglas generales (`entregas.md`)

| Exigencia | Estado | Evidencia |
| --- | --- | --- |
| §4.3 trazabilidad | Cumplido hasta la CI; falta el release | Clave REN en rama, commits y PR; cada HU enlaza sus pruebas en `docs/HU-*.md`; cada PR tiene su ejecución de CI. El último eslabón, el release, sigue pendiente. |
| §4.4 revisión de otro integrante antes de fusionar | Cumplido en la entrega 3 hasta PR #47; **incumplido desde PR #48** | En la entrega 3, cada PR integrada hasta #47 tuvo la aprobación del otro integrante: Jorge aprobó #38 a #44 (de Joaquín) y Joaquín aprobó #45 y #47 (de Jorge). Desde el 21 de noviembre de 2026 Joaquín no está disponible. Por decisión de Jorge bajamos a 0 la aprobación obligatoria en `develop` y `main`; siguen obligatorios el PR, los checks y `enforce_admins`, y no hay pushes directos. Cada PR desde #48 recibe revisiones adversarias de subagentes de IA sin el historial de la conversación, publicadas en la PR, que no reemplazan la revisión de un integrante. Las revisiones de Joaquín con cambios solicitados siguen bloqueando el merge aunque no se exijan aprobaciones; las descartamos dejando el motivo en la PR. |
| §4.6 repositorio mínimo | Cumplido | `README.md`, `.gitignore`, `.env.example`, `LICENSE`, `CONTRIBUTING.md` y `docs/`, vigentes desde la entrega 1. |
| Requisitos finales | **Parcial** | HU-09, HU-15 y HU-18 integradas; HU-17 en revisión, pendiente de una llamada real a Gemini (CA-08). |
| §4.5 tag `v3.0-entrega3` y GitHub Release | Pendiente | [Notas preparadas](releases/entrega-3.md); se crean sobre el commit estable de `main`. |
| §4.7 Wiki actualizada con Home como índice | Cumplido | Home enlaza la página Entrega 3; se vuelve a sincronizar en el cierre. |
| §4.8 uso de IA documentado | Cumplido | Wiki Entrega 3 y Supuestos; cada sección del registro. |
| Pauta §4.2 y reglas §4.10: presentación en clases | Por confirmar en Aula | Exponen los grupos que no lo hicieron en la presentación 1, según la selección en Aula; no registramos aquí si a RentSmart le corresponde. |

## Procedimiento de cierre

1. Integrar PR #46 (HU-17) con su revisión adversaria publicada. Si sigue sin clave para la llamada real, se integra con CA-08 pendiente y así queda registrado.
2. Crear `release/v3.0-entrega3` desde `develop`, completar estas notas y la Wiki con los resultados finales, y abrir el PR hacia `main`.
3. Exigir CI verde sobre el head revisado y una revisión adversaria publicada en la PR, sin hallazgos bloqueantes ni altos abiertos; integrar con merge commit. La aprobación obligatoria está relajada desde el 21 de noviembre (fila §4.4).
4. Comprobar la CI de `main`, el despliegue automático a Azure y la versión pública con `scripts/verify-deployment.sh` sobre el SHA.
5. Crear el tag `v3.0-entrega3` y el GitHub Release con funcionalidades, defectos, pruebas, limitaciones e instrucciones.
6. Sincronizar `main` con `develop` mediante PR, volver a publicar la Wiki y comprobar su contenido remoto.
7. Publicar el video, registrar su enlace y comprobar el acceso sin sesión. Entregar en Aula.

## Estado de la Wiki

Publicada el 20 de noviembre de 2026 desde `develop` `8243e17` (PR #47): commit de Wiki `de43207`. Comprobamos que las nueve páginas remotas coinciden con sus fuentes (sin contar finales de línea) y que `Entrega-3` y la portada cargan sin sesión.
