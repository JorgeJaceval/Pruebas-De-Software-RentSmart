# RentSmart v3.0-entrega3

**Entrega 3 — pruebas E2E integradas al pipeline y requisitos finales.** Conservamos el MVP de la entrega 1 y el CI/CD de la entrega 2. Sumamos una suite E2E con Playwright que corre en cada cambio y bloquea el despliegue si falla, e integramos HU-15, HU-09 y HU-18. HU-17 sigue en revisión: solo la damos por entregada si se integra antes del release. El [GitHub Release](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/releases/tag/v3.0-entrega3) identifica el SHA estable, la fecha y las verificaciones finales.

> **Borrador.** El SHA final, la ejecución de CI sobre `main`, el despliegue verificado y el enlace del video se completan en el cierre; hasta entonces no los damos por hechos.

## Funcionalidades incorporadas

- **Pruebas E2E (REN-87 a REN-90):** Playwright con Chromium headless contra Caddy, API y PostgreSQL reales en un entorno Compose temporal. 18 casos integrados: login y permisos, CRUD de espacios, validaciones, búsqueda y filtros, reserva, pago, cancelaciones y moderación. E3-16 (IA) se suma con HU-17, para 19.
- **Pipeline:** job `e2e` en cada PR y push a `develop`/`main`; `quality` y `deploy` exigen su aprobación. El artefacto `e2e-results` conserva HTML, JUnit, capturas y trazas, y Slack informa el resultado. Una sonda manual demuestra el bloqueo con una aserción real fallida.
- **HU-15 (REN-15):** el arrendatario cancela desde Mis reservas, con reembolso simulado si había pagado; completa CA-03 de HU-13.
- **HU-09 (REN-9):** filtro del catálogo por fecha y horario disponibles, con las mismas reglas que la creación de reservas.
- **HU-18 (REN-18):** panel de administración para retirar publicaciones con motivo y restituirlas como inactivas; el propietario ve el motivo y las reservas se conservan. Migración `0008_space_moderation`.
- **HU-17 (REN-17), pendiente de integrar ([PR #46](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/pull/46)):** sugerencia de descripción con IA (API gratuita de Gemini) al publicar o editar, que se puede usar, editar o descartar y nunca se publica sola. Falta la evidencia de una llamada real (CA-08).

## Defectos corregidos

- La configuración de Playwright apuntaba a `localhost` fijo; ahora exige `BASE_URL` y rechaza destinos que no sean locales.
- Una prueba de disponibilidad fallaba en el límite de 90 días por el cambio de horario de verano; corregimos el dato de prueba sin cambiar la regla.
- El botón Cancelar de Mis reservas estaba deshabilitado (CA-03 de HU-13 parcial); HU-15 lo habilita.
- REN-9 figuraba Finalizada en Jira con criterios temporales pendientes; la reabrimos y la completamos.

## Pruebas ejecutadas

| Suite | Integrado en `develop` ([CI #44857577109](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/44857577109)) | Candidato con HU-17 ([CI #44855034122](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/44855034122)) |
| --- | --- | --- |
| E2E Playwright | 18 | 19 (suma E3-16) |
| Jest y React Testing Library | 176 | 182 |
| Pytest con PostgreSQL real | 207 | 229 |

Fallo controlado: [CI #44828331317](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/44828331317), con una aserción E2E fallida, `quality` en rojo, deploy omitido y Slack FALLO.

La columna del candidato solo vale para el release si PR #46 se integra; se completa con la ejecución final sobre `main`. Los conteos son casos aprobados, no porcentajes de cobertura.

## Instalación y actualización

```bash
git clone https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart.git
cd Pruebas-De-Software-RentSmart
git switch --detach v3.0-entrega3
```

- Aplicar `alembic upgrade head` antes de iniciar la API: `0008_space_moderation` agrega el motivo, autor y fecha del retiro y la tabla de moderaciones. Los retiros anteriores quedan sin motivo registrado.
- Variables nuevas, opcionales: `GEMINI_API_KEY` y `GEMINI_MODEL` (ver `.env.example` y `.env.production.example`). Sin clave, la sugerencia con IA se informa no disponible.
- Para administrar publicaciones, promover una cuenta existente en PostgreSQL (ver [HU-18](../HU-18.md)).
- E2E local: `bash scripts/run-e2e.sh` (ver [la Wiki de entrega 3](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/wiki/Entrega-3)).

## Limitaciones conocidas

- E2E solo en Chromium; sin pruebas visuales, de carga ni de accesibilidad automatizadas.
- Pagos y reembolsos simulados.
- La IA depende de la cuota gratuita de Gemini, que es baja y cambia; con el límite alcanzado se informa y se escribe a mano.
- Pipeline en GitHub Actions en lugar de Jenkins, con justificación presentada al profesor.
- Artefactos de Actions sujetos a 7 días de retención.

## Enlaces de entrega

- [Aplicación HTTPS](https://rentsmart-usm-viveros.chilecentral.cloudapp.azure.com).
- [Wiki de entrega 3](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/wiki/Entrega-3).
- [Matriz de la pauta y cierre](../cierre-entrega-3.md), [registro](../entrega-3.md), [Jira REN](https://rentsmartpsf.atlassian.net/jira/software/projects/REN).
- Video de entrega 3: se agrega al publicarlo.

**Equipo:** Jorge Aceval y Joaquín Viveros.
