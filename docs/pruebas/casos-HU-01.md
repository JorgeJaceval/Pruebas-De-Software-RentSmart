# Casos de prueba manuales de HU-01

Suite **SM-HU01**, versión **1.0**, diseñada el **6 de octubre de 2026** para [REN-1 — Registrarse](https://rentsmartpsf.atlassian.net/browse/REN-1). Cubre los criterios [CA-01 a CA-06](../HU-01.md#criterios-y-pruebas) del registro actual. El oráculo es `Historias de usuario.pdf`, página 7, complementado por los rangos comunes de las páginas 3 y 4 y el contrato de registro documentado en [HU-01](../HU-01.md).

**Estado de la suite: diseñada; sin ejecución manual registrada.** Los resultados automatizados existentes son evidencia separada y no convierten estos casos en aprobados manualmente. Esta suite no añade automatización E2E ni acredita aceptación de un usuario: Playwright corresponde a la entrega 3.

## Aplicación de la clase

La clase `INF331 Pruebas Manuales S5 V1.1.pdf` distingue el oráculo (páginas 6–8), las pruebas unitarias, de integración y de sistema (16–24) y la aceptación de usuario (30–33). Define los campos de cada caso y de la suite en las páginas 52–55, la trazabilidad en 49–50 y el reporte y ciclo del defecto en 56–62. Las referencias corresponden a la posición de página del PDF, que puede diferir del número impreso en la diapositiva.

Cada caso siguiente tiene precondiciones, datos, pasos y resultado esperado verificable. Se separan las comprobaciones de interfaz de las consultas de API/BD. Los rangos provienen de la especificación de HU-01 y la selección del valor inmediatamente inferior, igual e inmediatamente superior a cada límite aplica el **análisis de valor límite** de `INF-331 Pruebas Estáticas y Dinámicas S6 V1.01.pdf`, página 63. La página 84 de S6 también orienta a comprobar cadenas vacías, muy largas y caracteres inesperados. Un registro exitoso solo verifica creación de cuenta: las acciones de iniciar sesión, publicar y reservar pertenecen a otras historias.

## Ambiente, datos y registro de resultados

- Ambiente local de pruebas: aplicación de la rama de HU-01, frontend en `http://localhost:5173/#registro`, API en `http://localhost:8000/docs` y PostgreSQL de Compose. Aplicar la migración de usuarios siguiendo [HU-01](../HU-01.md#estrategia-y-comandos).
- Medios: navegador con herramientas de desarrollo, Swagger UI para las solicitudes HTTP y un cliente SQL para consultar la base local. Registrar versión del navegador, sistema operativo y commit al ejecutar.
- Datos: usar solo cuentas ficticias. `<marca>` representa un identificador distinto por ejecución, por ejemplo `20261006-01`. El correo base es `hu01-<marca>@example.com`; cada subcaso positivo necesita un correo nuevo. No reutilizar cuentas personales.
- La contraseña base de prueba es `Clave de prueba 2026!`; no usarla fuera de este ambiente. No incluir contraseñas ni hashes en capturas, tickets o logs de resultados. Para inspeccionar solicitudes, anotar nombres de campos y estado HTTP, sin guardar el cuerpo que contiene la contraseña.
- Aislamiento: antes del caso verificar que su correo no existe. Después, conservar únicamente los datos necesarios para el caso de duplicado o borrar la cuenta ficticia específica por UUID y correo. No vaciar la tabla ni eliminar cuentas ajenas a la prueba.

Los casos de interfaz son pruebas funcionales de sistema previstas para ejecución manual; las consultas API/BD son comprobaciones dirigidas de integración y almacenamiento. Los negativos de privilegios y confidencialidad comprueban controles concretos de HU-01, sin representar una auditoría completa de seguridad.

| Caso | Responsable previsto | Nivel / propósito | Estado manual | Momento / observado / evidencia manual |
| --- | --- | --- | --- | --- |
| CP-HU01-01 | Joaquín Viveros; Jorge Aceval verifica BD | Sistema e integración; registro válido | Diseñado | No ejecutado / sin observación / sin evidencia |
| CP-HU01-02 | Joaquín Viveros; Jorge Aceval verifica BD | Sistema e integración; duplicado | Diseñado | No ejecutado / sin observación / sin evidencia |
| CP-HU01-03 | Joaquín Viveros y Jorge Aceval | Sistema y API; obligatoriedad | Diseñado | No ejecutado / sin observación / sin evidencia |
| CP-HU01-04 | Joaquín Viveros y Jorge Aceval | Sistema y API; correo inválido | Diseñado | No ejecutado / sin observación / sin evidencia |
| CP-HU01-05 | Joaquín Viveros y Jorge Aceval | Sistema y API; longitudes | Diseñado | No ejecutado / sin observación / sin evidencia |
| CP-HU01-06 | Jorge Aceval | API; tipos y representaciones inválidas | Diseñado | No ejecutado / sin observación / sin evidencia |
| CP-HU01-07 | Jorge Aceval; Joaquín Viveros verifica interfaz | Integración y almacenamiento; confidencialidad | Diseñado | No ejecutado / sin observación / sin evidencia |
| CP-HU01-08 | Jorge Aceval | API; privilegios e identidad | Diseñado | No ejecutado / sin observación / sin evidencia |
| CP-HU01-09 | Jorge Aceval | Integración; solicitudes concurrentes | Diseñado | No ejecutado / sin observación / sin evidencia |
| CP-HU01-10 | Jorge Aceval y Joaquín Viveros | Sistema e integración; recuperación | Diseñado | No ejecutado / sin observación / sin evidencia |

Al ejecutar, crear una fila de historial por caso y subcaso con **fecha/hora, commit, ambiente, ejecutor real, resultado observado, aprobado/fallido/bloqueado, evidencia y defecto Jira**. Comparar el resultado observado con todos los puntos del resultado esperado; no sustituir la observación por una copia del esperado. Mantener el historial al repetir un caso tras corregir un defecto.

## CP-HU01-01 — Registro válido, normalizado y persistente

**Criterios:** CA-01, CA-02 y CA-05. **Tipo:** positivo.

**Precondiciones:** servicios disponibles, migración aplicada y ausencia del correo base en BD. Página de registro abierta sin una cuenta previamente creada en esa pestaña.

**Datos:** nombre `  Jorge de Prueba  `, correo `  HU01-<MARCA>@Example.com  ` y contraseña base.

**Pasos:**

1. Escribir los tres datos y pulsar **Crear cuenta**.
2. Comprobar el mensaje de confirmación y el estado HTTP de la solicitud en las herramientas de desarrollo.
3. Desde una conexión SQL independiente, consultar `id`, `name`, `email` e `is_admin` de la cuenta por el correo base normalizado. No seleccionar el hash para una captura.
4. Recargar la página y repetir la consulta desde otra conexión SQL.

**Resultado esperado:** la API responde `201` y devuelve únicamente `id`, `name` y `email`. La interfaz informa **Tu cuenta fue creada.** y retira el formulario. Existe una sola cuenta, con nombre `Jorge de Prueba`, correo en minúsculas sin espacios exteriores, UUID generado por el servidor e `is_admin = false`. La cuenta sigue presente tras recargar y desde otra conexión. No se inicia sesión ni se entrega un token.

**Respaldo automatizado:** [prueba PostgreSQL](../../backend/tests/test_registration_postgres.py), `test_hu01_ca01_registration_persists_across_sessions_and_application_instances`; [formulario](../../frontend/src/RegistrationForm.test.tsx), `envía nombre, correo y contraseña; anuncia el éxito sin iniciar sesión`.

## CP-HU01-02 — Correo duplicado con variantes de escritura

**Criterio:** CA-02. **Tipo:** negativo.

**Precondiciones:** una cuenta ficticia existente con el correo base; formulario abierto de nuevo. Registrar su UUID y comprobar que hay una sola fila antes de empezar.

**Datos:** nombre `Otra persona`, contraseña base y tres variantes del mismo correo: original, todo en mayúsculas y con espacios exteriores.

**Pasos:**

1. Enviar cada variante desde el formulario, recargando entre intentos.
2. Registrar el estado HTTP sin guardar el cuerpo de la solicitud.
3. Comprobar el mensaje junto al correo y que el nombre y el correo escritos siguen disponibles para corregirlos.
4. Consultar la cuenta por el correo normalizado y comparar cantidad y UUID con el registro inicial.

**Resultado esperado:** cada intento responde `409`; se muestra **Ya existe una cuenta con este correo.** asociado al campo de correo. No aparece confirmación de éxito. Continúa existiendo una sola fila, con el UUID inicial; no se reemplaza la cuenta anterior ni se revela su contraseña.

**Respaldo automatizado:** [API](../../backend/tests/test_registration.py), `test_hu01_ca02_rejects_existing_email_after_normalization`; [formulario](../../frontend/src/RegistrationForm.test.tsx), `muestra el error 409 junto al correo y conserva los datos para corregirlos`.

## CP-HU01-03 — Campos obligatorios

**Criterio:** CA-03. **Tipo:** negativo.

**Precondiciones:** formulario vacío y correo de prueba inexistente.

**Datos:** primero los tres campos vacíos; después tres solicitudes API válidas salvo por omitir, por separado, `name`, `email` o `password`.

**Pasos:**

1. Pulsar **Crear cuenta** sin escribir datos.
2. Comprobar los errores por campo, el foco en **Nombre** y que no se envió `POST /api/auth/register`.
3. Usando Swagger UI, enviar cada solicitud con uno de los campos omitido, manteniendo válidos los restantes.
4. Consultar que el correo usado no fue almacenado.

**Resultado esperado:** la interfaz señala nombre de 2–80 caracteres, correo válido y contraseña de 8–64 caracteres. La API rechaza cada solicitud incompleta con `422` y un error para el campo omitido. Ningún intento crea una cuenta; el error no incluye la contraseña enviada en los otros campos.

**Respaldo automatizado:** [API](../../backend/tests/test_registration.py), `test_hu01_ca03_rejects_missing_required_fields`; [formulario](../../frontend/src/RegistrationForm.test.tsx), `identifica los campos vacíos y enfoca el primero sin llamar a la API`.

## CP-HU01-04 — Correo mal formado

**Criterio:** CA-03. **Tipo:** negativo.

**Precondiciones:** nombre y contraseña válidos, sin cuentas correspondientes a los datos de prueba.

**Datos:** correo `correo-invalido` y, en otro intento, `jorge@`.

**Pasos:**

1. Enviar cada correo desde el formulario junto con el nombre y contraseña válidos.
2. Comprobar el error asociado al correo y que no se envió una solicitud de registro.
3. Enviar los mismos datos directamente a la API para comprobar que la validación no depende solo de la interfaz.
4. Consultar que no se creó una cuenta con esos valores.

**Resultado esperado:** el formulario pide un correo electrónico válido, conserva el nombre y permite corregir el correo. La API responde `422` con el campo `email` en `errors`; no persiste ninguna cuenta ni devuelve valores de entrada sensibles.

**Respaldo automatizado:** [API](../../backend/tests/test_registration.py), `test_hu01_ca03_rejects_invalid_values_without_creating_an_account` (variantes `malformed-email` y `missing-email-domain`); [formulario](../../frontend/src/RegistrationForm.test.tsx), `rechaza %s antes de enviar el formulario` (variante `correo sin dominio`).

## CP-HU01-05 — Longitudes válidas y fuera de rango

**Criterio:** CA-03. **Tipo:** positivo y negativo, según el subcaso.

**Precondiciones:** correo nuevo para cada intento positivo y para cada repetición positiva directa de API. En cada fila mantener los otros campos válidos; variar un solo campo para identificar qué frontera se está verificando. El nombre base válido es `Jorge de Prueba` y la contraseña base es la indicada en los datos comunes.

**Datos y oráculo:**

| Subcaso | Nombre | Contraseña | Resultado esperado |
| --- | --- | --- | --- |
| 05-A | `J` (1 carácter) | Base | Error en `name`; API `422`; sin cuenta |
| 05-B | `Jo` (2 caracteres) | Base | API `201`; una cuenta |
| 05-C | `Jor` (3 caracteres) | Base | API `201`; una cuenta |
| 05-D | 79 caracteres `J` | Base | API `201`; una cuenta |
| 05-E | 80 caracteres `J` | Base | API `201`; una cuenta |
| 05-F | 81 caracteres `J` | Base | Error en `name`; API `422`; sin cuenta |
| 05-G | Nombre base válido | 7 caracteres `a` | Error en `password`; API `422`; sin cuenta |
| 05-H | Nombre base válido | 8 caracteres `a` | API `201`; una cuenta |
| 05-I | Nombre base válido | 9 caracteres `a` | API `201`; una cuenta |
| 05-J | Nombre base válido | 63 caracteres `a` | API `201`; una cuenta |
| 05-K | Nombre base válido | 64 caracteres `a` | API `201`; una cuenta |
| 05-L | Nombre base válido | 65 caracteres `a` | Error en `password`; API `422`; sin cuenta |

**Técnica:** para los límites del nombre 2 y 80 se prueban `1/2/3` y `79/80/81`; para la contraseña 8 y 64, `7/8/9` y `63/64/65`. Son los puntos de frontera y sus vecinos enteros `±1`, según S6, página 63.

**Pasos:**

1. Preparar y contar los caracteres de los datos de cada fila; escribirlos en el formulario con su correo de prueba.
2. Enviar. En los negativos comprobar el campo señalado y la ausencia de solicitud HTTP; en los positivos comprobar confirmación y `201`.
3. Repetir cada fila directamente contra la API: usar otro correo nuevo en las positivas, y comprobar `201` o `422` y el campo de error según corresponda.
4. Consultar que cada positivo creó solo una fila y los negativos ninguna.

**Resultado esperado adicional:** los límites se aplican al nombre después de recortar espacios exteriores; la contraseña conserva exactamente sus caracteres. Los datos válidos restantes siguen disponibles cuando hay un error. Registrar un resultado independiente por cada subcaso.

**Respaldo automatizado:** [API](../../backend/tests/test_registration.py), `test_hu01_ca03_accepts_valid_boundary_lengths` y `test_hu01_ca03_rejects_invalid_values_without_creating_an_account`; [formulario](../../frontend/src/RegistrationForm.test.tsx), grupos parametrizados `rechaza %s antes de enviar el formulario` y `acepta el límite %s de los campos`.

## CP-HU01-06 — Rechazo de tipos y representaciones de texto inválidas

**Criterio:** CA-03. **Tipo:** negativo de API.

**Precondiciones:** API y BD disponibles, correo base inexistente. Este caso evita la interfaz para comprobar el contrato público.

**Datos:** cuerpo válido salvo por un campo `name`, `email` o `password` con valor `null`; repetir con un número en `name` y un objeto en `password`. Como subcasos de API, preparar cadenas con un carácter NUL o con un sustituto Unicode aislado, usando un cliente HTTP que permita generar estas entradas. No tratar una cadena JSON escrita literalmente en el formulario como equivalente a esos caracteres.

**Pasos:**

1. Enviar los subcasos de tipos a `POST /api/auth/register` desde Swagger UI; para las representaciones NUL/Unicode usar el cliente HTTP preparado en los datos.
2. Registrar estado y nombres de campos de error, sin guardar la contraseña del cuerpo.
3. Consultar que el correo de prueba no fue almacenado.

**Resultado esperado:** cada variante responde `422` y señala el campo inválido. Los tipos distintos de texto no se convierten silenciosamente a cadenas. Las representaciones no admitidas no causan un error interno `500`. No se crea cuenta y no se publican los valores recibidos en la respuesta. Registrar cada subcaso por separado; los caracteres Unicode válidos y las contraseñas válidas con espacios significativos se conservan, según CA-04.

**Respaldo automatizado:** [API](../../backend/tests/test_registration.py), `test_hu01_ca03_rejects_non_string_fields` y `test_hu01_ca03_rejects_unexpected_text_without_internal_errors`. Cubren tipos no textuales y rechazos de NUL en nombre, Unicode inválido y correo con nombre visible, sin crear cuenta.

## CP-HU01-07 — Contraseña protegida y hash persistido

**Criterio:** CA-04. **Tipo:** positivo de almacenamiento y confidencialidad.

**Precondiciones:** dos correos ficticios nuevos, servicios disponibles; no generar capturas del cuerpo HTTP ni del valor almacenado.

**Datos:** dos cuentas con nombres distintos y la misma contraseña base.

**Pasos:**

1. Escribir la contraseña en el formulario; comprobar visualmente que el campo oculta los caracteres.
2. Crear la primera cuenta y comprobar que desaparece el formulario al informar éxito.
3. Registrar la segunda cuenta con la misma contraseña y otro correo.
4. Inspeccionar las respuestas `201`: sus únicos campos deben ser `id`, `name` y `email`.
5. Desde SQL, obtener únicamente booleanos que indiquen si ambos `password_hash` empiezan con `$argon2id$`, si ninguno es igual al texto de prueba y si ambos hashes son distintos. No copiar los valores de los hashes.
6. Enviar un correo inválido con una contraseña de prueba y comprobar que la respuesta `422` no contiene `input`, `password_hash` ni el valor de la contraseña.

**Resultado esperado:** la interfaz oculta y retira el campo de contraseña tras el éxito. La BD contiene hashes Argon2id distintos aunque las contraseñas de prueba sean iguales; nunca almacena la contraseña en claro. Las respuestas de éxito y error no revelan contraseña ni hash. La inspección manual del formato no demuestra por sí sola que el hash verifica correctamente: eso se comprueba con `verify_password` en las pruebas automatizadas.

**Respaldo automatizado:** [API](../../backend/tests/test_registration.py), `test_hu01_ca04_hashes_password_with_argon2_and_a_different_salt_per_user` y `test_hu01_ca04_validation_never_echoes_input_or_password_to_response_or_logs`; [formulario](../../frontend/src/RegistrationForm.test.tsx), `oculta la contraseña y envía únicamente los campos permitidos`.

## CP-HU01-08 — Intento de asignar privilegios o identidad

**Criterio:** CA-05. **Tipo:** negativo de API.

**Precondiciones:** correo base inexistente y cuerpo de registro válido. No se necesitan permisos administrativos para llamar al endpoint público.

**Datos:** añadir al cuerpo, por separado, `"role": "admin"`, `"is_admin": true`, un `"id"` UUID elegido por el cliente o `"password_hash": "valor-elegido-por-cliente"`.

**Pasos:**

1. Enviar cada variante a `POST /api/auth/register` desde Swagger UI.
2. Consultar que el correo no fue almacenado después de los intentos rechazados.
3. Enviar el registro con solo `name`, `email` y `password`, sin los campos adicionales.
4. Consultar el UUID generado e `is_admin` de la cuenta creada.

**Resultado esperado:** las variantes con campos adicionales responden `422`, con error de formulario, sin crear cuenta. El registro permitido responde `201`, genera su UUID en el servidor y persiste `is_admin = false`. La cuenta normal queda habilitada como identidad para futuras historias; este caso no prueba que publicar o reservar ya estén implementados.

**Respaldo automatizado:** [API](../../backend/tests/test_registration.py), `test_hu01_ca05_rejects_privilege_and_identity_fields` y `test_hu01_ca01_registers_a_normalized_user_without_returning_credentials`.

## CP-HU01-09 — Dos solicitudes para el mismo correo

**Criterio:** CA-06. **Tipo:** integración, concurrencia y unicidad.

**Precondiciones:** PostgreSQL real, migración aplicada y un correo nuevo. Usar un cliente HTTP que pueda lanzar dos solicitudes en paralelo y conservar sus dos respuestas; acordar los datos antes de dispararlas.

**Datos:** dos solicitudes `POST /api/auth/register` con el mismo cuerpo válido y correo base.

**Pasos:**

1. Preparar las dos solicitudes sin enviarlas.
2. Dispararlas en paralelo y esperar a que terminen ambas.
3. Registrar por separado sus estados HTTP y campos públicos de respuesta.
4. Consultar desde una conexión independiente la cantidad de filas del correo normalizado y el UUID de la cuenta creada.

**Resultado esperado:** exactamente una respuesta `201` y otra `409`; una sola cuenta persistida, con el UUID de la respuesta exitosa. El conflicto señala el correo y no aparece un error interno `500` ni una segunda cuenta.

**Límite de la comprobación manual:** enviar en paralelo no demuestra que los INSERT se solaparon realmente. La prueba automatizada sincroniza ambas solicitudes con `Barrier` antes de insertar y comprueba la carrera contra PostgreSQL, por lo que es la evidencia específica de concurrencia.

**Respaldo automatizado:** [PostgreSQL](../../backend/tests/test_registration_postgres.py), `test_hu01_ca06_simultaneous_registration_only_creates_one_account`; la restricción independiente de la API se verifica en `test_hu01_ca02_database_enforces_email_uniqueness_without_the_api`.

## CP-HU01-10 — Indisponibilidad de BD y recuperación

**Criterios relacionados:** CA-01, CA-03 y CA-04; complemento técnico de manejo de fallos. **Tipo:** negativo y recuperación.

**Precondiciones:** entorno local de pruebas de Compose, aplicación cargada y correo nuevo. Registrar que la BD está disponible al comienzo y que el correo aún no existe.

**Datos:** nombre `Jorge de Prueba`, correo base y contraseña base.

**Pasos:**

1. En este entorno de pruebas, detener únicamente la BD con `docker compose stop db`.
2. Enviar el formulario válido y esperar la respuesta.
3. Comprobar el estado HTTP, el mensaje general y la conservación del nombre y correo. No capturar la contraseña.
4. Restablecer la BD con `docker compose start db` y esperar a que `/api/health/ready` devuelva `200`.
5. Consultar que el intento fallido no creó la cuenta; después volver a pulsar **Crear cuenta** y comprobar confirmación y persistencia.

**Resultado esperado:** durante el fallo, la API responde `503` sin detalles internos de conexión; la interfaz informa **No pudimos crear tu cuenta. Vuelve a intentarlo en unos momentos.**, conserva datos útiles y habilita el envío al terminar. Tras la recuperación, el reintento responde `201` y deja una sola cuenta. No se informa éxito en el intento sin persistencia.

**Respaldo automatizado:** [API](../../backend/tests/test_registration.py), `test_hu01_ca04_database_failure_is_safe_and_rolls_back` (fallo simulado); [formulario](../../frontend/src/RegistrationForm.test.tsx), `presenta un error genérico ante un 503 sin revelar detalles internos` e `informa un error de red, conserva nombre y correo y permite reintentar`. Estas pruebas aisladas no equivalen a ejecutar manualmente la caída y recuperación de la BD.

## Evaluación, defectos y cierre

Un caso manual aprueba solo si se observan todos sus resultados esperados. Si los servicios o datos no permiten ejecutar los pasos, registrar **bloqueado** con la causa; si el observado contradice el oráculo, registrar **fallido** y enlazar el defecto en Jira con el caso, CA, commit, pasos, esperado, observado y evidencia sin credenciales. La severidad describe el impacto; la prioridad decide cuándo corregirlo. Después de la corrección, repetir el caso afectado y las comprobaciones relacionadas, conservando ambas ejecuciones.

La suite puede considerarse ejecutada cuando existe un registro para todos sus casos y subcasos. Su cierre requiere revisar resultados y defectos; completar los pasos no demuestra aceptación de usuario ni cobertura porcentual de código. La cobertura automatizada y los resultados ya obtenidos se consultan por separado en [evidencia de REN-1](../evidencias/REN-1.md) y en la matriz de trazabilidad del proyecto.
