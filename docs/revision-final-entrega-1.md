# Revisión final de Entrega 1

Revisión iniciada el **12 de octubre de 2026** y cierre documental el **13 de octubre**, America/Santiago. Revisamos la [pauta oficial completa de 2026-2](https://github.com/Pruebas-de-Software/HandsOnProject/blob/main/semestres/2026-2/entrega1.md), incluidos sus anexos. Entregamos el MVP descrito en [Entrega 1](entrega-1.md); no declaramos implementadas las funciones que siguen en el backlog.

## Comprobación de los lineamientos

| Referencia | Estado | Evidencia y alcance |
| --- | --- | --- |
| 1: tema y herramienta | Confirmado por el equipo | RentSmart y Jest inscritos en Aula/Moodle, según confirmación de Jorge del 12 de octubre. Pytest complementa el backend. |
| 2: funcionalidades prioritarias y CRUD | Verificado | Publicar, listar, buscar, detalle, editar y eliminar espacios propios sin reservas. HU-01 a HU-13, con límites de HU-07/09/13 explícitos. |
| 3.1: equipo y responsabilidades | Documentado | Jorge Aceval: líder, backend e integración; Joaquín Viveros: frontend y testing. Dupla autorizada por docencia, según confirmación del equipo. |
| 3.1 y anexo D: organización | **Pendiente externo** | El repositorio continúa en JorgeJaceval. Los intentos de crear `rentsmart-aceval-viveros` no se completaron; detalles más abajo. |
| 3.2: GitFlow | Disponible | main, develop, historial de features y PR; [CONTRIBUTING](../CONTRIBUTING.md). Cierre documental mediante push directo autorizado expresamente. |
| 3.2: Jira y planificación | Revisado | HU con criterios, prioridades y estimaciones iniciales. Completamos CA y estimaciones de REN-16/17/18 a partir del documento original, manteniéndolas pendientes. |
| 3.2: estado del tablero | **Inconsistencia registrada** | El 13 de octubre REN-7/9/13, REN-27/29/32 aparecen Done tras cierres posteriores del 12 de octubre. La implementación y sus evidencias mantienen pendientes; Done no acredita esos criterios. |
| 3.3: integraciones | **Parcial** | GitHub–Jira enlazados mediante Development. Discord confirmado como canal; falta acreditar/configurar su conexión automática, pues no se proporcionó servidor/canal o webhook. |
| 4 y anexo B: nube | Sugerencia | Ejecución local con Docker Compose. No declaramos despliegue cloud. |
| 5.1: repositorio y aplicación | Publicado | [Código](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart), React/FastAPI/PostgreSQL, lockfiles y estructura documentada. |
| 5.1: instalación y uso | Verificado | [README](../README.md); corregimos la generación de la clave para requerir solamente Docker en ese recorrido. Arranque desde volumen PostgreSQL nuevo completado. |
| 5.1: enlaces visibles | Publicados | Video, integrantes, Wiki, documentación y Release accesibles desde README. |
| 5.1: licencia e higiene | Verificado | MIT, .gitignore, .env.example sin clave real y archivos de entorno locales fuera de Git. |
| 5.1: contacto y contribución | Publicado | Issues del repositorio y CONTRIBUTING, con roles y flujo de colaboración. |
| 5.1.1: versión | Publicado | Tag anotado `v1.0-entrega1` en commit `5c0fabce255b9b0c9d886c0fae627a790060b6f8`, perteneciente a main; Release público con notas. |
| 5.2: Wiki | **Publicada** | [Wiki real](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/wiki), con portada, entrega, arquitectura, instalación, estrategia/resultados y supuestos. Primera publicación completa: `1f4868c`. |
| 5.2: estrategia y evidencia | Disponible | [CI de la versión](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/actions/runs/38326696945): 98 Jest + 114 Pytest, build y Alembic aprobados. |
| 5.2: cobertura y trazabilidad | Documentado | 99 CP lógicos; tres planificados sin ejecución. HU → CA → CP → pruebas/resultados en Jira. No se atribuye porcentaje de cobertura de código. |
| 5.2 y 6: supuestos/dependencias | Publicados | [Wiki](wiki/Supuestos-y-dependencias.md), reglas de Santiago, CLP, horarios, reservas y pagos pendientes; límites de terceros. |
| 5.3: video | Enlace verificado | [Video_final_psf.mp4](https://drive.google.com/file/d/17H2e4SKm3GOre0F0W0TxGIGKeGdF53n1/view?usp=sharing) abre el reproductor. No se acredita aquí una revisión audiovisual completa. |
| 5.4: exposición | Condicional | Corresponde al equipo si es seleccionado; la publicación del repositorio no acredita haber expuesto. |
| 6: calendario y foro | Gestión del equipo | Inscripción confirmada; fecha y envío oficial se gestionan en Aula. Esta revisión no afirma haber enviado una tarea en Moodle. |
| Anexo A | Compatible | Jest/RTL para React y Pytest para Python; Playwright E2E reservado para Entrega 3. |
| Anexo C | Estructura disponible | Home como índice, página Entrega 1 con H1 correspondiente y páginas separadas de arquitectura, instalación, pruebas y supuestos. |
| Anexo D: identidad | Material preparado | [Logo y avatar](organizacion.md), descripción, nombre/handle y [perfil público preparado](organizacion/profile/README.md). Su publicación depende de crear la organización. |

## Bloqueos que no se presentan como cumplidos

**Organización:** los intentos autenticados del 12 de octubre no produjeron una organización creada. El texto genérico encontrado en el HTML no identifica la causa y no se considera evidencia de un rechazo específico. El 13 de octubre verificamos que el propietario del repositorio sigue siendo una cuenta personal y el navegador vuelve a pedir login. [REN-27](https://rentsmartpsf.atlassian.net/browse/REN-27) aparece Done, pero este requisito material continúa pendiente. No se transfirió el repositorio.

**Discord:** usar Discord está confirmado. La integración automática GitHub/Jira–Discord necesita el canal y sus permisos; su existencia no se infiere del uso del chat. [REN-32](https://rentsmartpsf.atlassian.net/browse/REN-32) aparece Done, pero su descripción conserva este punto pendiente.

**Cierres posteriores en Jira:** el historial registra cambios a Done después de nuestra revisión, por ejemplo REN-7 y REN-27 a las 22:56 del 12 de octubre. Conservamos esos cambios posteriores del tablero y explicitamos la diferencia entre cierre administrativo y cumplimiento funcional. HU-07/09/13 mantienen criterios parciales; REN-29 mantiene pendiente una inicialización reproducible de datos demostrativos y administrador fuera de fixtures. Las cuentas sintéticas del recorrido prueban el flujo, pero no sustituyen ese mecanismo.

## Alcance de la versión y del cierre

Ejecutamos además [13 pasos de integración en navegador](testing/recorrido-final-entrega-1.md), con API y PostgreSQL reales, desde una base nueva: registro, acceso válido/incorrecto, CRUD, estados de publicación, reserva, conflicto y Mis reservas. El registro HTTP y el conteo final de persistencia quedan adjuntos.

`v1.0-entrega1` conserva el código publicado y probado en `5c0fabc`. Este cierre añade documentación, evidencia y correcciones de instrucciones en main/develop, sin modificar el código de aplicación ni sus pruebas. Las notas del Release enlazan estos complementos; no se reescribe el tag publicado.

HU-14 a HU-18 y los criterios parciales de HU-07/09/13 se mantienen en el backlog. El alcance de Entrega 1 es el CRUD y los recorridos implementados; esta decisión no equivale a una aprobación docente del recorte del producto completo. La revisión acredita lo comprobado y conserva los pendientes, sin afirmar cumplimiento total mientras falte la organización y la integración de Discord.
