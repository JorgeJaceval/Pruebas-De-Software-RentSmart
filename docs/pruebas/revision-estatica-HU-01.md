# Revisión estática de HU-01 y su base técnica

Fecha: 6 de octubre de 2026. Revisor: agente Codex. Revisión base: `d62609b58d8b142f1397249633b4667e6201f31b`. Cierre: revisión del código corregido y de sus casos de regresión, con resultados de integración enlazados al final.

Alcance: registro de cuentas de HU-01/REN-1, validación del formulario/API, persistencia, errores y pruebas existentes. No incorpora otras historias ni E2E. Se revisaron los archivos fuente y casos de prueba; los sondeos adicionales se limitaron al esquema de entrada y a la codificación local, sin conexiones de red ni datos personales.

Este documento registra una revisión asistida por un agente. No acredita una revisión humana entre Jorge y Joaquín, una reunión de walkthrough ni una inspección formal con roles y acta. La revisión del PR por otro integrante debe quedar registrada en GitHub.

## Material y aplicación de los conceptos

Las páginas indicadas son páginas físicas del PDF, no los números impresos de las diapositivas.

| Concepto del material de Técnicas de pruebas, IFI331, Sem6 S2 2026 | Páginas PDF | Aplicación en esta revisión |
| --- | --- | --- |
| Resultado esperado explícito; entradas válidas, inválidas e inesperadas | 3–4 | Contrastar cada caso con un criterio y revisar además datos que no debe aceptar el registro |
| Pruebas estáticas: inspecciones, revisiones y análisis de flujo/datos | 2, 6–8 | Lectura de requisitos, validadores, endpoint, migración y tests sin ejecutar la aplicación |
| Pruebas dinámicas; caja blanca y caja negra | 6, 9 | Separar la revisión de código de los casos que ejecutan componentes/API |
| Caja blanca: estructura y complementariedad con caja negra | 13–31, 59 | Examinar ramas de validación, errores, rollback y unicidad; no inferir cobertura por contar tests |
| Accesibilidad y observabilidad de una falla | 53–58 | Verificar que la entrada alcance el fallo y que la respuesta/fila persistida permita observarlo |
| Caja negra funcional: entrada/salida contra la especificación | 61 | Clasificar los casos de éxito, datos inválidos, correo duplicado y privilegios |
| Valores límite: en el borde e inmediatamente a ambos lados | 63–68, 84–85 | Revisar longitudes 2–80 y 8–64 con sus vecinos |
| Clases de equivalencia válidas e inválidas | 69–76 | Agrupar campos ausentes, tipos incorrectos, longitudes y correos malformados |
| Combinaciones y categorías de entradas | 77–81 | Combinar validez de datos, estado de unicidad y disponibilidad de persistencia |

La clase enumera causa-efecto en p. 6 y usa una tabla de verdad para condiciones en p. 28. No desarrolla una tabla de decisión específica para registro, walkthroughs ni niveles unidad/componente/integración. La clasificación y la tabla siguientes son aplicación al proyecto, no una atribución de contenido adicional al PDF.

## Criterios de revisión

Fuente funcional: `Historias de usuario.pdf`, p. 7 (CA-01–CA-06), y reglas comunes de nombre/contraseña/correo de pp. 3–4. La [matriz de HU-01](../HU-01.md) resume su relación con las pruebas.

1. Datos válidos producen una cuenta persistente y una confirmación observable.
2. Correo normalizado y único, incluso ante dos solicitudes simultáneas.
3. Validación coherente entre interfaz, esquema y persistencia; errores asociados al campo.
4. Contraseña exacta al hashear; ausencia de texto original/hash en respuestas o registros.
5. Campos administrativos/identificadores del cliente no elevan privilegios.
6. Tests con resultado esperado, aislamiento y casos representativos; sin afirmar cobertura no medida.

## Hallazgos detectados en la revisión base

Los cuatro hallazgos siguientes describen el comportamiento observado antes de las correcciones. Están resueltos y verificados según la tabla de cierre. Severidad estima el impacto técnico del defecto; prioridad corresponde al orden de atención del equipo/Jira. Esta revisión no asigna prioridades de Jira ni atribuye decisiones humanas no registradas.

### RE-01 — Contraseña con sustituto Unicode aislado alcanzaba un error no controlado

Severidad del hallazgo original: **media**, por transformar una entrada inválida en error del servidor. Detectado en [schemas.py](../../backend/app/schemas.py), `RegistrationRequest.password`, y [auth.py](../../backend/app/routers/auth.py), llamada a `hash_password` anterior al manejo de errores de persistencia.

Entrada sintética: contraseña `"\ud800abcdefg"`, de ocho caracteres. El esquema base la aceptaba como `SecretStr`; `hash_password` lanzaba `UnicodeEncodeError` al codificarla para Argon2. El sondeo no imprimió ni almacenó la contraseña. El error quedaba fuera del bloque controlado del endpoint y alcanzaría una respuesta de error del servidor, en lugar del 422 asociado a `password`.

Reproducción original sobre la revisión base, desde `backend`. En la versión corregida el esquema rechaza esta entrada antes de alcanzar el hash:

```python
from app.schemas import RegistrationRequest
from app.security import hash_password

request = RegistrationRequest.model_validate({
    "name": "Probe", "email": "probe@example.com",
    "password": "\ud800abcdefg",
})
hash_password(request.password.get_secret_value())  # UnicodeEncodeError en la base
```

Corrección aplicada: `require_string` comprueba UTF-8 durante la validación y el handler devuelve un error seguro del campo. No recorta, normaliza ni reemplaza caracteres de la contraseña. Las regresiones cubren sustitutos altos/bajos aislados, conservando espacios, Unicode válido, límites y NUL en contraseña.

### RE-02 — Nombre con NUL superaba el esquema pero no podía persistirse en PostgreSQL

Severidad del hallazgo original: **media**, por comunicar indisponibilidad en vez de señalar el dato inválido. Detectado en [schemas.py](../../backend/app/schemas.py), `normalize_name`, y columna `users.name` en [models.py](../../backend/app/models.py).

Entrada sintética: nombre `"A\u0000B"`. Tenía tres caracteres y pasaba el esquema base. El adaptador local `psycopg.types.string.StrDumperUnknown(str).dump(name)` lanzaba `DataError`: un campo de texto PostgreSQL no admite NUL. Se observó el rechazo del adaptador, sin ejecutar SQL. El manejo genérico de persistencia comunicaría indisponibilidad 503, aunque el problema correspondía al campo `name`.

Corrección aplicada: `normalize_name` rechaza NUL antes de insertar y el handler devuelve 422 asociado a `name`; el formulario también impide el envío. La contraseña con NUL conserva su valor exacto y su hash se verifica en una regresión específica.

### RE-03 — El formulario y la API diferían en el formato de correo con nombre visible

Severidad del hallazgo original: **baja**, por inconsistencia del contrato de entrada. [registration.ts](../../frontend/src/registration.ts), `validateRegistration`, rechazaba `"Probe <probe@example.com>"`; `RegistrationRequest` lo aceptaba y lo transformaba en `probe@example.com` mediante `EmailStr`.

El sondeo del esquema confirmó esa diferencia. No permitía duplicar cuentas porque la dirección resultante se normalizaba y la BD imponía unicidad. Corrección aplicada: esquema y formulario rechazan los delimitadores `<`/`>` y aceptan solo una dirección simple. Se conserva el tratamiento Unicode/IDNA de `EmailStr`.

### RE-04 — Los valores límite no completaban ambos vecinos interiores

Severidad del hallazgo original: **baja**, mejora del diseño de pruebas. [test_registration.py](../../backend/tests/test_registration.py) y [RegistrationForm.test.tsx](../../frontend/src/RegistrationForm.test.tsx) cubrían nombre 1/2/80/81 y contraseña 7/8/64/65, además de vacíos, espacios y valores normales.

Para el análisis de tres puntos de p. 63 faltaban nombre 3/79 y contraseña 9/63. Se añadieron como casos aceptados e independientes por campo en API y formulario. Ahora se verifican nombre 1/2/3 y 79/80/81, y contraseña 7/8/9 y 63/64/65. Esto describe los límites revisados, sin afirmar cobertura completa de todos los datos posibles.

## Comprobaciones que no dieron lugar a un defecto

| Revisión | Evidencia de código/sondeo |
| --- | --- |
| Correo de 254 frente a `Field(max_length=320)` | El esquema acepta una dirección ASCII válida de 254 caracteres y rechaza una de 255 mediante `EmailStr`; la diferencia nominal de constantes no demuestra que la API acepte 320 |
| Normalización Unicode | `JOSE\u0301@EXAMPLE.COM` termina en `josé@example.com`; el validador aplica NFC al correo sin alterar la contraseña |
| Password con espacios o Unicode válido | El código no usa `strip`, `lower` ni normalización en password; las pruebas verifican el hash con el valor original |
| Datos sensibles en fallos | [errors.py](../../backend/app/errors.py) publica mensajes de una lista conocida, sin `input`, valores, contexto de validación ni excepción SQL |
| Cuenta ya guardada y pérdida de lectura | La respuesta pública se prepara antes del commit y no hay lectura posterior; existe una prueba de regresión para impedir falso fracaso después de guardar |
| Unicidad simultánea | Restricción `uq_users_email`, clasificación específica del conflicto y test PostgreSQL concurrente con dos respuestas 201/409 y una fila |
| Independencia de pruebas | SQLite recreado por caso; PostgreSQL usa esquemas `hu01_` con UUID, migración real y eliminación limitada al esquema generado |
| Privilegios | Esquema `extra="forbid"`, UUID del servidor y `is_admin=False`; pruebas rechazan rol, id, hash y flag administrativos del cliente |

CA-01 menciona poder dirigirse al inicio de sesión. El registro confirma éxito y no inicia sesión automáticamente; la navegación a un inicio de sesión funcional depende de HU-02, fuera del alcance autorizado. No se acredita esa navegación como implementada ni se propone un enlace a una pantalla inexistente.

## Lectura de las pruebas dinámicas existentes

Los tests de `RegistrationForm` son pruebas de componente con DOM simulado y HTTP sustituido mediante `fetch`. Los casos `TestClient` con SQLite ejecutan API, validación y SQLModel juntos: son pruebas de integración del backend con una BD sustituida, no todas son unitarias. Los casos PostgreSQL comprueban integración con el motor real y migraciones.

Caja negra: entradas válidas/ausentes/malformadas, duplicado, longitudes y respuesta pública. Caja blanca: inducir un error de commit, comprobar rollback, impedir lecturas después de commit y sincronizar dos inserciones. Un mismo caso puede tener un oráculo funcional y preparación que conoce el código.

Tabla de decisión derivada para el comportamiento del registro:

| Datos permitidos/válidos | Correo ya existente | Persistencia disponible | Resultado esperado |
| --- | --- | --- | --- |
| No | — | — | 422, errores de campos/formulario; no insertar |
| Sí | Sí | Sí | 409 controlado; conservar la cuenta existente |
| Sí | No | Sí | 201 después del commit; una cuenta normal |
| Sí | — | No | 503 seguro cuando no puede confirmar la operación |
| Sí, dos solicitudes simultáneas | No al comenzar | Sí | Un 201 y un 409; una sola cuenta |

La tabla expresa condiciones y resultados de HU-01; no sustituye el test concurrente ni exige combinaciones imposibles. La fase estática no ejecutó suites ni calculó métricas. La integración posterior ejecutó los casos de regresión y las suites; sus resultados y mediciones se documentan aparte. No se atribuye cobertura MC/DC ni se ejecutaron E2E.

## Cierre de la revisión

Se revisaron los cambios de fuente y los tests sin detectar un fallo material nuevo. El filtro de sustitutos aislados de JavaScript usa la bandera Unicode `u`, de modo que permite pares válidos de caracteres astrales; la regresión con 64 caracteres `🔑` verifica ese comportamiento.

| Hallazgo | Estado de cierre | Casos de regresión identificados |
| --- | --- | --- |
| RE-01 | Corregido y verificado | `test_hu01_ca03_rejects_unexpected_text_without_internal_errors`, parámetros `password-high-surrogate`/`password-low-surrogate`; formulario «rechaza contraseña con Unicode inválido»; `test_hu01_ca04_preserves_the_exact_password` conserva Unicode y NUL válidos |
| RE-02 | Corregido y verificado | Mismo test de textos inesperados, parámetro `name-null`; formulario «rechaza nombre con carácter nulo»; error asociado a `name` sin inserción |
| RE-03 | Corregido y verificado | Mismo test, parámetros `display-name-email`/`bracketed-email`; formulario «rechaza correo con nombre visible» |
| RE-04 | Completado y verificado | `test_hu01_ca03_accepts_valid_boundary_lengths`, ocho parámetros aceptados; formulario «acepta el límite…» con ocho casos por campo; casos inválidos de longitudes 1/81 y 7/65 conservados |

La integración registró **35 casos Jest aprobados** y **71 casos Pytest aprobados**, además del build. Los comandos, resultados y métricas están en la [evidencia de calidad de HU-01](../evidencias/calidad-HU-01.md). Este cierre acredita la revisión asistida y las comprobaciones descritas; no constituye una aprobación humana del PR.
