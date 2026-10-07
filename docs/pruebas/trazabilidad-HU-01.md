# Matriz de trazabilidad de HU-01

Versión **1.0**, 6 de octubre de 2026. Fuente de aceptación: `Historias de usuario.pdf`, p. 7, **CA-01–CA-06**, y rangos comunes pp. 3–4. Historia [REN-1](https://rentsmartpsf.atlassian.net/browse/REN-1), [PR #4](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/pull/4). Los IDs RF/RNF/RN corresponden al [catálogo](../requerimientos.md#catálogo-de-requisitos-de-hu-01); el resumen original se conserva en [HU-01](../HU-01.md#criterios-y-pruebas).

La matriz aplica Requerimientos 1/2, pp. 36–37; Requerimientos 2/2, pp. 42–43 y 49–50; y `INF331 Pruebas Manuales S5 V1.1.pdf`, pp. 49–50. Relaciona fuente → requisito → realización → caso → evidencia. **Trazado no significa aprobado:** el resultado se consulta en [evidencia de calidad](../evidencias/calidad-HU-01.md), correspondiente al commit ejecutado. Las referencias usan nombres identificables de pruebas, sin hashes o números de línea que se desactualicen.

## Resumen de alcance y estado

| Criterio | Requisitos | Evidencia prevista y estado |
| --- | --- | --- |
| CA-01: cuenta persistente, confirmación y posibilidad de dirigirse a sesión | RF-REG-01 | Registro/confirmación con pruebas automatizadas; **parcial** para el criterio completo: pantalla/navegación de sesión pendiente HU-02; manual diseñado/no ejecutado; UAT no realizada |
| CA-02: normalización y correo único | RF-REG-02/05, RN-REG-01 | Componentes, API y PostgreSQL vinculados abajo; resultado automatizado en informe; manual diseñado/no ejecutado |
| CA-03: rechazos por campo y datos útiles conservados | RF-REG-02/03/04 | Parametrización y mensajes de componente/API; decisión de entradas inesperadas registrada en revisión; manual diseñado/no ejecutado |
| CA-04: hash y ausencia de contraseña en respuestas/capturas/logs | RNF-REG-01/03 | Pruebas de hash/respuestas/logs capturados; revisión de configuración/capturas complementaria; no acredita todo sistema externo de observabilidad; manual diseñado/no ejecutado |
| CA-05: cuenta normal sin escalamiento administrativo | RF-REG-06, RN-REG-02/03 | Contrato de registro y cuenta persistida; **ámbito de registro**, publicación/reserva aún no verificadas; manual diseñado/no ejecutado |
| CA-06: unicidad respaldada en BD bajo concurrencia | RF-REG-05, RNF-REG-02, RN-REG-01 | Restricción y carrera sincronizada PostgreSQL; manual diseñado/no ejecutado, cuyo envío cercano no prueba solapamiento real |

La revisión del otro integrante y la integración por PR siguen pendientes de su registro; la matriz no declara una aprobación humana ni cambia el estado de Jira. Los casos manuales siguientes pertenecen a [SM-HU01](casos-HU-01.md) y todos están **diseñados, sin ejecución manual registrada**.

## CA-01 — Registro válido y persistencia

**Código:** [RegistrationForm.tsx](../../frontend/src/RegistrationForm.tsx), [registration.ts](../../frontend/src/registration.ts), [auth.py](../../backend/app/routers/auth.py), [models.py](../../backend/app/models.py) y [0001_create_users.py](../../backend/migrations/versions/0001_create_users.py).

| Archivo de pruebas | Nombre exacto / propósito |
| --- | --- |
| [RegistrationForm.test.tsx](../../frontend/src/RegistrationForm.test.tsx) | `envía nombre, correo y contraseña; anuncia el éxito sin iniciar sesión` — envío y confirmación en componente |
| [test_registration.py](../../backend/tests/test_registration.py) | `test_hu01_ca01_registers_a_normalized_user_without_returning_credentials` — respuesta y cuenta normal |
| Mismo archivo | `test_hu01_ca01_reports_success_when_database_reads_fail_after_commit` — registro confirmado sin depender de otra lectura después del commit |
| [test_registration_postgres.py](../../backend/tests/test_registration_postgres.py) | `test_hu01_ca01_registration_persists_across_sessions_and_application_instances` — otra sesión/aplicación ve la cuenta persistida; migración aplicada |

**Manual:** [CP-HU01-01](casos-HU-01.md#cp-hu01-01--registro-válido-normalizado-y-persistente), comprobación de creación/recarga. [CP-HU01-10](casos-HU-01.md#cp-hu01-10--indisponibilidad-de-bd-y-recuperación), manejo técnico de indisponibilidad. **Límite:** ningún caso anterior acredita una pantalla de inicio de sesión; CA-01 permanece parcial hasta HU-02. Estado/resultados automatizados: [informe](../evidencias/calidad-HU-01.md); manual sin ejecutar.

## CA-02 — Correo normalizado y duplicados

**Código:** [registration.ts](../../frontend/src/registration.ts), [schemas.py](../../backend/app/schemas.py), [auth.py](../../backend/app/routers/auth.py), [models.py](../../backend/app/models.py), [migración](../../backend/migrations/versions/0001_create_users.py); restricciones `uq_users_email` y `ck_users_email_normalized`.

| Archivo de pruebas | Nombre exacto / propósito |
| --- | --- |
| [RegistrationForm.test.tsx](../../frontend/src/RegistrationForm.test.tsx) | `normaliza nombre y correo sin recortar ni alterar la contraseña` — cuerpo de solicitud |
| Mismo archivo | `muestra el error 409 junto al correo y conserva los datos para corregirlos` — conflicto y reintento de componente |
| [test_registration.py](../../backend/tests/test_registration.py) | `test_hu01_ca02_rejects_existing_email_after_normalization` — variantes normalizadas; una cuenta |
| [test_registration_postgres.py](../../backend/tests/test_registration_postgres.py) | `test_hu01_ca02_database_enforces_email_uniqueness_without_the_api` — restricción SQL independiente de la ruta |
| Mismo archivo | `test_hu01_ca02_database_rejects_unnormalized_email_even_without_the_api` — rechaza escritura no normalizada directa |

**Manual:** [CP-HU01-01](casos-HU-01.md#cp-hu01-01--registro-válido-normalizado-y-persistente) y [CP-HU01-02](casos-HU-01.md#cp-hu01-02--correo-duplicado-con-variantes-de-escritura). **Estado:** automatización vinculada al [informe](../evidencias/calidad-HU-01.md); manual sin ejecutar. `fetch` simulado no demuestra unicidad SQL: esa evidencia corresponde a PostgreSQL.

## CA-03 — Validación, límites y mensajes

**Código:** [RegistrationForm.tsx](../../frontend/src/RegistrationForm.tsx), [registration.ts](../../frontend/src/registration.ts), [schemas.py](../../backend/app/schemas.py) y [errors.py](../../backend/app/errors.py).

| Archivo de pruebas | Nombre exacto / propósito |
| --- | --- |
| [RegistrationForm.test.tsx](../../frontend/src/RegistrationForm.test.tsx) | `identifica los campos vacíos y enfoca el primero sin llamar a la API` — obligatoriedad y foco |
| Mismo archivo | Grupo parametrizado `rechaza %s antes de enviar el formulario` — longitudes/formato/espacios inválidos; conservar el nombre de variante en el resultado |
| Mismo archivo | Grupo parametrizado `acepta el límite %s de los campos` — fronteras válidas y Unicode |
| Mismo archivo | `muestra errores 422 del servidor junto a los campos correspondientes` — errores recibidos y datos útiles conservados |
| Mismo archivo | `ofrece un error general si el servidor no devuelve errores de validación reconocibles` — respuesta de fallo incompleta |
| [test_registration.py](../../backend/tests/test_registration.py) | `test_hu01_ca03_rejects_missing_required_fields` — parámetros ausentes |
| Mismo archivo | `test_hu01_ca03_rejects_invalid_values_without_creating_an_account` — valores inválidos parametrizados y ausencia de cuenta |
| Mismo archivo | `test_hu01_ca03_rejects_non_string_fields` — nulos, números y estructuras |
| Mismo archivo | `test_hu01_ca03_accepts_valid_boundary_lengths` — longitudes válidas parametrizadas |
| Mismo archivo | `test_hu01_ca03_rejects_unexpected_text_without_internal_errors` — NUL en nombre, sustitutos Unicode aislados y correo con nombre visible/corchetes; rechazo `422` sin cuenta ni errores internos |

**Manual:** [CP-HU01-03](casos-HU-01.md#cp-hu01-03--campos-obligatorios), [CP-HU01-04](casos-HU-01.md#cp-hu01-04--correo-mal-formado), [CP-HU01-05](casos-HU-01.md#cp-hu01-05--longitudes-válidas-y-fuera-de-rango) y [CP-HU01-06](casos-HU-01.md#cp-hu01-06--rechazo-de-tipos-y-representaciones-de-texto-inválidas). **Estado:** automatización vinculada al [informe](../evidencias/calidad-HU-01.md); manual sin ejecutar.

La selección aplica equivalencia y valores límite de S6, pp. 63 y 69–72. Las series ±1 y los caracteres inesperados están implementados y se identifican en el [plan](plan-pruebas.md#selección-de-datos-y-resultados-esperados); el informe acredita las variantes efectivamente ejecutadas. El rechazo de NUL en nombre/sustitutos aislados y correo con nombre visible es una decisión de robustez de esta revisión, no un criterio numérico inventado del PDF. La contraseña válida con NUL se conserva y se verifica mediante hash. Comparar máximos declarativos 254/320 no demuestra una discrepancia de aceptación efectiva, porque `EmailStr` valida el formato/longitud.

## CA-04 — Protección de contraseña y errores

**Código:** [security.py](../../backend/app/security.py), [schemas.py](../../backend/app/schemas.py), [models.py](../../backend/app/models.py), [auth.py](../../backend/app/routers/auth.py), [errors.py](../../backend/app/errors.py), [RegistrationForm.tsx](../../frontend/src/RegistrationForm.tsx). La respuesta pública usa `RegisteredUser`; contraseña/hash no son campos públicos.

| Archivo de pruebas | Nombre exacto / propósito |
| --- | --- |
| [RegistrationForm.test.tsx](../../frontend/src/RegistrationForm.test.tsx) | `oculta la contraseña y envía únicamente los campos permitidos` — campo oculto y contrato enviado |
| Mismo archivo | `presenta un error genérico ante un 503 sin revelar detalles internos` — detalles no mostrados por el componente |
| [test_registration.py](../../backend/tests/test_registration.py) | `test_hu01_ca04_hashes_password_with_argon2_and_a_different_salt_per_user` — hash distinto por cuenta y verificable |
| Mismo archivo | `test_hu01_ca04_preserves_the_exact_password` — entrada válida sin recorte/alteración; variantes `significant-spaces`, `unicode` y `null-character-preserved` |
| Mismo archivo | `test_hu01_ca04_validation_never_echoes_input_or_password_to_response_or_logs` — respuestas y logs capturados durante validación |
| Mismo archivo | `test_hu01_ca04_database_failure_is_safe_and_rolls_back` — excepción simulada, rollback y error sin detalles internos |
| [test_registration_postgres.py](../../backend/tests/test_registration_postgres.py) | `test_hu01_ca01_registration_persists_across_sessions_and_application_instances` — hash real persistido y verificación |

**Manual:** [CP-HU01-07](casos-HU-01.md#cp-hu01-07--contraseña-protegida-y-hash-persistido) y complemento [CP-HU01-10](casos-HU-01.md#cp-hu01-10--indisponibilidad-de-bd-y-recuperación). **Estado:** automatización y revisión estática/capturas en [informe](../evidencias/calidad-HU-01.md); manual sin ejecutar. Los logs capturados de una ejecución no prueban ausencia de secretos en cualquier infraestructura externa; capturas y configuración necesitan revisión adicional. No se considera una auditoría completa de seguridad.

## CA-05 — Identidad normal y rechazo de privilegios

**Código:** [schemas.py](../../backend/app/schemas.py) (`extra="forbid"`), [auth.py](../../backend/app/routers/auth.py) (`is_admin=false`), [models.py](../../backend/app/models.py) (UUID generado), [registration.ts](../../frontend/src/registration.ts) y [RegistrationForm.tsx](../../frontend/src/RegistrationForm.tsx).

| Archivo de pruebas | Nombre exacto / propósito |
| --- | --- |
| [RegistrationForm.test.tsx](../../frontend/src/RegistrationForm.test.tsx) | `oculta la contraseña y envía únicamente los campos permitidos` — solo tres campos y sin selector administrativo |
| [test_registration.py](../../backend/tests/test_registration.py) | `test_hu01_ca05_rejects_privilege_and_identity_fields` — rechazo parametrizado de privilegios/identidad/hash del cliente |
| Mismo archivo | `test_hu01_ca01_registers_a_normalized_user_without_returning_credentials` — UUID y flag administrativo del servidor |
| [test_registration_postgres.py](../../backend/tests/test_registration_postgres.py) | `test_hu01_ca01_registration_persists_across_sessions_and_application_instances` — cuenta normal persistida |

**Manual:** [CP-HU01-01](casos-HU-01.md#cp-hu01-01--registro-válido-normalizado-y-persistente) y [CP-HU01-08](casos-HU-01.md#cp-hu01-08--intento-de-asignar-privilegios-o-identidad). **Estado:** evidencia automatizada del registro en [informe](../evidencias/calidad-HU-01.md); manual sin ejecutar. Una cuenta única sin roles excluyentes respeta RN-REG-02, pero **publicar como propietaria y reservar como arrendataria son operaciones futuras no verificadas por estos tests**.

## CA-06 — Unicidad bajo registro concurrente

**Código:** [models.py](../../backend/app/models.py) y [migración](../../backend/migrations/versions/0001_create_users.py) (`uq_users_email`); [auth.py](../../backend/app/routers/auth.py) (identificar conflicto, rollback y `409`). Aislamiento de prueba en [conftest.py](../../backend/tests/conftest.py).

| Archivo de pruebas | Nombre exacto / propósito |
| --- | --- |
| [test_registration_postgres.py](../../backend/tests/test_registration_postgres.py) | `test_hu01_ca06_simultaneous_registration_only_creates_one_account` — dos solicitudes sincronizadas con `Barrier`, PostgreSQL real, una fila y estados `201/409` |
| Mismo archivo | `test_hu01_ca02_database_enforces_email_uniqueness_without_the_api` — la restricción existe fuera de la comprobación de API |

**Manual:** [CP-HU01-09](casos-HU-01.md#cp-hu01-09--dos-solicitudes-para-el-mismo-correo). **Estado:** prueba PostgreSQL vinculada al [informe](../evidencias/calidad-HU-01.md); manual sin ejecutar. Una simulación de respuestas o SQLite no acredita esta carrera. El caso manual de solicitudes próximas tiene el límite de no demostrar sincronización del INSERT.

## Complementos y mantenimiento

RF-REG-07 (indisponibilidad técnica) se realiza en [auth.py](../../backend/app/routers/auth.py), [errors.py](../../backend/app/errors.py) y [registration.ts](../../frontend/src/registration.ts). Sus pruebas son `test_hu01_ca04_database_failure_is_safe_and_rolls_back`, `informa un error de red, conserva nombre y correo y permite reintentar` y `presenta un error genérico ante un 503 sin revelar detalles internos`; manual CP-HU01-10. Se diferencia un fallo simulado del circuito real manual todavía no ejecutado.

Al cambiar un requisito o corregir un defecto, conservar su ID, actualizar realización/tests, registrar el defecto o decisión en Jira y adjuntar una ejecución nueva al informe. Los resultados anteriores quedan como historial. La cobertura de código, el número de tests, la cobertura de criterios y la aceptación humana son conceptos separados. Playwright/E2E queda para la entrega 3 y UAT no se ha realizado.
