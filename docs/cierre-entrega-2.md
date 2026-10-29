# Cierre de entrega 2 — REN-77

Estado al **29 de octubre de 2026**. La publicación de RentSmart y la primera publicación de la Wiki de entrega 2 están verificadas; video y tag/Release finales siguen pendientes. El alcance autorizado se limita a entrega 2: HU-14/HU-16, CI/CD, Slack y sus evidencias. La dependencia de cancelación de HU-14 permanece declarada; no autoriza implementar HU-15 ni completar otros requisitos del proyecto.

## Matriz de la pauta y Anexo A

| Punto exigido | Evidencia preparada | Estado y acción pendiente |
| --- | --- | --- |
| Objetivo y herramienta CI/CD | [Página de Wiki](wiki/Entrega-2.md), secciones 1–2 | Preparado; Actions es alternativa de la sección 3.3 de la pauta |
| Dos requerimientos y pruebas | [HU-14](HU-14.md), [HU-16](HU-16.md), PR #20/#21, CP/Testing de Jira | Implementados con límite explícito: CA-05 de HU-14 parcial por cancelación |
| Arquitectura e infraestructura obligatoria | [Arquitectura](wiki/Arquitectura.md), [despliegue](despliegue.md), [evidencia del VPS](evidencias/REN-84-despliegue-2026-10-29.md) | Publicación HTTPS, SHA/readiness y contenedores sanos verificados; arquitectura publicada en la Wiki desde PR #29 |
| Disparadores, etapas y dependencias | [Wiki](wiki/Entrega-2.md), [workflow](../.github/workflows/ci.yml) | Implementados y documentados |
| Integración GitHub y Slack | [Guía de Slack](notificaciones-slack.md) | ÉXITO/FALLO reales aceptados y recepción confirmada por el usuario |
| Ejecución manual y verificación del trigger | [Wiki](wiki/Entrega-2.md), sección 6 | Procedimiento preparado y ejecuciones reales enlazadas |
| Resultados y artefactos | [Registro](entrega-2.md), [estrategia](wiki/Estrategia-y-resultados-de-pruebas.md) | 134 Jest, 144 Pytest y 26 pruebas de infraestructura; revisar checks del candidato final y disponibilidad de artefactos |
| Problemas encontrados y soluciones | [Registro](entrega-2.md), [Wiki](wiki/Entrega-2.md) | Incidente SSH y solución documentados; conservar incidencias posteriores |
| Kanban, GitFlow y trazabilidad | Jira REN, ramas/commits con clave y PR revisados | Mantener actualizado hasta release; no contar un PR abierto como integrado |
| Documentación actualizada y Wiki | [Fuentes de Wiki](wiki/README.md) | Primera publicación verificada desde PR #29; sincronizar las actualizaciones finales después de revisión |
| Cápsula autoexplicativa | [Guion de video](guion-video-entrega-2.md) | Guion preparado; grabación, publicación y URL pendientes |
| Versión estable, tag y GitHub Release | [Notas en borrador](releases/entrega-2.md) | Pendiente: release revisada hacia `main`, `v2.0-entrega2` y publicación real |

## Estado del ambiente

| Dato | Estado conocido |
| --- | --- |
| CI | GitHub Actions, runners Ubuntu, Node.js 24, Python 3.12 y PostgreSQL 17 temporal |
| Aplicación local | `compose.yaml`, Vite/FastAPI/PostgreSQL |
| Producción publicada | Azure, Chile Central; Linux + Docker Compose + Caddy, `compose.production.yaml` independiente; revisión `ff19bc3` |
| Host y usuario/puerto SSH | `57.156.63.29`, `rentsmartdeploy`, `22`; huella y acceso verificados |
| Dominio | `rentsmart-usm-viveros.chilecentral.cloudapp.azure.com`, DNS/HTTPS y redirección desde HTTP verificados |
| Acceso Docker y proxy existente | Docker 29.9.2 y Compose v5.6.1 sin sudo; sin proxy previo; TCP 80/443 comprobados con sonda temporal |
| Secrets SSH y `shared/.env` | `.env` remoto 600; `production` limitado a `main`; autenticación y host comprobados en el segundo intento después de corregir la clave |
| Activación | `DEPLOY_ENABLED=true`; PR #28 integrado y primera publicación de `ff19bc3` verificada; sin tag/Release final |
| Slack | App RentSmart CI; workspace Rent-Smart-aceval-viveros; canal `#rentsmart-ci` |
| Secreto Slack | `SLACK_WEBHOOK_URL` existe como secreto del repositorio; valor protegido |
| Aplicación y video | [Aplicación publicada](https://rentsmart-usm-viveros.chilecentral.cloudapp.azure.com); video de entrega 2 pendiente |

## Secuencia de cierre

1. Verificamos la integración del [PR #26](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/pull/26) de documentación de REN-77 mediante `8b76c33`. Conservamos la revisión de las ampliaciones posteriores y comprobamos que las fuentes de Wiki describan el código integrado.
2. Verificamos la integración del [PR #27](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/pull/27) mediante `7ba9f25`, con VPS/DNS preparados. Consultamos el ambiente `production`, la regla exclusiva para la rama `main`, los nombres de los secretos y las variables. Esto no valida el contenido de las credenciales. La publicación se ejecuta cuando el código revisado alcance `main`; no presentamos la preparación como despliegue realizado.
3. Declaramos el alcance parcial de CA-05 de HU-14 para evaluación y registramos cualquier acuerdo docente. Esta lista no autoriza desarrollar cancelación ni nuevas historias.
4. PR #28 de `release/REN-77-v2.0-entrega2` está aprobado e integrado en `main` mediante `ff19bc3`, con checks y CI del merge aprobados. Conservamos historial y clave Jira, sin crear el tag. El primer intento falló al interpretar `SSH_PRIVATE_KEY`; el usuario corrigió el secreto y el segundo intento publicó correctamente.
5. Primera publicación verificada: [#40944029052, intento 2](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/40944029052), mismo SHA revisado; [registramos HTTPS, versión/readiness y contenedores](evidencias/REN-84-despliegue-2026-10-29.md). PR #29 ya integró la evidencia en `develop`. Pendiente: mantener la Wiki sincronizada con las fuentes integradas. Publicamos la primera versión de entrega 2 mediante `9d1e175`, con [evidencia y verificación remota](evidencias/REN-77-wiki-2026-10-29.md). `scripts/publicar-wiki.ps1` incluye siete páginas y la barra lateral; requiere PowerShell y acceso a la Wiki. Verificamos enlaces y contenido remoto antes de declararla publicada.
6. Grabamos/publicamos el video, verificamos que el enlace pueda abrirlo el evaluador y lo incorporamos a README, Wiki y notas de versión. No grabamos variables de secretos ni el webhook.
7. Con el candidato estable y los pendientes explícitamente resueltos o aceptados, creamos el tag `v2.0-entrega2` sobre el commit final de `main` y el GitHub Release con las notas revisadas. Confirmamos tag, SHA, enlaces y resultado del despliegue correspondiente a esa revisión. Sincronizamos después `main` con `develop` por PR.

La primera publicación del VPS requiere que el código de CI/CD alcance `main` por el flujo revisado, sin crear todavía el tag. Si después agregamos URLs o ajustes finales a las notas, esos cambios también pasan por PR/revisión y verificamos el SHA definitivo antes del tag. La comprobación final del despliegue, video y release debe identificar el código que realmente se entrega; los resultados históricos no sustituyen los checks de ese candidato.

## Registro mínimo para la entrega real

- URL pública, fecha, SHA y ejecución de Actions que confirmó `version.json` y `/api/health/ready`.
- Enlaces de CI normal/fallo controlado y mensajes recibidos en Slack, sin mostrar el webhook.
- URL de Wiki publicada con el Anexo A y las limitaciones actualizadas.
- URL accesible del video y revisión del código que demuestra.
- PR de release revisado, SHA final de `main`, tag y URL del GitHub Release.
- Estado final de REN-74/77/84 y alcance declarado de HU-14, con responsable conservado.

Las pruebas E2E/UI y los requisitos finales de entrega 3 se mantienen fuera de esta lista de implementación.
