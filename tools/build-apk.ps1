# Compila el APK de Puentes desde la linea de comandos.
#
#   powershell -ExecutionPolicy Bypass -File tools\build-apk.ps1
#   powershell -ExecutionPolicy Bypass -File tools\build-apk.ps1 -Release
#
# Requiere Android Studio ya abierto una vez (para que exista el SDK).

param(
  [switch]$Release
)

$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent $PSScriptRoot

# --- 1. Buscar un JDK que Gradle pueda usar ---
#
# OJO: el JDK que trae Android Studio es Java 25, y Gradle 8.14 solo corre
# hasta Java 24 ("Unsupported class file major version 69"). Ademas el Android
# Gradle Plugin 8.x esta soportado oficialmente sobre JDK 17 y 21.
# Por eso buscamos primero un JDK 21 o 17, y dejamos el de Android Studio
# como ultimo recurso.
$jdkCandidatos = @()
$jdkCandidatos += Get-ChildItem 'C:\Program Files\Eclipse Adoptium' -Directory -ErrorAction SilentlyContinue |
                  Where-Object { $_.Name -match 'jdk-(21|17)\.' } |
                  Sort-Object Name -Descending |
                  ForEach-Object { $_.FullName }
$jdkCandidatos += Get-ChildItem "$env:USERPROFILE\.jdks" -Directory -ErrorAction SilentlyContinue |
                  Where-Object { $_.Name -match '(21|17)' } |
                  ForEach-Object { $_.FullName }
$jdkCandidatos += @(
  'C:\Program Files\Android\Android Studio\jbr',
  'C:\Program Files\Android\Android Studio\jre'
)

$jdk = $jdkCandidatos | Where-Object { $_ -and (Test-Path (Join-Path $_ 'bin\java.exe')) } | Select-Object -First 1
if (-not $jdk) {
  Write-Host "No encontre ningun JDK." -ForegroundColor Red
  Write-Host "Instala uno con:  winget install EclipseAdoptium.Temurin.21.JDK"
  exit 1
}
$env:JAVA_HOME = $jdk

# `java -version` escribe en stderr. En PowerShell 5.1, redirigir stderr de un
# ejecutable nativo con 2>&1 convierte cada linea en un error terminante, asi
# que hacemos la redireccion dentro de cmd y recibimos texto plano.
$rutaJava = Join-Path $jdk 'bin\java.exe'
$versionJava = (& cmd /c "`"$rutaJava`" -version 2>&1" | Select-Object -First 1)

Write-Host "JDK:  $jdk" -ForegroundColor DarkGray
Write-Host "      $versionJava" -ForegroundColor DarkGray

if ($versionJava -match '"(2[5-9]|[3-9][0-9])') {
  Write-Host ""
  Write-Host "Aviso: ese JDK es demasiado nuevo para Gradle 8.14." -ForegroundColor Yellow
  Write-Host "Instala el 21 con:  winget install EclipseAdoptium.Temurin.21.JDK" -ForegroundColor Yellow
  Write-Host ""
}

# --- 2. Buscar el SDK de Android ---
$sdkCandidatos = @(
  "$env:LOCALAPPDATA\Android\Sdk",
  "$env:USERPROFILE\AppData\Local\Android\Sdk",
  'C:\Android\Sdk',
  $env:ANDROID_HOME,
  $env:ANDROID_SDK_ROOT
) | Where-Object { $_ }
$sdk = $sdkCandidatos | Where-Object { Test-Path (Join-Path $_ 'platforms') } | Select-Object -First 1

if (-not $sdk) {
  Write-Host ""
  Write-Host "No encontre el SDK de Android." -ForegroundColor Red
  Write-Host "Abri Android Studio una vez y completa el asistente de configuracion:"
  Write-Host "  descarga el SDK (alrededor de 1,5 GB) y despues volve a ejecutar este script."
  exit 1
}
$env:ANDROID_HOME = $sdk
$env:ANDROID_SDK_ROOT = $sdk
Write-Host "SDK:  $sdk" -ForegroundColor DarkGray

# --- 3. Dejar constancia en local.properties (lo que espera Gradle) ---
$localProps = Join-Path $raiz 'android\local.properties'
$rutaSdk = $sdk -replace '\\', '\\'
"sdk.dir=$rutaSdk" | Out-File -FilePath $localProps -Encoding ascii
Write-Host "local.properties actualizado" -ForegroundColor DarkGray

# --- 4. Copiar los assets web mas recientes ---
Write-Host ""
Write-Host "Sincronizando assets web..." -ForegroundColor Cyan
Push-Location $raiz
try {
  & npx cap sync android
  if ($LASTEXITCODE -ne 0) { throw "cap sync fallo" }
} finally {
  Pop-Location
}

# --- 5. Compilar ---
$tarea = if ($Release) { 'assembleRelease' } else { 'assembleDebug' }
Write-Host ""
Write-Host "Compilando ($tarea). La primera vez descarga Gradle y tarda varios minutos..." -ForegroundColor Cyan
Write-Host ""

Push-Location (Join-Path $raiz 'android')
try {
  & .\gradlew.bat $tarea --console=plain
  if ($LASTEXITCODE -ne 0) { throw "la compilacion fallo" }
} finally {
  Pop-Location
}

# --- 6. Mostrar donde quedo el archivo ---
$carpeta = if ($Release) { 'release' } else { 'debug' }
$apk = Get-ChildItem -Path (Join-Path $raiz "android\app\build\outputs\apk\$carpeta") -Filter '*.apk' -ErrorAction SilentlyContinue | Select-Object -First 1

Write-Host ""
if ($apk) {
  $mb = [math]::Round($apk.Length / 1MB, 2)
  Write-Host "  APK listo: $($apk.FullName)" -ForegroundColor Green
  Write-Host "  Tamanio:   $mb MB"
  Write-Host ""
  if (-not $Release) {
    Write-Host "  Este es un APK de prueba (debug): sirve para instalarlo en tu telefono," -ForegroundColor DarkGray
    Write-Host "  pero NO para publicarlo en Play Store." -ForegroundColor DarkGray
  }
} else {
  Write-Host "  La compilacion termino pero no encontre el APK." -ForegroundColor Yellow
}
