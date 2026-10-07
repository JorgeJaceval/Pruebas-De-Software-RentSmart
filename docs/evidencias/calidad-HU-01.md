# Resultados de calidad de la base y HU-01

Ejecución local: 6 de octubre de 2026, Windows, Node.js 24.11.1 y Python 3.12.13. Alcance: cambios de REN-1 en `feature/REN-1-registro-usuarios`, propuestos en el [PR #4](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/pull/4). Esta ejecución amplía la [evidencia inicial de registro](REN-1.md); no convierte los casos manuales diseñados en ejecutados.

## Pruebas ejecutadas

| Comprobación | Resultado observado |
| --- | --- |
| `npm run test:coverage` | 35 aprobadas: 31 de HU-01 y 4 del inicio; 2 suites |
| `npm run build` | TypeScript y compilación Vite correctos |
| `uv run pytest -q --cov=app --cov-branch --cov-report=term-missing --cov-report=xml:coverage.xml --cov-report=json:coverage.json --cov-report=html` | 71 aprobadas: 65 de HU-01 y 6 de la base |
| HU-01 / API con SQLite en memoria | 60 casos aprobados; validación, límites, datos inesperados, hash, errores y privilegios |
| HU-01 / PostgreSQL real | 5 casos aprobados; persistencia, restricciones y concurrencia |
| `uv run alembic check` y `uv run alembic current` | Sin diferencias con los modelos; revisión `0001_create_users (head)` |

Los tests PostgreSQL aplican la migración en esquemas temporales independientes y los eliminan al terminar. Las peticiones de componente sustituyen `fetch`; las pruebas de API usan `TestClient`. Ninguna de estas suites constituye E2E de navegador. No se ejecutó Playwright.

Pytest informó dos advertencias locales: deprecación de `httpx` en `Starlette TestClient` y permiso insuficiente para guardar la caché de Pytest. No impidieron ejecutar los 71 casos ni generar cobertura. El aviso de compatibilidad de la dependencia deberá revisarse al actualizar el cliente de pruebas.

## Cobertura de código medida

| Motor y alcance | Sentencias / líneas | Ramas | Funciones |
| --- | --- | --- | --- |
| Jest 30, proveedor V8; 4 archivos de `src/` | 277/279 = **99,28 %** | 75/76 = **98,68 %** | 12/12 = **100 %** |
| pytest-cov 7.1.0 / coverage.py 7.16.2; `app/` | 183/187 = **97,86 %** de sentencias | 16/18 = **88,89 %** | No se informa esta métrica |

coverage.py muestra además **97,07 %** combinado: `(183 + 16) / (187 + 18)`. Ese valor no debe confundirse con su porcentaje de sentencias ni compararse directamente con el resumen de Jest. Cada motor define sus unidades instrumentadas; el número de pruebas tampoco es un porcentaje de cobertura.

Frontend incluye `App.tsx`, `RegistrationForm.tsx`, `api.ts` y `registration.ts`; excluye tests, preparación de Jest y `main.tsx` de arranque. Backend incluye todos los módulos de `app/`; no mide migraciones, tests ni dependencias. Las migraciones sí se ejecutan en la suite PostgreSQL, aunque estén fuera de este denominador.

Quedaron sin ejecutar la salida defensiva del formulario ante una excepción ajena a `RegistrationError`; el fallback de validación para errores fuera de los campos conocidos; y las salidas de rollback fallido o restricción SQL distinta de correo duplicado. Se conservan visibles en los informes; no se fija un umbral de aprobación inventado ni se declara cobertura de condiciones o MC/DC.

Los [totales y resultados por archivo](calidad-HU-01.json) se extrajeron de `frontend/coverage/coverage-summary.json` y `backend/coverage.json`. Los informes completos se generan con los comandos anteriores: frontend HTML/LCOV/JSON y backend HTML/XML/JSON. GitHub Actions genera y publica los artefactos `cobertura-frontend` y `cobertura-backend` en cada ejecución; los archivos generados locales están ignorados por Git.

## Correcciones y diseño aplicado

| Hallazgo de la revisión | Corrección verificada | Prueba de regresión |
| --- | --- | --- |
| RE-01: Unicode inválido podía llegar a Argon2 y fallar | Rechazo `422` antes del hash, con mensaje fijo del campo; no se modifica la contraseña | `test_hu01_ca03_rejects_unexpected_text_without_internal_errors`; casos de formulario |
| RE-02: NUL en nombre podía fallar al persistir | Rechazo `422` antes de insertar; ninguna cuenta creada | Mismo test, subcaso `name-null` |
| RE-03: API admitía correo con nombre visible y formulario lo rechazaba | Contrato de dirección simple, sin delimitadores `< >`, en ambas capas | Subcasos `display-name-email` y `bracketed-email`; formulario |
| RE-04: faltaban vecinos interiores de los límites | Nombre `1/2/3/79/80/81`; contraseña `7/8/9/63/64/65`, variando un campo a la vez | `test_hu01_ca03_accepts_valid_boundary_lengths` y grupo `acepta el límite %s de los campos` |

El test de contraseña exacta conserva los espacios, el Unicode válido y un NUL que Argon2 sí admite. Así se evita extender a la contraseña una restricción necesaria únicamente para el nombre persistido.

La [matriz](../pruebas/trazabilidad-HU-01.md) vincula criterios, requisitos, código, tests y casos manuales. El [informe estático](../pruebas/revision-estatica-HU-01.md) conserva la reproducción original de los hallazgos. CA-01 continúa parcial por la navegación a inicio de sesión pendiente de HU-02; CA-05 acredita el registro de una cuenta normal, sin verificar todavía publicación o reserva.

## Integración y evidencia pendiente

Los [checks del PR](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/pull/4/checks) permiten reproducir estas verificaciones en Linux con PostgreSQL 17 y acceder a los artefactos de cobertura del último commit. La revisión del otro integrante, los casos manuales y la aceptación por usuarios no se atribuyen a este resultado automatizado. La entrega completa requiere además las funcionalidades y evidencias que pide la pauta; esta mejora está limitada a la base y HU-01 por elección del usuario.
