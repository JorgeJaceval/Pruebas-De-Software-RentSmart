# Contribuir a RentSmart

## Contacto

Jorge Aceval y Joaquín Viveros mantienen el proyecto. Usa los [issues del repositorio](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/issues) para consultas, mejoras o errores. Describe los pasos para reproducir el problema, el resultado esperado y el observado; adjunta evidencia sin credenciales ni datos personales.

## Ramas y GitFlow

| Rama | Propósito | Origen y destino |
| --- | --- | --- |
| `main` | Versiones estables | Recibe releases y hotfixes revisados |
| `develop` | Integración del desarrollo | Recibe features mediante PR |
| `feature/REN-<numero>-<descripcion>` | Una funcionalidad o tarea | Sale de `develop`, PR hacia `develop` |
| `release/<version>` | Preparar una entrega | Sale de `develop`, PR hacia `main`; sincronizar después con `develop` |
| `hotfix/REN-<numero>-<descripcion>` | Corregir una versión estable | Sale de `main`, PR hacia `main`; sincronizar después con `develop` |

Cada cambio debe estar asociado a una tarea Jira. Copia su clave exacta desde la tarjeta o el detalle de la tarea, conservando las mayúsculas, y usa una descripción en minúsculas separada por guiones. Por ejemplo, `feature/REN-27-vinculacion-jira` corresponde a [REN-27](https://rentsmartpsf.atlassian.net/browse/REN-27), la tarea de configuración del repositorio. Para otra tarea, usa su propia clave.

## Crear una feature

Con el directorio de trabajo limpio, este es el ejemplo para `REN-27`:

```bash
git switch develop
git pull --ff-only origin develop
git switch -c feature/REN-27-vinculacion-jira
# Implementar y verificar el cambio.
git add ruta/al/archivo
git commit -m "docs: REN-27 explica cómo vincular el trabajo con Jira"
git push -u origin feature/REN-27-vinculacion-jira
```

En GitHub, abre un PR con base `develop` y comparación `feature/REN-27-vinculacion-jira`. Incluye `REN-27` en el título, completa la plantilla con el enlace a la tarea y solicita revisión al otro integrante. Las contribuciones externas pueden usar un fork y proponer el PR hacia `develop` siguiendo la misma convención.

## Vinculación con Jira

La clave de la tarea debe aparecer en estos tres lugares:

| Elemento | Ejemplo para REN-27 |
| --- | --- |
| Rama | `feature/REN-27-vinculacion-jira` |
| Mensaje de commit | `docs: REN-27 explica cómo vincular el trabajo con Jira` |
| Título del PR | `docs: REN-27 deja claro el vínculo entre GitHub y Jira` |

La descripción del PR también debe incluir el enlace completo a la tarea: <https://rentsmartpsf.atlassian.net/browse/REN-27> en este ejemplo. Mantén los prefijos `feat`, `fix`, `docs`, `chore` u otros según el cambio, y escribe mensajes claros que expliquen qué se hizo.

Con la integración GitHub–Jira configurada y con acceso al repositorio, comprueba en la sección **Desarrollo** de la tarea que aparezcan la rama y el PR. La clave en el nombre de la rama y el título del PR sigue el [flujo documentado por Atlassian](https://support.atlassian.com/jira-cloud-administration/docs/use-the-github-for-jira-app/).

Los tags de Git, como `v1.0-entrega1`, se reservan para marcar las versiones entregadas; la clave `REN-27` identifica la tarea Jira asociada al trabajo.

## Revisión e integración

- Mantén cada PR enfocado en una tarea Jira. Verifica que su clave exacta aparezca en la rama, los commits y el título del PR, y enlaza la tarjeta en la descripción.
- Explica qué cambió, su motivo y cómo se verificó. En cambios funcionales, incluye pruebas pertinentes con Jest/React Testing Library, Pytest o Playwright según corresponda.
- Ejecuta `npm run build` y `npm run test:ci` en `frontend`, y `uv run pytest` en `backend`. Aplica `uv run alembic upgrade head` después de instalar dependencias cuando haya migraciones nuevas. PostgreSQL debe estar disponible para las pruebas de persistencia y concurrencia. Las E2E con Playwright corresponden a la entrega 3. El [README](README.md) explica la instalación y los comandos completos.
- El otro integrante revisa y aprueba antes de integrar; resuelve las observaciones y los conflictos.
- Los checks de GitHub Actions deben pasar: `frontend` compila y ejecuta Jest; `backend` aplica las migraciones y ejecuta Pytest con PostgreSQL. Al implementar una historia, relaciona sus criterios de aceptación con casos concretos, como en [HU-01](docs/HU-01.md).
- Integra features en `develop`. Para releases y hotfixes usa un merge commit que conserve el historial y sincroniza las dos ramas permanentes mediante PR.
- No hagas push directo ni force push a `main` o `develop`. Configura protección en GitHub para exigir PR y una aprobación; la documentación por sí sola no aplica esta restricción.

## Entregas

Prepara la entrega en `release/<version>` y abre el PR hacia `main`. Tras su revisión e integración, sincroniza con `develop`. Para la entrega 1, el tag `v1.0-entrega1` debe apuntar al commit estable entregado en `main` y tener un Release con sus notas. La configuración inicial del repositorio no constituye por sí sola esa entrega.

## Licencia

Al contribuir aceptas distribuir tus aportes bajo la [licencia MIT](LICENSE) del proyecto.
