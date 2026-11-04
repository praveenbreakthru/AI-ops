<#
.SYNOPSIS
    Starts Grafana Alloy for Windows Event Log shipping to Loki.
#>
$baseDir = if ($PSScriptRoot) { Split-Path -Parent $PSScriptRoot } else { (Get-Location).Path }
param(
    [string]$ConfigPath = "$baseDir\monitoring\alloy\config.alloy",
    [string]$BinaryPath = "$baseDir\monitoring\alloy\alloy-windows-amd64.exe",
    [string]$LogPath    = "$baseDir\monitoring\alloy\alloy.log"
)

$existing = Get-Process | Where-Object { $_.ProcessName -like "*alloy*" }
if ($existing) {
    Write-Host "Alloy is already running (PID: $($existing.Id | Out-String).Trim())."
    exit 0
}

if (-not (Test-Path $BinaryPath)) {
    Write-Error "Alloy binary not found at $BinaryPath."
    exit 1
}

Write-Host "Starting Grafana Alloy..."
$storagePath = "$baseDir\monitoring\alloy\data"
if (-not (Test-Path $storagePath)) { New-Item -ItemType Directory -Path $storagePath -Force | Out-Null }

$p = Start-Process -FilePath $BinaryPath `
    -ArgumentList "run", "`"$ConfigPath`"", "--storage.path=`"$storagePath`"" `
    -RedirectStandardOutput $LogPath `
    -RedirectStandardError "$LogPath.err" `
    -PassThru -WindowStyle Hidden

Start-Sleep -Seconds 3

if (Get-Process -Id $p.Id -ErrorAction SilentlyContinue) {
    Write-Host "Grafana Alloy started successfully with PID $($p.Id)."
} else {
    Write-Error "Failed to start Grafana Alloy. Check log at $LogPath.err"
    if (Test-Path "$LogPath.err") { Get-Content "$LogPath.err" -Tail 15 }
}

