<#
.SYNOPSIS
    Starts windows_exporter in background with persistent logging.
#>
$baseDir = if ($PSScriptRoot) { Split-Path -Parent $PSScriptRoot } else { (Get-Location).Path }
param(
    [string]$ConfigPath = "$baseDir\monitoring\windows_exporter\config.yml",
    [string]$BinaryPath = "$baseDir\monitoring\windows_exporter\windows_exporter.exe",
    [string]$LogPath    = "$baseDir\monitoring\windows_exporter\windows_exporter.log",
    [int]$Port = 9182
)

$existing = Get-Process -Name "windows_exporter" -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "windows_exporter is already running (PID: $($existing.Id | Out-String).Trim())."
    try {
        $resp = Invoke-WebRequest -Uri "http://localhost:$Port/metrics" -UseBasicParsing -TimeoutSec 3
        Write-Host "Endpoint is healthy and responding (Status $($resp.StatusCode))."
        exit 0
    } catch {
        Write-Warning "Process exists but endpoint unresponsive. Restarting..."
        Stop-Process -Name "windows_exporter" -Force -ErrorAction SilentlyContinue
    }
}

if (-not (Test-Path $BinaryPath)) {
    Write-Error "windows_exporter binary not found at $BinaryPath."
    exit 1
}

Write-Host "Starting windows_exporter on port $Port..."
$p = Start-Process -FilePath $BinaryPath `
    -ArgumentList "--config.file=`"$ConfigPath`"", "--web.listen-address=:$Port", "--log.file=`"$LogPath`"" `
    -PassThru -WindowStyle Hidden

Start-Sleep -Seconds 2

if (Get-Process -Id $p.Id -ErrorAction SilentlyContinue) {
    Write-Host "windows_exporter started successfully with PID $($p.Id)."
    try {
        $resp = Invoke-WebRequest -Uri "http://localhost:$Port/metrics" -UseBasicParsing -TimeoutSec 5
        Write-Host "Metrics endpoint verified (Status $($resp.StatusCode))."
    } catch {
        Write-Warning "Could not immediately reach endpoint: $_"
    }
} else {
    Write-Error "Failed to start windows_exporter. Check log at $LogPath"
    if (Test-Path $LogPath) { Get-Content $LogPath -Tail 15 }
}
