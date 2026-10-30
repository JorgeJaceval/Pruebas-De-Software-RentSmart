# Documentación de la Wiki

Esta carpeta contiene las fuentes versionadas de siete páginas de GitHub Wiki y su barra lateral. `Home.md` reúne los enlaces a ambas entregas, arquitectura, instalación, pruebas y supuestos. Este README contiene las instrucciones de mantenimiento; no se publica como página de Wiki.

La [Wiki pública](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/wiki) incorpora entrega 2 desde el 29 de octubre de 2026: commit `9d1e1757e83e375ec693eeeb9adb9fa894ec0696`, copiado de la revisión integrada `b5a58646824e0edc07f40567d76083b40365c9d7`. Conservamos [la evidencia inicial](../evidencias/REN-77-wiki-2026-10-29.md). El snapshot público verificado es `e5c29a12ffa0f34a948d2de503ba43c548e484a0`, copiado exactamente de `86ccb33b3db585b1598ce70ee280cd124f67b18b` tras integrar PR #35. Incluye el despliegue de PR #34, CA-05, migración 0007 y evidencia de 150 Jest/165 Pytest. Los cambios posteriores se publican desde sus propias fuentes revisadas. Editar estas fuentes no actualiza ese sitio: los cambios de entrega 2 se preparan por PR y deben publicarse después de revisión/integración.

## Navegación de la copia versionada

- [Inicio](Home.md)
- [Entrega 1](Entrega-1.md)
- [Entrega 2](Entrega-2.md)
- [Arquitectura](Arquitectura.md)
- [Instalación y ejecución](Instalacion-y-ejecucion.md)
- [Estrategia y resultados de pruebas](Estrategia-y-resultados-de-pruebas.md)
- [Supuestos y dependencias](Supuestos-y-dependencias.md)

## Actualizar la Wiki

Desde la raíz del repositorio, ejecutar en PowerShell:

```powershell
./scripts/publicar-wiki.ps1
```

El script sincroniza las siete páginas y la barra lateral con el repositorio Git de la Wiki. Ejecutarlo publica cambios: se utiliza desde un checkout revisado e integrado y con acceso a esa Wiki. Para la primera publicación ejecutamos las operaciones Git equivalentes desde una copia temporal aislada, porque PowerShell no está disponible en este equipo: clonamos la Wiki, comprobamos su estado, copiamos únicamente las ocho fuentes aprobadas, revisamos el diff y publicamos el commit. Conservamos las páginas adicionales del repositorio remoto.

Después de publicar, verificar `Home`, `Entrega-2`, la barra lateral y los enlaces de navegación. Completar los datos reales del VPS, video y release antes de declararlos realizados. La [lista de cierre](../cierre-entrega-2.md) organiza esos pendientes.

Para un repositorio diferente, utilizar el parámetro `-Repository 'PROPIETARIO/Pruebas-De-Software-RentSmart'`. La copia local se conserva en `.cache/`.

La [documentación oficial de GitHub](https://docs.github.com/en/communities/documenting-your-project-with-wikis/adding-or-editing-wiki-pages) describe la creación y edición de páginas. Conservamos el [informe de entrega 1](../entrega-1.md) y el [registro de entrega 2](../entrega-2.md) por separado.
