# Guion propuesto para la cápsula de entrega 2

**Material de preparación; video todavía no grabado ni publicado.** Proponemos unos ocho minutos, sin atribuir esa duración a una exigencia de la pauta. Somos Jorge Aceval y Joaquín Viveros. El relato usa el trabajo real de entrega 2 y diferencia lo implementado de lo pendiente.

## Antes de grabar

- Elegimos un SHA revisado con CI normal aprobada y dos cuentas de demostración para los roles propietario/arrendatario.
- Confirmamos la URL HTTPS y el SHA antes de grabar. La primera publicación verificada corresponde a `ff19bc37918b10402779c9f8647798b6eff707d6`; si cambia, registramos la revisión y ejecución nuevas. Separamos la demostración funcional con datos de prueba de la consulta pública de salud/versión.
- Abrimos código, Jira, Wiki revisada, una CI normal, la sonda artificial y los dos mensajes de Slack. Preparamos únicamente ventanas necesarias; evitamos `.env`, secretos, webhooks, claves y cabeceras de autenticación.
- Usamos los enlaces históricos indicados abajo como evidencia de esa revisión. Para demostrar una revisión nueva comprobamos sus propios checks.

## Recorrido y narración

| Tiempo orientativo | Pantalla y narración |
| --- | --- |
| 0:00–0:40 | **Objetivo y herramienta.** «En entrega 2 ampliamos RentSmart con reservas recibidas y pago simulado e incorporamos un flujo CI/CD verificable. Conservamos GitHub Actions, alternativa admitida por la pauta. GitHub dispara el pipeline desde push/PR y conserva sus checks». Mostrar la página Entrega 2 y la estructura del repositorio |
| 0:40–1:30 | **Infraestructura y dependencias.** Mostrar el diagrama: React/TypeScript, FastAPI, SQLModel, PostgreSQL y Alembic; runners Ubuntu con Node/Python/DB temporal; Slack. Explicar Compose local y la publicación real en Azure Chile Central: Ubuntu, Docker Compose y Caddy; solo 80/443 públicos para la aplicación. Decir dónde corre realmente cada componente al grabar |
| 1:30–2:35 | **Pipeline y evidencia normal.** Mostrar `ci.yml`, ramas/eventos y una ejecución aprobada. Explicar frontend/backend paralelos, `quality`, `production`, condición de `deploy` y `notify`. Abrir JSON/JUnit, resumen y artefactos. «La revisión inicial tenía 134 pruebas frontend y 144 backend; el candidato de CA-05 suma 150 y 165 locales. Las 26 comprobaciones de infraestructura se cuentan por separado». Mostrar resultados de la revisión efectivamente grabada. No afirmar cobertura del 100% |
| 2:35–3:45 | **HU-14.** Con el propietario, abrir Mis espacios → Consultar reservas, filtrar por publicación y mostrar arrendatario/contrato/estado y próximas/historial. Relacionar con permisos y pruebas de aislamiento. «Completamos CA-05 con cancelación confirmada, auditoría y reembolso simulado cuando corresponde». Mostrarlo solo desde la revisión aprobada con esa ampliación; el VPS y la demo inicial ff19bc3 todavía no la incluyen |
| 3:45–4:55 | **HU-16.** Con el arrendatario, abrir una reserva elegible, rechazar un pago simulado y reintentar aprobando. Mostrar estado pagado, referencia/importe/fecha y lectura posterior del propietario. «Es una simulación sin dinero real ni tarjetas; backend conserva el contrato y procesa de forma atómica e idempotente». Mostrar la evidencia de tests, sin exponer tokens |
| 4:55–6:00 | **Fallo y Slack.** Abrir la sonda histórica, señalar que las pruebas de aplicación aprobaron y la etapa artificial hace fallar frontend/quality. Mostrar production/deploy omitidos y notify ejecutado. Abrir los avisos ÉXITO y FALLO artificial en `#rentsmart-ci` y sus botones a Actions. Aclarar que el rojo de la sonda es intencional |
| 6:00–7:00 | **Despliegue y verificación.** Explicar Caddy → `/api` → FastAPI → PostgreSQL, volúmenes, migración previa y verificación del SHA. Mostrar la URL HTTPS real, `version.json`, readiness y el intento 2 aprobado de #40944029052. Relacionar su SHA con el merge revisado de PR #28. «Despliegue omitido significa que no publicamos una versión». No ejecutar una publicación improvisada durante la grabación |
| 7:00–8:00 | **Problemas, colaboración y cierre.** Mostrar Jira y PR revisados. Explicar el fallo real de lectura de SSH_PRIVATE_KEY en el intento 1 y su corrección al cargar la clave completa; el intento 2 publicó el mismo SHA. Distinguirlo de la sonda artificial y mostrar el historial sin abrir secretos. Mostrar estado de Wiki/video/release, límites de HU-14 y pendientes reales. Cerrar con el alcance de entrega 2, sin demostrar funcionalidades o pruebas reservadas para entrega 3 |

## Evidencias disponibles para abrir

| Evidencia | Enlace y revisión |
| --- | --- |
| CI normal y aviso real de éxito | [#40796675009](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/40796675009), PR sobre `d3553a8` |
| Sonda y aviso real de fallo artificial | [#40796674640](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/40796674640), mismo código de aplicación |
| Integración HU-14 | [PR #20](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/pull/20) y [documentación](HU-14.md) |
| Integración HU-16 | [PR #21](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/pull/21) y [documentación](HU-16.md) |
| CI, despliegue preparado y Slack | PR [#22](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/pull/22), [#23](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/pull/23), [#24](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/pull/24) y [#25](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/pull/25) |
| Primera publicación HTTPS | [Actions #40944029052](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/40944029052), intento 2 aprobado sobre `ff19bc3`; [PR #28](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/pull/28) integrado |
| Aplicación pública | [RentSmart](https://rentsmart-usm-viveros.chilecentral.cloudapp.azure.com), [versión](https://rentsmart-usm-viveros.chilecentral.cloudapp.azure.com/version.json), [readiness](https://rentsmart-usm-viveros.chilecentral.cloudapp.azure.com/api/health/ready) |
| Arquitectura y procedimiento | [Página de entrega 2](wiki/Entrega-2.md), [despliegue](despliegue.md), [Slack](notificaciones-slack.md) |

Los reportes descargables tienen retención limitada. Antes de grabar verificamos que los enlaces y artefactos estén disponibles; si generamos nueva evidencia, registramos su SHA y ejecución. Para repetir una sonda, elegimos una referencia que no pueda desplegar y dejamos después una ejecución normal aprobada.

## Demostración local preparada

Disponemos de una [copia local con cuentas y reservas ficticias](demo-video-entrega-2.md), sobre el mismo SHA de la primera publicación. La guía indica cómo abrirla, iniciar sesión en ambos roles y crear una reserva fresca al grabar para respetar el plazo de pago de 15 minutos. Su preparación no constituye video grabado.

## Lista de preparación de la grabación

1. Confirmamos [PR #29](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/pull/29) integrado y la primera publicación de la Wiki desde esas fuentes revisadas. Consultamos el estado de PR #31 y sincronizamos sus correcciones después de integrarlas; presentamos el contenido que esté realmente publicado al grabar.
2. Preparamos en un entorno de demostración dos cuentas ficticias, una publicación del propietario y una reserva del arrendatario elegible para pago. Comprobamos manualmente el recorrido de HU-14/HU-16 antes de grabar y anotamos qué entorno mostramos. No usamos datos personales reales ni presentamos esta demostración como pruebas E2E automatizadas.
3. Abrimos las pestañas en el orden del guion: Wiki, arquitectura, workflow/CI, aplicación de demostración, pruebas, Slack, despliegue, Jira y PR revisados. Para la evidencia pública consultamos únicamente página inicial, versión y readiness; la primera verificación no creó datos en producción.
4. Para Actions seleccionamos explícitamente el intento 1 al explicar el error de clave y el intento 2 al mostrar su solución. Diferenciamos la ejecución histórica de las pruebas del candidato final y comprobamos la disponibilidad de artefactos antes de grabar.
5. Comprobamos audio, legibilidad de texto y ausencia de ventanas con credenciales. Repartimos la narración entre ambos integrantes según disponibilidad; ocho minutos es una propuesta, no un límite oficial confirmado.
6. Dejamos visibles los pendientes reales: revisión/integración y publicación del candidato de CA-05, video, sincronización final de Wiki y tag/Release según el estado al grabar. Explicamos la justificación de CA-05 en entrega 2 y mantenemos la interfaz del arrendatario pendiente en HU-15.

## Ficha que completamos al publicar

| Dato | Registro pendiente |
| --- | --- |
| URL del video de entrega 2 | Pendiente de grabación y publicación |
| Fecha y duración real | Pendientes |
| SHA y entorno de la demostración funcional | Pendientes de confirmar al grabar |
| SHA público y ejecución de despliegue mostrados | Referencia inicial: `ff19bc3`, #40944029052 intento 2; reconfirmamos al grabar |
| Acceso del evaluador | Pendiente de comprobar con otra sesión |
| Enlaces incorporados en README, Wiki y notas | Pendientes después de disponer de la URL real |

## Al terminar

Revisamos que el video incluya alcances de la herramienta, trabajo y dependencias, uso del pipeline, infraestructura, pruebas, problemas y soluciones. Publicamos el archivo con acceso para el evaluador y comprobamos el enlace desde otra sesión. Incorporamos esa URL real en README, Wiki y notas de versión; no sustituimos la cápsula de entrega 2 con el video de entrega 1. La grabación no se marca completada por disponer de este guion.
