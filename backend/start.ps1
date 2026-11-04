# Start the Sajha Kaam backend (see README.md). Run from anywhere:
#   .\backend\start.ps1             (or: .\backend\start.ps1 -Port 8001)
# It uses the virtual environment in backend\.venv, and reads backend\.env if it exists.
param([int]$Port = 8000)

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$python = Join-Path $here ".venv\Scripts\python.exe"

if (-not (Test-Path $python)) {
    Write-Host "No virtual environment found in $here\.venv" -ForegroundColor Yellow
    Write-Host "Create it once (README.md, step 2), then run this script again:"
    Write-Host "  cd `"$here`""
    Write-Host "  py -m venv .venv"
    Write-Host "  .\.venv\Scripts\python.exe -m pip install -r requirements.txt"
    exit 1
}

& $python -c "import fastapi, sqlmodel, nacl, bcrypt, jwt, yaml" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Some packages are missing. Install them once, then run this script again:" -ForegroundColor Yellow
    Write-Host "  & `"$python`" -m pip install -r `"$here\requirements.txt`""
    exit 1
}

Set-Location $here
$envArgs = @()
if (Test-Path (Join-Path $here ".env")) {
    $envArgs = @("--env-file", ".env")
    Write-Host "Using settings from backend\.env"
}
Write-Host "Sajha Kaam API on http://0.0.0.0:$Port  (docs: http://localhost:$Port/docs)  Ctrl+C to stop"
& $python -m uvicorn app.main:app --host 0.0.0.0 --port $Port @envArgs
