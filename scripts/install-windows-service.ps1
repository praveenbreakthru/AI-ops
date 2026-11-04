<#
.SYNOPSIS
    Installs windows_exporter as a native Windows Service (requires Administrator).
#>
$binary = "D:\Breakthru All Files\AIops-project\monitoring\windows_exporter\windows_exporter.exe"
$config = "D:\Breakthru All Files\AIops-project\monitoring\windows_exporter\config.yml"
$serviceName = "windows_exporter"

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Warning "Administrator rights required to install as a Windows Service."
    Write-Host "You can run start-windows-exporter.ps1 directly without admin privileges."
    exit 1
}

$existingService = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
if ($existingService) {
    Write-Host "Service $serviceName already exists. Reconfiguring..."
    Stop-Service -Name $serviceName -Force -ErrorAction SilentlyContinue
    sc.exe delete $serviceName
}

$binPathWithArgs = "`"$binary`" --config.file=`"$config`" --web.listen-address=:9182"
New-Service -Name $serviceName -BinaryPathName $binPathWithArgs -DisplayName "Windows AIOps Exporter" -StartupType Automatic -Description "Prometheus metrics exporter for Windows laptop monitoring"
Start-Service -Name $serviceName
Write-Host "windows_exporter successfully registered and started as a Windows Service!"

