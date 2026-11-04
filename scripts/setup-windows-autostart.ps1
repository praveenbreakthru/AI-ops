<#
.SYNOPSIS
    Registers a Windows Scheduled Task to auto-start the Windows AIOps Platform on boot / logon.
#>
$root = "D:\Breakthru All Files\AIops-project"
$taskName = "WindowsAIOpsPlatformAutoStart"
$scriptPath = "$root\scripts\start.ps1"

Write-Host "Configuring Windows AIOps Platform auto-start..." -ForegroundColor Cyan

# 1. Option A: Windows Task Scheduler
try {
    $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$scriptPath`""
    $trigger = New-ScheduledTaskTrigger -AtLogOn
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description "Auto-starts the complete Windows AIOps Monitoring Platform upon user login." -Force | Out-Null
    Write-Host "[ SUCCESS ] Scheduled Task '$taskName' registered successfully." -ForegroundColor Green
} catch {
    Write-Warning "Could not register Scheduled Task (may need elevation): $_"
    
    # 2. Option B: Fallback to Startup folder shortcut
    $startupFolder = [System.Environment]::GetFolderPath('Startup')
    $shortcutPath = Join-Path $startupFolder "WindowsAIOps.lnk"
    
    $wscript = New-Object -ComObject WScript.Shell
    $shortcut = $wscript.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = "powershell.exe"
    $shortcut.Arguments = "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$scriptPath`""
    $shortcut.WorkingDirectory = $root
    $shortcut.Description = "Windows AIOps AutoStart"
    $shortcut.Save()
    Write-Host "[ SUCCESS ] Fallback Startup shortcut created at '$shortcutPath'." -ForegroundColor Green
}
