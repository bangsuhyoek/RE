$ErrorActionPreference = "Stop"

function Invoke-Native {
  param(
    [Parameter(Mandatory = $true)][string]$Label,
    [Parameter(Mandatory = $true)][scriptblock]$Command
  )
  Write-Host $Label -ForegroundColor Cyan
  & $Command
  if ($LASTEXITCODE -ne 0) {
    throw "$Label failed with exit code $LASTEXITCODE"
  }
}

if (-not (Test-Path ".\package.json")) {
  throw "Run this script from the RE project root (package.json not found)."
}
if (-not (Test-Path ".\android")) {
  throw "android folder not found. Run re-android-setup.ps1 first."
}

Invoke-Native "[1/5] npm test" { npm test }
Invoke-Native "[2/5] Vite production build" { npm run build }
Invoke-Native "[3/5] Capacitor Android sync" { npx cap sync android }
Invoke-Native "[4/5] Capacitor doctor" { npx cap doctor }

Write-Host "[5/5] Android Gradle debug build" -ForegroundColor Cyan
Push-Location .\android
try {
  & .\gradlew.bat assembleDebug
  if ($LASTEXITCODE -ne 0) {
    throw "Android Gradle debug build failed with exit code $LASTEXITCODE"
  }
} finally {
  Pop-Location
}

Write-Host "All Android verification steps passed." -ForegroundColor Green
Write-Host "APK path (if Gradle used the standard output): android\app\build\outputs\apk\debug\app-debug.apk" -ForegroundColor Green
