# Cierre de entrega 3 — REN-92

**Actualización: 20 de noviembre de 2026.** Relaciona cada exigencia de la [pauta de entrega 3](https://github.com/Pruebas-de-Software/HandsOnProject/blob/main/semestres/2026-2/entrega3.md) y de las [reglas generales](https://github.com/Pruebas-de-Software/HandsOnProject/blob/main/semestres/2026-2/entregas.md) con su evidencia y su estado real. El [registro acumulativo](entrega-3.md) conserva el historial de cada PR.

## Definition of Done (§3)

| Ítem | Estado | Evidencia |
| --- | --- | --- |
| Set de pruebas E2E/UI (mínimo 5; recomendado 10) | Cumplido | 18 casos integrados en `develop` en [`frontend/e2e/`](../frontend/e2e) ([CI #44857577109](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/44857577109)); E3-16 (IA) entra con [PR #46](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/pull/46), para 19 en el candidato combinado ([CI #44855034122](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/44855034122)). Listado en la [Wiki](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/wiki/Entrega-3) §3. |
| Cubren escenarios críticos, explicados | Cumplido | Wiki §3 relaciona cada caso con el escenario de la pauta; la [guía E2E](testing/e2e.md), con sus criterios. |
| Se ejecutan automáticamente en el pipeline | Cumplido, con GitHub Actions | Job `e2e` en cada PR/push; [primera ejecución #44822253194](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/44822253194). La pauta nombra Jenkins: justificación en la Wiki §2, aceptación docente pendiente. |
| El pipeline falla si falla una prueba E2E | Cumplido | [Sonda #44828331317](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/44828331317): `e2e` y `quality` en rojo, deploy omitido. |
| Evidencia (logs, reportes, screenshots) | Cumplido | Artefacto `e2e-results` (HTML, JUnit, capturas, trazas) y [registro de la sonda con captura](evidencias/REN-90-fallo-e2e-2026-11-20.md). |
| Notificaciones a Slack | Cumplido | `notify` informa `e2e`; avisos ÉXITO y FALLO aceptados por Slack en las ejecuciones normal y de sonda. |

## Requisitos de la pauta (§2) y anexos

| Exigencia | Estado | Evidencia |
| --- | --- | --- |
| §2.3 headless, `BASE_URL`, datos | Cumplido | `scripts/run-e2e.sh` y `frontend/playwright.config.ts`; Wiki §3–§5. |
| §2.4 scripts en GitHub, ejecución automática, Slack | Cumplido | Mismas evidencias del DoD. |
| §4.1 GitFlow y Kanban | Cumplido, con excepción desde PR #48 | Ramas `feature/REN-*` y épica REN-85 con REN-86 a REN-92. Hasta PR #47 revisó cada PR el otro integrante. Desde PR #48, como Joaquín no está disponible, cada PR la revisa un subagente de IA sin contexto previo y Jorge la integra; la revisión queda como comentario en la PR. |
| §4.1 estimación en horas o Story Points | **Parcial** | Estimaciones en las descripciones y en el [registro §4](entrega-3.md); falta habilitar el campo estructurado en Jira. |
| §5.1 código actualizado | En curso | `develop` integra todo salvo HU-17 ([PR #46](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/pull/46)); pasa a `main` con el release. |
| §5.2 cápsula de video | **Pendiente** | [Guion](guion-video-entrega-3.md) listo; falta grabar y publicar. |
| §5.3 documento completo | Cumplido | [Wiki Entrega 3](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/wiki/Entrega-3) y [registro](entrega-3.md). |
| Anexo A: selectores estables, evidencia en fallos, aislar externos | Cumplido | Selectores por rol y etiqueta; capturas y trazas en fallos; imagen externa y Gemini fuera de la CI. |
| Anexo B: página "Entrega 3" con 8 apartados | Cumplido | [Publicada](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/wiki/Entrega-3) desde las fuentes de PR #47. |

## Reglas generales (`entregas.md`)

| Exigencia | Estado | Evidencia |
| --- | --- | --- |
| Requisitos finales | **Parcial** | HU-09, HU-15 y HU-18 integradas; HU-17 en revisión, pendiente de una llamada real a Gemini (CA-08). |
| §4.5 tag `v3.0-entrega3` y GitHub Release | Pendiente | [Notas preparadas](releases/entrega-3.md); se crean sobre el commit estable de `main`. |
| §4.7 Wiki actualizada con Home como índice | Cumplido | Home enlaza la página Entrega 3; se vuelve a sincronizar en el cierre. |
| §4.8 uso de IA documentado | Cumplido | Wiki Entrega 3 y Supuestos; cada sección del registro. |
| §4.10 presentación en clases | Según Aula | Expone el grupo seleccionado en Aula. |

## Procedimiento de cierre

1. Integrar PR #46 (HU-17) cuando tenga su evidencia real y la aprobación de Joaquín, o registrar la decisión de cerrar sin ella.
2. Crear `release/v3.0-entrega3` desde `develop`, completar estas notas y la Wiki con los resultados finales, y abrir el PR hacia `main`.
3. Exigir CI verde sobre el head revisado y la aprobación del otro integrante; integrar con merge commit.
4. Comprobar la CI de `main`, el despliegue automático a Azure y la versión pública con `scripts/verify-deployment.sh` sobre el SHA.
5. Crear el tag `v3.0-entrega3` y el GitHub Release con funcionalidades, defectos, pruebas, limitaciones e instrucciones.
6. Sincronizar `main` con `develop` mediante PR, volver a publicar la Wiki y comprobar su contenido remoto.
7. Publicar el video, registrar su enlace y comprobar el acceso sin sesión. Entregar en Aula.

## Estado de la Wiki

Publicada el 20 de noviembre de 2026 desde `develop` `8243e17` (PR #47): commit de Wiki `de43207`. Comprobamos que las nueve páginas remotas coinciden byte a byte con sus fuentes (sin contar finales de línea) y que `Entrega-3` y la portada cargan sin sesión.
