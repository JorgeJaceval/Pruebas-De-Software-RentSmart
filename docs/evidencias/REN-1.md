# Evidencia de HU-01 / REN-1

Verificación realizada el 6 de octubre de 2026. Los casos se derivaron de los seis criterios de HU-01 de `Historias de usuario.pdf`, página 7, y de los rangos comunes del documento. La [matriz de trazabilidad](../HU-01.md) explica la relación con cada criterio.

## Resultados locales

| Comprobación | Resultado |
| --- | --- |
| `npm run test:ci` | 24 aprobadas: 20 de HU-01 y 4 del inicio |
| `npm run build` | TypeScript y compilación Vite correctos |
| `uv run pytest -q` | 57 aprobadas: 51 de HU-01 y 6 anteriores |
| HU-01 con SQLite aislado | 46 casos aprobados de API, validación, límites, protección de datos y errores |
| HU-01 con PostgreSQL real | 5 casos aprobados de persistencia, restricciones y concurrencia |
| `uv run alembic upgrade head` | Migración `0001_create_users` aplicada |
| `uv run alembic check` | Sin diferencias entre modelo y esquema instalado |
| `docker compose up -d --build --wait` | Frontend, backend y PostgreSQL disponibles |
| Solicitud HTTP al proxy `/api/auth/register` de Vite | `201`; cuenta persistida en PostgreSQL, hash verificado y cuenta sin privilegios administrativos |

La solicitud de comprobación creó una cuenta temporal con correo generado para esa ejecución. Se verificó su persistencia y se eliminó exclusivamente esa cuenta por su UUID y correo. Las pruebas PostgreSQL automatizadas usan esquemas `hu01_<UUID>` y los eliminan al finalizar; no borran ni reemplazan cuentas de desarrollo.

La carrera de registro sincroniza dos solicitudes antes del INSERT y consulta PostgreSQL real. El resultado fue exactamente una respuesta `201`, otra `409` y una sola fila. El fallo de base de datos de las pruebas aisladas se simula; la persistencia y las restricciones se verifican con PostgreSQL.

Una prueba de regresión simula que las lecturas de base de datos dejan de estar disponibles después del commit. El registro conserva la respuesta `201` y la cuenta queda persistida, sin ejecutar una lectura posterior para construir la respuesta.

Las 81 pruebas aprobadas corresponden a Jest y Pytest. No se ejecutó la suite E2E ni se agregaron casos E2E a HU-01. Playwright se reserva para la entrega 3 y su trabajo se retiró del pipeline actual.

## Capturas

El formulario se verificó visualmente en escritorio y móvil. Las capturas muestran campos vacíos y no contienen contraseñas.

![Formulario de registro en escritorio](REN-1-registro.png)

![Formulario de registro en móvil](REN-1-registro-movil.png)

## Trazabilidad

- [REN-1 — Registrarse](https://rentsmartpsf.atlassian.net/browse/REN-1).
- Rama: `feature/REN-1-registro-usuarios`.
- Commit y título del PR: `feat: REN-1 permite crear una cuenta en RentSmart`.
- Los checks activos son `frontend` y `backend`; el segundo incluye migraciones, comprobación del esquema y las pruebas PostgreSQL.
- La revisión del otro integrante y la integración en `develop` se realizan mediante el PR.
