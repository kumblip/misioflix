# MisioFlix v0.4.100 - prepare a separate fresh source clone and repair GitHub release version.
# This script never overwrites existing NAS or local Jellyfin files.
# Use -WyslijNaGitHub only when you intend to push these changes to repo main.
[CmdletBinding()]
param([switch]$WyslijNaGitHub, [switch]$Kompiluj)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$target = Join-Path $root 'MISIOFLIX_V100_POPRAWIONE_ZRODLA'
if (Test-Path -LiteralPath $target) {
    throw "Folder juz istnieje: $target. Nie nadpisuje go. Zmien nazwe lub usun po zapisaniu danych."
}
foreach ($tool in @('git', 'node')) {
    if (!(Get-Command $tool -ErrorAction SilentlyContinue)) { throw "Brak $tool. Zainstaluj go przed uruchomieniem." }
}
$python = 'python'
$pyargs = @()
if (!(Get-Command python -ErrorAction SilentlyContinue)) {
    if (Get-Command py -ErrorAction SilentlyContinue) { $python = 'py'; $pyargs = @('-3') }
    else { throw 'Brak Python 3.' }
}
Write-Host 'Klonuje najnowsze main do osobnego katalogu (bez zmieniania instalacji).'
& git clone --depth 1 --branch main https://github.com/kumblip/misioflix.git $target
if ($LASTEXITCODE -ne 0) { throw 'Nie udalo sie pobrac repozytorium.' }
Push-Location $target
try {
    $existing = @(& git ls-remote --tags origin 'refs/tags/v0.4.100.0')
    if ($LASTEXITCODE -ne 0) { throw 'Nie udalo sie sprawdzic tagu 0.4.100.0. Przerwano.' }
    if ($existing.Count -gt 0 -and ($existing -join '').Trim().Length -gt 0) {
        throw 'Tag v0.4.100.0 juz istnieje. Nie nadpisuje wydan. Uzyj kolejnego numeru i osobnej aktualizacji.'
    }
    & $python @pyargs (Join-Path $root 'prepare_release_v100.py') $target
    if ($LASTEXITCODE -ne 0) { throw 'Nie udalo sie przygotowac poprawionych zrodel v0.4.100.0.' }
    & $python @pyargs 'tools/sync_version.py'
    if ($LASTEXITCODE -ne 0) { throw 'Nie udala sie synchronizacja wersji .csproj.' }
    $version = (& $python @pyargs -c "import json;print(json.load(open('meta.json',encoding='utf-8'))['version'])")
    if ($LASTEXITCODE -ne 0 -or ($version -join '').Trim() -ne '0.4.100.0') {
        throw 'Nieprawidlowa wersja meta.json (oczekiwano 0.4.100.0).'
    }
    & node --check 'src/Jellyfin.Plugin.MisioFlix/Web/home.js'
    if ($LASTEXITCODE -ne 0) { throw 'Bledna skladnia home.js.' }
    & node --check 'src/Jellyfin.Plugin.MisioFlix/Web/client.js'
    if ($LASTEXITCODE -ne 0) { throw 'Bledna skladnia client.js.' }
    if (!(Get-Command npm -ErrorAction SilentlyContinue)) { throw 'Brak npm do uruchomienia zestawu testow CSS.' }
    & npm install --no-save --no-package-lock --ignore-scripts --no-audit --no-fund 'postcss@8'
    if ($LASTEXITCODE -ne 0) { throw 'Nie udalo sie zainstalowac zaleznosci testowych.' }
    & $python @pyargs 'tools/run_tests.py'
    if ($LASTEXITCODE -ne 0) { throw 'Testy nie przeszly; niczego nie wyslano do GitHub.' }
    if ($Kompiluj) {
        if (!(Get-Command dotnet -ErrorAction SilentlyContinue)) { throw 'Wymagane .NET 10 SDK do kompilacji lokalnej.' }
        & dotnet publish 'src/Jellyfin.Plugin.MisioFlix/Jellyfin.Plugin.MisioFlix.csproj' --configuration Release --output 'build/publish'
        if ($LASTEXITCODE -ne 0) { throw 'Kompilacja lokalna nie powiodla sie.' }
        & $python @pyargs 'tools/package.py'
        if ($LASTEXITCODE -ne 0) { throw 'Pakowanie nie powiodlo sie.' }
    }
    # Safety: enumerate only explicitly permitted changed paths. No workflow,
    # Jellyfin, MAL, Simkl, collections, NFO, player, media or manifest edits.
    $allowed = @(
        'meta.json',
        '.github/workflows/build.yml',
        'src/Jellyfin.Plugin.MisioFlix/Jellyfin.Plugin.MisioFlix.csproj',
        'src/Jellyfin.Plugin.MisioFlix/Web/home.js',
        'tests/current/test_library_collections_0425.py',
        'tests/current/search_catalog_cache_100.cjs',
        'CHANGELOG_v0.4.100_SEARCH_CACHE.md'
    )
    $changed = @(& git status --porcelain --untracked-files=all)
    if ($LASTEXITCODE -ne 0) { throw 'Nie udalo sie sprawdzic zmian git.' }
    foreach ($line in $changed) {
        $path = $line.Substring(3).Trim('"')
        if ($path -match '^node_modules/' -or $path -match '^build/' -or $path -match '^dist/' -or $path -match '^bin/' -or $path -match '^obj/') { continue }
        if ($allowed -notcontains $path) { throw "Nieoczekiwany zmieniony plik: $path. Wysylka zatrzymana." }
    }
    Write-Host 'ZRODLA v0.4.100.0: OK. Testy ukonczone. Wersja .csproj zsynchronizowana.'
    if ($WyslijNaGitHub) {
        Write-Host 'Wybrano -WyslijNaGitHub: wysylam TYLKO zweryfikowane pliki do main.'
        & git add -- @allowed
        if ($LASTEXITCODE -ne 0) { throw 'git add nie powiodl sie.' }
        $staged = @(& git diff --cached --name-only)
        if ($LASTEXITCODE -ne 0) { throw 'Nie udalo sie zweryfikowac listy plikow.' }
        if ($staged.Count -eq 0) { throw 'Brak zmian do publikacji.' }
        foreach ($file in $staged) { if ($allowed -notcontains $file) { throw "Niedozwolony plik staged: $file" } }
        & git -c user.name='MisioFlix Release Helper' -c user.email='misioflix-release-helper@users.noreply.github.com' commit -m 'fix: v0.4.100.0 Search Cache i numer wydania'
        if ($LASTEXITCODE -ne 0) { throw 'Nie udalo sie zatwierdzic zmian.' }
        # No force push. Concurrent updates to main cause safe rejection.
        & git push origin HEAD:main
        if ($LASTEXITCODE -ne 0) { throw 'Push odrzucony lub brak uprawnien. Nie nadpisano zmian. Zachowaj lokalna kopie.' }
        Write-Host 'PUSH OK. Sprawdz Actions -> build. Po zielonym build uruchom release z PUBLIKUJ.'
    } else {
        Write-Host 'Nie wyslano nic do GitHub. Aby wyslac, uruchom ponownie paczke w czystym folderze z -WyslijNaGitHub.'
    }
} finally { Pop-Location }
