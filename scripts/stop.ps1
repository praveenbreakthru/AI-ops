<#
.SYNOPSIS
    Shutdown script for the Pure Full-Stack Windows AIOps Platform.
#>

$root = if ($PSScriptRoot) { Split-Path -Parent $PSScriptRoot } else { (Get-Location).Path }
Set-Location $root

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "       STOPPING WINDOWS AIOPS MONITORING PLATFORM       " -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Cyan

# 1. Stop Frontend
Write-Host "[1/2] Stopping Vite frontend dev server..." -ForegroundColor Yellow
$nodeProcs = Get-Process "node" -ErrorAction SilentlyContinue
if ($nodeProcs) {
    Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue
    Write-Host "Frontend processes stopped."
}

# 2. Stop FastAPI Backend
Write-Host "[2/2] Stopping FastAPI backend..." -ForegroundColor Yellow
$pyPort = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
if ($pyPort) {
    Stop-Process -Id $pyPort.OwningProcess -Force -ErrorAction SilentlyContinue
    Write-Host "Backend process (PID $($pyPort.OwningProcess)) stopped."
}

Write-Host "`nAll Windows AIOps services successfully stopped.`n" -ForegroundColor Green
