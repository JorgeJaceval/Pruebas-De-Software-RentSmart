# RentSmart v3.0-entrega3

**Entrega 3: pruebas E2E en el pipeline y requisitos finales.** Sumamos 19 pruebas Playwright que corren en cada cambio y bloquean el merge y el despliegue si fallan, e integramos HU-15, HU-09, HU-18 y HU-17.

**Versión rehecha el 23 de noviembre de 2026.** La primera versión (22 de noviembre) apuntaba a `54d64a1`, el merge de PR #49. La rehicimos sobre `main` después de integrar la documentación breve que pidió la corrección de la entrega 2 la llamada real a Gemini (CA-08) y el video, PR #50 a #58. El código de la aplicación es el mismo; cambian la documentación y la retención de artefactos. El [GitHub Release](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/releases/tag/v3.0-entrega3) registra el SHA, la CI y el despliegue.

## Qué incluye

- **E2E:** Playwright + Chromium headless contra Caddy, API y PostgreSQL reales en un entorno Docker temporal. Cubren login y permisos, CRUD de espacios, validaciones, búsqueda y filtros, reserva, pago, cancelaciones, moderación y la IA sin clave.
- **Pipeline:** job `e2e` en cada PR y push a `develop`/`main`. `quality` (check obligatorio) y `deploy` exigen que pase. Reportes en el artefacto `e2e-results` (90 días) y resultado en Slack.
- **HU-15:** el arrendatario cancela desde Mis reservas, con reembolso simulado si pagó.
- **HU-09:** filtro del catálogo por fecha y horario libres.
- **HU-18:** un administrador retira publicaciones con motivo y las restituye. Migración `0008_space_moderation`.
- **HU-17:** sugerencia de descripción con IA (Gemini) al publicar o editar; se usa, edita o descarta y nunca se publica sola. Corte a los 12 s y 5 sugerencias por minuto por usuario. CA-08 cumplido con una [llamada real](../evidencias/REN-17-ia-real-2026-11-22.md).

## Defectos corregidos

- Playwright apuntaba a `localhost` fijo; ahora exige `BASE_URL` local.
- Una prueba de fechas fallaba por el horario de verano; corregimos el dato de prueba.
- El botón Cancelar de Mis reservas estaba deshabilitado; HU-15 lo habilita.
- En HU-17, la revisión adversaria encontró, entre otros: tiempo de espera sin mensaje, plazo no total, respuesta sin tope de tamaño, redirecciones que reenviaban la clave, falta de límite por usuario y conexión a la base retenida mientras se esperaba a Gemini. Cada uno tiene su prueba de regresión.

## Pruebas

| Suite | Aprobadas |
| --- | --- |
| E2E Playwright | 19 |
| Jest + React Testing Library | 185 |
| Pytest con PostgreSQL real | 273 |

Fallo controlado: [CI #44828331317](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/44828331317), una aserción E2E real hecha para fallar deja `e2e` y `quality` en rojo y Slack avisa FALLO. Ninguna prueba automática llama a Gemini.

## Instalar o actualizar

```bash
git clone https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart.git
cd Pruebas-De-Software-RentSmart
git switch --detach v3.0-entrega3
```

- Aplicar `alembic upgrade head` antes de iniciar la API (lo hace Compose solo).
- IA opcional: `GEMINI_API_KEY` en `.env` (en producción, en `/opt/rentsmart/shared/.env`); sin ella, la app avisa que no está disponible. Opcionales: `GEMINI_MODEL`, `AI_TIMEOUT_SECONDS`, `AI_USER_REQUESTS`, `AI_USER_WINDOW_SECONDS`.
- Para administrar publicaciones, promover una cuenta en PostgreSQL (ver [HU-18](../HU-18.md)).
- E2E local: `bash scripts/run-e2e.sh`.

## Limitaciones

- La IA depende de la cuota gratuita de Gemini; si se agota, la app lo avisa y se escribe a mano.
- El límite de sugerencias se cuenta en la memoria de cada proceso de la API.
- E2E solo en Chromium; pagos y reembolsos simulados.
- Pipeline en GitHub Actions en vez de Jenkins; justificación en la [Wiki §2](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/wiki/Entrega-3).
- Revisión entre integrantes: desde PR #48 integramos sin una aprobación vigente de Joaquín (ver la [matriz](../cierre-entrega-3.md), §4.4).

## Enlaces

- [App publicada](https://rentsmart-usm-viveros.chilecentral.cloudapp.azure.com) · [Wiki Entrega 3](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/wiki/Entrega-3) · [Release](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/releases/tag/v3.0-entrega3)
- [Matriz de cierre](../cierre-entrega-3.md) · [registro](../entrega-3.md) · [Jira REN](https://rentsmartpsf.atlassian.net/jira/software/projects/REN)
- [Video de la entrega](https://drive.google.com/file/d/1aF9g9xhNt11qjysnjtm-2q3I-7NNRERH/view?usp=sharing) (14 min 6 s; [ficha de acceso](../evidencias/REN-91-video-2026-11-23.md)).

**Equipo:** Jorge Aceval y Joaquín Viveros.
