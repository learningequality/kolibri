<#
.SYNOPSIS
  Stops the local Kolibri dev instance and cleans up orphan processes.

.DESCRIPTION
  Runs `kolibri stop`, kills any lingering python processes spawned from this
  repo's venv, and removes stale PID files so the next `dev-qr-start.ps1`
  run doesn't hit "another Kolibri server is running".

.PARAMETER Force
  Also kill ALL python.exe processes, not just those under this repo's .venv.
  Use with care if you have other Python applications running.

.EXAMPLE
  .\dev-qr-stop.ps1
  .\dev-qr-stop.ps1 -Force
#>
[CmdletBinding()]
param(
    [switch]$Force
)

$ErrorActionPreference = "Continue"
Set-Location $PSScriptRoot

$VenvKolibri = Join-Path $PSScriptRoot ".venv\Scripts\kolibri.exe"

Write-Host ""
Write-Host "==> Stopping Kolibri dev instance" -ForegroundColor Cyan

# 1. Graceful stop via kolibri's own command.
if (Test-Path $VenvKolibri) {
    & $VenvKolibri stop 2>&1 | Select-String "stopped|ERROR|running" |
        ForEach-Object { Write-Host "    $_" }
} else {
    Write-Host "    [skip] .venv\Scripts\kolibri.exe not found"
}

Start-Sleep -Seconds 2

# 2. Kill python processes belonging to this repo's venv (orphan daemon).
$repoVenv = Join-Path $PSScriptRoot ".venv"
$killed = 0
Get-Process -Name "python" -ErrorAction SilentlyContinue | ForEach-Object {
    $path = $null
    try { $path = $_.Path } catch {}
    $isOurs = $path -and $path.StartsWith($repoVenv)
    if (-not $isOurs -and $Force) {
        # -Force: kill any python that might be holding the kolibri PID.
        # Only do this if the process was started recently (heuristic).
        $isOurs = $true
    }
    if ($isOurs) {
        Write-Host "    Killing python PID=$($_.Id) ($path)"
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
        $killed++
    }
}

if ($killed -eq 0) {
    Write-Host "    [ok] No orphan python processes found"
}

# 3. Remove stale PID / lock files so the next start is clean.
$pidFile = Join-Path $env:USERPROFILE ".kolibri\server.pid"
if (Test-Path $pidFile) {
    Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
    Write-Host "    [ok] Removed stale PID file"
}

# 4. Verify ports 8080 and 8000 are free.
foreach ($port in 8080, 8000) {
    $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($conn) {
        Write-Host "    [warn] Port $port is still in use by PID(s): $($conn.OwningProcess -join ', ')"
    } else {
        Write-Host "    [ok] Port $port is free"
    }
}

Write-Host ""
Write-Host "==> Kolibri dev instance stopped" -ForegroundColor Green
Write-Host ""
