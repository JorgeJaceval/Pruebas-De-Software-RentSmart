# Guion del video de la entrega 3

Diez minutos. Cubre lo que pide la pauta (§5.2): alcances, herramienta E2E y cómo corre, paso a paso, integración con el pipeline y problemas con sus soluciones.

## Antes de grabar

- App local con datos de demostración y `GEMINI_API_KEY` en `.env`: `docker compose up --build -d --wait` y abrir <http://localhost:5173>. Usar solo cuentas ficticias: una propietaria, un arrendatario con reservas y una administradora.
- Reporte E2E listo: correr `bash scripts/run-e2e.sh` (en Git Bash: `MSYS2_ARG_CONV_EXCL=/app bash scripts/run-e2e.sh`) y abrir el reporte con `npx playwright show-report frontend/test-results/e2e/run-<id>/report`.
- Pestañas: [Wiki Entrega 3](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/wiki/Entrega-3), `frontend/e2e/spaces.spec.ts`, `scripts/run-e2e.sh`, `.github/workflows/ci.yml`, la [CI del release](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/45093776011), el [fallo controlado](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/44828331317), el [Release](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/releases/tag/v3.0-entrega3), Slack `#rentsmart-ci` y Jira (épica REN-85).
- No mostrar archivos `.env`, claves ni el webhook de Slack.

## Guion

### 0:00–0:45 · Presentación

*Pantalla:* README en GitHub con el badge verde.

> «Hola, somos Jorge Aceval y Joaquín Viveros, del equipo RentSmart. RentSmart sirve para publicar espacios, como salas u oficinas, y reservarlos por horario. En esta entrega agregamos pruebas end-to-end con Playwright y las metimos al pipeline. Ahora cada cambio levanta la app completa, la prueba con un navegador real y, si algo falla, no se integra ni se despliega. También terminamos las últimas historias del backlog.»

### 0:45–2:00 · Lo nuevo en la app

*Pantalla:* la app local.
1. Catálogo: filtrar por fecha y horario.
2. Entrar como el arrendatario, ir a Mis reservas y cancelar la reserva pendiente.
3. Entrar como la propietaria, abrir Publicar espacio, completar nombre, tipo, comuna, capacidad y condiciones, pulsar «Sugerir descripción con IA», editar un poco el texto y usarlo.
4. Entrar como la administradora y retirar una publicación con un motivo.

> «Primero, el catálogo ahora filtra por fecha y horario, y solo muestra los espacios libres en ese tramo. Segundo, el arrendatario puede cancelar su reserva desde Mis reservas; si ya pagó, el reembolso se simula. Tercero, al publicar se puede pedir una descripción sugerida por IA. La app manda a Gemini solo los datos del formulario y la respuesta llega marcada como generada con IA. La puedo usar, editar o descartar; nunca se publica sola. Si no hay clave o la IA falla, la app lo avisa y se escribe a mano. Y cuarto, un administrador puede retirar una publicación con un motivo y después restituirla.»

### 2:00–3:00 · Herramienta y pipeline

*Pantalla:* `spaces.spec.ts` (señalar `getByRole` y `getByLabel`) y luego la tabla Jenkins/Actions de la Wiki §2.

> «Usamos Playwright con TypeScript y Chromium. La pauta lo permite en vez de Selenium y no lo habíamos usado. Está en el mismo lenguaje que el frontend, espera solo a que la página esté lista y busca los elementos como los ve el usuario: por rol y por etiqueta. Corre sin ventana y deja reportes, capturas y trazas.
> En lugar de Jenkins seguimos con GitHub Actions, que ya teníamos funcionando desde la entrega 2. Migrar significaba montar y mantener otro servidor y exponerlo a internet, y volver a probar todo. En esta tabla se ve que cada cosa que haría Jenkins tiene su equivalente en nuestro pipeline.»

### 3:00–3:40 · Cómo trabajamos

*Pantalla:* Jira con REN-85 a REN-92; la lista de PR en GitHub.

> «Seguimos con Kanban en Jira y GitFlow. Partimos por planificar y armar la matriz de casos. Después montamos Playwright, escribimos las pruebas, las conectamos a la CI y probamos un fallo a propósito. Cada historia nueva entró en su propia rama, con sus pruebas, y por PR con la CI en verde. Al final hicimos el release a main.»

### 3:40–4:30 · Las pruebas

*Pantalla:* tabla de casos de la Wiki §3.

> «Son 19 pruebas en 16 casos. Cubren login y permisos, el CRUD completo de espacios, los mensajes de error, la búsqueda y los filtros, la reserva, el pago y las cancelaciones, la moderación y el caso de la IA sin clave. Cada prueba crea sus propias cuentas y datos, así que no dependen unas de otras ni del orden. Además, todo corre sobre una base de datos temporal que se borra al terminar.»

### 4:30–5:40 · Cómo corren en local

*Pantalla:* `scripts/run-e2e.sh`, el final de la corrida (19 passed) y el reporte HTML con un caso abierto.

> «Para correrlas basta un comando: `bash scripts/run-e2e.sh`. El script crea un entorno de Docker con nombre y contraseñas al azar. Después construye la app, aplica las migraciones y la levanta en un puerto libre. Cuando está lista, pasa esa dirección a Playwright como `BASE_URL` y corre las pruebas. Al final borra todo, pase o falle. Aquí están las 19 en verde, y en el reporte se ve cada paso.»

### 5:40–6:50 · En el pipeline

*Pantalla:* `ci.yml` (job `e2e`), la CI del release con sus jobs y el artefacto `e2e-results`, y el Release con los zip adjuntos.

> «En GitHub Actions el job `e2e` corre en cada pull request y en cada push a develop y main. Primero van las pruebas de frontend y backend; después, en paralelo, la E2E y el smoke de contenedores. El job `quality` junta todos los resultados y es obligatorio para hacer merge. El despliegue a Azure también exige que la E2E pase. Esta es la ejecución del release: todo en verde y desplegado. Los reportes quedan como artefacto por 90 días, y los del release están adjuntos al Release, donde no caducan.»

### 6:50–7:50 · Fallo controlado y Slack

*Pantalla:* la ejecución del fallo controlado (`e2e` y `quality` en rojo, `deploy` omitido), su reporte y Slack con un ÉXITO y el FALLO.

> «Para mostrar que el pipeline de verdad falla, no pusimos un `exit 1`. Corrimos una aserción real de Playwright hecha para fallar. La E2E queda en rojo y `quality` también, así que ese cambio no se puede integrar. Y el despliegue exige que la E2E pase, así que tampoco se publicaría. Y en Slack, en el canal rentsmart-ci, llega el resultado de cada ejecución: éxito en una normal y fallo en esta.»

### 7:50–9:10 · Problemas y soluciones

*Pantalla:* tabla de la Wiki §7.

> «Algunos problemas que tuvimos:
> - Playwright apuntaba a localhost fijo. Lo cambiamos a `BASE_URL` y bloqueamos cualquier dirección que no sea local, para no probar nunca contra producción.
> - Las pruebas compartían datos. Cada una tiene ahora los suyos, y lo comprobamos corriendo la suite dos veces en paralelo.
> - Las fotos venían de internet, así que simulamos solo esa imagen.
> - Una prueba de fechas fallaba por el cambio de horario de verano; corregimos el dato de prueba, no la regla.
> - Para probar la moderación necesitábamos un administrador. Lo creamos solo en la base temporal.
> - En la IA, una revisión buscando fallas encontró varios: por ejemplo, que al vencer el tiempo no salía ningún mensaje y que no había límite de uso por persona. Corregimos cada uno con su prueba.
> - Y la CI no debe depender de Gemini, así que corre sin clave. La llamada real la probamos aparte, con un script que deja evidencia sin mostrar la clave.»

### 9:10–10:00 · Cierre

*Pantalla:* Release `v3.0-entrega3` y Wiki §8.

> «La versión v3.0-entrega3 está en main, con la CI en verde y desplegada en Azure. Después de la corrección de la entrega 2, acortamos la documentación, ampliamos la justificación de Actions y dejamos los artefactos adjuntos al Release. Queda pendiente un campo de estimación en Jira. Usamos Codex y Claude Code como apoyo, y todo lo validamos con las pruebas. La documentación está en la Wiki, en la página Entrega 3. Gracias.»

Si el tiempo se alarga, acortar la parte de la app (0:45–2:00) o la lista de problemas.
