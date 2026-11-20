# E2E de entrega 3 — entorno aislado y suite crítica (REN-87/88)

Preparamos Playwright con Chromium para recorrer React compilado → Caddy → FastAPI → PostgreSQL 17. No interceptamos HTTP de la aplicación ni sustituimos el backend por mocks. Aislamos únicamente una foto ficticia externa, `https://e2e-images.invalid/space.svg`, respondiendo con un SVG fijo en el navegador: los casos no dependen de una descarga de imágenes de terceros. El proveedor externo de IA, cuando exista, se aislará por separado.

## Prerrequisitos y ejecución

Usamos Linux con Docker Engine/Compose v2 o superior, Node.js 24 y npm, Git, Bash, OpenSSL, curl y Python 3. Desde la raíz del repositorio:

```bash
cd frontend
npm ci
npx playwright install --with-deps chromium
cd ..
bash scripts/run-e2e.sh
```

La instalación `--with-deps` puede requerir permisos para paquetes del sistema; se realiza en la máquina o runner de pruebas. Para abrir un reporte ya generado:

```bash
cd frontend
npx playwright show-report test-results/e2e/run-XXXXXXXX/report
```

Sustituimos `run-XXXXXXXX` por la carpeta informada por el lanzador. No publicamos esa ruta literal como evidencia de una ejecución real.

## Ciclo de vida y aislamiento

`scripts/run-e2e.sh` crea un nombre aleatorio `rentsmart-e2e-*` y reutiliza el Compose de producción con **otro proyecto, imágenes, red, volúmenes y secretos temporales**. Exporta sus valores explícitamente y utiliza un archivo de entorno vacío: no carga `.env` local ni credenciales del VPS.

Construye API/interfaz desde el árbol de trabajo, levanta PostgreSQL, aplica Alembic upgrade/check, espera salud y verifica versión/readiness. El puerto HTTP se asigna automáticamente en `127.0.0.1`; API y PostgreSQL no publican puertos del host. El entorno de prueba usa HTTP local, sin solicitar certificados ni afirmar verificación del HTTPS público.

El lanzador calcula y exporta `BASE_URL`. La configuración de Playwright exige esa variable y rechaza destinos externos, HTTPS, credenciales y rutas adicionales: el contrato actual es un entorno HTTP local aislado, no ejecutar estas escrituras contra Azure. No inicia Vite ni reutiliza servidores encontrados en puertos fijos.

Cada test recibe un contexto de navegador limpio y una cuenta ficticia distinta con UUID y contraseña aleatoria. La fixture `registeredAccount` usa la API solo para preparar una cuenta cuando el registro no es el comportamiento evaluado. El caso de registro crea la cuenta desde la interfaz. No añadimos endpoints de borrado/reset a la aplicación: los datos se eliminan con el volumen privado al terminar la ejecución. Dentro de una ejecución las filas previas permanecen, pero cada caso usa datos propios, sin depender del orden.

Las trampas EXIT/INT/TERM conservan logs e intentan eliminar únicamente contenedores, red, volúmenes e imágenes del proyecto generado, también ante error. No hacen `system prune`, borrado global de volúmenes ni limpieza de la demo existente. Si falla `compose down`, la ejecución no anuncia éxito. Una terminación forzada del proceso/host puede impedir las trampas: el nombre del proyecto queda en `environment.txt` para inspeccionar sus recursos, sin tocar proyectos ajenos.

## Casos, trazabilidad y límites

| Caso | Acción comprobada por navegador | Historia / criterio relacionado |
| --- | --- | --- |
| E3-01 | Registro e inicio de sesión por UI y conservación de identidad/vista privada al recargar. | REN-1; REN-2 CA-01/03, sesión vigente. |
| E3-02 | Vista privada solicita login; contraseña incorrecta de cuenta existente muestra error y no concede acceso, tampoco al recargar. | REN-2 CA-02 y navegación privada. Cuenta preparada por API. |
| E3-03 | Publicar formulario válido, encontrar en catálogo y consultar detalle. | REN-3 CA-01/03/07, camino válido. |
| E3-04 | Cambiar nombre y precio de publicación propia y comprobar persistencia al recargar. | REN-4 CA-01/03, edición válida. |
| E3-05 | Confirmar eliminación sin reservas; desaparece del panel y catálogo, consulta pública devuelve 404. | REN-6 CA-01, confirmación positiva, y CA-02. |
| E3-06 | Campos obligatorios vacíos y precio 499 producen error; no aparece publicación guardada. | REN-3 CA-02, validaciones de UI seleccionadas. |
| E3-07 | Buscar por nombre sin distinguir mayúsculas, ordenar precio ascendente, combinar tipo/comuna/precio máximo/capacidad mínima y limpiar. | REN-9 CA-01/02/03/07/08, variantes descritas. No incluye filtro temporal. |
| E3-09 | Reserva de dos horas presenta total, confirmación y registro en Mis reservas; API de lectura confirma el importe 20.000. | REN-12 CA-01/05/08; REN-13 CA-01 y acceso al pago de CA-03. |
| E3-10 | Otra cuenta recibe conflicto al solicitar un bloque ya reservado y no obtiene reserva nueva. | REN-12 CA-04, pendiente vigente bloqueante. No demuestra carrera coordinada de CA-06. |
| E3-11 | Rechazar y reintentar pago aprobado por UI; estado, importe y referencia permanecen al recargar. | REN-16 CA-04/05. No se cuenta la recarga como repetición del POST de CA-06. |
| E3-12 | Propietario consulta arrendatario y dos publicaciones; filtro alterna la publicación propia elegida. | REN-14 CA-02/03, selección propia; no prueba el identificador ajeno. |
| E3-13 | Volver sin cancelar conserva pago; confirmar cancelación lleva a historial y persiste reembolso con referencia e importe conservados. | REN-14 CA-05; REN-15 CA-03/05 y estado/historial de CA-04 desde propietario. Auditoría interna no se expone ni verifica por UI. |

Los criterios relacionados indican los comportamientos concretos observados, **no cobertura completa de cada CA o historia**. Las reglas restantes conservan sus pruebas de componentes/API o siguen pendientes según el registro. Usamos API para preparar los datos que no constituyen la acción evaluada: publicación para editar/eliminar, reserva para pagar y pago aprobado para cancelar. Las acciones evaluadas y su lectura visible pasan por navegador real. Algunas comprobaciones adicionales consultan la API real para contrastar persistencia, sin sustituir el recorrido UI.

Esperamos elementos accesibles y resultados observables; no utilizamos pausas fijas. Inicialmente ejecutamos sin reintentos para no ocultar fallos. En CI limitamos a un worker; podemos verificar independencia local con `bash scripts/run-e2e.sh --repeat-each=2 --workers=2`. Las repeticiones no aumentan el número de casos funcionales.

REN-88 amplía de dos a **doce casos de la matriz**, superando el mínimo planificado de diez. E3-08 (filtro temporal), E3-14 (cancelación del arrendatario) y E3-15 (moderación) siguen pendientes de sus funciones. No creamos tests vacíos, omitidos ni mocks de aplicación para contarlos como implementados. REN-89 incorpora la etapa obligatoria y el resultado en Slack; sus resultados reales de CI se registran en PR/Jira. El job `production` sigue siendo smoke sin navegador y no se confunde con el nuevo `e2e`.

## Integración con GitHub Actions — REN-89

El workflow `.github/workflows/ci.yml` conserva los eventos push/PR hacia `develop`/`main` y la ejecución manual. Tras aprobar frontend/backend, `production` (smoke) y `e2e` corren en jobs distintos en paralelo; después `quality` recoge los cuatro resultados con `always()`. E2E instala Node.js 24, dependencias con `npm ci`, Chromium/dependencias con `npx playwright install --with-deps chromium` y ejecuta `bash scripts/run-e2e.sh`.

Actions define `CI=true`: Playwright usa un worker, headless y cero reintentos. El script calcula `BASE_URL` para su ensamblaje temporal; no necesitamos guardarla como variable de repositorio ni reutilizar `DEPLOY_URL`. No proporcionamos claves SSH ni secretos de producción al job E2E.

`deploy` depende de quality, smoke y E2E y exige sus resultados `success`, además de main, evento push/manual y flag habilitado. Un fallo, cancelación u omisión de E2E impide publicar. No usamos `continue-on-error`. `notify` espera también E2E y siempre intenta informar su resultado; E2E omitida sin otro fallo/cancelación produce INCOMPLETO, nunca ÉXITO.

El paso de artefactos se intenta con `always()`, retención **7 días**, nombre **`e2e-results`** y directorio `frontend/test-results/e2e/`. Incluye HTML/JUnit, logs y las trazas/capturas que se hayan generado. Si falla la instalación o el navegador antes de preparar una carpeta puede no existir evidencia Playwright: el job conserva su fallo y los logs de Actions, sin inventar un reporte. El resumen del job enlaza el artefacto cuando se subió; el botón del aviso Slack lleva a la ejecución.

Descargamos y descomprimimos el artefacto para abrir su carpeta `run-*/report` con el visor de Playwright. Las trazas pueden contener credenciales ficticias efímeras; no usamos cuentas reales ni secretos de producción. No confundimos pruebas locales previas con los resultados automáticos: enlazamos SHA y ejecución al registrarlos.

REN-90 incorpora una aserción E2E fallida separada para comprobar el caso negativo; sus resultados reales se enlazan en el registro. Añadir `needs` no se presenta por sí solo como evidencia de esa ejecución. Quality ejecuta la guarda real `scripts/check-quality.sh` y falla si alguno de los cuatro trabajos no terminó en success. Observamos que main y develop ya exigen quality: conservar ese nombre como control final impide que un fallo E2E quede fuera de la protección existente. No modificamos reglas de ramas; puede añadirse e2e como check explícito adicional, pero quality ya recoge su resultado.

## Sonda manual de fallo E2E — REN-90

La suite normal sigue teniendo **12 casos de producto**, sin sonda ni casos omitidos. La configuración excluye `e2e/probes/` salvo que `E2E_FAILURE_PROBE=true`; en ese modo selecciona solo una prueba de infraestructura. No sumamos esa sonda al conteo funcional.

Para ensayar localmente en un entorno nuevo:

```bash
E2E_FAILURE_PROBE=true bash scripts/run-e2e.sh
```

Esperamos salida **1**: Chromium abre el catálogo real y comprueba su encabezado visible. Después registra un marcador y exige mediante `expect(locator).toHaveText` el texto deliberadamente distinto `REN90_EXPECTED_DIFFERENT_HEADING`. No modificamos la aplicación para provocar o esconder el fallo. Se conservan JUnit/HTML, captura y traza, y se limpia el entorno pese al fallo.

En Actions elegimos **Run workflow → rama de prueba → failure_probe=e2e**. La ejecución corre primero los doce casos normales; solo si aprueban corre una segunda invocación del lanzador con la sonda y otra base temporal. La sonda fallida deja e2e rojo, quality falla al recoger ese resultado y notify informa FALLO artificial. Conservamos ambos directorios de resultados dentro de `e2e-results`, siete días. El resumen distingue suite normal, sonda y verificación de su aserción.

`scripts/e2e_probe.py` confirma el marcador, caso único y fallo JUnit con la aserción intencional. Un fallo de navegador/red/preparación, ausencia de marcador, reporte aprobado o corrupto no acredita esa aserción. El resultado se publica como output del step para que Slack distinga sonda solicitada de ejecutada. El lanzador conserva su código de error; no usamos `continue-on-error` ni convertimos la ejecución roja en verde.

Los ensayos se hacen en una rama de prueba sin publicación. Además, deploy exige `failure_probe=none` para una ejecución manual: una sonda solicitada nunca publica, incluso si terminara inesperadamente verde. En una rama de prueba deploy también se omite por la restricción a main. Por eso diferenciamos evidencia observada (e2e/quality fallidos y deploy omitido) de la revisión de sus condiciones: no afirmamos que la omisión observada se deba exclusivamente a una sola guarda ni ejecutamos una publicación de prueba en main.

Para cerrar la revisión conservamos también una ejecución normal aprobada y comprobamos el último commit del PR sin sonda. Las capturas muestran la UI real; el desacuerdo está en la aserción deliberada, no en un cambio defectuoso del producto.

## Evidencia por ejecución

Cada ejecución crea su carpeta privada ignorada por Git en `frontend/test-results/e2e/run-*`:

- `environment.txt`: proyecto, HEAD de origen, indicador `source_dirty` y URL temporal. Si el árbol tiene cambios de aplicación/pruebas sin commit, el SHA no identifica por sí solo todo el contenido construido; el indicador lo deja explícito.
- `readiness.log`: comprobación del frontend/API/DB y revisión informada por el ensamblaje.
- `playwright.log`, `junit.xml` y `report/`: salida, reporte de casos y reporte HTML.
- `results/`: trazas y capturas cuando falla un test.
- `services.log` y `cleanup.log`: logs del entorno y limpieza, también si falla antes de abrir navegador. En un fallo temprano puede no existir aún reporte Playwright.

Las trazas pueden incluir contraseñas y tokens **ficticios** de ese entorno temporal. No utilizamos cuentas personales ni secretos reales y no versionamos esos artefactos. Su publicación/retención en CI se configurará en REN-89/90.

## Problemas encontrados y verificación

Registramos los resultados observados, recursos limpiados y problemas locales en [el registro acumulativo](../entrega-3.md). Los errores de preparación no se cuentan como pruebas de aplicación fallidas ni como evidencia del control de publicación.

Referencias técnicas: [fixtures](https://playwright.dev/docs/test-fixtures), [configuración](https://playwright.dev/docs/test-configuration) e [integración continua](https://playwright.dev/docs/ci) de Playwright.
