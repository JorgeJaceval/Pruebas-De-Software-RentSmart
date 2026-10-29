# Cierre de entrega 2 — REN-77

Estado al **29 de octubre de 2026**. Esta lista prepara el cierre; no acredita que la Wiki, el video, RentSmart en el VPS o la release estén publicados. El alcance autorizado se limita a entrega 2: HU-14/HU-16, CI/CD, Slack y sus evidencias. La dependencia de cancelación de HU-14 permanece declarada; no autoriza implementar HU-15 ni completar otros requisitos del proyecto.

## Matriz de la pauta y Anexo A

| Punto exigido | Evidencia preparada | Estado y acción pendiente |
| --- | --- | --- |
| Objetivo y herramienta CI/CD | [Página de Wiki](wiki/Entrega-2.md), secciones 1–2 | Preparado; Actions es alternativa de la sección 3.3 de la pauta |
| Dos requerimientos y pruebas | [HU-14](HU-14.md), [HU-16](HU-16.md), PR #20/#21, CP/Testing de Jira | Implementados con límite explícito: CA-05 de HU-14 parcial por cancelación |
| Arquitectura e infraestructura obligatoria | [Arquitectura](wiki/Arquitectura.md), [despliegue](despliegue.md), [VPS de Azure](vps-azure.md) | CI/Slack reales y VPS con SSH/Docker/DNS comprobados; publicación pendiente |
| Disparadores, etapas y dependencias | [Wiki](wiki/Entrega-2.md), [workflow](../.github/workflows/ci.yml) | Implementados y documentados |
| Integración GitHub y Slack | [Guía de Slack](notificaciones-slack.md) | ÉXITO/FALLO reales aceptados y recepción confirmada por el usuario |
| Ejecución manual y verificación del trigger | [Wiki](wiki/Entrega-2.md), sección 6 | Procedimiento preparado y ejecuciones reales enlazadas |
| Resultados y artefactos | [Registro](entrega-2.md), [estrategia](wiki/Estrategia-y-resultados-de-pruebas.md) | 134 Jest, 144 Pytest y 26 pruebas de infraestructura; revisar checks del candidato final y disponibilidad de artefactos |
| Problemas encontrados y soluciones | [Registro](entrega-2.md), [Wiki](wiki/Entrega-2.md) | Preparado; incorporar cualquier incidencia del despliegue real |
| Kanban, GitFlow y trazabilidad | Jira REN, ramas/commits con clave y PR revisados | Mantener actualizado hasta release; no contar un PR abierto como integrado |
| Documentación actualizada y Wiki | [Fuentes de Wiki](wiki/README.md) | Preparadas para revisión; publicar después de integrar |
| Cápsula autoexplicativa | [Guion de video](guion-video-entrega-2.md) | Guion preparado; grabación, publicación y URL pendientes |
| Versión estable, tag y GitHub Release | [Notas en borrador](releases/entrega-2.md) | Pendiente: release revisada hacia `main`, `v2.0-entrega2` y publicación real |

## Estado del ambiente

| Dato | Estado conocido |
| --- | --- |
| CI | GitHub Actions, runners Ubuntu, Node.js 24, Python 3.12 y PostgreSQL 17 temporal |
| Aplicación local | `compose.yaml`, Vite/FastAPI/PostgreSQL |
| Producción prevista | Azure, Chile Central; Linux + Docker Compose + Caddy, `compose.production.yaml` independiente |
| Host y usuario/puerto SSH | `57.156.63.29`, `rentsmartdeploy`, `22`; huella y acceso verificados |
| Dominio | `rentsmart-usm-viveros.chilecentral.cloudapp.azure.com`, resolución IPv4 confirmada; HTTPS todavía pendiente |
| Acceso Docker y proxy existente | Docker 29.9.2 y Compose v5.6.1 sin sudo; sin proxy previo; TCP 80/443 comprobados con sonda temporal |
| Secrets SSH y `shared/.env` | `.env` remoto 600 con secretos nuevos y `SITE_ADDRESS`; `production` limitado a `main` y los dos secretos SSH presentes; contenido/autenticación del pipeline pendientes de validar |
| Activación | `DEPLOY_ENABLED=false`; preparamos `release/REN-77-v2.0-entrega2` hacia `main`, sin publicación ni tag |
| Slack | App RentSmart CI; workspace Rent-Smart-aceval-viveros; canal `#rentsmart-ci` |
| Secreto Slack | `SLACK_WEBHOOK_URL` existe como secreto del repositorio; valor protegido |
| Video y URL de versión publicada | Pendientes; no usar enlaces de entrega 1 para acreditar entrega 2 |

## Secuencia de cierre

1. Verificamos la integración del [PR #26](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/pull/26) de documentación de REN-77 mediante `8b76c33`. Conservamos la revisión de las ampliaciones posteriores y comprobamos que las fuentes de Wiki describan el código integrado.
2. Verificamos la integración del [PR #27](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/pull/27) mediante `7ba9f25`, con VPS/DNS preparados. Consultamos el ambiente `production`, la regla exclusiva para la rama `main`, los nombres de los secretos y las variables. Esto no valida el contenido de las credenciales. La publicación se ejecuta cuando el código revisado alcance `main`; no presentamos la preparación como despliegue realizado.
3. Declaramos el alcance parcial de CA-05 de HU-14 para evaluación y registramos cualquier acuerdo docente. Esta lista no autoriza desarrollar cancelación ni nuevas historias.
4. Preparamos `release/REN-77-v2.0-entrega2` desde `develop` y el PR hacia `main`. Conservamos el prefijo GitFlow `release/` y la clave Jira. Exigimos sus checks y revisión del compañero antes de integrar, con merge commit que conserve el historial. `DEPLOY_ENABLED=false`; no hacemos push directo a las ramas permanentes ni creamos el tag con este candidato.
5. Después de integrar en `main`, comprobamos el SHA/CI, activamos `DEPLOY_ENABLED=true` y ejecutamos el workflow manual normal desde `main`. Verificamos el despliegue real de REN-84 mediante HTTPS, SHA/readiness y registramos URL, ejecución y resultado. Publicamos la Wiki desde las fuentes revisadas. `scripts/publicar-wiki.ps1` incluye siete páginas y la barra lateral; requiere PowerShell y acceso al repositorio de la Wiki. Verificamos enlaces y contenido remoto. Si aún falta un dato real, se conserva marcado como pendiente.
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
