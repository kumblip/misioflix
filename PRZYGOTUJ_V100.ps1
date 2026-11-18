# PowerShell 5.1+; no changes to Jellyfin/NAS, original checkout or installed DLL.
param([string]$Zrodla = '', [switch]$Kompiluj)
$ErrorActionPreference='Stop'
$scriptDir=Split-Path -Parent $MyInvocation.MyCommand.Path
$target=Join-Path $scriptDir 'MisioFlix_v0.4.100_ZRODLA'
if(Test-Path $target){throw "Katalog docelowy juz istnieje: $target. Nie nadpisuje istniejacych danych."}
if($Zrodla){
  $source=(Resolve-Path $Zrodla).Path
  if(!(Test-Path (Join-Path $source 'meta.json'))){throw 'Wskazany katalog nie zawiera meta.json'}
  New-Item -ItemType Directory -Path $target | Out-Null
  Get-ChildItem -Force -LiteralPath $source | Where-Object {$_.Name -ne '.git'} | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination $target -Recurse -Force
  }
}else{
  if(!(Get-Command git -ErrorAction SilentlyContinue)){throw 'Brak git. Zainstaluj Git for Windows lub podaj -Zrodla.'}
  & git clone --depth 1 https://github.com/kumblip/misioflix.git $target
  if($LASTEXITCODE -ne 0){throw 'Nie udalo sie pobrac repozytorium.'}
}
$python='python'
if(!(Get-Command python -ErrorAction SilentlyContinue)){
 if(Get-Command py -ErrorAction SilentlyContinue){$python='py'}
 else{throw 'Wymagany Python 3. Nie modyfikowano wersji na NAS.'}
}
$cmdArgs=@()
if($python -eq 'py'){$cmdArgs=@('-3')}
& $python @cmdArgs (Join-Path $scriptDir 'apply_patch.py') $target
if($LASTEXITCODE -ne 0){throw 'Patch przerwany: bazowa wersja musi byc 0.4.99.0 i miec zgodne fragmenty.'}
Push-Location $target
try{
  & $python @cmdArgs 'tools/sync_version.py'
  if($LASTEXITCODE -ne 0){throw 'Synchronizacja wersji nie powiodla sie.'}
  if(!(Get-Command node -ErrorAction SilentlyContinue)){throw 'Wymagany Node.js do kontroli regresji.'}
  & node --check 'src/Jellyfin.Plugin.MisioFlix/Web/home.js'
  if($LASTEXITCODE -ne 0){throw 'Bledna skladnia JavaScript.'}
  if(Get-Command npm -ErrorAction SilentlyContinue){
    & npm install --no-save --no-package-lock --ignore-scripts --no-audit --no-fund 'postcss@8'
    if($LASTEXITCODE -ne 0){throw 'Instalacja zaleznosci testow nie powiodla sie.'}
  }
  & $python @cmdArgs 'tools/run_tests.py'
  if($LASTEXITCODE -ne 0){throw 'Regresja! Nie uzywaj tej kompilacji.'}
  if($Kompiluj){
    if(!(Get-Command dotnet -ErrorAction SilentlyContinue)){throw 'Do kompilacji wymagany jest .NET 10 SDK.'}
    & dotnet publish 'src/Jellyfin.Plugin.MisioFlix/Jellyfin.Plugin.MisioFlix.csproj' --configuration Release --output 'build/publish'
    if($LASTEXITCODE -ne 0){throw 'Kompilacja nie powiodla sie.'}
    & $python @cmdArgs 'tools/package.py'
    if($LASTEXITCODE -ne 0){throw 'Pakowanie DLL nie powiodlo sie.'}
  }
}finally{Pop-Location}
$sourceZip=Join-Path $scriptDir 'MisioFlix_v0.4.100_ZRODLA.zip'
if(Test-Path $sourceZip){throw 'Archiwum zrodel juz istnieje. Nie nadpisuje.'}
$items=Get-ChildItem -Force -LiteralPath $target | Where-Object {$_.Name -notin @('.git','node_modules','build','bin','obj')}
Compress-Archive -Path $items.FullName -DestinationPath $sourceZip -CompressionLevel Optimal
Write-Host "GOTOWE: $sourceZip"
if($Kompiluj){Write-Host 'DLL i paczka Jellyfin: sprawdz katalog build/ w nowej kopii zrodel.'}
