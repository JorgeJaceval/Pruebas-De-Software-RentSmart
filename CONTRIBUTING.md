# Contribuir a RentSmart

## Contacto

Jorge Aceval y Joaquín Viveros mantienen el proyecto. Usa los [issues del repositorio](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/issues) para consultas, mejoras o errores. Describe los pasos para reproducir el problema, el resultado esperado y el observado; adjunta evidencia sin credenciales ni datos personales.

## Ramas y GitFlow

| Rama | Propósito | Origen y destino |
| --- | --- | --- |
| `main` | Versiones estables | Recibe releases y hotfixes revisados |
| `develop` | Integración del desarrollo | Recibe features mediante PR |
| `feature/<descripcion>` | Una funcionalidad o tarea | Sale de `develop`, PR hacia `develop` |
| `release/<version>` | Preparar una entrega | Sale de `develop`, PR hacia `main`; sincronizar después con `develop` |
| `hotfix/<descripcion>` | Corregir una versión estable | Sale de `main`, PR hacia `main`; sincronizar después con `develop` |

Usa nombres en minúsculas separados por guiones, por ejemplo `feature/publicacion-espacios`. Si existe una tarea Jira, incluye su clave en el nombre, commits y PR.

## Crear una feature

Con el directorio de trabajo limpio:

```bash
git switch develop
git pull --ff-only origin develop
git switch -c feature/descripcion
# Implementar y verificar el cambio.
git add ruta/al/archivo
git commit -m "feat: describir el cambio"
git push -u origin feature/descripcion
```

En GitHub, abre un PR con base `develop` y comparación `feature/descripcion`. Completa la plantilla y solicita revisión al otro integrante. Las contribuciones externas pueden usar un fork y proponer el PR hacia `develop`.

## Revisión e integración

- Mantén cada PR enfocado en una tarea y enlaza su issue o tarjeta Jira cuando exista.
- Explica qué cambió, su motivo y cómo se verificó. En cambios funcionales, incluye pruebas pertinentes con Jest/React Testing Library, Pytest o Playwright según corresponda.
- En esta etapa solo existe configuración y documentación: no hay comandos de pruebas de aplicación disponibles. Registra la validación manual realizada.
- El otro integrante revisa y aprueba antes de integrar; resuelve las observaciones y los conflictos.
- Los checks de CI configurados deben pasar. Esta base aún no incorpora pipelines de pruebas.
- Integra features en `develop`. Para releases y hotfixes usa un merge commit que conserve el historial y sincroniza las dos ramas permanentes mediante PR.
- No hagas push directo ni force push a `main` o `develop`. Configura protección en GitHub para exigir PR y una aprobación; la documentación por sí sola no aplica esta restricción.

## Entregas

Prepara la entrega en `release/<version>` y abre el PR hacia `main`. Tras su revisión e integración, sincroniza con `develop`. Para la entrega 1, el tag `v1.0-entrega1` debe apuntar al commit estable entregado en `main` y tener un Release con sus notas. La configuración inicial del repositorio no constituye por sí sola esa entrega.

## Licencia

Al contribuir aceptas distribuir tus aportes bajo la [licencia MIT](LICENSE) del proyecto.
