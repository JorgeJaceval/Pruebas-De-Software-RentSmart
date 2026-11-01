# Cierre de entrega 2 — REN-77

Estado al **29 de octubre de 2026**. La publicación de RentSmart y la primera publicación de la Wiki de entrega 2 están verificadas; video y tag/Release finales siguen pendientes. El alcance autorizado se limita a entrega 2: HU-14/HU-16, CI/CD, Slack y sus evidencias. La ampliación autorizada incorpora la cancelación necesaria para CA-05 de HU-14, con [justificación y alcance](cancelacion-ca05-entrega-2.md); tiene PR #33 integrada en `develop` mediante `66e5f87` y CI del merge aprobada; PR #34 está integrada en `main` y publicada mediante `27ba058`, con [evidencia](evidencias/REN-14-despliegue-ca05-2026-10-29.md). HU-15 conserva pendiente la interfaz del arrendatario.

## Matriz de la pauta y Anexo A

| Punto exigido | Evidencia preparada | Estado y acción pendiente |
| --- | --- | --- |
| Objetivo y herramienta CI/CD | [Página de Wiki](wiki/Entrega-2.md), secciones 1–2 | Preparado; Actions es alternativa de la sección 3.3 de la pauta |
| Dos requerimientos y pruebas | [HU-14](HU-14.md), [HU-16](HU-16.md), PR #20/#21, CP/Testing de Jira | HU-16 integrada; CA-05 de HU-14 implementado en candidato con cancelación del propietario, HU-14/HU-16 integradas; CA-05 publicado con PR #34 y migración 0007; CI del merge aprobada |
| Arquitectura e infraestructura obligatoria | [Arquitectura](wiki/Arquitectura.md), [despliegue](despliegue.md), [evidencia del VPS](evidencias/REN-84-despliegue-2026-10-29.md) | Publicación HTTPS, SHA/readiness y contenedores sanos verificados; arquitectura publicada en la Wiki desde PR #29 |
| Disparadores, etapas y dependencias | [Wiki](wiki/Entrega-2.md), [workflow](../.github/workflows/ci.yml) | Implementados y documentados |
| Integración GitHub y Slack | [Guía de Slack](notificaciones-slack.md) | ÉXITO/FALLO reales aceptados y recepción confirmada por el usuario |
| Ejecución manual y verificación del trigger | [Wiki](wiki/Entrega-2.md), sección 6 | Procedimiento preparado y ejecuciones reales enlazadas |
| Resultados y artefactos | [Registro](entrega-2.md), [estrategia](wiki/Estrategia-y-resultados-de-pruebas.md) | Candidato de CA-05: 150 Jest y 165 Pytest locales; 26 comprobaciones de infraestructura separadas. Revisar CI y artefactos del candidato final |
| Problemas encontrados y soluciones | [Registro](entrega-2.md), [Wiki](wiki/Entrega-2.md) | Incidente SSH y solución documentados; conservar incidencias posteriores |
| Kanban, GitFlow y trazabilidad | Jira REN, ramas/commits con clave y PR revisados | Mantener actualizado hasta release; no contar un PR abierto como integrado |
| Documentación actualizada y Wiki | [Fuentes de Wiki](wiki/README.md) | Publicación de PR #35 verificada en e5c29a1; sincronizar después las fuentes finales con el video |
| Cápsula autoexplicativa | [Guion de video](guion-video-entrega-2.md) | Guion preparado; grabación, publicación y URL pendientes |
| Versión estable, tag y GitHub Release | [Notas en borrador](releases/entrega-2.md) | Pendiente: release revisada hacia `main`, `v2.0-entrega2` y publicación real |

## Estado del ambiente

| Dato | Estado conocido |
| --- | --- |
| CI | GitHub Actions, runners Ubuntu, Node.js 24, Python 3.12 y PostgreSQL 17 temporal |
| Aplicación local | `compose.yaml`, Vite/FastAPI/PostgreSQL |
| Producción publicada | Azure, Chile Central; Linux + Docker Compose + Caddy, `compose.production.yaml` independiente; revisión `27ba058`, CA-05 y migración 0007 verificadas |
| Host y usuario/puerto SSH | `57.156.63.29`, `rentsmartdeploy`, `22`; huella y acceso verificados |
| Dominio | `rentsmart-usm-viveros.chilecentral.cloudapp.azure.com`, DNS/HTTPS y redirección desde HTTP verificados |
| Acceso Docker y proxy existente | Docker 29.9.2 y Compose v5.6.1 sin sudo; sin proxy previo; TCP 80/443 comprobados con sonda temporal |
| Secrets SSH y `shared/.env` | `.env` remoto 600; `production` limitado a `main`; autenticación y host comprobados en el segundo intento después de corregir la clave |
| Activación | `DEPLOY_ENABLED=true`; PR #28 integrado y primera publicación de `ff19bc3` y actualización `27ba058` verificadas; sin tag/Release final |
| Slack | App RentSmart CI; workspace Rent-Smart-aceval-viveros; canal `#rentsmart-ci` |
| Secreto Slack | `SLACK_WEBHOOK_URL` existe como secreto del repositorio; valor protegido |
| Aplicación y video | [Aplicación publicada](https://rentsmart-usm-viveros.chilecentral.cloudapp.azure.com); video de entrega 2 pendiente |

## Secuencia de cierre

1. Verificamos la integración del [PR #26](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/pull/26) de documentación de REN-77 mediante `8b76c33`. Conservamos la revisión de las ampliaciones posteriores y comprobamos que las fuentes de Wiki describan el código integrado.
2. Verificamos la integración del [PR #27](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/pull/27) mediante `7ba9f25`, con VPS/DNS preparados. Consultamos el ambiente `production`, la regla exclusiva para la rama `main`, los nombres de los secretos y las variables. Esto no valida el contenido de las credenciales. La publicación se ejecuta cuando el código revisado alcance `main`; no presentamos la preparación como despliegue realizado.
3. Revisamos e integramos la ampliación autorizada de CA-05 de HU-14 con sus pruebas, antes de publicar la revisión final. [Documentamos por qué pertenece a entrega 2](cancelacion-ca05-entrega-2.md). No requerimos una excepción docente para presentar el criterio completo.
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
- Estado final de REN-74/77/84 y revisión/integración de CA-05 de HU-14, con responsables conservados.

Las pruebas E2E/UI y los requisitos finales de entrega 3 se mantienen fuera de esta lista de implementación.


## Preparación de publicación — registro histórico

El usuario confirmó inicialmente que faltaba integrar PR #33. Después verificamos su merge `66e5f87` y CI aprobada. Preparamos `release/REN-14-publicacion-ca05` y PR #34 hacia `main`, incorporando el historial integrado; no integramos PR ni publicamos al VPS desde esta preparación. La demostración local sí se actualizó a `9103718` con respaldo, migración y ensayo de CA-05, según [su guía](demo-video-entrega-2.md). Los siguientes pasos son verificar CI y revisar/integrar PR #34 a `main`; después comprobamos el despliegue y sincronizamos la Wiki con fuentes aprobadas. Video y tag/Release siguen pendientes.

Conservamos un respaldo privado previo a 0007 dentro del VPS y comprobamos su formato/listado, permisos 600 y hash; [la evidencia de preparación](evidencias/REN-14-preparacion-publicacion-ca05-2026-10-29.md) distingue respaldo, ensayo local y publicación aún pendiente.


## Publicación de CA-05 completada

PR #34 fue aprobada e integrada en `main` mediante `27ba0580232774fc65750c1974485381a1fcffa4`. [Actions #40967124896](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/40967124896) aprobó pruebas, infraestructura, despliegue y notificación. Comprobamos independientemente HTTPS/SHA/readiness, 0007 y sus restricciones, contenedores sanos y ruta de cancelación protegida, sin crear datos de producción. [La evidencia](evidencias/REN-14-despliegue-ca05-2026-10-29.md) conserva el respaldo inmediatamente previo y sus límites.

Incorporamos el `main` revisado a `feature/REN-14-evidencia-publicacion-ca05` para sincronizar con `develop` por PR. PR #35 ya integró ese registro en develop y sincronizamos su Wiki. Falta grabar/publicar el video pospuesto y cerrar la revisión definitiva con tag/GitHub Release. HU-15 conserva pendiente su interfaz del arrendatario y E2E/UI sigue para entrega 3.


## Borrador único de cierre final — REN-77

Preparamos `release/REN-77-cierre-entrega2` desde `develop` con PR #35 integrada, con destino `main`. Consolida las fuentes/evidencias ya revisadas y registra la Wiki sincronizada; el código funcional coincide con el `main` publicado. La PR se mantiene en borrador hasta contar con el video y sus datos reales. No solicita todavía integración ni crea tag/Release.

| Condición | Estado |
| --- | --- |
| HU-14/CA-05 y HU-16 implementadas, probadas e integradas | Verificado |
| CI/CD, Slack y publicación 27ba058/0007 | Verificado |
| Wiki pública y evidencia de despliegue | Verificado tras integrar PR #35 |
| Video grabado/publicado y accesible para el evaluador | Pendiente, pospuesto por el equipo |
| URL del video y revisión demostrada incorporadas en README/Wiki/notas | Pendiente de recibir el enlace real |
| Revisión del compañero e integración del cierre hacia main | Pendiente; borrador hasta completar video |
| CI y verificación del SHA final publicado | Pendiente del merge de cierre |
| Tag v2.0-entrega2 y GitHub Release con notas definitivas | Pendiente de la verificación final |
| Verificación de enlaces y estado final de REN-77/REN-74 | Pendiente de completar artefactos reales |

Cuando exista el video completamos su ficha en el guion, incorporamos el mismo enlace en README, Wiki y notas y comprobamos el acceso del evaluador desde otra sesión. Revisamos la CI del candidato, retiramos el borrador para revisión e integramos por el flujo acordado. Después verificamos el despliegue definitivo y creamos el tag/Release sobre ese SHA. Las notas no se presentan como definitivas mientras el video siga pendiente.
