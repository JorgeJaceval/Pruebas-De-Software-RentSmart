# E2E de entrega 3 — entorno aislado (REN-87)

Preparamos Playwright con Chromium para recorrer React compilado → Caddy → FastAPI → PostgreSQL 17. No interceptamos HTTP ni sustituimos el backend por mocks en estos casos. El proveedor externo de IA, cuando exista, se aislará por separado.

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

## Primeros casos y límites

| Caso | Acción comprobada por navegador | Preparación |
| --- | --- | --- |
| E3-01 | Registro, inicio de sesión y conservación de identidad/vista privada tras recargar. | Solo datos aleatorios; registro y login por UI real. |
| E3-02 | Una vista privada exige sesión; contraseña incorrecta de una cuenta existente muestra error y no abre navegación privada, tampoco al recargar. | Cuenta creada por API como fixture; login y verificaciones por UI real. |

Esperamos elementos accesibles y resultados observables; no utilizamos pausas fijas. Inicialmente ejecutamos sin reintentos para no ocultar fallos. En CI limitamos a un worker; podemos verificar independencia local con `bash scripts/run-e2e.sh --repeat-each=2 --workers=2`. Las repeticiones no aumentan el número de casos funcionales.

Esto prepara **dos casos de la matriz**, no la suite mínima de diez ni su integración automática. REN-88 ampliará escenarios y REN-89 incorporará la etapa obligatoria y el resultado en Slack. El workflow todavía no ejecuta navegador; sus jobs `production`/smoke siguen teniendo su significado anterior.

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
