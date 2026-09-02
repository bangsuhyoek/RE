[CmdletBinding()]
param(
  [switch]$Start
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$projectPath = Split-Path -Parent $PSScriptRoot
$packagePath = Join-Path $projectPath "package.json"
$envPath = Join-Path $projectPath ".env.local"

if (-not (Test-Path -LiteralPath $packagePath)) {
  throw "SubMate 프로젝트 루트에서 스크립트를 실행하지 못했습니다."
}

Write-Host "Google Vision API 키를 입력해 주세요." -ForegroundColor Cyan
Write-Host "입력 내용은 화면에 표시되지 않으며 .env.local에만 저장됩니다." -ForegroundColor DarkGray
$secureKey = Read-Host "GOOGLE_VISION_API_KEY" -AsSecureString
$keyPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)

try {
  $visionKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($keyPointer).Trim()
  if (-not $visionKey -or $visionKey -eq "replace_with_your_google_cloud_vision_api_key") {
    throw "실제 Google Vision API 키가 입력되지 않았습니다."
  }
  if (-not $visionKey.StartsWith("AIza")) {
    throw "Google Cloud API 키 형식이 아닙니다. 일반적으로 키 문자열은 AIza로 시작합니다."
  }

  $envContent = "GOOGLE_VISION_API_KEY=$visionKey`n"
  [IO.File]::WriteAllText($envPath, $envContent, [Text.UTF8Encoding]::new($false))
}
finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($keyPointer)
}

Set-Location $projectPath
Write-Host "[1/2] 패키지를 확인합니다." -ForegroundColor Cyan
& npx --yes pnpm@11.19.0 install --frozen-lockfile
if ($LASTEXITCODE -ne 0) {
  throw "패키지 설치에 실패했습니다."
}

Write-Host "[2/2] 로컬 OCR 설정이 완료되었습니다." -ForegroundColor Green
Write-Host ".env.local은 GitHub에 커밋되지 않습니다." -ForegroundColor DarkGray

if ($Start) {
  Write-Host "SubMate 개발 서버를 시작합니다." -ForegroundColor Cyan
  & npx --yes pnpm@11.19.0 dev
  exit $LASTEXITCODE
}

Write-Host "다음 명령으로 실행하세요: npx --yes pnpm@11.19.0 dev" -ForegroundColor Yellow
