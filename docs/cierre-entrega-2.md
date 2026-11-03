# Cierre de entrega 2 — REN-77

**Actualización: 2 de noviembre de 2026.** Reunimos CI/CD, HU-14/CA-05 y HU-16 e incorporamos el video proporcionado por Jorge, con acceso anónimo comprobado. El [registro acumulativo](entrega-2.md) conserva el historial; cada resultado corresponde al SHA de su evidencia.

## Enlaces de entrega

- [Código estable v2.0-entrega2](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/tree/v2.0-entrega2).
- [GitHub Release: SHA, CI y publicación final](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/releases/tag/v2.0-entrega2).
- [Aplicación HTTPS](https://rentsmart-usm-viveros.chilecentral.cloudapp.azure.com).
- [Wiki de entrega 2](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/wiki/Entrega-2).
- [Video de entrega 2](https://drive.google.com/file/d/1bSMNsGrb_MBqMZ_D4iOy18PT9qu68TKA/view?usp=sharing), **22 min 44 s**; [ficha verificada](evidencias/REN-77-video-2026-11-02.md).
- [PR de cierre #36](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/pull/36) y [checks](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/pull/36/checks).

Editar este archivo no publica esos artefactos. Su existencia se comprueba en los enlaces; el Release registra el SHA definitivo y sus verificaciones después del merge.

## Matriz de la pauta y Anexo A

| Punto | Implementación y evidencia |
| --- | --- |
| Objetivo y herramienta | [Wiki](wiki/Entrega-2.md); Actions, alternativa permitida en §3.3 de la [pauta](https://github.com/Pruebas-de-Software/HandsOnProject/blob/main/semestres/2026-2/entrega2.md) |
| Dos requisitos y pruebas | [HU-14](HU-14.md), [HU-16](HU-16.md), PR #20/#21/#33/#34, CP/Testing de Jira; CA-05 incluye cancelación del propietario, auditoría y reembolso simulado |
| Arquitectura e infraestructura | [Arquitectura](wiki/Arquitectura.md), [despliegue](despliegue.md): Azure, Compose, Caddy, FastAPI y PostgreSQL |
| Disparadores, etapas y dependencias | [Workflow](../.github/workflows/ci.yml): PR/push, ejecución manual, frontend/backend, quality, production, deploy y notify |
| Integraciones GitHub y Slack | [Notificaciones](notificaciones-slack.md); evidencia de ÉXITO/FALLO y recepción confirmada por el equipo |
| Ejecución y trigger | [Wiki, sección 6](wiki/Entrega-2.md#6-cómo-ejecutar-y-verificar-el-trigger), [instalación](wiki/Instalacion-y-ejecucion.md) |
| Resultados y artefactos | [Estrategia](wiki/Estrategia-y-resultados-de-pruebas.md); CI de 27ba058: 150 Jest + 165 Pytest; 26 comprobaciones de infraestructura separadas. El cierre conserva sus propios checks |
| Problemas y soluciones | [Wiki](wiki/Entrega-2.md) y bitácora; fallo real de SSH diferenciado de la sonda artificial |
| Kanban, GitFlow y revisión | [Jira REN](https://rentsmartpsf.atlassian.net/jira/software/projects/REN), claves REN en ramas/commits/PR, una aprobación y merge commit |
| Protección de ramas | PR, una aprobación y checks frontend/backend/quality/production/notify; sin force push, borrado ni bypass administrativo; configuración comprobable en GitHub |
| Wiki | Siete páginas y barra lateral publicadas desde [fuentes revisadas](wiki/README.md) |
| Video | [Cápsula publicada](https://drive.google.com/file/d/1bSMNsGrb_MBqMZ_D4iOy18PT9qu68TKA/view?usp=sharing) y [ficha](evidencias/REN-77-video-2026-11-02.md); acceso y metadatos comprobados, sin auditoría audiovisual completa |
| Versión estable | PR #36, v2.0-entrega2 y [notas](releases/entrega-2.md); el Release registra el resultado final |
| Apoyo de IA | [Herramientas, elementos y validación](wiki/Supuestos-y-dependencias.md#apoyo-de-inteligencia-artificial) |

## Procedimiento de cierre

1. Revisamos diff y comentarios; incorporamos el video y su ficha antes de retirar el borrador.
2. Exigimos CI normal sobre el head revisado, base vigente y aprobación antes del merge commit.
3. Comprobamos CI de main y publicación automática mediante versión/readiness. La publicación histórica 27ba058 conserva su evidencia; una nueva revisión se verifica por su propio SHA.
4. Publicamos las ocho fuentes aprobadas de Wiki y comprobamos bytes remotos, navegación y video sin sesión.
5. Creamos v2.0-entrega2 sobre el commit estable verificado y el GitHub Release con SHA, enlaces, pruebas y limitaciones.
6. Sincronizamos main con develop mediante PR y actualizamos Jira con artefactos reales.

## Límites del hito

HU-14/CA-05 y HU-16 están integradas; PR #34 publicó la cancelación del propietario con migración 0007 y [evidencia](evidencias/REN-14-despliegue-ca05-2026-10-29.md). Pagos y reembolsos son simulados.

La interfaz del arrendatario de HU-15, filtros temporales, funcionalidades finales y E2E/UI permanecen para entrega 3. Este cierre no completa el backlog general. Las fechas y el envío en Moodle se gestionan en Aula.
