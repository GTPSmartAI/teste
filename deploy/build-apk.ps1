# Gera o APK Android do Mangaflix Prime
# Uso (na raiz do projeto):
#   powershell -ExecutionPolicy Bypass -File deploy\build-apk.ps1            -> APK de teste (debug)
#   powershell -ExecutionPolicy Bypass -File deploy\build-apk.ps1 -Release   -> APK assinado para distribuir
param(
    [switch]$Release,
    [string]$Drive = 'Z:'
)
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$frontend = Join-Path $root 'frontend'
$env:JAVA_HOME = "$env:LOCALAPPDATA\AndroidBuild\jdk21"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"

if (-not (Test-Path "$env:JAVA_HOME\bin\java.exe")) {
    throw "JDK 21 não encontrado em $env:JAVA_HOME"
}
if (-not (Test-Path "$env:ANDROID_HOME\platforms")) {
    throw "Android SDK não encontrado em $env:ANDROID_HOME"
}

Write-Host "== Build web Android (Capacitor sync) ==" -ForegroundColor Cyan
Push-Location $frontend
try {
    npm.cmd run build:android
    if ($LASTEXITCODE -ne 0) { throw 'Falha no build do frontend Android' }
} finally { 
    Pop-Location 
}

# Se o caminho tiver espaços ou caracteres especiais, mapeia unidade temporária
subst $Drive /D 2>$null | Out-Null
subst $Drive "$frontend"
try {
    $task = if ($Release) { 'assembleRelease' } else { 'assembleDebug' }
    Write-Host "== Compilando Gradle ($task) ==" -ForegroundColor Cyan
    cmd /c "cd /d $Drive\android && $Drive\android\gradlew.bat $task --no-daemon -q"
    if ($LASTEXITCODE -ne 0) { throw "Falha no Gradle ($task)" }
} finally {
    subst $Drive /D 2>$null | Out-Null
}

$kind = if ($Release) { 'release' } else { 'debug' }
$src = Get-ChildItem "$frontend\android\app\build\outputs\apk\$kind\*.apk" -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $src) {
    throw "Arquivo APK não foi encontrado em $frontend\android\app\build\outputs\apk\$kind\"
}

$outDir = Join-Path $root 'apk'
New-Item -ItemType Directory -Force $outDir | Out-Null
$dest = Join-Path $outDir ("mangaflix-$kind-" + (Get-Date -Format 'yyyyMMdd-HHmm') + '.apk')
Copy-Item $src.FullName $dest -Force
Write-Host "✓ APK gerado com sucesso: $dest ($([math]::Round($src.Length/1MB,1)) MB)" -ForegroundColor Green
