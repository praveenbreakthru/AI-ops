<#
.SYNOPSIS
    Stops running Grafana Alloy processes.
#>
$procs = Get-Process | Where-Object { $_.ProcessName -like "*alloy*" }
if ($procs) {
    foreach ($p in $procs) {
        Write-Host "Stopping Alloy (PID: $($p.Id))..."
        Stop-Process -Id $p.Id -Force
    }
    Write-Host "Alloy stopped."
} else {
    Write-Host "Alloy is not running."
}
