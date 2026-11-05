<#
.SYNOPSIS
    Starts the FastAPI AIOps Backend in background with persistent logging.
#>
param(
    [int]$Port = 8000,
    [string]$LogPath = ""
)

$baseDir = if ($PSScriptRoot) { Split-Path -Parent $PSScriptRoot } else { (Get-Location).Path }
if (-not $LogPath) {
    $LogPath = "$baseDir\logs\backend.log"
}

$backendDir = "$baseDir\backend"
New-Item -ItemType Directory -Path "$baseDir\logs" -Force -ErrorAction SilentlyContinue | Out-Null

$existing = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "Backend is already running on port $Port (PID: $($existing.OwningProcess))."
    exit 0
}

Write-Host "Starting AIOps FastAPI Backend on port $Port..."
Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c", "cd /d `"$backendDir`" && python -m uvicorn app.main:app --host 0.0.0.0 --port $Port >> `"$LogPath`" 2>&1" `
    -WindowStyle Hidden

Start-Sleep -Seconds 3

$conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($conn) {
    Write-Host "FastAPI Backend started successfully on port $Port (PID $($conn.OwningProcess))."
} else {
    Write-Host "Verifying backend startup..."
    Start-Sleep -Seconds 2
    $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if ($conn) {
        Write-Host "FastAPI Backend started successfully on port $Port (PID $($conn.OwningProcess))."
    } else {
        Write-Warning "Backend may still be initializing. Check log at $LogPath"
    }
}
