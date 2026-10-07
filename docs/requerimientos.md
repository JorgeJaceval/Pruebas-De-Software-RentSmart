# Requerimientos y alcance de RentSmart

Versión documental: 1.1, 6 de octubre de 2026. Somos Jorge Aceval y Joaquín Viveros. En este documento especificamos la base de RentSmart y HU-01, que forman nuestro alcance actual. Las demás historias del MVP siguen pendientes.

## Fuentes y conceptos aplicados

Tomamos las historias de usuario y los conceptos de las clases como base para especificar los requisitos. Las páginas citadas corresponden a la posición en cada PDF, incluida su portada.

| Fuente | Concepto de clase | Aplicación en este documento |
| --- | --- | --- |
| `INF331 Ingeniería de Requerimientos 1 de 2 v1.1.pdf`, pp. 14–17 | Niveles de requisitos y calidad: completo, correcto, factible, necesario, priorizado, inequívoco y verificable | Separamos objetivo, comportamiento, atributos y reglas; asignamos identificadores y resultados observables |
| Mismo PDF, pp. 25–26 y 32 | Elicitación, análisis, especificación y validación iterativos; análisis de documentos | Usamos las HU como fuente, las contrastamos con la implementación y registramos diferencias de alcance |
| Mismo PDF, pp. 36–37 y 41 | Visión/alcance, fuente, ID, criterios y control de cambios | Mantenemos este catálogo, [HU-01](HU-01.md) y el historial de Git/Jira relacionados |
| Mismo PDF, pp. 49–50 y 54 | Contexto, diccionario de datos, modelos complementarios y prioridad por valor/riesgo | Describimos actores, intercambio de datos y prioridad de HU-01 por su dependencia para el acceso |
| `INF331 Ingeniería de Requerimientos 2 de 2 v1.1.pdf`, pp. 13–19 | Caso de uso textual con actores, precondiciones, flujo, alternativas y postcondiciones | Especificamos UC-01 con su flujo, alternativas y postcondiciones |
| Mismo PDF, pp. 25–34 | Reglas de negocio: hechos, restricciones, acciones, inferencias y cálculos | Clasificamos las políticas de unicidad y privilegios como restricciones |
| Mismo PDF, pp. 38–40 | Atributos de calidad medibles, con escala y método de comprobación | Definimos resultados observables para confidencialidad e integridad |
| Mismo PDF, pp. 42–43 y 49–50 | Fuente, versión, prioridad, estado y cambios; implementado distinto de verificado | Identificamos los requisitos y conservamos resultados y revisión en el PR y Jira |

Usamos `Historias de usuario.pdf` como referencia del comportamiento de RentSmart; su página 1 presenta las reglas como decisiones propuestas por nuestro equipo. Aplicamos los conceptos de las clases al registro de cuentas. Tenemos pendientes las otras 17 historias.

## Visión, contexto y alcance actual

Buscamos conectar particulares que ofrecen espacios con personas que necesitan arrendarlos. Comenzamos por la creación de cuentas, que permitirá continuar con publicación y reserva. Para HU-01 definimos como resultado exitoso crear una sola cuenta persistente con datos válidos, informar el resultado y proteger su contraseña.

| Actor o interesado | Objetivo y relación con el alcance |
| --- | --- |
| Visitante | Crear su cuenta mediante HU-01; no necesita una sesión previa |
| Cuenta normal | En el producto previsto puede ser propietaria y arrendataria según la operación; no selecciona uno de esos roles al registrarse |
| Administrador | Privilegio fuera del registro público; su inicialización y operaciones no están implementadas en HU-01 |
| Jorge Aceval y Joaquín Viveros | Desarrollamos, documentamos y revisamos el producto según los roles del [README](../README.md) |

La interfaz envía nombre, correo y contraseña a la API; la API valida, genera un UUID, transforma la contraseña en hash y persiste en PostgreSQL. La interfaz recibe datos públicos o errores controlados. PostgreSQL es un componente interno del sistema, no un actor humano.

**Disponible:** esqueleto React/FastAPI/PostgreSQL, comprobación de disponibilidad, configuración reproducible y registro de cuentas. **Pendiente:** HU-02 a HU-18 (sesión, espacios, catálogo, reservas, pagos, IA y administración). Reservamos las E2E para la entrega 3. Delimitamos HU-01 al registro de cuentas; recuperación de contraseña, verificación por correo y autenticación social quedan fuera de esta historia (`Historias de usuario.pdf`, p. 7).

## Historia y prioridad

**HU-01 / [REN-1](https://rentsmartpsf.atlassian.net/browse/REN-1):** como visitante, quiero crear una cuenta con mi nombre, correo y contraseña para poder publicar espacios y realizar reservas. Fuente: `Historias de usuario.pdf`, p. 7. Prioridad **alta** según esa fuente: habilita HU-02 y las operaciones privadas posteriores. Depende del esqueleto de aplicación y BD, [REN-73](https://rentsmartpsf.atlassian.net/browse/REN-73).

Conservamos la prioridad del backlog. Tomamos la estimación de 1–1,5 horas del PDF como una referencia inicial; todavía no tenemos una medición del esfuerzo ejecutado. Las prioridades y fechas de las funcionalidades pendientes se mantienen en el backlog.

## Catálogo de requisitos de HU-01

Usamos `RF` para comportamiento observable, `RNF` para atributos de calidad y `RN` para políticas del dominio. Conservamos los IDs cuando cambia la redacción. Todos corresponden a HU-01 y tienen prioridad alta. La columna siguiente especifica el resultado esperado del requisito; registramos los resultados de ejecución en **Testing** de [REN-1](https://rentsmartpsf.atlassian.net/browse/REN-1) y en el PR.

| ID | Tipo y especificación verificable | Fuente / criterio | Resultado esperado |
| --- | --- | --- | --- |
| RF-REG-01 | El visitante puede enviar nombre, correo y contraseña; con datos válidos y correo nuevo se crea una cuenta y se muestra confirmación | PDF p. 7, CA-01 | API `201`, cuenta consultable desde otra sesión PostgreSQL y mensaje del formulario |
| RF-REG-02 | Antes de persistir, el sistema recorta nombre/correo y convierte correo a minúsculas; conserva la contraseña exactamente como fue ingresada | PDF pp. 3–4 y 7, CA-02/03 | Valores guardados normalizados y verificación del hash con la contraseña original |
| RF-REG-03 | El sistema rechaza campos ausentes, correo inválido, nombre fuera de 2–80 caracteres y contraseña fuera de 8–64 | PDF pp. 3–4 y 7, CA-03 | API `422`, errores por campo y ninguna cuenta creada |
| RF-REG-04 | Los errores del formulario identifican el campo afectado y conservan los datos útiles para corregirlo | PDF p. 7, CA-03 | Mensaje asociado al campo; entrada conservada tras error, sin volver a escribir todo |
| RF-REG-05 | Si el correo normalizado ya existe, el registro devuelve conflicto controlado y no agrega una segunda cuenta | PDF p. 7, CA-02/06 | API `409`, error del campo correo y una fila en BD |
| RF-REG-06 | El registro público acepta solo los tres datos de entrada; el servidor genera el UUID y crea `is_admin=false` | PDF p. 7, CA-05 | Campos adicionales rechazados con `422`; UUID del servidor y cuenta normal persistida |
| RF-REG-07 | Ante indisponibilidad de persistencia, la API responde `503` con mensaje controlado y la interfaz permite volver a intentar | Decisión técnica de REN-1 para gestionar el error de registro | Respuesta sin detalles internos y datos conservados en formulario |
| RNF-REG-01 | La contraseña persistida es un hash, distinto del texto original y verificable; ninguna respuesta de registro incluye contraseña ni hash | PDF pp. 4 y 7, CA-04; Argon2id es decisión técnica | Inspección de la fila, verificación del hash y comprobación de respuestas exitosas/fallidas |
| RNF-REG-02 | Dos solicitudes concurrentes con el mismo correo producen exactamente una cuenta, un `201` y un `409` | PDF p. 7, CA-06 | Dos solicitudes sincronizadas con PostgreSQL real y conteo posterior de una fila |
| RNF-REG-03 | Contraseñas no deben aparecer en capturas ni registros de aplicación; la API no publica entradas ni errores internos | PDF p. 7, CA-04 | Capturas, registros y respuestas sin contraseñas |
| RN-REG-01 | Un correo normalizado identifica como máximo una cuenta, incluso ante solicitudes simultáneas | PDF pp. 4 y 7, CA-02/06 | Restricción `uq_users_email` y una sola cuenta persistida |
| RN-REG-02 | Una misma cuenta normal puede participar como propietaria y arrendataria según su relación con un espacio/reserva | PDF p. 2, RN-02; p. 7, CA-05 | Registro sin selector de esos roles; sus operaciones concretas pertenecen a otras HU |
| RN-REG-03 | El registro público no puede conceder privilegios administrativos | PDF p. 2, RN-04; p. 7, CA-05 | Rechazo de `role`, `id` e `is_admin`; flag administrativo falso |

Clasificamos estas RN como **restricciones**, siguiendo Requerimientos 2/2, p. 30. En RF-REG-05 y RF-REG-06 describimos cómo las aplica el software. Con RNF-REG-01/03 especificamos confidencialidad y con RNF-REG-02, integridad ante concurrencia. Aún no definimos metas de disponibilidad, tiempo máximo de registro o carga de usuarios.

## Criterios de aceptación y resultado observable

Conservamos los identificadores CA-01 a CA-06 y el contenido de los criterios del PDF, p. 7.

| Criterio | Requisitos relacionados | Comportamiento y alcance |
| --- | --- | --- |
| CA-01 | RF-REG-01 | Creación persistente y confirmación; no se inicia sesión automáticamente. Acceder a una pantalla de inicio de sesión depende de HU-02, todavía pendiente |
| CA-02 | RF-REG-02/05, RN-REG-01 | Normalización y un único registro para variantes del mismo correo |
| CA-03 | RF-REG-02/03/04 | Validación por campo y conservación de datos; límites derivados de las pp. 3–4 |
| CA-04 | RNF-REG-01/03 | Hash y respuestas sin secretos |
| CA-05 | RF-REG-06, RN-REG-02/03 | Cuenta normal sin escalamiento en registro; no demuestra publicación o reserva aún |
| CA-06 | RF-REG-05, RNF-REG-02, RN-REG-01 | Una cuenta ante registro simultáneo |

Resumimos aquí los criterios del requisito. Registramos el alcance comprobado y los resultados en el PR y en **Testing** de Jira.

## UC-01 — Crear una cuenta

Especificamos este caso de uso siguiendo el esquema de Requerimientos 2/2, p. 14, con fecha 6 de octubre de 2026. Actor principal: visitante. Prioridad: alta. Frecuencia: no medida. Disparador: el visitante solicita crear una cuenta. Precondición de interacción: interfaz de registro disponible. Para completar el flujo exitoso necesitamos una BD disponible; describimos los fallos de conexión en las alternativas.

**Flujo normal**

1. El visitante ingresa nombre, correo y contraseña.
2. El sistema valida los campos y normaliza nombre y correo.
3. El sistema genera el identificador de cuenta, calcula el hash de contraseña y solicita persistir una cuenta normal.
4. La base de datos confirma la transacción y aplica la unicidad del correo.
5. El sistema informa que la cuenta fue creada y limpia el formulario.

**Alternativas y excepciones**

- Datos inválidos o incompletos: el sistema informa errores por campo, conserva los datos útiles y permite corregirlos; no crea una cuenta.
- Correo ya registrado, incluida una carrera concurrente: el sistema informa el conflicto; conserva una sola cuenta y revierte la transacción que falla.
- Campos de privilegios/identificador agregados por el cliente: la API rechaza la solicitud, aunque se evite la interfaz.
- Fallo de red o persistencia: el sistema informa que no pudo completar la operación y permite reintentar sin exponer detalles internos.

**Postcondición exitosa:** una cuenta persistente, correo normalizado, UUID generado, contraseña solo como hash y sin privilegios administrativos. No se crea una sesión. **Postcondición fallida:** no se crea una cuenta desde la solicitud rechazada; un conflicto no elimina ni modifica la cuenta previa. Reglas relacionadas: RN-REG-01/02/03. Publicar, reservar e iniciar sesión son otros casos de uso.

## Diccionario de datos y decisiones técnicas

| Dato | Significado y validación | Origen / exposición |
| --- | --- | --- |
| `name` | Nombre, 2–80 caracteres después de recortar extremos | Visitante; respuesta pública y BD |
| `email` | Correo válido, recortado, minúsculas y único | Visitante; respuesta pública y BD; PDF no define un máximo numérico de longitud |
| `password` | Contraseña, 8–64 caracteres; no se recorta ni altera | Entrada sensible del visitante; nunca respuesta pública ni persistencia en texto |
| `password_hash` | Resultado Argon2id con salt | Generado por backend; BD exclusivamente |
| `id` | Identificador UUID de cuenta | Generado por servidor; respuesta pública y clave de BD |
| `is_admin` | Privilegio administrativo, falso en el registro público | Decisión del servidor; no aceptado como entrada |

API: `POST /api/auth/register`, éxito `201` con `id`, `name` y `email`; errores `409`, `422` o `503` con `detail` y `errors`. Elegimos los códigos HTTP, Argon2id, UUID, etiquetas/atributos ARIA y restricciones SQL para implementar los requisitos. Documentamos el contrato completo en [HU-01](HU-01.md) y OpenAPI.

## Calidad, validación y gestión del cambio

Aplicamos Requerimientos 1/2, p. 17, indicando fuente, ID, resultado comprobable y alcance para cada requisito. Definimos comportamientos concretos y revisamos la consistencia entre formulario, contrato de API, migración y pruebas. Validamos también en el servidor, aunque el formulario ya compruebe los datos. Mantenemos separadas la verificación técnica y la aceptación del producto.

Obtuvimos los requisitos mediante **análisis documental** de las historias y las clases. Para validar las necesidades, contrastamos esta especificación con sus fuentes y la sometemos a revisión. Con las pruebas automatizadas verificamos comportamientos concretos; la aceptación del producto requiere una revisión humana.

Identificamos la versión de HU-01 mediante `REN-1`, la rama `feature/REN-1-registro-usuarios` y el [PR #4](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/pull/4). Implementamos el registro y lo integramos en `develop`. Conservamos sus resultados de comprobación automatizada y mantenemos el estado de la tarea en Jira.

Cuando cambiamos un requisito, registramos el motivo y la fuente en Jira, revisamos el impacto en contrato, datos, interfaz y pruebas, y actualizamos el requisito conservando su ID. Proponemos el cambio por PR y usamos Git para conservar autor, fecha y versión de cada modificación. Jorge coordina el cambio y el otro integrante lo revisa según nuestro flujo de contribución. Así aplicamos las prácticas de Requerimientos 2/2, pp. 42–43 y 47–50.
