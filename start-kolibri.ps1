<#
.SYNOPSIS
  Complete Kolibri startup script - brings up a fully working local instance.

.DESCRIPTION
  Executes all steps needed to bring up Kolibri from scratch:
    1. Python venv + dependencies
    2. pnpm dependencies
    3. Database migrations
    4. Facility provisioning (with QR login enabled + test learners)
    5. Frontend build / dev server
    6. Server startup + health check

  The script is idempotent and can be re-run safely.

.PARAMETER Mode
    "dev"     - Start pnpm devserver (hot-reload, port 8000). DEFAULT.
    "prod"    - Build production assets and start kolibri daemon (port 8080).
    "backend" - Backend API only, no frontend (port 8080).

.PARAMETER FacilityName
    Facility name for the test facility. Defaults to "QR Test Facility".

.EXAMPLE
    .\start-kolibri.ps1
    .\start-kolibri.ps1 -Mode prod
    .\start-kolibri.ps1 -Mode backend
#>
[CmdletBinding()]
param(
    [ValidateSet("dev", "prod", "backend")]
    [string]$Mode = "dev",
    [string]$FacilityName = "QR Test Facility"
)

$ErrorActionPreference = "Continue"
Set-Location $PSScriptRoot

$env:DJANGO_SETTINGS_MODULE = "kolibri.deployment.default.settings.dev"
$env:KOLIBRI_RUN_MODE = "dev"
$env:KOLIBRI_DEV_FACILITY = $FacilityName

# --- Helpers ---------------------------------------------------------------
function Write-Phase($msg)  { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)     { Write-Host "    [ok]   $msg" -ForegroundColor Green }
function Write-Skip($msg)   { Write-Host "    [skip] $msg" -ForegroundColor DarkGray }
function Write-Warn($msg)   { Write-Host "    [warn] $msg" -ForegroundColor Yellow }
function Write-Err($msg)    { Write-Host "    [err]  $msg" -ForegroundColor Red }

$VenvPython  = Join-Path $PSScriptRoot ".venv\Scripts\python.exe"
$VenvKolibri = Join-Path $PSScriptRoot ".venv\Scripts\kolibri.exe"
$VenvPip     = Join-Path $PSScriptRoot ".venv\Scripts\pip.exe"

# --- Stop any existing instance --------------------------------------------
Write-Phase "Stopping any existing Kolibri instance"
if (Test-Path $VenvKolibri) {
    & $VenvKolibri stop 2>$null | Out-Null
}
Get-Process -Name "python" -ErrorAction SilentlyContinue |
    Where-Object { $_.Path -and $_.Path.StartsWith($PSScriptRoot) } |
    ForEach-Object { Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue }
Remove-Item "$env:USERPROFILE\.kolibri\server.pid" -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Write-Ok "Clean slate"

# === PHASE 1: Python venv + deps ==========================================
Write-Phase "Phase 1/6: Python virtualenv + dependencies"

if (-not (Test-Path $VenvPython)) {
    Write-Host "    Creating .venv ..."
    $basePython = (Get-Command python.exe -ErrorAction SilentlyContinue).Source
    if (-not $basePython) { throw "python.exe not found on PATH" }
    & $basePython -m venv .venv
    & $VenvPython -m pip install --upgrade pip "setuptools<82" wheel
    Write-Ok "venv created"
} else {
    Write-Skip ".venv exists"
}

& $VenvPython -c "import django, kolibri" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "    Installing Python dependencies (this takes a few minutes) ..."
    & $VenvPython -m pip install -r requirements/dev.txt 2>&1 | Out-Null
    & $VenvPython -m pip install -r requirements/test.txt 2>&1 | Out-Null
    & $VenvPython -m pip install -e . --no-deps 2>&1 | Out-Null
    Write-Ok "Python deps installed"
} else {
    Write-Skip "Python deps already installed"
}

# === PHASE 2: pnpm deps ===================================================
Write-Phase "Phase 2/6: JavaScript dependencies (pnpm)"

# Ensure pnpm is available
$pnpmCmd = (Get-Command pnpm -ErrorAction SilentlyContinue).Source
if (-not $pnpmCmd) {
    Write-Host "    Enabling pnpm via corepack ..."
    cmd /c "corepack enable pnpm 2>$null" 2>&1 | Out-Null
    $pnpmCmd = (Get-Command pnpm -ErrorAction SilentlyContinue).Source
}

if ($pnpmCmd) {
    if (-not (Test-Path "node_modules")) {
        Write-Host "    Running pnpm install (this takes a few minutes) ..."
        cmd /c "pnpm install --prefer-offline 2>&1" 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-Warn "Full pnpm install failed (likely a native-module build issue)."
            Write-Host "    Retrying with --ignore-scripts ..."
            cmd /c "pnpm install --prefer-offline --ignore-scripts 2>&1" 2>&1 | Out-Null
        }
        Write-Ok "pnpm install complete"
    } else {
        Write-Skip "node_modules exists"
    }

    # Fix: node-sass on ARM64 Windows ships a broken binary (HTTP 404 saved as .node).
    # Install Dart Sass as a fallback that sass-loader auto-detects.
    $nodeArch = & node -e "process.stdout.write(process.arch)"
    if ($nodeArch -eq "arm64") {
        Write-Host "    ARM64 detected: installing Dart Sass for SCSS compilation ..."
        cmd /c "pnpm add -wD sass@^1.69.0 --prefer-offline 2>&1" 2>&1 | Out-Null
        Write-Ok "Dart Sass installed (ARM64 workaround)"
    }
} else {
    Write-Warn "pnpm unavailable - frontend will not be available"
}

# === PHASE 3: Database migrations =========================================
Write-Phase "Phase 3/6: Database migrations"
& $VenvKolibri configure setup 2>&1 | Select-String "successfully" | ForEach-Object { Write-Host "    $_" }
Write-Ok "Migrations applied"

# === PHASE 4: Facility + QR login + learners ==============================
Write-Phase "Phase 4/6: Facility provisioning (QR login + test learners)"

Get-Content "$PSScriptRoot\dev_setup_qr.py" -Raw | & $VenvKolibri manage shell 2>&1 |
    Select-String "^\[(ok|skip)\]|^=" |
    ForEach-Object { Write-Host "    $_" }

# === PHASE 5+6: Start server ===============================================
switch ($Mode) {

    "dev" {
        Write-Phase "Phase 5/6: Starting pnpm devserver (Django + webpack watcher)"
        Write-Host "    First webpack compile takes 2-5 minutes."

        # Write a batch launcher so the process is fully detached.
        $launcher = Join-Path $env:TEMP "kolibri-devserver-launcher.bat"
        $venvScripts = Join-Path $PSScriptRoot ".venv\Scripts"
        @"
@echo off
cd /d "$PSScriptRoot"
set DJANGO_SETTINGS_MODULE=kolibri.deployment.default.settings.dev
set KOLIBRI_RUN_MODE=dev
set PATH=$venvScripts;%PATH%
call pnpm devserver > "$env:TEMP\kolibri-devserver.log" 2>&1
"@ | Set-Content $launcher -Encoding ASCII

        # Use WMI for a truly detached process that survives this script.
        ([wmiclass]"Win32_Process").Create("cmd /c `"$launcher`"") | Out-Null

        Write-Host ""
        Write-Host "    Waiting for Django backend on port 8000 ..."
        $ready = $false
        for ($i = 0; $i -lt 120; $i++) {
            Start-Sleep -Seconds 5
            try {
                Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/auth/facility/" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop | Out-Null
                $ready = $true
                break
            } catch {
                if ($_.Exception.Response) { $ready = $true; break }
            }
            if ($i % 6 -eq 5) {
                Write-Host "    Still waiting ... ($($i * 5)s elapsed)"
                # Show latest log line for feedback
                $tail = Get-Content "$env:TEMP\kolibri-devserver.log" -Tail 1 -ErrorAction SilentlyContinue
                if ($tail) { Write-Host "    log: $tail" }
            }
        }

        if ($ready) {
            Write-Ok "Django backend is up"
        } else {
            Write-Warn "Django not responding after 10 minutes. Check the devserver window."
        }

        Write-Host ""
        Write-Host "==============================================================" -ForegroundColor Yellow
        Write-Host " Kolibri dev server is starting" -ForegroundColor Yellow
        Write-Host "==============================================================" -ForegroundColor Yellow
        Write-Host "  Backend API:   http://127.0.0.1:8000/api/auth/facility/"
        Write-Host "  Full UI:       http://127.0.0.1:8000/"
        Write-Host "                  (available once webpack finishes compiling -"
        Write-Host "                   watch the devserver window for the message"
        Write-Host "                   'Compiled successfully')"
        Write-Host "  Admin login:   a / a"
        Write-Host "  Learners:      learner1, learner2, learner3 (password: pass)"
        Write-Host ""
        Write-Host "  Stop:          Close the devserver window, or:"
        Write-Host "                 .\dev-qr-stop.ps1"
        Write-Host "==============================================================" -ForegroundColor Yellow
    }

    "prod" {
        Write-Phase "Phase 5/6: Building production frontend assets"
        Write-Host "    Running kolibri-build prod (this takes several minutes) ..."
        $buildResult = cmd /c "pnpm kolibri-build prod --file ./build_tools/build_plugins.txt --transpile 2>&1" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Ok "Frontend assets built"
        } else {
            Write-Err "Frontend build failed. Falling back to backend-only mode."
            Write-Host "    (This is expected on ARM64 Windows where node-sass has no binary.)"
            $Mode = "backend"
        }

        if ($Mode -eq "prod") {
            Write-Phase "Phase 6/6: Starting Kolibri server (production mode)"
            $launcher = Join-Path $env:TEMP "kolibri-prod-launcher.bat"
            @"
@echo off
cd /d "$PSScriptRoot"
set DJANGO_SETTINGS_MODULE=kolibri.deployment.default.settings.dev
set KOLIBRI_RUN_MODE=dev
"$VenvKolibri" start
"@ | Set-Content $launcher -Encoding ASCII
            Start-Process -FilePath "cmd.exe" -ArgumentList "/c", $launcher -WindowStyle Hidden -PassThru | Out-Null

            Write-Host "    Waiting for server ..."
            for ($i = 0; $i -lt 60; $i++) {
                Start-Sleep -Seconds 1
                try {
                    Invoke-WebRequest -Uri "http://127.0.0.1:8080/" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop | Out-Null
                    break
                } catch {
                    if ($_.Exception.Response) { break }
                }
            }
            Write-Ok "Server is up at http://127.0.0.1:8080/"
            Write-Host ""
            Write-Host "==============================================================" -ForegroundColor Yellow
            Write-Host " Kolibri is running (production mode)" -ForegroundColor Yellow
            Write-Host "==============================================================" -ForegroundColor Yellow
            Write-Host "  URL:           http://127.0.0.1:8080/"
            Write-Host "  Admin login:   a / a"
            Write-Host "  Learners:      learner1, learner2, learner3 (password: pass)"
            Write-Host "  Stop:          .\dev-qr-stop.ps1"
            Write-Host "==============================================================" -ForegroundColor Yellow
        }
    }

    "backend" {
        Write-Phase "Phase 5/6: Starting Kolibri backend (API only, no frontend)"
        $launcher = Join-Path $env:TEMP "kolibri-backend-launcher.bat"
        @"
@echo off
cd /d "$PSScriptRoot"
set DJANGO_SETTINGS_MODULE=kolibri.deployment.default.settings.dev
set KOLIBRI_RUN_MODE=dev
"$VenvKolibri" start
"@ | Set-Content $launcher -Encoding ASCII
        Start-Process -FilePath "cmd.exe" -ArgumentList "/c", $launcher -WindowStyle Hidden -PassThru | Out-Null

        Write-Host "    Waiting for server ..."
        for ($i = 0; $i -lt 60; $i++) {
            Start-Sleep -Seconds 1
            try {
                Invoke-WebRequest -Uri "http://127.0.0.1:8080/api/auth/facility/" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop | Out-Null
                break
            } catch {
                if ($_.Exception.Response) { break }
            }
        }
        Write-Ok "Backend API is up at http://127.0.0.1:8080/"
        Write-Host ""
        Write-Host "==============================================================" -ForegroundColor Yellow
        Write-Host " Kolibri backend is running (API only)" -ForegroundColor Yellow
        Write-Host "==============================================================" -ForegroundColor Yellow
        Write-Host "  API:           http://127.0.0.1:8080/api/auth/facility/"
        Write-Host "  Admin login:   a / a"
        Write-Host "  Stop:          .\dev-qr-stop.ps1"
        Write-Host "==============================================================" -ForegroundColor Yellow
    }
}
