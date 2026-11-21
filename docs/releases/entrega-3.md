# RentSmart v3.0-entrega3

**Entrega 3 — pruebas E2E integradas al pipeline y requisitos finales.** Conservamos el MVP de la entrega 1 y el CI/CD de la entrega 2. Sumamos una suite E2E con Playwright que corre en cada cambio y bloquea el despliegue si falla, e integramos HU-15, HU-09, HU-18 y HU-17. De HU-17 queda pendiente un solo criterio: la evidencia de una llamada real a Gemini (CA-08). El tag apunta al merge en `main` de [PR #{{RELEASE_PR}}](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/pull/{{RELEASE_PR}}), del 21 de noviembre de 2026. El [GitHub Release](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/releases/tag/v3.0-entrega3) publica estas notas.

## Funcionalidades incorporadas

- **Pruebas E2E (REN-87 a REN-90):** Playwright con Chromium headless contra Caddy, API y PostgreSQL reales en un entorno Compose temporal. 19 casos: login y permisos, CRUD de espacios, validaciones, búsqueda y filtros, reserva, pago, cancelaciones, moderación y la sugerencia con IA sin proveedor (E3-16).
- **Pipeline:** job `e2e` en cada PR y push a `develop`/`main`; `quality` y `deploy` exigen su aprobación. El artefacto `e2e-results` conserva HTML, JUnit, capturas y trazas, y Slack informa el resultado. Una sonda manual demuestra el bloqueo con una aserción real fallida.
- **HU-15 (REN-15):** el arrendatario cancela desde Mis reservas, con reembolso simulado si había pagado; completa CA-03 de HU-13.
- **HU-09 (REN-9):** filtro del catálogo por fecha y horario disponibles, con las mismas reglas que la creación de reservas.
- **HU-18 (REN-18):** panel de administración para retirar publicaciones con motivo y restituirlas como inactivas; el propietario ve el motivo y las reservas se conservan. Migración `0008_space_moderation`.
- **HU-17 (REN-17, [PR #46](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/pull/46)):** sugerencia de descripción con IA (API gratuita de Gemini) al publicar o editar. Se puede usar, editar o descartar y nunca se publica sola. La clave queda solo en el backend. El backend corta la llamada a los 12 s y limita a 5 sugerencias por minuto por usuario. Cada fallo tiene su mensaje e invita a escribir a mano. Detalle en [HU-17](../HU-17.md).
  - **CA-08, pendiente:** las pruebas automatizadas usan un proveedor simulado y un servidor local que imita la API. Falta la evidencia de una llamada real, porque no tenemos clave. Sin clave, la aplicación informa que la sugerencia no está disponible.

## Defectos corregidos

- La configuración de Playwright apuntaba a `localhost` fijo; ahora exige `BASE_URL` y rechaza destinos que no sean locales.
- Una prueba de disponibilidad fallaba en el límite de 90 días por el cambio de horario de verano; corregimos el dato de prueba sin cambiar la regla.
- El botón Cancelar de Mis reservas estaba deshabilitado (CA-03 de HU-13 parcial); HU-15 lo habilita.
- REN-9 figuraba Finalizada en Jira con criterios temporales pendientes; la reabrimos y la completamos.
- Antes de integrar HU-17, cuatro rondas adversarias de subagentes de IA (tres pruebas y una verificación final) encontraron defectos que corregimos, cada uno con su regresión:
  - al vencer los 15 s, el navegador no mostraba ningún mensaje;
  - el plazo de 12 s era por operación y no total, y la respuesta se leía sin tope (ahora 64 KiB);
  - una redirección reenviaba la clave; ahora no se siguen;
  - no se revisaba `finishReason`, y un campo podía cerrar el delimitador del prompt;
  - no había límite por usuario;
  - la limpieza de Markdown alteraba textos válidos y era lenta ante respuestas hostiles;
  - la conexión a la base de datos quedaba retenida mientras se esperaba a Gemini;
  - Compose no pasaba a la API las variables `AI_*`.

## Pruebas ejecutadas

| Suite | Casos aprobados |
| --- | --- |
| E2E Playwright | 19 |
| Jest y React Testing Library | 185 |
| Pytest con PostgreSQL real | 273 |

Fuentes: el head final de PR #46 ([CI #44947226199](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/44947226199)) y la [CI de `main`](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/workflows/ci.yml?query=branch%3Amain) del release, que repite las mismas suites, despliega y notifica. El GitHub Release registra el SHA, esa ejecución y la verificación del despliegue.

Fallo controlado: [CI #44828331317](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/44828331317), con una aserción E2E fallida, `quality` en rojo, deploy omitido y Slack FALLO.

Los conteos son casos aprobados, no porcentajes de cobertura. Ninguna prueba llama a Gemini: el lanzador E2E deja la clave vacía.

## Instalación y actualización

```bash
git clone https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart.git
cd Pruebas-De-Software-RentSmart
git switch --detach v3.0-entrega3
```

- Aplicar `alembic upgrade head` antes de iniciar la API: `0008_space_moderation` agrega el motivo, autor y fecha del retiro y la tabla de moderaciones. Los retiros anteriores quedan sin motivo registrado.
- Variables nuevas de IA, todas opcionales (ver `.env.example` y `.env.production.example`):
  - `GEMINI_API_KEY`: sin ella, la sugerencia se informa no disponible.
  - `GEMINI_MODEL`: por defecto, el alias `gemini-flash-lite-latest`.
  - `AI_TIMEOUT_SECONDS` (12), `AI_USER_REQUESTS` (5) y `AI_USER_WINDOW_SECONDS` (60): plazo total y límite por usuario. Ambos Compose las pasan a la API; vacías, usan el valor por defecto.
- En producción, la clave va en `/opt/rentsmart/shared/.env` y se aplica en el siguiente despliegue (ver [HU-17](../HU-17.md) y [el despliegue](../despliegue.md)). No se versiona.
- Para administrar publicaciones, promover una cuenta existente en PostgreSQL (ver [HU-18](../HU-18.md)).
- E2E local: `bash scripts/run-e2e.sh` (ver [la Wiki de entrega 3](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/wiki/Entrega-3)).

## Limitaciones conocidas

- Producción no tiene clave de Gemini: la sugerencia con IA se informa no disponible y el resto de la publicación funciona igual. CA-08 de HU-17 sigue pendiente de una llamada real.
- Con clave, la IA depende de la cuota gratuita de Gemini, que es baja y cambia; con el límite alcanzado se informa y se escribe a mano.
- El límite por usuario se cuenta en la memoria de cada proceso de la API. Con un solo proceso, como hoy en producción, es efectivo; con varios, cada uno contaría por separado, y un reinicio lo pone en cero.
- E2E solo en Chromium; sin pruebas visuales, de carga ni de accesibilidad automatizadas.
- Pagos y reembolsos simulados.
- Revisión: desde PR #48 no hubo aprobación del otro integrante, porque Joaquín no estuvo disponible. Las PR, incluida la de este release, recibieron revisiones adversarias de subagentes de IA publicadas en cada PR. Esto incumple §4.4 de las reglas generales; la [matriz](../cierre-entrega-3.md) lo registra. En PR #46, Joaquín pidió la evidencia real antes de aprobar; descartamos su revisión al integrar y dejamos el motivo en la PR.
- Pipeline en GitHub Actions en lugar de Jenkins: justificación en la Wiki §2; aceptación docente pendiente.
- Artefactos de Actions sujetos a 7 días de retención.

## Enlaces de entrega

- [Aplicación HTTPS](https://rentsmart-usm-viveros.chilecentral.cloudapp.azure.com).
- [Código etiquetado](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/tree/v3.0-entrega3) y [GitHub Release](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/releases/tag/v3.0-entrega3).
- [Wiki de entrega 3](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/wiki/Entrega-3).
- [Matriz de la pauta y cierre](../cierre-entrega-3.md), [registro](../entrega-3.md), [Jira REN](https://rentsmartpsf.atlassian.net/jira/software/projects/REN).
- Video de entrega 3: **pendiente**. El [guion](../guion-video-entrega-3.md) está listo; agregamos el enlace al publicarlo.

**Equipo:** Jorge Aceval y Joaquín Viveros.
