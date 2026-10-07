# Aplicación de las clases a la base y HU-01

Alcance elegido: mejorar la base y el registro de usuarios disponibles. La pauta de entrega sigue siendo la fuente del alcance global; estos cambios no implementan el resto del MVP. Las referencias de página siguientes corresponden a la posición dentro de cada PDF.

| Clase y conceptos utilizados | Aplicación concreta |
| --- | --- |
| Ingeniería de Requerimientos 1/2: calidad del requisito (p. 17), análisis documental (p. 32), fuente/ID/trazabilidad (pp. 36–37), visión y alcance (p. 41) | [Catálogo de requisitos](requerimientos.md): actores, alcance, prioridad, RF/RNF/RN, origen y resultado comprobable |
| Ingeniería de Requerimientos 2/2: caso de uso (pp. 13–19), reglas de negocio (pp. 25–34), calidad medible (pp. 38–40), gestión y estados (pp. 42–43, 49–50) | UC-01 textual, atributos verificables, control de cambios y distinción entre implementación, verificación y aprobación |
| Pruebas Manuales S5: oráculo (pp. 6–8), niveles (pp. 16–24, 30–33), plan (pp. 44–45), trazabilidad y casos (pp. 49–55), defectos (pp. 56–62) | [Plan de pruebas](pruebas/plan-pruebas.md), [matriz de trazabilidad](pruebas/trazabilidad-HU-01.md) y [10 casos manuales](pruebas/casos-HU-01.md), con resultado esperado y estado real |
| Pruebas Estáticas y Dinámicas S6: revisiones (pp. 6–8), cobertura estructural (pp. 13–31), límites (p. 63), equivalencia (pp. 69–76), entradas inesperadas (p. 84) | [Revisión estática](pruebas/revision-estatica-HU-01.md), corrección de entradas que causaban fallos, límites ±1 y medición de cobertura con informes descargables de CI |

## Estado comprobable

| Elemento | Estado y evidencia |
| --- | --- |
| Base React/FastAPI/PostgreSQL y registro | Implementados en [PR #4 / REN-1](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/pull/4), pendiente revisión e integración |
| Requisitos y trazabilidad | Documentados con IDs y tests concretos; CA-01 parcial por navegación al inicio de sesión pendiente de HU-02 |
| Pruebas automatizadas y build | Ejecutados; [106 pruebas aprobadas y cobertura medida](evidencias/calidad-HU-01.md) |
| Casos manuales | 10 diseñados con subcasos; sin ejecución manual registrada |
| Revisión de código | Revisión asistida registrada; cuatro hallazgos tratados y comprobados. Revisión humana del PR pendiente |
| Identidad de organización | Archivos y responsabilidades preparados; el [repositorio sigue en la cuenta personal](organizacion.md). Organización real y protección efectiva de ramas no se acreditan por esta documentación |
| Publicación/reserva y demás HU | Pendientes; CA-05 comprueba identidad normal y privilegios al registrarse |
| E2E | Reservadas para entrega 3; no ejecutadas ni exigidas en esta revisión |

## Uso en la entrega

Jorge mantiene el catálogo, la persistencia, Pytest y CI; Joaquín mantiene la interfaz y sus pruebas de componente. El otro integrante revisa los cambios antes de integrar, según [CONTRIBUTING](../CONTRIBUTING.md). Cada requisito nuevo debe conectar su criterio con código, caso y evidencia; al modificarlo se conserva el ID y se registra el motivo en Jira/Git.

Para cerrar esta parte, el equipo debe registrar la revisión del PR y ejecutar los casos manuales que decida incluir como evidencia. La navegación de CA-01 necesita HU-02. Para declarar lista la entrega completa, debe contrastar las funcionalidades restantes, backlog, organización, versión entregada y material de presentación con la [pauta](https://github.com/Pruebas-de-Software/HandsOnProject/blob/main/semestres/2026-1/entrega1.md). No se declaran realizados actos, aprobaciones o funciones sin evidencia.
