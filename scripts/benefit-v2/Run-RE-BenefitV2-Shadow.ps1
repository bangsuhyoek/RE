$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$env:SUPABASE_URL = 'https://ssukvsphufvdaanqlmgj.supabase.co'
$plain = [IntPtr]::Zero
try {
    $secret = Read-Host 'RE project secret/service_role key' -AsSecureString
    $plain = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
    $env:SUPABASE_SERVICE_ROLE_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($plain)
    if ([string]::IsNullOrWhiteSpace($env:SUPABASE_SERVICE_ROLE_KEY)) {
        throw 'Key was not entered; no pipeline run was started.'
    }
    Push-Location $projectRoot
    try {
        node (Join-Path $PSScriptRoot 'reShadow.js')
        if ($LASTEXITCODE -ne 0) { throw "RE shadow finished with exit code $LASTEXITCODE" }
    } finally {
        Pop-Location
    }
} finally {
    Remove-Item Env:SUPABASE_SERVICE_ROLE_KEY -ErrorAction SilentlyContinue
    Remove-Item Env:SUPABASE_URL -ErrorAction SilentlyContinue
    if ($plain -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($plain)
    }
}
