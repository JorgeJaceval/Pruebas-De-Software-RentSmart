# REN-9 — filtro temporal del catálogo

20 de noviembre de 2026, America/Santiago. Rama `feature/REN-9-filtro-temporal-catalogo`, sincronizada con `develop` `e991cafabb402622956af2061e1d20a84aaeb6bf` tras integración de PR #43.

## Resultados locales

- 170 Jest en 13 suites, TypeScript/Vite aprobados.
- 199 Pytest con PostgreSQL 17 temporal y esquemas aislados, una advertencia existente de Starlette. Migraciones hasta 0007 y `alembic check` sin operaciones nuevas; no cambiamos el esquema.
- 16 E2E Chromium headless, dos workers, cero reintentos, 0 fallos/errores/omitidos, reporte ignorado `frontend/test-results/e2e/run-1Zd5flvW/`; HTML/JUnit y logs conservados. Un ensayo anterior de 14 casos sin HU-15 corresponde a `run-58QXNIGr`, no al resultado conjunto.
- `source_head=e991cafabb402622956af2061e1d20a84aaeb6bf`, `source_dirty=true`, `failure_probe=false`: árbol candidato aún sin commit, no el contenido puro de la base. La sonda de REN-90 está excluida de los casos normales y no cuenta como caso funcional adicional.
- Proyecto `rentsmart-e2e-75915cf1cf15`: no quedan contenedores ni volúmenes propios. El PostgreSQL de Pytest fue eliminado. La demo existente conserva sus tres servicios healthy; no usamos el VPS ni sus secretos.

## Qué comprueban las pruebas

Los 34 casos backend nuevos cubren horario/visibilidad/contrato público, superposición y consecutivos, pagadas y pendientes vigentes/vencidas, terminales, parámetros completos, formatos inválidos, duración, límites exactos de ahora/90 días, DST inexistente/repetido, fallo SQL/reintento y lectura sin mutación. Contrastan la decisión con solicitudes reales de reserva cuando corresponde.

Las ocho comprobaciones frontend nuevas cubren aplicación explícita, AND con filtros básicos, intervalo incompleto/invertido/excesivo, validación del servidor, vacío distinto de error, limpieza, nueva consulta, reintento y respuesta tardía. Jest simula HTTP; no se presenta como ejecución de navegador.

Los dos recorridos E3-08 usan navegador/API/PostgreSQL reales. Uno compara espacio libre, reservado y horario incompatible, admite un intervalo consecutivo y limpia filtros. El otro encuentra un espacio libre, otra cuenta reserva después y la solicitud por UI recibe conflicto; la nueva búsqueda ya excluye ese espacio. Este escenario es secuencial, no una carrera coordinada ni garantía de adjudicación. Las carreras transaccionales existentes de HU-12 permanecen verificadas en Pytest.

El primer ensayo backend detectó un error del fixture en el límite de 90 días, que cruza DST. Ajustamos la expectativa a la hora local del instante exacto, sin cambiar la regla; la ejecución completa posterior aprobó. No versionamos credenciales efímeras ni trazas privadas.

## Seguimiento remoto

La PR y Jira registran SHA, ejecución final de Actions y revisión. Los resultados locales no equivalen a CI, revisión humana, integración ni publicación en producción. [Alcance de HU-09](../HU-09.md), [CP/Testing](../testing/HU-09.md) y [registro acumulativo](../entrega-3.md).
