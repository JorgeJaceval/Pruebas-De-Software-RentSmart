# Guion de la cápsula de entrega 3

Cubre los cinco puntos que pide la pauta (§5.2): alcances de la solución, herramienta E2E y cómo corre, paso a paso del trabajo, integración con el pipeline y ejecución automática, y problemas con sus soluciones. Duración objetivo: **10 minutos** (unas 1.300 palabras de narración). El video publicado y su comprobación de acceso se registran al cerrar; este guion no es la grabación.

## Antes de grabar

- Grabar sobre el release `v3.0-entrega3` integrado en `main`, con su CI en verde. Si se graba antes, se muestra la [PR #49](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/pull/49) y se dice que el release está en revisión.
- Tener lista una ejecución de `bash scripts/run-e2e.sh` (tarda varios minutos) y su reporte HTML (`npx playwright show-report frontend/test-results/e2e/run-*/report`).
- Tener abiertos: la aplicación publicada, `frontend/e2e/spaces.spec.ts`, `scripts/run-e2e.sh`, `.github/workflows/ci.yml`, la [CI #44947226199](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/44947226199), la [sonda de fallo #44828331317](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/44828331317), el canal `#rentsmart-ci`, Jira (épica REN-85) y la [Wiki Entrega 3](wiki/Entrega-3.md).
- No mostrar `.env`, claves, el webhook de Slack ni tokens. Usar solo cuentas ficticias.

## Recorrido y narración

### 0:00–1:00 · Presentación y alcances

*Pantalla:* portada de la aplicación y tabla de la §1 de la Wiki.

> «Hola, somos el equipo de RentSmart, una plataforma para publicar y reservar espacios por horario. En esta tercera entrega sumamos pruebas de interfaz end-to-end y las integramos al pipeline: cada cambio en el repositorio levanta la aplicación completa, la recorre con un navegador real y, si una prueba falla, el build queda en FAIL y no se despliega. Además cerramos los requisitos finales del backlog: el arrendatario puede cancelar sus reservas, el catálogo filtra por fecha y horario, la administración puede retirar y restituir publicaciones, y al publicar un espacio se puede pedir una sugerencia de descripción con IA.»

### 1:00–1:45 · Demostración rápida

*Pantalla:* filtrar el catálogo por fecha y horario, cancelar una reserva en «Mis reservas», pulsar «Sugerir descripción». Para la moderación, si no hay una cuenta administradora en producción, mostrar la traza de E3-15 en el reporte.

> «Así se ven en la aplicación. La sugerencia con IA está integrada, pero ni la CI ni el servidor tienen clave de Gemini: la aplicación informa que no está disponible y se puede escribir la descripción a mano. La evidencia de una llamada real, el criterio CA-08, queda pendiente.»

### 1:45–2:45 · Herramienta E2E

*Pantalla:* `spaces.spec.ts`, señalando `getByRole` y `getByLabel`.

> «Elegimos Playwright con TypeScript y Chromium, una de las alternativas a Selenium que permite la pauta y que no habíamos usado. Comparte lenguaje con el frontend, espera los estados de la página sin pausas fijas, corre headless y genera reportes HTML, JUnit, capturas y trazas. Ubicamos los elementos por rol y etiqueta, como los ve el usuario, y no por clases CSS, lo que hace las pruebas más estables. Para el pipeline mantuvimos GitHub Actions, la herramienta de la entrega 2, en vez de Jenkins: ya concentraba build, pruebas, despliegue y Slack, y cumple lo mismo que pide la pauta. Esa decisión la presentamos al profesor.»

### 2:45–3:30 · Paso a paso del trabajo

*Pantalla:* Jira con la épica REN-85 y las tarjetas REN-86 a REN-92; la lista de PR #38 a #49 en GitHub.

> «Trabajamos con Kanban y GitFlow, igual que en las entregas anteriores. Primero planificamos y armamos la matriz de casos; luego montamos el entorno de Playwright, escribimos la suite crítica, la conectamos a la CI y demostramos un fallo controlado. Cada requisito final llegó en su propia rama con sus pruebas. Cada tarea tiene su rama y su PR con la clave de Jira, y nada entra a develop sin la CI en verde. Al final hicimos el release a main.»

### 3:30–4:30 · Set de pruebas

*Pantalla:* tabla de la §3 de la Wiki y la carpeta `frontend/e2e/`.

> «Tenemos 19 pruebas en 16 casos, sobre el mínimo de 10 que recomienda la pauta. Cubren login y permisos; el CRUD completo de espacios: crear, listar, ver detalle, editar y eliminar; validaciones y mensajes de error; búsqueda y filtros, incluido el de fecha y horario; la reserva, el pago simulado y las cancelaciones; la moderación administrativa y el caso de la IA sin proveedor. Cada prueba crea sus propias cuentas y datos con identificadores aleatorios, así que ninguna depende de otra ni del orden, y toda la ejecución usa una base PostgreSQL temporal que se destruye al terminar.»

### 4:30–5:45 · Cómo corre en local

*Pantalla:* `scripts/run-e2e.sh`, la ejecución preparada y el reporte HTML con un caso abierto.

> «En local basta un comando: `bash scripts/run-e2e.sh`. El script crea un proyecto de Docker Compose con nombre y contraseñas aleatorias, construye las imágenes de producción, aplica las migraciones y levanta Caddy, la API y PostgreSQL en un puerto libre. Comprueba que la aplicación esté lista, exporta `BASE_URL` y ejecuta Playwright headless. Al terminar, pase o falle, guarda los registros y elimina contenedores, volúmenes e imágenes. Aquí están las 19 en verde, y en el reporte se ve cada paso de un caso.»

### 5:45–7:00 · Integración con el pipeline

*Pantalla:* `ci.yml` con el job `e2e`; la ejecución #44947226199, su resumen y el artefacto `e2e-results`.

> «En la CI, el job `e2e` corre en cada pull request y en cada push a develop y main. Va después de las pruebas de frontend y backend, en paralelo con el smoke de infraestructura. El job `quality`, obligatorio en la protección de ramas, falla si E2E no aprueba, y el despliegue a Azure exige E2E aprobado: una prueba E2E rota bloquea el merge y la publicación. Cada ejecución sube un artefacto con el reporte HTML, el JUnit y los registros, y en los fallos, capturas y trazas. La CI deja vacía la clave de Gemini para no depender de un servicio externo.»

### 7:00–8:00 · Fallo controlado y Slack

*Pantalla:* la sonda #44828331317 con `e2e` y `quality` en rojo y el despliegue omitido; su captura o traza; `#rentsmart-ci` con un mensaje de ÉXITO y el de FALLO.

> «Para demostrar que el pipeline falla de verdad no pusimos un simple `exit 1`: lanzamos una sonda que es una aserción real de Playwright, deliberadamente falsa. Los demás casos aprueban, esa aserción falla, `e2e` y `quality` quedan en rojo y el despliegue se omite. En Slack, el canal rentsmart-ci recibe el resultado de cada ejecución: ÉXITO en una normal y FALLO en la sonda.»

### 8:00–9:15 · Problemas y soluciones

*Pantalla:* tabla de la §7 de la Wiki.

> «Los principales problemas: la configuración apuntaba a localhost fijo; ahora `BASE_URL` es obligatoria y rechaza destinos que no sean locales, para no correr nunca contra producción. Las pruebas compartían datos; les dimos datos únicos y una base temporal, y comprobamos la independencia repitiendo la suite en paralelo. Las fotos dependían de servidores externos, así que aislamos solo esa imagen. Una prueba fallaba por el cambio de horario de verano; corregimos el dato de prueba, no la regla de negocio. La moderación necesitaba un administrador, que creamos solo en la base temporal. Y en la sugerencia con IA, las revisiones adversarias encontraron un tiempo de espera sin mensaje, un plazo que no era total y la falta de un límite por usuario, entre otros; cada corrección quedó con su prueba de regresión.»

### 9:15–10:00 · Cierre

*Pantalla:* `main`, el tag y el Release `v3.0-entrega3`; la §8 de la Wiki.

> «El release `v3.0-entrega3` queda en main, con la CI en verde y el despliegue verificado. Quedan pendientes la evidencia real de Gemini, un campo de estimación estructurado en Jira y la validación docente de Actions en vez de Jenkins. Usamos Codex y Claude Code como apoyo para implementar, probar y documentar. Desde la PR #48, sin la revisión de un compañero disponible, cada PR tuvo revisiones adversarias de subagentes de IA publicadas en GitHub; no reemplazan la revisión de un integrante y lo dejamos registrado. Todo está documentado en la Wiki Entrega 3. Gracias.»

Si la narración se alarga, acortar primero la demostración (1:00–1:45) o la lista de problemas.

## Evidencias para abrir

| Evidencia | Enlace |
| --- | --- |
| Primera ejecución automática | [#44822253194](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/44822253194) |
| Ejecución normal comparable | [#44828334713](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/44828334713) |
| Fallo controlado | [#44828331317](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/44828331317) y [registro con captura](evidencias/REN-90-fallo-e2e-2026-11-20.md) |
| HU-17 integrada (19 E2E, 185 Jest, 273 Pytest) | [#44947226199](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/44947226199) |
| Release | [PR #49](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/pull/49) y [Release `v3.0-entrega3`](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/releases/tag/v3.0-entrega3) |
