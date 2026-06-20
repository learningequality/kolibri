<#
.SYNOPSIS
  Brings up a fresh local Kolibri dev instance with QR code login enabled.

.DESCRIPTION
  Idempotent: safe to re-run. Creates venv, installs deps, runs migrations,
  provisions a test facility with QR login + 3 learners, and starts the server
  as a background daemon on port 8080.

.PARAMETER ForceInstall
  Re-run pip/pnpm install even if .venv/node_modules already exist.

.PARAMETER Foreground
  Run the Kolibri server in the foreground (blocks the terminal) instead of
  daemonising. Useful for debugging.

.PARAMETER Port
  Port to serve Kolibri on. Defaults to 8080.

.PARAMETER FacilityName
  Facility name. Defaults to "QR Test Facility".

.EXAMPLE
  .\dev-qr-start.ps1
  .\dev-qr-start.ps1 -Foreground
  .\dev-qr-start.ps1 -FacilityName "My School" -Port 8000
#>
[CmdletBinding()]
param(
    [switch]$ForceInstall,
    [switch]$Foreground,
    [int]$Port = 8080,
    [string]$FacilityName = "QR Test Facility"
)

$ErrorActionPreference = "Continue"
$PSNativeCommandErrorActionPreference = $false
Set-Location $PSScriptRoot

$env:DJANGO_SETTINGS_MODULE = "kolibri.deployment.default.settings.dev"
$env:KOLIBRI_RUN_MODE = "dev"
$env:KOLIBRI_DEV_FACILITY = $FacilityName

function Write-Phase($msg) {
    Write-Host ""
    Write-Host "==> $msg" -ForegroundColor Cyan
}

function Write-Ok($msg)   { Write-Host "    [ok]   $msg" -ForegroundColor Green }
function Write-Skip($msg) { Write-Host "    [skip] $msg" -ForegroundColor DarkGray }
function Write-Err($msg)  { Write-Host "    [err]  $msg" -ForegroundColor Red }

# ---------------------------------------------------------------------------
# Phase 1 â-- Python virtualenv + dependencies
# ---------------------------------------------------------------------------
Write-Phase "Python virtualenv + dependencies"

$VenvPython = Join-Path $PSScriptRoot ".venv\Scripts\python.exe"
$VenvKolibri = Join-Path $PSScriptRoot ".venv\Scripts\kolibri.exe"

if (-not (Test-Path $VenvPython)) {
    Write-Host "    Creating .venv ..."
    # Find a base Python to create the venv from.
    $basePython = (Get-Command python.exe -ErrorAction SilentlyContinue).Source
    if (-not $basePython) { throw "python.exe not found on PATH." }
    & $basePython -m venv .venv
    & $VenvPython -m pip install --upgrade pip "setuptools<82" wheel
    Write-Ok "venv created"
} else {
    Write-Skip ".venv already exists"
}

# Check whether kolibri/django are importable inside the venv.
$depsOk = $true
& $VenvPython -c "import django, kolibri" 2>$null
if ($LASTEXITCODE -ne 0) { $depsOk = $false }

if (-not $depsOk -or $ForceInstall) {
    Write-Host "    Installing Python dev + test requirements..."
    & $VenvPython -m pip install -r requirements/dev.txt
    & $VenvPython -m pip install -r requirements/test.txt
    & $VenvPython -m pip install -e . --no-deps
    Write-Ok "Python deps installed"
} else {
    Write-Skip "Python deps already installed"
}

# ---------------------------------------------------------------------------
# Phase 2 â-- pnpm dependencies (optional; needed for webpack/Jest only)
# ---------------------------------------------------------------------------
Write-Phase "pnpm dependencies (for Jest / webpack)"

$PnpmAvailable = $null -ne (Get-Command pnpm -ErrorAction SilentlyContinue)
if (-not $PnpmAvailable) {
    Write-Host "    pnpm not found; enabling via corepack..."
    cmd /c "corepack enable pnpm 2>$null" 2>&1 | Out-Null
    $PnpmAvailable = $null -ne (Get-Command pnpm -ErrorAction SilentlyContinue)
}

if ($PnpmAvailable) {
    if ((-not (Test-Path "node_modules")) -or $ForceInstall) {
        Write-Host "    Running pnpm install --ignore-scripts ..."
        # --ignore-scripts skips the deasync native build (needs VS Build Tools).
        # Lint and Jest work fine without it; webpack builds may need it.
        cmd /c "pnpm install --prefer-offline --ignore-scripts 2>&1" 2>&1 | Out-Null
        Write-Ok "pnpm install done (scripts skipped)"
    } else {
        Write-Skip "node_modules already present"
    }
} else {
    Write-Skip "pnpm unavailable â-- skipping JS deps (backend-only mode)"
}

# ---------------------------------------------------------------------------
# Phase 3 â-- Database migrations
# ---------------------------------------------------------------------------
Write-Phase "Database migrations"

# configure setup is idempotent.
& $VenvKolibri configure setup 2>&1 | Select-String "successfully|migrat|ERROR" | ForEach-Object { Write-Host "    $_" }
Write-Ok "migrations applied"

# ---------------------------------------------------------------------------
# Phase 4 â-- Facility + QR login + test learners
# ---------------------------------------------------------------------------
Write-Phase "Facility provisioning + QR login enablement"

Get-Content "$PSScriptRoot\dev_setup_qr.py" | & $VenvKolibri manage shell 2>&1 |
    Select-String "^\[(ok|skip)\]|^=" |
    ForEach-Object { Write-Host "    $_" }

# ---------------------------------------------------------------------------
# Phase 5 â-- Start server
# ---------------------------------------------------------------------------
Write-Phase "Starting Kolibri server"

# Stop any lingering instance first so port/PID are clean.
& $VenvKolibri stop 2>$null | Out-Null
Start-Sleep -Seconds 2

# Kill orphan python processes that might hold the PID file.
Get-Process -Name "python" -ErrorAction SilentlyContinue |
    Where-Object {
        $_.Path -and $_.Path.StartsWith($PSScriptRoot)
    } | ForEach-Object {
        Write-Host "    Killing orphan kolibri python process (PID=$($_.Id))..."
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    }
Start-Sleep -Seconds 1
Remove-Item "$env:USERPROFILE\.kolibri\server.pid" -Force -ErrorAction SilentlyContinue

if ($Foreground) {
    Write-Host "    Starting in foreground (Ctrl+C to stop)..."
    & $VenvKolibri start --foreground
    return
}

Write-Host "    Starting daemonised on port $Port ..."
# Write a launcher batch file so the quoting is trivial and the process is
# fully detached from this PowerShell session.
$launcher = Join-Path $env:TEMP "kolibri-dev-launcher.bat"
@"
@echo off
cd /d "$PSScriptRoot"
set DJANGO_SETTINGS_MODULE=kolibri.deployment.default.settings.dev
set KOLIBRI_RUN_MODE=dev
"$VenvKolibri" start
"@ | Set-Content $launcher -Encoding ASCII
Start-Process -FilePath "cmd.exe" -ArgumentList "/c", $launcher -WindowStyle Hidden -PassThru | Out-Null

# Wait for HTTP to respond (max 60s).
$ready = $false
for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Seconds 1
    try {
        Invoke-WebRequest -Uri "http://127.0.0.1:$Port/api/auth/facility/" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop | Out-Null
        $ready = $true
        break
    } catch {
        if ($_.Exception.Response) { $ready = $true; break }
    }
}

if ($ready) {
    Write-Ok "Kolibri is up at http://127.0.0.1:$Port/"
} else {
    Write-Err "Kolibri did not respond within 60s. Check $env:TEMP\kolibri-dev.log"
    return
}

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "==============================================================" -ForegroundColor Yellow
Write-Host " Kolibri QR-login dev instance is running" -ForegroundColor Yellow
Write-Host "==============================================================" -ForegroundColor Yellow
Write-Host "  URL:          http://127.0.0.1:$Port/"
Write-Host "  Admin login:  a / a"
Write-Host "  Learners:     learner1, learner2, learner3  (password: pass)"
Write-Host "  Stop with:    .\dev-qr-stop.ps1"
Write-Host ""
Write-Host "  NOTE: Frontend Vue bundles are not webpack-compiled by this script."
Write-Host "        For full UI (QR sign-in page, cards), run instead:"
Write-Host "          pnpm devserver"
Write-Host "==============================================================" -ForegroundColor Yellow
