# Requerimientos y alcance de RentSmart

Versión documental: 1.12, 8 de octubre de 2026. Somos Jorge Aceval y Joaquín Viveros. En este documento especificamos la base de RentSmart, HU-01 a HU-06, HU-08, HU-10 a HU-12 y los alcances parciales de HU-09/13. Integramos la creación de reservas y el panel privado del arrendatario; conservamos pendientes el filtro temporal del catálogo, el panel del propietario, cancelación y pago simulado.

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

Usamos `Historias de usuario.pdf` como referencia del comportamiento de RentSmart; su página 1 presenta las reglas como decisiones propuestas por nuestro equipo. Aplicamos los conceptos de las clases al registro, al acceso de cuentas y a la publicación, edición, estado, eliminación, detalle, horario diario, reserva y consulta privada del arrendatario, junto al catálogo con filtros básicos. HU-09 y CA-03 de HU-13 son parciales; HU-07 y HU-14 a HU-18 continúan pendientes. Comprobamos la protección concurrente mediante la API real de HU-12, frente a otra reserva, edición, desactivación y eliminación.

## Visión, contexto y alcance actual

Buscamos conectar particulares que ofrecen espacios con personas que necesitan arrendarlos. Comenzamos por la creación de cuentas, que permitirá continuar con publicación y reserva. Para HU-01 definimos como resultado exitoso crear una sola cuenta persistente con datos válidos, informar el resultado y proteger su contraseña.

| Actor o interesado | Objetivo y relación con el alcance |
| --- | --- |
| Visitante | Crear su cuenta mediante HU-01; no necesita una sesión previa |
| Cuenta normal | En el producto previsto puede ser propietaria y arrendataria según la operación; no selecciona uno de esos roles al registrarse |
| Administrador | Privilegio fuera del registro público; su inicialización y operaciones no están implementadas en HU-01 |
| Jorge Aceval y Joaquín Viveros | Desarrollamos, documentamos y revisamos el producto según los roles del [README](../README.md) |

La interfaz envía nombre, correo y contraseña a la API; la API valida, genera un UUID, transforma la contraseña en hash y persiste en PostgreSQL. La interfaz recibe datos públicos o errores controlados. PostgreSQL es un componente interno del sistema, no un actor humano.

**Disponible:** esqueleto React/FastAPI/PostgreSQL, comprobación de disponibilidad, configuración reproducible, registro, acceso de cuentas, publicación, edición, cambio de estado y eliminación de espacios propios sin reservas; catálogo público de activos no retirados, detalle completo, horario diario, filtros básicos locales y creación de reservas con pago pendiente y confirmación privada recuperable. **Pendiente:** filtro temporal de HU-09, HU-07 y HU-13 a HU-18. Reservamos las E2E para la entrega 3. Delimitamos HU-01 al registro, HU-02 a sesión y permisos, HU-03 a publicación y recuperación privada, HU-04 a edición con protección de reservas, HU-05 al estado de publicación, HU-06 a eliminación y conservación del historial, HU-08 al catálogo, HU-09 a búsqueda y filtros básicos, HU-10 al detalle autorizado, HU-11 al horario diario y HU-12 a reserva y pago pendiente atómicos con validación temporal y confirmación (`Historias de usuario.pdf`, pp. 7–15).

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
| CA-01 | RF-REG-01 | Creación persistente, confirmación y enlace al inicio de sesión incorporado con HU-02; no se inicia sesión automáticamente |
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

## HU-02 — Requisitos de acceso y sesión

**HU-02 / [REN-2](https://rentsmartpsf.atlassian.net/browse/REN-2):** como usuario registrado, quiero iniciar y cerrar sesión para acceder a mis funciones y dejar de estar autenticado cuando termine. Fuente: `Historias de usuario.pdf`, p. 8. Prioridad alta; depende de HU-01. Documentamos el contrato y los siete criterios en [HU-02](HU-02.md).

| ID | Requisito verificable | Fuente / criterio |
| --- | --- | --- |
| RF-SES-01 | Credenciales correctas establecen una sesión con vencimiento y acceso a vistas privadas | PDF p. 8, CA-01 |
| RF-SES-02 | Correo inexistente y contraseña incorrecta producen la misma respuesta sin autenticar | PDF p. 8, CA-02 |
| RF-SES-03 | Recargar recupera una sesión vigente; vencer o recibir rechazo de autenticación vuelve a solicitar acceso | PDF p. 8, CA-03 |
| RF-SES-04 | Cerrar sesión elimina el acceso guardado y bloquea volver a vistas privadas sin autenticarse | PDF p. 8, CA-04 |
| RF-SES-05 | La API comprueba token y cuenta en cada acceso privado y el permiso administrativo en la operación correspondiente | PDF p. 8, CA-05/06 |
| RF-SES-06 | Una cuenta autenticada ve sus enlaces privados; solo una cuenta administrativa ve el enlace de administración | PDF p. 8, CA-07 |
| RNF-SES-01 | Se rechazan tokens inválidos, alterados o vencidos y no se exponen contraseñas ni hashes en respuestas | PDF p. 8, CA-02/06; continuidad de confidencialidad de HU-01 |
| RN-SES-01 | Los privilegios proceden de la cuenta persistida; el cliente y los claims adicionales no asignan permisos | PDF p. 8, CA-05/06 |

Elegimos JWT HS256, `sessionStorage` y una vigencia configurable de 30 minutos como decisiones técnicas. El cierre elimina el acceso del cliente; un token copiado conserva su vigencia, conforme a CA-04. Incorporamos la publicación de espacios mediante HU-03; las demás operaciones siguen en sus respectivas historias.

## UC-02 — Iniciar y terminar una sesión

Actor principal: usuario registrado. Precondiciones del flujo exitoso: cuenta creada, API y PostgreSQL disponibles. Disparador: el usuario solicita iniciar sesión. Fuente: PDF de historias, p. 8; esquema de caso de uso de Requerimientos 2/2, p. 14.

1. El usuario ingresa correo y contraseña; normalizamos el correo y conservamos la contraseña exacta.
2. Verificamos las credenciales y entregamos un token con vigencia limitada y los datos públicos de la cuenta.
3. La interfaz guarda el acceso y habilita la navegación privada; cada consulta privada vuelve a comprobar autenticación y permisos en el servidor.
4. Al cerrar sesión o vencer, la interfaz elimina el acceso y solicita autenticarse nuevamente.

**Alternativas:** credenciales incorrectas reciben un mensaje genérico; token ausente, alterado o vencido recibe `401`; permiso administrativo insuficiente recibe `403`; un fallo de conexión permite reintentar sin mostrar una vista privada sin verificar la sesión.

**Postcondición de inicio exitoso:** acceso limitado asociado a la cuenta real, sin modificar sus permisos. **Postcondición de cierre o vencimiento:** acceso eliminado de esa pestaña y vistas privadas bloqueadas. Conservamos los resultados de verificación en el PR y en **Testing** de REN-2.

## HU-03 — Requisitos de publicación

**HU-03 / [REN-3](https://rentsmartpsf.atlassian.net/browse/REN-3):** como propietario, quiero publicar un espacio con sus características y condiciones para que otras personas puedan encontrarlo y arrendarlo. Fuente: `Historias de usuario.pdf`, pp. 8–9; prioridad alta, dependiente de HU-02. Los rangos y el contrato están en [HU-03](HU-03.md).

| ID | Requisito verificable | Fuente / criterio |
| --- | --- | --- |
| RF-PUB-01 | El formulario recibe los datos y fotos de publicación e inicia un horario editable de 09:00–18:00 | PDF pp. 8–9, CA-01/02 |
| RF-PUB-02 | Formulario y API rechazan datos fuera de los rangos comunes, sin persistir una publicación inválida | PDF p. 4 y pp. 8–9, CA-02 |
| RF-PUB-03 | Una solicitud válida crea un espacio persistido, con UUID, propietario autenticado y estado activo | PDF p. 9, CA-03/04 |
| RF-PUB-04 | Se previsualizan de una a tres URLs HTTPS y se muestra un reemplazo si la foto no carga | PDF pp. 3–4 y 9, CA-05 |
| RF-PUB-05 | El envío pendiente evita el doble clic; un error conserva datos y permite reintentar sin anunciar éxito | PDF p. 9, CA-06 |
| RF-PUB-06 | La publicación confirmada se muestra y sus datos se recuperan al recargar la vista privada | PDF p. 9, CA-07 |
| RN-PUB-01 | El precio por hora es un entero en CLP; el tipo pertenece a las tres categorías propuestas | PDF p. 2, RN-05/06 |
| RN-PUB-02 | La apertura y el cierre son horas enteras de un mismo día, con apertura menor que cierre | PDF p. 2, RN-07; p. 4 |
| RNF-PUB-01 | Propietario, identificador y estado inicial se deciden en el servidor; la recuperación privada exige esa cuenta propietaria | PDF p. 9, CA-03/04; lectura privada de CA-07 |

## UC-03 — Publicar un espacio

Actor principal: cuenta autenticada que publica. Precondiciones del flujo exitoso: sesión vigente, API y PostgreSQL disponibles. Disparador: seleccionamos **Publicar espacio**. Fuente: PDF de historias, pp. 8–9; esquema de caso de uso de Requerimientos 2/2, p. 14.

1. Completamos los datos, revisamos las fotos y ajustamos el horario inicial si corresponde.
2. Validamos el formulario y enviamos la solicitud autenticada; bloqueamos los envíos repetidos mientras está pendiente.
3. El servidor valida los datos, obtiene el propietario de la sesión y guarda una publicación activa.
4. Mostramos la confirmación y el espacio; al recargar recuperamos los datos persistidos con la cuenta propietaria.

**Alternativas:** datos inválidos muestran errores por campo; sesión ausente o vencida solicita iniciar sesión; una foto inaccesible muestra reemplazo; un fallo de red o persistencia conserva el formulario y permite reintentar. No anunciamos éxito sin confirmación del servidor.

**Postcondición exitosa:** espacio activo asociado a la cuenta real y recuperable desde PostgreSQL. **Postcondición de rechazo:** la solicitud inválida o no autorizada no crea una publicación. El catálogo y el listado completo pertenecen a otras historias; incorporamos la edición mediante HU-04. Registramos la revisión y los resultados en el PR y en **Testing** de REN-3.

## HU-04 — Requisitos de edición

**HU-04 / [REN-4](https://rentsmartpsf.atlassian.net/browse/REN-4):** como propietario, quiero editar los datos de mi espacio para mantener actualizada la publicación. Fuente: `Historias de usuario.pdf`, p. 9; prioridad alta y dependencia HU-03. Detallamos el contrato en [HU-04](HU-04.md).

| ID | Requisito verificable | Fuente / criterio |
| --- | --- | --- |
| RF-EDI-01 | Cargamos los datos actuales antes de editar y aplicamos las validaciones de creación | PDF p. 9, CA-01 |
| RF-EDI-02 | Solo el propietario actualiza; la solicitud no cambia UUID, dueño ni estado | PDF p. 9, CA-02/05 |
| RF-EDI-03 | Guardar actualiza todos los datos juntos y la siguiente consulta refleja el cambio | PDF p. 9, CA-03 |
| RF-EDI-04 | Las reservas existentes conservan precio unitario e importe después de cambiar la tarifa del espacio | PDF p. 9, CA-04; RN-12 |
| RF-EDI-05 | Un horario incompatible con reservas vigentes rechaza también los demás cambios de la misma solicitud | PDF p. 9, CA-06; HU-11 pp. 13–14 |
| RF-EDI-06 | Cancelar vuelve al espacio sin enviar una actualización | PDF p. 9, CA-07 |
| RN-EDI-01 | La vigencia depende de estado y tiempo: pendiente no vencida o pagada no finalizada | PDF p. 14, HU-11 CA-04/05 |
| RNF-EDI-01 | Una validación fallida o un error de persistencia conserva la publicación anterior y las reservas | PDF p. 9, CA-03/06 |

## UC-04 — Editar un espacio propio

Actor principal: cuenta propietaria autenticada. Precondiciones: espacio existente y servicios disponibles. Disparador: seleccionamos **Editar espacio** desde su vista privada.

1. Recuperamos los datos actuales y completamos los cambios en el formulario.
2. Guardamos los datos o cancelamos para volver al espacio sin modificarlos.
3. Al guardar, el servidor comprueba el propietario, los campos y las reservas vigentes dentro de la transacción de edición.
4. Confirmamos el guardado y consultamos el espacio actualizado; conserva identidad, estado y condiciones monetarias de sus reservas.

**Alternativas:** datos inválidos o un horario incompatible muestran errores y conservan el formulario; acceso ajeno se deniega; un error permite reintentar. No anunciamos éxito antes de confirmar el servidor.

**Postcondición exitosa:** datos del espacio actualizados conjuntamente. **Postcondición de rechazo o cancelación:** publicación anterior intacta. HU-12 integra la creación de reservas y comprueba su concurrencia con la edición mediante solicitudes reales. Conservamos los casos y resultados en **CP**, **Testing** y el PR de REN-4.

## HU-05 — Requisitos de estado de publicación

**HU-05 / [REN-5](https://rentsmartpsf.atlassian.net/browse/REN-5):** como propietario, quiero activar o desactivar mi publicación para controlar cuándo recibo reservas nuevas. Fuente: `Historias de usuario.pdf`, p. 10; prioridad alta, dependencia HU-03. Detallamos el contrato y las integraciones pendientes en [HU-05](HU-05.md).

| ID | Requisito verificable | Fuente / criterio |
| --- | --- | --- |
| RF-EST-01 | Mostramos el estado actual y una acción explícita; confirmamos el cambio solo después de la respuesta del servidor | PDF p. 10, CA-01 |
| RF-EST-02 | La consulta pública excluye inactivos/retirados e incluye una reactivación válida | PDF p. 10, CA-02/04 |
| RF-EST-03 | Reactivamos una desactivación propia solo con datos de publicación válidos | PDF p. 10, CA-04 |
| RF-EST-04 | Rechazamos la reactivación de un retiro administrativo y no eliminamos esa bandera al editar | PDF p. 10, CA-05; HU-18 p. 20 |
| RF-EST-05 | Solo el propietario establece el estado; la API acepta únicamente un booleano y repetirlo conserva el mismo resultado | PDF p. 10, CA-06 |
| RN-EST-01 | Cambiar el estado conserva todos los datos de las reservas existentes | PDF p. 3, RN-14; p. 10, CA-03 |
| RN-EST-02 | Una nueva reserva consulta el estado actual bajo el bloqueo del espacio y rechaza inactivos/retirados | PDF p. 10, CA-02; integración comprobada en HU-12 |
| RNF-EST-01 | Un fallo de persistencia revierte el cambio; un fallo de interfaz permite reintentar sin anunciar éxito | Continuidad de RT-02/03 y robustez del recorrido |

La comprobación de estado y la consulta pública se prueban con PostgreSQL real. HU-12 comprueba la creación concurrente frente a desactivación y conserva la confirmación privada individual después del cambio; HU-13 añade el panel del arrendatario. CA-03 mantiene pendientes el panel del propietario, pago y cancelación de HU-14 a HU-16.

## UC-05 — Activar o desactivar una publicación propia

Actor principal: cuenta propietaria autenticada. Precondiciones: espacio existente y servicios disponibles. Disparador: seleccionamos la acción de estado desde el espacio propio.

1. Cargamos el estado actual y mostramos la acción correspondiente.
2. Solicitamos un estado explícito; bloqueamos el doble envío mientras esperamos.
3. El servidor bloquea la fila, comprueba propiedad y, al activar, ausencia de retiro y datos válidos; guarda sin modificar reservas.
4. Mostramos el estado confirmado; la siguiente consulta pública refleja su visibilidad.

**Alternativas:** un retiro impide activar; datos inválidos requieren corregir la publicación; otra cuenta recibe denegación; un fallo permite reintentar. **Postcondición exitosa:** estado solicitado persistido y reservas anteriores intactas. **Postcondición fallida:** ningún cambio desde la solicitud rechazada. Conservamos la revisión, casos, resultados y dependencias en **CP**, **Testing** y el PR de REN-5.

## HU-06 — Requisitos de eliminación

**HU-06 / [REN-6](https://rentsmartpsf.atlassian.net/browse/REN-6):** como propietario, quiero eliminar un espacio que nunca recibió reservas para retirar publicaciones que ya no quiero conservar. Fuente: `Historias de usuario.pdf`, pp. 10–11; prioridad alta, dependencia HU-03. Detallamos el contrato en [HU-06](HU-06.md).

| ID | Requisito verificable | Fuente / criterio |
| --- | --- | --- |
| RF-ELI-01 | La confirmación identifica el espacio; cancelar no envía DELETE ni modifica datos | PDF p. 10, CA-01 |
| RF-ELI-02 | Un espacio sin ninguna reserva se elimina físicamente y las consultas posteriores no lo encuentran | PDF p. 10, CA-02 |
| RF-ELI-03 | Cualquier reserva histórica impide eliminar; ofrecemos desactivar mediante una acción explícita | PDF p. 10, CA-03 |
| RF-ELI-04 | Solo el propietario elimina, incluso frente a otra cuenta administrativa | PDF p. 10, CA-04 |
| RN-ELI-01 | Canceladas, vencidas y finalizadas también cuentan como historial que debe conservarse | PDF p. 3, RN-15; p. 10, CA-03 |
| RNF-ELI-01 | La consulta de reservas y la eliminación comparten transacción y bloqueo; la FK evita referencias huérfanas | PDF p. 11, CA-05 |
| RNF-ELI-02 | Un fallo revierte la eliminación; la interfaz evita duplicados y no anuncia éxito sin confirmar | Robustez del recorrido; CA-01/02 |

Comprobamos originalmente la carrera con un escritor de reservas de prueba y PostgreSQL real. HU-12 añade solicitudes reales de creación y eliminación en ambos órdenes, conservando el mismo bloqueo hasta confirmar reserva y pago o borrado.

## UC-06 — Eliminar un espacio propio sin reservas

Actor principal: cuenta propietaria autenticada. Precondiciones del éxito: espacio existente sin ninguna reserva, API y PostgreSQL disponibles. Disparador: seleccionamos **Eliminar espacio** en su vista privada.

1. Identificamos el espacio en la confirmación y permitimos cancelar sin cambios.
2. Al confirmar, enviamos DELETE y bloqueamos acciones competidoras mientras esperamos.
3. El servidor bloquea la fila, comprueba el propietario y toda reserva histórica y elimina en una única transacción.
4. Tras confirmar `204`, volvemos a Mis espacios y mostramos la eliminación; GET privado posterior recibe `404` y la consulta pública lo excluye.

**Alternativas:** reservas existentes reciben `409` y se conserva el historial; el propietario puede elegir **Desactivar y conservar** mediante HU-05. Una cuenta ajena recibe denegación. Un fallo permite reintentar sin confirmar éxito. **Postcondición exitosa:** espacio eliminado sin reservas huérfanas. **Postcondición de rechazo o cancelación:** espacio y reservas intactos. Conservamos los casos y resultados en **CP**, **Testing** y el PR de REN-6.

## HU-08 — Requisitos del catálogo

**HU-08 / [REN-8](https://rentsmartpsf.atlassian.net/browse/REN-8):** como persona interesada en arrendar, quiero explorar un catálogo de espacios publicados para conocer la oferta disponible. Fuente: `Historias de usuario.pdf`, pp. 11–12; prioridad alta, dependencias HU-03/05. Contrato y alcance en [HU-08](HU-08.md).

| ID | Requisito verificable | Fuente / criterio |
| --- | --- | --- |
| RF-CAT-01 | Visitantes y cuentas autenticadas consultan solo publicaciones activas no retiradas | PDF p. 12, CA-01 |
| RF-CAT-02 | Tarjetas con nombre, foto principal, tipo, comuna, capacidad y precio CLP/h, con enlace al detalle | PDF p. 12, CA-02; ampliado por HU-10 |
| RF-CAT-03 | Distinguimos carga, lista vacía y fallo; el error permite reintentar | PDF p. 12, CA-04 |
| RF-CAT-04 | Una foto inaccesible muestra reemplazo y las tarjetas no exponen datos privados | PDF p. 12, CA-05 |
| RN-CAT-01 | Una publicación visible no garantiza disponibilidad para una fecha y hora | PDF p. 12, CA-03 |
| RN-CAT-02 | El conjunto pequeño de demostración se lista completo sin paginación ni promesa de capacidad masiva | PDF p. 12, CA-06 |

## UC-08 — Explorar publicaciones

Actor principal: visitante o cuenta autenticada. Precondiciones del éxito: API y PostgreSQL disponibles; no exige sesión. Disparador: seleccionamos **Explorar catálogo**.

1. Consultamos las publicaciones actuales y mostramos carga mientras esperamos.
2. Presentamos tarjetas o un mensaje de lista vacía; explicamos el alcance de disponibilidad.
3. El enlace solicita de nuevo el espacio visible y abre su resumen público; podemos volver al catálogo y renovar la consulta.

**Alternativas:** fallo de consulta o respuesta inválida muestra error con reintento; foto inaccesible muestra reemplazo; una URL antigua de un espacio inactivo, retirado o eliminado recibe `404`. **Postcondición:** datos públicos consultados sin modificar publicaciones ni reservas. HU-09 añade filtros básicos y mantiene pendiente el filtro temporal; HU-10 amplía el detalle y HU-12 conecta su selección con la creación de reservas. Registramos casos y resultados en **CP**, **Testing** y el PR de REN-8.

## HU-09 — Búsqueda, filtros y orden parcial

**HU-09 / [REN-9](https://rentsmartpsf.atlassian.net/browse/REN-9):** como persona interesada en arrendar, quiero buscar y filtrar espacios por mis necesidades para encontrar opciones adecuadas y comparar precios. Fuente: `Historias de usuario.pdf`, pp. 12–13; prioridad alta, dependencia HU-08 y HU-11/12 para el filtro temporal. Contrato y límites en [HU-09](HU-09.md).

| ID | Requisito verificable | Fuente / criterio |
| --- | --- | --- |
| RF-BUS-01 | Buscamos coincidencias parciales en nombre o descripción sin distinguir mayúsculas; texto vacío no restringe | CA-01 |
| RF-BUS-02 | Filtramos por igualdad de tipo y comuna, ignorando mayúsculas y espacios exteriores de la comuna | CA-02 |
| RF-BUS-03 | Precios mínimo/máximo inclusivos, enteros no negativos; capacidad mínima entera entre 1 y 100 | CA-02; CA-05 parcial |
| RF-BUS-04 | Combinamos con AND solo filtros completados e informamos valores inválidos o rango de precio invertido | CA-03; CA-05 parcial |
| RF-BUS-05 | Ordenamos precio ascendente/descendente con desempate por UUID; por defecto conservamos el orden estable por identificador del backend | CA-07; no implica orden cronológico |
| RF-BUS-06 | Limpiar restaura catálogo y orden predeterminado; una búsqueda sin coincidencias conserva los filtros | CA-08 |

Aplicamos estos filtros en el cliente al conjunto pequeño completo de HU-08 y añadimos `description` al contrato de lectura del frontend. Conservamos `GET /api/spaces` sin parámetros ni cambios de backend o migraciones. CA-01/02/03/07/08 quedan cubiertos en este alcance; CA-05 es parcial. CA-04/06 y la validación de intervalos de CA-05 requieren disponibilidad y reservas de HU-11/12. HU-09 permanece parcial y no garantiza que una publicación esté libre en un horario concreto.

Probamos estas reglas y sus mensajes con Jest/React Testing Library y HTTP simulado. Conservamos los resultados de ejecución y la revisión del código en el PR. Las E2E se reservan para la entrega 3.

## HU-10 — Detalle del espacio

**HU-10 / [REN-10](https://rentsmartpsf.atlassian.net/browse/REN-10):** como persona interesada en un espacio, quiero ver su información completa para decidir si cumple lo que necesito antes de reservar. Fuente: `Historias de usuario.pdf`, p. 13; prioridad alta y dependencias HU-03/08. Contrato en [HU-10](HU-10.md).

| ID | Requisito verificable | Fuente / criterio |
| --- | --- | --- |
| RF-DET-01 | Mostramos todos los datos, todas las fotos, tarifa CLP/h y horario diario en Santiago | CA-01/05 |
| RF-DET-02 | Visitante puede consultar e iniciar sesión con retorno al mismo espacio, conservado al recargar el login | CA-02 |
| RF-DET-03 | Inactivos/retirados solo son consultables por dueño o administrador, con aviso y sin controles de reserva | CA-03 |
| RF-DET-04 | Identificamos el espacio propio sin exponer identidad del dueño y lo excluimos de la selección; la API rechaza reservarlo | CA-04; integración comprobada en HU-12 |
| RF-DET-05 | Mostramos selección de fecha y horas dentro del horario con estimación; comprobamos disponibilidad antes de confirmar | CA-05; creación y validación definitiva implementadas en HU-12 |
| RF-DET-06 | Una foto fallida muestra reemplazo y conserva los datos y otras fotos | CA-06 |

La consulta autenticada añade únicamente estado y relación de la cuenta; no concede permisos de editar, activar o eliminar a administradores ajenos. Las pruebas comprueban permisos directos y contrato con PostgreSQL; interfaz y retorno de sesión con HTTP simulado. Conservamos resultados en el PR y las E2E para entrega 3.

## HU-11 — Definir el horario disponible

**HU-11 / [REN-11](https://rentsmartpsf.atlassian.net/browse/REN-11):** como propietario, quiero definir la apertura y el cierre diarios de mi espacio para recibir reservas solo dentro de las horas en que puedo ofrecerlo. Fuente: `Historias de usuario.pdf`, pp. 13–14; prioridad alta, dependencia HU-03. Contrato, casos y alcance en [HU-11](HU-11.md).

| ID | Requisito verificable | Fuente / criterio |
| --- | --- | --- |
| RF-HOR-01 | Configuramos apertura y cierre al publicar o editar y explicamos su aplicación diaria en Santiago | CA-01 |
| RN-HOR-01 | Exigimos horas enteras con `0 ≤ apertura < cierre ≤ 23`, sin cruce de medianoche | CA-02 |
| RF-HOR-02 | Validamos un intervalo en el mismo día de Santiago, con inicio desde apertura y término hasta cierre; aceptamos límites exactos | CA-03; servicio compartido e integración API HU-12 |
| RF-HOR-03 | Rechazamos el cambio que excluya pendientes vigentes o pagadas no finalizadas, sin modificar publicación ni reservas | CA-04 |
| RN-HOR-02 | Canceladas, expiradas, finalizadas y pendientes vencidas por tiempo no bloquean un cambio | CA-05 |
| RF-HOR-04 | Solo el propietario modifica el horario; las consultas públicas no incluyen identidades ni reservas privadas | CA-06 |
| RNF-HOR-01 | Un bloqueo común serializa el cambio de horario y el escritor de reserva; ninguno deja una reserva fuera del horario confirmado | CA-07; comprobación con escritor de prueba y API real de HU-12 |

Reutilizamos publicación y edición, las columnas de horario y las migraciones existentes. Compartimos las reglas en `app/availability.py`; HU-12 adquiere la misma guardia del espacio, lee la hora después de esperar y conserva el bloqueo hasta guardar reserva y pago. Probamos ambos órdenes de concurrencia y estados temporales efectivos. Los filtros temporales del catálogo de HU-09 siguen pendientes. Las E2E se reservan para la entrega 3.

## HU-12 — Reservar un horario disponible

**HU-12 / [REN-12](https://rentsmartpsf.atlassian.net/browse/REN-12):** como arrendatario, quiero reservar un espacio para una fecha y horario disponibles para asegurar un lugar para mi actividad. Fuente: `Historias de usuario.pdf`, pp. 14–15; prioridad alta, dependencias HU-02/10/11. Contrato, casos y límites en [HU-12](HU-12.md).

| ID | Requisito verificable | Fuente / criterio |
| --- | --- | --- |
| RF-RES-01 | Elegimos fecha y horas con duración y total estimado; confirmamos los valores calculados por backend | CA-01 |
| RN-RES-01 | Exigimos 1–8 horas enteras del mismo día en Santiago, dentro del horario, con inicio futuro y hasta 90 días inclusive | CA-02; RN-07/08 |
| RF-RES-02 | Solo reservamos publicaciones activas no retiradas de otra cuenta, según el estado actual del servidor | CA-03/10 |
| RN-RES-02 | Evitamos superposiciones con pendientes vigentes y pagadas vigentes, permitiendo intervalos consecutivos | CA-04; RN-10/11 |
| RF-RES-03 | Guardamos cuenta, espacio, intervalo, duración, precio, total, creación, estado y plazo junto con un pago pendiente único | CA-05; RN-12/20 |
| RNF-RES-01 | Bloqueamos el espacio y validamos/guardamos en una transacción; dos solicitudes idénticas producen una reserva y un conflicto | CA-06 |
| RNF-RES-02 | La API obtiene la cuenta de sesión y calcula precio, estado y vencimiento; rechaza campos manipulables adicionales | CA-07 |
| RF-RES-04 | Mostramos identificador, fecha, horas, total, estado y plazo; la confirmación persiste mediante consulta privada al recargar | CA-08 |
| RN-RES-03 | Las pendientes vencidas liberan disponibilidad por tiempo efectivo, sin exigir actualización previa de la fila | CA-09 |

Comprobamos CA-01 a CA-10 con Jest/React Testing Library y Pytest/PostgreSQL, incluyendo solicitudes reales de reserva contra otra reserva, edición, desactivación y eliminación. HU-13 incorpora el panel del arrendatario; HU-14 mantiene pendiente el del propietario. El pago pendiente es un registro persistido; aprobar o rechazar pagos corresponde a HU-16. El filtro temporal de HU-09 requiere integración adicional en catálogo.

## HU-13 — Consultar mis reservas y pagos

**HU-13 / [REN-13](https://rentsmartpsf.atlassian.net/browse/REN-13):** como arrendatario, quiero consultar mis reservas y el estado de sus pagos para conocer pendientes e historial. Fuente: `Historias de usuario.pdf`, pp. 15–16; prioridad alta, dependencia HU-12 y HU-16 para resultados de pago. Contrato y decisiones en [HU-13](HU-13.md).

| ID | Requisito verificable | Fuente / criterio |
| --- | --- | --- |
| RF-MRES-01 | Consultamos solo reservas de la cuenta autenticada con espacio, intervalo, duración, importes y estados | CA-01/06 |
| RN-MRES-01 | Expiración y finalización usan una misma hora del servidor y la lógica compartida con HU-12 | CA-02 |
| RF-MRES-02 | Indicamos elegibilidad temporal para pagar/cancelar; ocultamos opciones terminales o ya iniciadas | CA-03, parcial hasta HU-15/16 |
| RF-MRES-03 | Mostramos el vencimiento y actualizamos los estados mediante una nueva consulta privada | CA-04 |
| RN-MRES-02 | Conservamos contrato e historial después de editar, desactivar o retirar el espacio, incluidos legados sin pago | CA-05 |
| RF-MRES-04 | Distinguimos carga, vacío y error con reintento; ordenamos vigentes primero e historial después | CA-07 |
| RNF-MRES-01 | Listado y detalle aplican permiso en SQL y no exponen identidades privadas ni errores internos | CA-01/06; RT-03/05 |

Usamos una consulta que une reserva y espacio y conserva reservas sin pago mediante unión opcional. No modificamos el contrato ni el estado guardado al leer, ni necesitamos una nueva migración. Separamos lectura histórica y validación estricta de creación para presentar minutos, fracciones e importes anteriores sin imponerles de nuevo reglas de una reserva nueva.

CA-01/02/04/05/06/07 quedan en el alcance de consulta. CA-03 conserva pendientes los endpoints y recorridos efectivos de cancelación y pago: los botones elegibles se presentan deshabilitados con explicación. HU-15/16 deberán revalidar tiempo y permisos dentro de sus transacciones; no declaramos rechazo de acciones ilegales por una API todavía inexistente. Conservamos pruebas, revisión y resultados en la PR, y reservamos Playwright para la entrega 3.
