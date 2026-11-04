<#
.SYNOPSIS
    Health Verification for Pure Full-Stack Windows AIOps Platform.
#>

$services = @(
    @{ Name = "FastAPI Backend API";   Url = "http://127.0.0.1:8000/api/health";          ExpectedCode = 200 },
    @{ Name = "React Operations UI";   Url = "http://127.0.0.1:5173";                     ExpectedCode = 200 },
    @{ Name = "Live Telemetry Gauges"; Url = "http://127.0.0.1:8000/api/system/overview"; ExpectedCode = 200 },
    @{ Name = "Windows Event Logs";    Url = "http://127.0.0.1:8000/api/system/logs";     ExpectedCode = 200 },
    @{ Name = "AI Predictive Engine";  Url = "http://127.0.0.1:8000/api/ai/predictions";  ExpectedCode = 200 }
)

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "       WINDOWS AIOPS PLATFORM HEALTH VERIFICATION       " -ForegroundColor Cyan
Write-Host "       (Pure Full-Stack: Python Backend + React UI)     " -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Cyan

$passed = 0
$total = $services.Count

foreach ($s in $services) {
    try {
        $resp = Invoke-WebRequest -Uri $s.Url -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        if ($resp.StatusCode -eq $s.ExpectedCode) {
            Write-Host "[ PASS ] $($s.Name) is healthy ($($s.Url))" -ForegroundColor Green
            $passed++
        } else {
            Write-Host "[ WARN ] $($s.Name) returned HTTP $($resp.StatusCode)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "[ FAIL ] $($s.Name) is unreachable ($($s.Url))" -ForegroundColor Red
    }
}

Write-Host "`nSummary: $passed / $total core subsystems verified operational.`n" -ForegroundColor Cyan
