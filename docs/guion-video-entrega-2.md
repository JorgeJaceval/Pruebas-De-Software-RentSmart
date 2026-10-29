# Guion propuesto para la cápsula de entrega 2

**Material de preparación; video todavía no grabado ni publicado.** Proponemos unos ocho minutos, sin atribuir esa duración a una exigencia de la pauta. Somos Jorge Aceval y Joaquín Viveros. El relato usa el trabajo real de entrega 2 y diferencia lo implementado de lo pendiente.

## Antes de grabar

- Elegimos un SHA revisado con CI normal aprobada y dos cuentas de demostración para los roles propietario/arrendatario.
- Confirmamos el estado real del VPS. Si todavía no está publicado, explicamos que la configuración de despliegue está preparada y dejamos su evidencia como pendiente; no mostramos HTTP local como HTTPS público.
- Abrimos código, Jira, Wiki revisada, una CI normal, la sonda artificial y los dos mensajes de Slack. Preparamos únicamente ventanas necesarias; evitamos `.env`, secretos, webhooks, claves y cabeceras de autenticación.
- Usamos los enlaces históricos indicados abajo como evidencia de esa revisión. Para demostrar una revisión nueva comprobamos sus propios checks.

## Recorrido y narración

| Tiempo orientativo | Pantalla y narración |
| --- | --- |
| 0:00–0:40 | **Objetivo y herramienta.** «En entrega 2 ampliamos RentSmart con reservas recibidas y pago simulado e incorporamos un flujo CI/CD verificable. Conservamos GitHub Actions, alternativa admitida por la pauta. GitHub dispara el pipeline desde push/PR y conserva sus checks». Mostrar la página Entrega 2 y la estructura del repositorio |
| 0:40–1:30 | **Infraestructura y dependencias.** Mostrar el diagrama: React/TypeScript, FastAPI, SQLModel, PostgreSQL y Alembic; runners Ubuntu con Node/Python/DB temporal; Slack. Explicar Compose local y el diseño Linux/Caddy previsto. Decir dónde corre realmente cada componente al grabar |
| 1:30–2:35 | **Pipeline y evidencia normal.** Mostrar `ci.yml`, ramas/eventos y una ejecución aprobada. Explicar frontend/backend paralelos, `quality`, `production`, condición de `deploy` y `notify`. Abrir JSON/JUnit, resumen y artefactos. «Hay 134 pruebas frontend y 144 backend; 26 comprobaciones de infraestructura se cuentan por separado». No afirmar cobertura del 100% |
| 2:35–3:45 | **HU-14.** Con el propietario, abrir Mis espacios → Consultar reservas, filtrar por publicación y mostrar arrendatario/contrato/estado y próximas/historial. Relacionar con permisos y pruebas de aislamiento. «CA-05 conserva la dependencia de HU-15; cancelar sigue deshabilitado y no se presenta como desarrollado en esta entrega» |
| 3:45–4:55 | **HU-16.** Con el arrendatario, abrir una reserva elegible, rechazar un pago simulado y reintentar aprobando. Mostrar estado pagado, referencia/importe/fecha y lectura posterior del propietario. «Es una simulación sin dinero real ni tarjetas; backend conserva el contrato y procesa de forma atómica e idempotente». Mostrar la evidencia de tests, sin exponer tokens |
| 4:55–6:00 | **Fallo y Slack.** Abrir la sonda histórica, señalar que las pruebas de aplicación aprobaron y la etapa artificial hace fallar frontend/quality. Mostrar production/deploy omitidos y notify ejecutado. Abrir los avisos ÉXITO y FALLO artificial en `#rentsmart-ci` y sus botones a Actions. Aclarar que el rojo de la sonda es intencional |
| 6:00–7:00 | **Despliegue y verificación.** Explicar Caddy → `/api` → FastAPI → PostgreSQL, volúmenes, migración previa y verificación del SHA. Si REN-84 ya está completada, mostrar la URL real, `version.json`, readiness y su ejecución; si no, declarar publicación pendiente. «Despliegue omitido significa que no publicamos una versión». No ejecutar una publicación improvisada durante la grabación |
| 7:00–8:00 | **Problemas, colaboración y cierre.** Mostrar Jira y PR revisados. Resumir sondas frente a fallos reales, frontend de desarrollo frente a Caddy y protección de secretos. Mostrar estado de Wiki/video/release, límites de HU-14 y pendientes reales. Cerrar con el alcance de entrega 2, sin demostrar funcionalidades o pruebas reservadas para entrega 3 |

## Evidencias disponibles para abrir

| Evidencia | Enlace y revisión |
| --- | --- |
| CI normal y aviso real de éxito | [#40796675009](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/40796675009), PR sobre `d3553a8` |
| Sonda y aviso real de fallo artificial | [#40796674640](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/40796674640), mismo código de aplicación |
| Integración HU-14 | [PR #20](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/pull/20) y [documentación](HU-14.md) |
| Integración HU-16 | [PR #21](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/pull/21) y [documentación](HU-16.md) |
| CI, despliegue preparado y Slack | PR [#22](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/pull/22), [#23](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/pull/23), [#24](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/pull/24) y [#25](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/pull/25) |
| Arquitectura y procedimiento | [Página de entrega 2](wiki/Entrega-2.md), [despliegue](despliegue.md), [Slack](notificaciones-slack.md) |

Los reportes descargables tienen retención limitada. Antes de grabar verificamos que los enlaces y artefactos estén disponibles; si generamos nueva evidencia, registramos su SHA y ejecución. Para repetir una sonda, elegimos una referencia que no pueda desplegar y dejamos después una ejecución normal aprobada.

## Al terminar

Revisamos que el video incluya alcances de la herramienta, trabajo y dependencias, uso del pipeline, infraestructura, pruebas, problemas y soluciones. Publicamos el archivo con acceso para el evaluador y comprobamos el enlace desde otra sesión. Incorporamos esa URL real en README, Wiki y notas de versión; no sustituimos la cápsula de entrega 2 con el video de entrega 1. La grabación no se marca completada por disponer de este guion.
