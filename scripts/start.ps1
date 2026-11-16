<#
.SYNOPSIS
    Master startup script for the Pure Full-Stack Windows AIOps Platform.
#>

$root = if ($PSScriptRoot) { Split-Path -Parent $PSScriptRoot } else { (Get-Location).Path }
Set-Location $root

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "       STARTING WINDOWS AIOPS MONITORING PLATFORM       " -ForegroundColor Cyan
Write-Host "       (Pure Full-Stack: Python Backend + React UI)     " -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Cyan

# 1. Start FastAPI Backend (Port 8000)
Write-Host "[1/2] Starting FastAPI AIOps Backend on port 8000..." -ForegroundColor Yellow
& "$root\scripts\start-backend.ps1"

# 2. Start React Frontend (Port 5173)
Write-Host "`n[2/2] Checking React Frontend on port 5173..." -ForegroundColor Yellow
$frontendRunning = Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue
if (-not $frontendRunning) {
    Write-Host "Starting Vite frontend dev server on port 5173..."
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "cd /d `"$root\frontend`" && npm run dev -- --host 0.0.0.0 --port 5173" -WindowStyle Hidden
    Start-Sleep -Seconds 3
} else {
    Write-Host "Frontend is already running on port 5173."
}

# 3. Health Check
Start-Sleep -Seconds 2
& "$root\scripts\health-check.ps1"
