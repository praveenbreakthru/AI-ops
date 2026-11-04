<#
.SYNOPSIS
    Master startup script for the complete Windows AIOps Platform.
#>

$root = if ($PSScriptRoot) { Split-Path -Parent $PSScriptRoot } else { (Get-Location).Path }
Set-Location $root

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "       STARTING WINDOWS AIOPS MONITORING PLATFORM       " -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Cyan

# 1. Start windows_exporter
Write-Host "[1/5] Starting native windows_exporter..." -ForegroundColor Yellow
& "$root\scripts\start-windows-exporter.ps1"

# 2. Start Grafana Alloy
Write-Host "`n[2/5] Starting Grafana Alloy log shipper..." -ForegroundColor Yellow
& "$root\scripts\start-alloy.ps1"

# 3. Start Docker Compose Stack (Prometheus, Loki, Alertmanager, Grafana, PostgreSQL)
Write-Host "`n[3/5] Starting Docker core observability containers..." -ForegroundColor Yellow
docker compose -f "$root\docker\docker-compose.yml" up -d

# 4. Start FastAPI Backend
Write-Host "`n[4/5] Starting FastAPI AIOps Backend..." -ForegroundColor Yellow
& "$root\scripts\start-backend.ps1"

# 5. Start React Frontend
Write-Host "`n[5/5] Checking React Frontend dev server..." -ForegroundColor Yellow
$frontendRunning = Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue
if (-not $frontendRunning) {
    Write-Host "Starting Vite frontend on port 5173..."
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "cd /d `"$root\frontend`" && npm run dev -- --host 0.0.0.0 --port 5173" -WindowStyle Hidden
    Start-Sleep -Seconds 3
} else {
    Write-Host "Frontend is already running on port 5173."
}

# 6. Run Health Verification
Start-Sleep -Seconds 3
& "$root\scripts\health-check.ps1"

