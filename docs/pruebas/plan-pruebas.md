# Plan de pruebas: base técnica y HU-01

Identificador **PP-BASE-HU01**, versión **1.0**, fecha **6 de octubre de 2026**. Aplicable a [REN-73](https://rentsmartpsf.atlassian.net/browse/REN-73) y [REN-1](https://rentsmartpsf.atlassian.net/browse/REN-1). Se actualiza con los cambios de requisitos y código; los resultados de una ejecución se conservan en [evidencia de calidad](../evidencias/calidad-HU-01.md), sin sustituir este plan por un listado de tests aprobados.

## Fundamento de las clases

Referencias por posición de página del PDF, incluida su portada. Se aplican los conceptos pertinentes al alcance actual; los ejemplos, ejercicios y otras aplicaciones de las diapositivas no añaden funcionalidades al proyecto.

| Fuente | Concepto y páginas | Aplicación |
| --- | --- | --- |
| `INF331 Ingeniería de Requerimientos 1 de 2 v1.1.pdf` | Calidad verificable p. 17; desarrollo iterativo pp. 25–26; fuente, ID, criterios y trazabilidad pp. 36–37 | [Catálogo de requisitos](../requerimientos.md), criterios conservados del PDF de HU y matriz con límites explícitos |
| `INF331 Ingeniería de Requerimientos 2 de 2 v1.1.pdf` | Caso de uso pp. 13–19; calidad medible pp. 38–40; estado y trazabilidad pp. 42–43 y 49–50 | Flujo y excepciones de registro; evidencia de lo comprobado, sin equiparar implementado, verificado y aceptado |
| `INF331 Pruebas Manuales S5 V1.1.pdf` | Oráculo pp. 6–8; ambientes/dobles pp. 11–15; niveles pp. 16–24; UAT pp. 30–33; plan pp. 44–48; trazabilidad pp. 49–50; casos pp. 52–55; defectos pp. 56–62 | Definir entorno, expectativas, suites, límites, responsables y registro de ejecución/defectos |
| `INF-331 Pruebas Estáticas y Dinámicas S6 V1.01.pdf` | Entradas válidas, inválidas e inesperadas pp. 3–4; estáticas/dinámicas pp. 6–8; estructura pp. 13–24; accesibilidad/observabilidad p. 58; caja negra p. 61; límites p. 63; equivalencia pp. 69–72; cadenas inesperadas p. 84 | Revisar requisitos/código y ejecutar casos dirigidos; seleccionar particiones y vecinos de los límites; comprobar efectos persistidos, no solo HTTP |

## Objetivo, alcance y oráculo

Detectar diferencias entre el comportamiento previsto y la base/HU-01 implementadas: disponibilidad de la API, CORS, estados de interfaz, creación persistente de cuentas, validación, normalización, confidencialidad, privilegios y unicidad concurrente. El oráculo principal es `Historias de usuario.pdf`, **p. 7, CA-01–CA-06**, con rangos comunes de **pp. 3–4**; el contrato técnico está en [HU-01](../HU-01.md). Las expectativas se fijan antes de ejecutar y se comparan con lo observado; el código bajo prueba no es la única fuente del esperado.

Los estados HTTP `201/409/422/503`, Argon2id, UUID y manejo de fallos son decisiones técnicas documentadas. Esta revisión incorpora como decisión de robustez el rechazo de NUL en nombre y sustitutos Unicode aislados en los campos textuales, y exige correo sin nombre visible (`Nombre <correo>`); se verifican sin crear una cuenta. La contraseña válida con NUL se conserva y se transforma en hash verificable, sin recortarla ni cambiarla. No se atribuyen esas decisiones a una regla del profesor. El máximo declarativo de 320 del campo backend no demuestra que se acepte un correo ASCII de 255 caracteres: `EmailStr` valida adicionalmente; no hay un defecto de longitud demostrado por comparar constantes.

Fuera del alcance ejecutado: inicio/cierre de sesión HU-02, operaciones de espacios/reservas/pagos/IA/administración HU-03–HU-18, auditoría completa de seguridad, pruebas de carga o SLA de rendimiento/disponibilidad. **E2E con Playwright corresponde a entrega 3** y no es un requisito de salida de este plan. **UAT no realizada**: los desarrolladores y la CI no acreditan aceptación de usuarios.

CA-01 queda **parcial respecto del recorrido completo**: registro y confirmación están comprobados; navegar al inicio de sesión requiere HU-02 pendiente. CA-05 verifica identidad normal y rechazo de privilegios en registro; no acredita que publicar y reservar estén funcionando.

## Estrategia y nivel real de las suites

| Suite / actividad | Herramienta, aislamiento y nivel | Qué comprueba / límite |
| --- | --- | --- |
| Componentes de frontend | Jest + React Testing Library + jsdom; `fetch` sustituido por `jest.fn()`, interacción con `userEvent` | Formulario, accesibilidad de mensajes, validaciones, normalización, petición y estados; no abre navegador ni conecta con API/BD real |
| API integrada en proceso | Pytest + `TestClient`; FastAPI, validadores, ruta, hash y SQLModel juntos; sesión reemplazada por SQLite en memoria | Contrato, límites, errores y persistencia aislada; **integración**, no se llama unitaria a toda esta suite por usar Pytest |
| Persistencia PostgreSQL | Pytest marcado `postgres`; migraciones Alembic reales, esquema temporal por prueba, conexiones independientes | Restricciones, persistencia, normalización y carrera sincronizada antes del INSERT; no representa carga masiva ni reserva concurrente |
| Base técnica | `App.test.tsx`, `test_health.py`, `test_postgres.py` | Estados de inicio, liveness sin BD, readiness, errores de BD y CORS; los estados de frontend son simulados, PostgreSQL real se acredita en backend |
| Revisión estática y chequeos automáticos | Lectura de especificación/código/migración/tests; TypeScript/build, `alembic check`, revisión del diff | Detectar ambigüedades, diferencias de contrato y rutas de fallo; compilación correcta no demuestra por sí sola comportamiento correcto |
| Suite manual SM-HU01 | [CP-HU01-01 a CP-HU01-10](casos-HU-01.md), navegador/API/SQL | Diseñada, **sin ejecución manual registrada**; debe conservar observado, ejecutor, momento y evidencia de cada subcaso |
| Aceptación de usuario | Revisión/ejecución por representantes de usuario | **No realizada**; no se inventa aprobador, acta o aceptación |

`jest.fn()` permite verificar llamadas y programar respuestas/rechazos; `MagicMock`/excepciones inducen fallos de BD. SQLite permite ejecutar lógica integrada en un entorno sustituto, pero no garantiza el comportamiento de PostgreSQL. Una prueba que simula `503` en frontend verifica su reacción, no provoca una caída real de la BD. Por ello, los límites de cada doble se registran en la matriz.

`alembic check` consulta el esquema real de la BD para contrastarlo con los modelos; es una comprobación ejecutada de coherencia, no una inspección estática pura. TypeScript revisa tipos y la lectura del diff revisa artefactos sin ejecutar el recorrido del registro.

## Selección de datos y resultados esperados

Las clases de equivalencia agrupan entradas que deberían recibir el mismo tratamiento; se eligen representantes sin suponer que una muestra demuestra todas las combinaciones. Para negativos, mantener válidos los otros campos facilita identificar la causa. El oráculo exige también comprobar que no se persistió una cuenta y que no se expusieron secretos.

| Campo / condición | Particiones y representantes | Esperado |
| --- | --- | --- |
| Nombre | Texto válido recortado; vacío/solo espacios; demasiado corto/largo; valor no textual | Éxito en el válido; error del campo y ninguna fila en inválidos |
| Correo | Nuevo válido; variantes de mayúsculas/espacios; duplicado; formato inválido; nombre visible; tipo no textual | Normalización; `409` solo para duplicado; `422` para formato/tipo rechazado |
| Contraseña | Texto válido, incluido Unicode, espacios y NUL; vacía/corta/larga; tipo no textual | Longitud por caracteres; preservar entrada válida; hash verificable; error controlado en inválidos |
| Caracteres inesperados inválidos | NUL en nombre o sustituto Unicode aislado en campos textuales | Rechazo de validación controlado, ninguna cuenta y ningún error interno de persistencia/codificación |
| Privilegios e identidad | Solo campos admitidos; `role`, `is_admin`, `id`, `password_hash` adicionales | Cuenta normal en válido; `422` sin cuenta en adicionales |
| Persistencia | BD disponible; caída; dos solicitudes del mismo correo | `201` tras commit; `503` seguro ante caída; una cuenta y respuestas `201/409` en carrera |

Se aplica S6, p. 63, tomando el borde y sus vecinos **±1**: nombre **1/2/3** y **79/80/81**; contraseña **7/8/9** y **63/64/65**. Para nombre, medir después de recortar extremos; para contraseña, contar caracteres sin cambiarla. Las series completas están implementadas en las pruebas parametrizadas de API; su ejecución concreta se acredita en el informe actualizado. Los grupos parametrizados permiten conservar el dato que originó cada caso.

La prueba concurrente sincroniza dos solicitudes con `Barrier` antes del INSERT y observa estados HTTP y cantidad de filas desde una sesión independiente. Esto mejora accesibilidad y observabilidad (S6, p. 58): alcanzar el conflicto y comprobar su efecto. Enviar manualmente dos solicitudes próximas sin esa sincronización no prueba necesariamente una carrera.

La selección combina caja negra desde criterios con revisión de ramas de validación/error. Cobertura estructural y trazabilidad de criterios son mediciones diferentes; ninguna implica ausencia de defectos. No se afirma MC/DC, cobertura completa de rutas ni un porcentaje sin reporte generado.

## Ambiente, responsables y ejecución

Ambiente de desarrollo local: Node.js 24, Python 3.12 administrado por uv, PostgreSQL 17 de Compose; dependencias resueltas en `package-lock.json` y `uv.lock`. CI: GitHub Actions en Linux, los mismos lockfiles y un servicio PostgreSQL 17. La prueba PostgreSQL aplica Alembic en un esquema `hu01_<UUID>` y elimina solamente ese esquema al terminar; no reemplaza cuentas de desarrollo. Se necesitan permisos de creación de esquemas.

Jorge Aceval coordina el plan, backend, migraciones, pruebas PostgreSQL y CI. Joaquín Viveros se encarga del frontend, casos de interfaz y pruebas Jest/RTL. Ambos mantienen documentación y revisan el trabajo del otro según [CONTRIBUTING](../../CONTRIBUTING.md). La asignación prevista no constituye un registro de quién ejecutó manualmente un caso.

Secuencia reproducible, con PostgreSQL disponible:

```bash
# Desde frontend
npm ci
npm run build
npm run test:coverage

# Desde backend
uv sync --frozen
uv run alembic upgrade head
uv run alembic check
uv run pytest -q --cov=app --cov-branch --cov-report=term-missing --cov-report=xml:coverage.xml --cov-report=json:coverage.json --cov-report=html
```

Para solo la integración aislada sin PostgreSQL, `uv run pytest -m "not postgres" -q`; esa ejecución no verifica CA-06 ni las restricciones PostgreSQL. En PowerShell usar `npm.cmd` si la política bloquea `npm.ps1`. Registrar comandos, commit, entorno, salida y momento en la evidencia. Los tests se repiten después de cambios/fallos según el impacto; no se reutiliza un resultado de un commit distinto como evidencia del actual.

La cobertura de frontend usa el proveedor V8 de Jest sobre `src/**/*.{ts,tsx}`, excluyendo tests, configuración de tests y el arranque `main.tsx`; genera texto, resumen JSON, LCOV y HTML. `pytest-cov` mide sentencias y ramas de `app/`, con informes texto, XML, JSON y HTML. GitHub Actions conserva esos informes como artefactos. Son mediciones del código instrumentado; no se fija un umbral arbitrario ni se equiparan con cobertura de criterios o UAT. El informe de evidencia identifica valores y archivos excluidos en la ejecución real.

## Entrada, salida, riesgos y defectos

**Entrada:** requisitos/criterios identificados, aplicación y contrato disponibles, dependencias bloqueadas instalables, datos ficticios y entorno aislado preparados; para PostgreSQL, servicio sano y migraciones aplicables. Un prerrequisito ausente se registra como bloqueo de la prueba, no como aprobado ni defecto confirmado del producto.

**Salida de la comprobación automatizada:** build y checks activos correctos; casos relacionados ejecutados con resultado registrado; migración/modelo consistentes; cada criterio trazado a su evidencia o a un límite pendiente explícito; defectos encontrados corregidos y reprobados o registrados con justificación. La revisión del otro integrante en el PR se mantiene como condición de integración. Una prueba nueva requiere ejecución nueva. CA-01 parcial y manual/UAT no ejecutadas deben seguir visibles, sin declarar HU-01 aceptada íntegramente.

**Salida de la suite manual:** todos los casos y subcasos tienen observado, resultado y evidencia; bloqueos/defectos constan en el historial; se revisan diferencias con el oráculo. Mientras esos registros no existan, la suite está diseñada, no ejecutada. La aceptación de usuario es un hito posterior distinto.

| Riesgo | Tratamiento y evidencia necesaria |
| --- | --- |
| Duplicados por normalización/carrera | Restricción SQL, pruebas de variantes y concurrencia real; no confiar solo en comprobación previa del cliente |
| Diferencias SQLite/PostgreSQL | Conservar suites reales de migración/restricciones; indicar motor en evidencia |
| Filtración de contraseña/hash | Verificar respuestas y manejo de errores/logs; capturas sin secretos; no guardar cuerpos sensibles como evidencia |
| Cliente y servidor validan distinto | Comparar datos y decisiones del contrato; enviar inválidos directamente a API |
| Errores de codificación o almacenamiento | Rechazo de NUL en nombre/sustitutos aislados; preservación y hash de contraseña válida con NUL; regresión después de corregir |
| Confundir artefactos con pruebas ejecutadas | Separar plan/casos de observado; enlazar el informe actualizado y registrar commit |
| Declarar listo el MVP por tener registro | Documentar HU pendientes; separar registro, integración del PR y aceptación |

Un **defecto** contradice un requisito o provoca una falla inesperada. Registrar en Jira: caso/criterio, resumen, commit/ambiente, pasos, esperado, observado, evidencia, impacto y alternativa si existe. Severidad expresa impacto; prioridad indica orden de atención. Seguir descubrimiento → reporte → asignación → corrección → verificación, manteniendo la ejecución original y la regresión (S5, pp. 56–62).

Un **cambio de requisito** agrega o modifica comportamiento esperado: registrar motivo/origen e impacto en datos, API, interfaz, pruebas y documentos antes de actualizar la línea de referencia (Requerimientos 2/2, pp. 42–48). El rechazo explícito de entradas inesperadas queda documentado como decisión de robustez de esta revisión, acompañado de pruebas; no se oculta como si siempre hubiera sido un criterio textual del PDF.

Entregables: este plan, [casos manuales](casos-HU-01.md), [matriz HU-01](trazabilidad-HU-01.md), suites versionadas, revisión estática, registros de defectos y [evidencia de calidad](../evidencias/calidad-HU-01.md). Los enlaces de Jira y PR conservan la clave REN correspondiente. Ninguno de estos artefactos declara completadas las demás funcionalidades exigibles al producto.
