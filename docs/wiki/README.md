# Publicación de la Wiki

Los siete archivos de esta carpeta son la fuente versionada de las páginas de GitHub Wiki. `Home.md` reúne los enlaces a alcance, arquitectura, instalación, pruebas y supuestos. Este README contiene instrucciones de publicación y no se copia como página.

## Navegación de la copia versionada

- [Inicio](Home.md)
- [Entrega 1](Entrega-1.md)
- [Arquitectura](Arquitectura.md)
- [Instalación y ejecución](Instalacion-y-ejecucion.md)
- [Estrategia y resultados de pruebas](Estrategia-y-resultados-de-pruebas.md)
- [Supuestos y dependencias](Supuestos-y-dependencias.md)

## Publicar en GitHub

1. Iniciar sesión en GitHub con permisos de escritura del repositorio y crear/guardar la primera página `Home` desde [la Wiki](https://github.com/JorgeJaceval/Pruebas-De-Software-RentSmart/wiki).
2. Desde la raíz del repositorio, ejecutar en PowerShell:

   ```powershell
   ./scripts/publicar-wiki.ps1
   ```

3. Verificar Home, la barra lateral y las cinco páginas temáticas en GitHub. El script copia únicamente las siete páginas conocidas, conserva otras páginas existentes y publica en el repositorio Git de la Wiki. No modifica las ramas de la aplicación, tags ni Releases.

Si cambia el propietario del repositorio, usar `./scripts/publicar-wiki.ps1 -Repository 'ORGANIZACION/Pruebas-De-Software-RentSmart'` con el destino real. La copia local queda bajo `.cache/` y una Wiki con cambios locales o conflictos requiere revisión antes de volver a publicar.

GitHub requiere crear una página inicial en su interfaz antes de clonar una Wiki nueva: [documentación oficial](https://docs.github.com/en/communities/documenting-your-project-with-wikis/adding-or-editing-wiki-pages).

La presencia de estos archivos acredita contenido preparado; la publicación se registra por separado en [el estado de entrega](../entrega-1.md).
