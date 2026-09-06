$ErrorActionPreference = "Stop"

$apiBase = Read-Host "현재 배포된 RE. Vercel 주소를 입력하세요 (예: https://example.vercel.app)"
$supabaseUrl = Read-Host "RE. Supabase Project URL을 입력하세요"
$supabaseKey = Read-Host "RE. Supabase Publishable Key를 입력하세요"

$apiBase = $apiBase.TrimEnd('/')

$content = @"
VITE_API_BASE_URL=$apiBase
VITE_SUPABASE_URL=$supabaseUrl
VITE_SUPABASE_PUBLISHABLE_KEY=$supabaseKey
"@

Set-Content -Path ".env.local" -Value $content -Encoding UTF8
Write-Host ".env.local 설정 완료" -ForegroundColor Green
Write-Host "GEMINI_API_KEY / GOOGLE_VISION_API_KEY는 브라우저에 노출되면 안 되는 서버 환경변수이므로 .env.local에 넣지 않습니다." -ForegroundColor Yellow
Write-Host "환경변수 반영 후 다시 동기화: npm run android:sync" -ForegroundColor Cyan
