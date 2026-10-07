# Requerimientos y alcance de RentSmart

Versión documental: 1.0, 6 de octubre de 2026. Elaboración para el equipo Jorge Aceval y Joaquín Viveros; la implementación de HU-01 fue solicitada por el usuario. Este documento especifica la base disponible y HU-01, sin declarar terminado el MVP completo ni sustituir la pauta de la entrega.

## Fuentes y conceptos aplicados

Las páginas citadas corresponden a la posición en cada PDF, incluida su portada.

| Fuente | Concepto de clase | Aplicación en este documento |
| --- | --- | --- |
| `INF331 Ingeniería de Requerimientos 1 de 2 v1.1.pdf`, pp. 14–17 | Niveles de requisitos y calidad: completo, correcto, factible, necesario, priorizado, inequívoco y verificable | Separar objetivo, comportamiento, atributos y reglas; asignar identificadores y resultados observables |
| Mismo PDF, pp. 25–26 y 32 | Elicitación, análisis, especificación y validación iterativos; análisis de documentos | Usar las HU como fuente, contrastarlas con la implementación y registrar diferencias de alcance |
| Mismo PDF, pp. 36–37 y 41 | Visión/alcance, fuente, ID, criterios, matriz y control de cambios | Mantener este catálogo, [HU-01](HU-01.md), la matriz y el historial de Git/Jira relacionados |
| Mismo PDF, pp. 49–50 y 54 | Contexto, diccionario de datos, modelos complementarios y prioridad por valor/riesgo | Describir actores, intercambio de datos y prioridad de HU-01 por su dependencia para el acceso |
| `INF331 Ingeniería de Requerimientos 2 de 2 v1.1.pdf`, pp. 13–19 | Caso de uso textual con actores, precondiciones, flujo, alternativas y postcondiciones | Especificar UC-01 sin confundir un diagrama con la descripción del comportamiento |
| Mismo PDF, pp. 25–34 | Reglas de negocio: hechos, restricciones, acciones, inferencias y cálculos | Clasificar las políticas de unicidad y privilegios como restricciones; no inventar reglas de reservas aquí |
| Mismo PDF, pp. 38–40 | Atributos de calidad medibles, con escala y método de comprobación | Definir comprobaciones concretas de confidencialidad/integridad; no copiar tiempos o SLAs de los ejemplos |
| Mismo PDF, pp. 42–43 y 49–50 | Fuente, versión, prioridad, estado, cambios y trazabilidad; implementado distinto de verificado | Vincular requisito → criterio → código → prueba → evidencia y mantener separada la revisión del PR |

Las clases enseñan prácticas y presentan ejemplos; sus ejercicios no agregan funciones a RentSmart. `Historias de usuario.pdf`, p. 1, identifica sus reglas como decisiones propuestas por el equipo. La solicitud de implementar HU-01 concreta el trabajo de registro; no convierte las otras 17 historias en funcionalidades realizadas.

## Visión, contexto y alcance actual

RentSmart busca conectar particulares que ofrecen espacios con personas que necesitan arrendarlos. La creación de una cuenta es el primer paso para el recorrido futuro de publicación y reserva. En esta base, el éxito observable de HU-01 es crear una sola cuenta persistente con datos válidos, informar el resultado y proteger su contraseña.

| Actor o interesado | Objetivo y relación con el alcance |
| --- | --- |
| Visitante | Crear su cuenta mediante HU-01; no necesita una sesión previa |
| Cuenta normal | En el producto previsto puede ser propietaria y arrendataria según la operación; no selecciona uno de esos roles al registrarse |
| Administrador | Privilegio fuera del registro público; su inicialización y operaciones no están implementadas en HU-01 |
| Jorge Aceval y Joaquín Viveros | Desarrollar, documentar y revisar el producto según los roles del [README](../README.md) |

La interfaz envía nombre, correo y contraseña a la API; la API valida, genera un UUID, transforma la contraseña en hash y persiste en PostgreSQL. La interfaz recibe datos públicos o errores controlados. PostgreSQL es un componente interno del sistema, no un actor humano.

**Disponible:** esqueleto React/FastAPI/PostgreSQL, comprobación de disponibilidad, configuración reproducible y registro de cuentas. **Pendiente:** HU-02 a HU-18 (sesión, espacios, catálogo, reservas, pagos, IA y administración). E2E corresponde a la entrega 3 por indicación del usuario. Registro, recuperación de contraseña, verificación por correo y autenticación social son alcances distintos; las tres últimas no pertenecen a HU-01 (`Historias de usuario.pdf`, p. 7).

## Historia y prioridad

**HU-01 / [REN-1](https://rentsmartpsf.atlassian.net/browse/REN-1):** como visitante, quiero crear una cuenta con mi nombre, correo y contraseña para poder publicar espacios y realizar reservas. Fuente: `Historias de usuario.pdf`, p. 7. Prioridad **alta** según esa fuente: habilita HU-02 y las operaciones privadas posteriores. Depende del esqueleto de aplicación y BD, [REN-73](https://rentsmartpsf.atlassian.net/browse/REN-73).

La prioridad conserva la del backlog; no equivale a una promesa de duración. La estimación de 1–1,5 horas del PDF es inicial, no una medición del esfuerzo ejecutado. No se asignan nuevas prioridades ni fechas a funcionalidades que aún no se han desarrollado.

## Catálogo de requisitos de HU-01

`RF` identifica comportamiento observable; `RNF`, atributo de calidad; `RN`, política del dominio. Los IDs se mantienen estables si cambia la redacción. Todos corresponden a HU-01, tienen prioridad alta y están implementados en la rama de REN-1; la evidencia automatizada se consulta en [REN-1](evidencias/REN-1.md). La aprobación del producto y la revisión de integración no se deducen del hecho de que las pruebas pasen.

| ID | Tipo y especificación verificable | Fuente / criterio | Comprobación |
| --- | --- | --- | --- |
| RF-REG-01 | El visitante puede enviar nombre, correo y contraseña; con datos válidos y correo nuevo se crea una cuenta y se muestra confirmación | PDF p. 7, CA-01 | API `201`, cuenta consultable desde otra sesión PostgreSQL y mensaje del formulario |
| RF-REG-02 | Antes de persistir, el sistema recorta nombre/correo y convierte correo a minúsculas; conserva la contraseña exactamente como fue ingresada | PDF pp. 3–4 y 7, CA-02/03 | Valores guardados normalizados y verificación del hash con la contraseña original |
| RF-REG-03 | El sistema rechaza campos ausentes, correo inválido, nombre fuera de 2–80 caracteres y contraseña fuera de 8–64 | PDF pp. 3–4 y 7, CA-03 | API `422`, ninguna cuenta creada; pruebas de límites y entradas inválidas |
| RF-REG-04 | Los errores del formulario identifican el campo afectado y conservan los datos útiles para corregirlo | PDF p. 7, CA-03 | Mensaje asociado al campo; entrada conservada tras error, sin volver a escribir todo |
| RF-REG-05 | Si el correo normalizado ya existe, el registro devuelve conflicto controlado y no agrega una segunda cuenta | PDF p. 7, CA-02/06 | API `409`, error del campo correo y una fila en BD |
| RF-REG-06 | El registro público acepta solo los tres datos de entrada; el servidor genera el UUID y crea `is_admin=false` | PDF p. 7, CA-05 | Campos adicionales rechazados con `422`; UUID del servidor y cuenta normal persistida |
| RF-REG-07 | Ante indisponibilidad de persistencia, la API responde `503` con mensaje controlado y la interfaz permite volver a intentar | Decisión técnica de REN-1 para gestionar el error de registro | Excepción de BD simulada, respuesta sin detalles internos y datos conservados en formulario |
| RNF-REG-01 | La contraseña persistida es un hash, distinto del texto original y verificable; ninguna respuesta de registro incluye contraseña ni hash | PDF pp. 4 y 7, CA-04; Argon2id es decisión técnica | Inspección de la fila, verificación del hash y comprobación de respuestas exitosas/fallidas |
| RNF-REG-02 | Dos solicitudes concurrentes con el mismo correo producen exactamente una cuenta, un `201` y un `409` | PDF p. 7, CA-06 | Dos solicitudes sincronizadas con PostgreSQL real y conteo posterior de una fila |
| RNF-REG-03 | Contraseñas no deben aparecer en capturas ni registros de aplicación; la API no publica entradas ni errores internos | PDF p. 7, CA-04 | Revisar manejo de errores/configuración de logs y capturas; las pruebas de API cubren respuestas, no todos los posibles sistemas de observabilidad |
| RN-REG-01 | Un correo normalizado identifica como máximo una cuenta, incluso ante solicitudes simultáneas | PDF pp. 4 y 7, CA-02/06 | Restricción `uq_users_email` y pruebas PostgreSQL; política de unicidad |
| RN-REG-02 | Una misma cuenta normal puede participar como propietaria y arrendataria según su relación con un espacio/reserva | PDF p. 2, RN-02; p. 7, CA-05 | Registro sin selector de esos roles; sus operaciones concretas pertenecen a otras HU |
| RN-REG-03 | El registro público no puede conceder privilegios administrativos | PDF p. 2, RN-04; p. 7, CA-05 | Rechazo de `role`, `id` e `is_admin`; flag administrativo falso |

Las RN anteriores son **restricciones** según Requerimientos 2/2, p. 30. RF-REG-05 y RF-REG-06 describen cómo las aplica el software. RNF-REG-01/03 concretan confidencialidad y RNF-REG-02 integridad ante concurrencia. No se fija un porcentaje de disponibilidad, tiempo máximo de registro o carga de usuarios: no hay una meta acordada ni medición que los respalde.

## Criterios de aceptación y resultado observable

Los identificadores CA-01 a CA-06 conservan los del PDF, p. 7; estos resúmenes no alteran su contenido original.

| Criterio | Requisitos relacionados | Qué se acredita y límite |
| --- | --- | --- |
| CA-01 | RF-REG-01 | Creación persistente y confirmación; no se inicia sesión automáticamente. Acceder a una pantalla de inicio de sesión depende de HU-02, todavía pendiente |
| CA-02 | RF-REG-02/05, RN-REG-01 | Normalización y un único registro para variantes del mismo correo |
| CA-03 | RF-REG-02/03/04 | Validación por campo y conservación de datos; límites derivados de las pp. 3–4 |
| CA-04 | RNF-REG-01/03 | Hash y respuestas sin secretos; capturas/logs requieren además revisión estática/manual |
| CA-05 | RF-REG-06, RN-REG-02/03 | Cuenta normal sin escalamiento en registro; no demuestra publicación o reserva aún |
| CA-06 | RF-REG-05, RNF-REG-02, RN-REG-01 | Una cuenta ante registro simultáneo; exige prueba PostgreSQL, no basta SQLite o simular respuestas |

Los tests concretos y su relación con estos criterios deben consultarse en la [documentación de HU-01](HU-01.md) y la matriz de trazabilidad. Un conteo de pruebas aprobadas no es un porcentaje de requisitos satisfechos ni cobertura de código.

## UC-01 — Crear una cuenta

Especificación textual basada en el esquema de Requerimientos 2/2, p. 14. Autor documental: equipo RentSmart; fecha: 6 de octubre de 2026. Actor principal: visitante. Prioridad: alta. Frecuencia: no medida. Disparador: el visitante solicita crear una cuenta. Precondición de interacción: interfaz de registro disponible; una BD disponible es condición del flujo exitoso, no una excusa para omitir su excepción.

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

API: `POST /api/auth/register`, éxito `201` con `id`, `name` y `email`; errores `409`, `422` o `503` con `detail` y `errors`. Los códigos HTTP, Argon2id, UUID, etiquetas/atributos ARIA y restricciones SQL son decisiones de realización, no requisitos adicionales atribuidos al profesor. El contrato completo de implementación está en [HU-01](HU-01.md) y OpenAPI.

## Calidad, validación y gestión del cambio

Aplicación de Requerimientos 1/2, p. 17: cada entrada tiene fuente, ID, resultado comprobable y límite de alcance. Se evitan expresiones como “rápido” o “seguro” sin criterio. Se revisa consistencia entre formulario, contrato de API, migración y pruebas; las pruebas del cliente no sustituyen la validación del servidor. La factibilidad técnica tiene evidencia ejecutable; no implica que todos los supuestos del MVP hayan sido aceptados por un docente o usuarios representativos.

La elicitación realizada aquí es **análisis documental** y uso de las solicitudes del usuario, no entrevistas o talleres inventados. La validación de necesidades corresponde a contrastar esta especificación con sus fuentes y recibir revisión del equipo/solicitante. La ejecución de pruebas verifica comportamientos concretos del producto. No se atribuye una aceptación humana a una herramienta automática.

La línea de referencia de HU-01 se identifica por `REN-1`, su rama `feature/REN-1-registro-usuarios` y el [PR #4](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/pull/4). El código está implementado y tiene evidencia de comprobación automatizada; la revisión/integración del PR es un estado separado. El estado de Jira se mantiene en Jira y no se reemplaza por la terminología de esta especificación.

Para cambiar un requisito: registrar motivo y fuente en Jira, revisar impacto en contrato/datos/interfaz/pruebas, actualizar el requisito conservando su ID, ajustar la matriz y proponer el cambio por PR. Git conserva autor, fecha y versión de cada modificación. Jorge coordina el cambio y el otro integrante revisa según el flujo de contribución. Esto aplica las prácticas de Requerimientos 2/2, pp. 42–43 y 47–50, sin afirmar que se celebró una reunión o aprobación no registrada.
