<!-- Incluye la clave real de Jira en el título: tipo: REN-<numero> descripción del cambio. -->

## Cambio y motivo

Describe el problema o tarea y el comportamiento resultante.

## Tarea Jira

Indica la clave exacta de la tarea y su enlace completo en Jira. La misma clave debe aparecer en el nombre de la rama, los mensajes de commit y el título de este PR.

## Verificación

Indica comandos y resultados, o la revisión manual para documentación/configuración.

Para cambios funcionales, enlaza criterio → caso/test → evidencia y especifica los resultados de cobertura con su alcance. Distingue casos manuales diseñados de ejecuciones registradas; identifica criterios parciales y dependencias pendientes. Documenta los hallazgos estáticos materiales y su corrección, como en [HU-01](../docs/pruebas/trazabilidad-HU-01.md).

## Revisión

- [ ] La rama, los commits y el título del PR incluyen la clave exacta de la tarea Jira.
- [ ] La descripción enlaza la tarea Jira correspondiente.
- [ ] La rama destino corresponde al flujo de CONTRIBUTING.md.
- [ ] Se verificaron los criterios del alcance y se identificaron los pendientes.
- [ ] Se actualizó la relación entre criterios, pruebas y evidencia.
- [ ] Se realizaron las pruebas pertinentes o se explicó por qué no aplican.
- [ ] Se actualizó la documentación afectada.
- [ ] No se incorporaron credenciales ni datos personales.
- [ ] Se solicitó revisión al otro integrante.
