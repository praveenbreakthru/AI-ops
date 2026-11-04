<#
.SYNOPSIS
    Master shutdown script for the complete Windows AIOps Platform.
#>

$root = if ($PSScriptRoot) { Split-Path -Parent $PSScriptRoot } else { (Get-Location).Path }
Set-Location $root

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "       STOPPING WINDOWS AIOPS MONITORING PLATFORM       " -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Cyan

# 1. Stop Frontend
Write-Host "[1/5] Stopping Vite frontend dev server..." -ForegroundColor Yellow
$nodeProcs = Get-Process "node" -ErrorAction SilentlyContinue
if ($nodeProcs) {
    Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue
    Write-Host "Node frontend processes stopped."
}

# 2. Stop FastAPI Backend
Write-Host "[2/5] Stopping FastAPI backend..." -ForegroundColor Yellow
$pyPort = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
if ($pyPort) {
    Stop-Process -Id $pyPort.OwningProcess -Force -ErrorAction SilentlyContinue
    Write-Host "Backend process stopped."
}

# 3. Stop Docker Compose Stack
Write-Host "[3/5] Stopping Docker observability stack..." -ForegroundColor Yellow
docker compose -f "$root\docker\docker-compose.yml" stop

# 4. Stop Grafana Alloy
Write-Host "[4/5] Stopping Grafana Alloy..." -ForegroundColor Yellow
& "$root\scripts\stop-alloy.ps1"

# 5. Stop windows_exporter
Write-Host "[5/5] Stopping windows_exporter..." -ForegroundColor Yellow
& "$root\scripts\stop-windows-exporter.ps1"

Write-Host "`nAll Windows AIOps services successfully stopped.`n" -ForegroundColor Green

