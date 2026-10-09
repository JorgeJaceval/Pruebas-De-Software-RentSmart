param(
    [ValidatePattern('^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$')]
    [string]$Repository = 'JorgeJaceval/Pruebas-De-Software-RentSmart'
)

$ErrorActionPreference = 'Stop'
$workspaceRoot = Split-Path -Parent $PSScriptRoot
$sourceDirectory = Join-Path $workspaceRoot 'docs/wiki'
$wikiDirectory = Join-Path $workspaceRoot ('.cache/wiki-' + $Repository.Replace('/', '-'))
$wikiRemote = 'https://github.com/' + $Repository + '.wiki.git'
$pageNames = @('Home.md', 'Entrega-1.md', 'Arquitectura.md', 'Instalacion-y-ejecucion.md', 'Estrategia-y-resultados-de-pruebas.md', 'Supuestos-y-dependencias.md', '_Sidebar.md')

foreach ($pageName in $pageNames) {
    if (-not (Test-Path -LiteralPath (Join-Path $sourceDirectory $pageName) -PathType Leaf)) {
        throw "Falta la pagina versionada: $pageName"
    }
}

if (-not (Test-Path -LiteralPath $wikiDirectory)) {
    New-Item -ItemType Directory -Path (Split-Path -Parent $wikiDirectory) -Force | Out-Null
    & git clone $wikiRemote $wikiDirectory
    if ($LASTEXITCODE -ne 0) {
        throw 'Primero crea y guarda una pagina Home en la Wiki de GitHub con una sesion autenticada. Despues vuelve a ejecutar este script.'
    }
}

Push-Location -LiteralPath $wikiDirectory
try {
    $configuredRemote = (& git remote get-url origin).Trim()
    if ($LASTEXITCODE -ne 0 -or $configuredRemote -ne $wikiRemote) {
        throw 'El directorio de publicacion pertenece a otra Wiki.'
    }
    $pendingChanges = & git status --porcelain
    if ($LASTEXITCODE -ne 0 -or $pendingChanges) {
        throw 'La copia local de la Wiki tiene cambios pendientes. Revisalos antes de publicar.'
    }
    & git pull --ff-only
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo actualizar la Wiki sin conflictos.' }

    foreach ($pageName in $pageNames) {
        Copy-Item -LiteralPath (Join-Path $sourceDirectory $pageName) -Destination (Join-Path $wikiDirectory $pageName)
    }
    & git add -- $pageNames
    if ($LASTEXITCODE -ne 0) { throw 'No se pudieron preparar las paginas.' }
    & git diff --cached --check
    if ($LASTEXITCODE -ne 0) { throw 'Las paginas contienen errores de formato.' }
    & git diff --cached --quiet
    if ($LASTEXITCODE -eq 0) {
        & git push origin HEAD
        if ($LASTEXITCODE -ne 0) { throw 'No se pudo comprobar/publicar el estado remoto de la Wiki.' }
        Write-Output 'La Wiki ya coincide con las paginas versionadas.'
        return
    }
    if ($LASTEXITCODE -ne 1) { throw 'No se pudo comparar la Wiki.' }
    & git commit -m 'docs: completar Wiki de Entrega 1'
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo guardar la actualizacion de Wiki.' }
    & git push origin HEAD
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo publicar la Wiki. El commit permanece en la copia local.' }
    Write-Output ('Wiki publicada: https://github.com/' + $Repository + '/wiki')
}
finally {
    Pop-Location
}
