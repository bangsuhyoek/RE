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

$configPath = ".\capacitor.config.json"
if (-not (Test-Path $configPath)) {
  throw "capacitor.config.json not found."
}

$config = Get-Content $configPath -Raw | ConvertFrom-Json
if ($config.appId -eq "com.example.re") {
  $appId = Read-Host "Android Application ID (example: com.yourname.re)"
  if ([string]::IsNullOrWhiteSpace($appId) -or $appId -notmatch '^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*){2,}$') {
    throw "Invalid Android Application ID. Example: com.yourname.re"
  }
  $config.appId = $appId
  $config | ConvertTo-Json -Depth 8 | Set-Content $configPath -Encoding UTF8
}

Invoke-Native "[1/6] npm install" { npm install }

if (-not (Test-Path ".\android")) {
  Invoke-Native "[2/6] add Android platform" { npm run android:add }
} else {
  Write-Host "[2/6] Android platform already exists; skipping add." -ForegroundColor DarkGray
}

Invoke-Native "[3/6] npm test" { npm test }
Invoke-Native "[4/6] Vite production build" { npm run build }
Invoke-Native "[5/6] Capacitor Android sync" { npx cap sync android }
Invoke-Native "[6/6] Android icon and splash assets" { npm run android:assets }

Write-Host "Android setup completed successfully." -ForegroundColor Green
Write-Host "Next: powershell -ExecutionPolicy Bypass -File .\scripts\re-android-verify.ps1" -ForegroundColor Green
