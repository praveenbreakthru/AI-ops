<#
.SYNOPSIS
    Stops running windows_exporter processes.
#>
$procs = Get-Process -Name "windows_exporter" -ErrorAction SilentlyContinue
if ($procs) {
    foreach ($p in $procs) {
        Write-Host "Stopping windows_exporter (PID: $($p.Id))..."
        Stop-Process -Id $p.Id -Force
    }
    Write-Host "windows_exporter stopped."
} else {
    Write-Host "windows_exporter is not running."
}
