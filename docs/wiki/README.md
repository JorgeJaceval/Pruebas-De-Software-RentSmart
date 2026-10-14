# Documentación de la Wiki

Esta carpeta contiene las fuentes versionadas de las seis páginas de GitHub Wiki y su barra lateral. `Home.md` reúne los enlaces a alcance, arquitectura, instalación, pruebas y supuestos. Este README contiene las instrucciones de mantenimiento.

La documentación está disponible en la [Wiki pública](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/wiki).

## Navegación de la copia versionada

- [Inicio](Home.md)
- [Entrega 1](Entrega-1.md)
- [Arquitectura](Arquitectura.md)
- [Instalación y ejecución](Instalacion-y-ejecucion.md)
- [Estrategia y resultados de pruebas](Estrategia-y-resultados-de-pruebas.md)
- [Supuestos y dependencias](Supuestos-y-dependencias.md)

## Actualizar la Wiki

Desde la raíz del repositorio, ejecutar en PowerShell:

```powershell
./scripts/publicar-wiki.ps1
```

El script sincroniza las seis páginas y la barra lateral con el repositorio Git de la Wiki. Después de publicar, verificar los enlaces de navegación y el contenido actualizado.

Para un repositorio diferente, utilizar el parámetro `-Repository 'PROPIETARIO/Pruebas-De-Software-RentSmart'`. La copia local se conserva en `.cache/`.

La [documentación oficial de GitHub](https://docs.github.com/en/communities/documenting-your-project-with-wikis/adding-or-editing-wiki-pages) describe la creación y edición de páginas. El [informe de entrega](../entrega-1.md) reúne las referencias al resto de los artefactos.
