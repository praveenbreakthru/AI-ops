<#
.SYNOPSIS
    Starts the FastAPI AIOps Backend in background with persistent logging.
#>
param(
    [int]$Port = 8000,
    [string]$LogPath = "D:\Breakthru All Files\AIops-project\logs\backend.log"
)

$backendDir = "D:\Breakthru All Files\AIops-project\backend"
New-Item -ItemType Directory -Path "D:\Breakthru All Files\AIops-project\logs" -Force -ErrorAction SilentlyContinue | Out-Null

$existing = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "Backend is already running on port $Port (PID: $($existing.OwningProcess))."
    exit 0
}

Write-Host "Starting AIOps FastAPI Backend on port $Port..."
$p = Start-Process -FilePath "python" `
    -ArgumentList "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "$Port" `
    -WorkingDirectory $backendDir `
    -RedirectStandardOutput $LogPath `
    -RedirectStandardError "$LogPath.err" `
    -PassThru -WindowStyle Hidden

Start-Sleep -Seconds 3

if (Get-Process -Id $p.Id -ErrorAction SilentlyContinue) {
    Write-Host "FastAPI Backend started successfully with PID $($p.Id)."
} else {
    Write-Error "Failed to start FastAPI Backend."
    if (Test-Path "$LogPath.err") { Get-Content "$LogPath.err" -Tail 15 }
}
