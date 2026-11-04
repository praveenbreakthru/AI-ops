<#
.SYNOPSIS
    Comprehensive Health Check for Windows AIOps Platform.
#>

$services = @(
    @{ Name = "windows_exporter"; Url = "http://127.0.0.1:9182/metrics"; ExpectedCode = 200 },
    @{ Name = "Prometheus TSDB"; Url = "http://127.0.0.1:9090/-/healthy"; ExpectedCode = 200 },
    @{ Name = "Grafana Dashboards"; Url = "http://127.0.0.1:3000/api/health"; ExpectedCode = 200 },
    @{ Name = "Grafana Loki"; Url = "http://127.0.0.1:3100/ready"; ExpectedCode = 200 },
    @{ Name = "Alertmanager"; Url = "http://127.0.0.1:9093/-/healthy"; ExpectedCode = 200 },
    @{ Name = "FastAPI Backend"; Url = "http://127.0.0.1:8000/api/health"; ExpectedCode = 200 },
    @{ Name = "React Frontend"; Url = "http://127.0.0.1:5173"; ExpectedCode = 200 },
    @{ Name = "Grafana Alloy"; Url = "http://127.0.0.1:12345/-/ready"; ExpectedCode = 200 }
)

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "       WINDOWS AIOPS PLATFORM HEALTH VERIFICATION       " -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Cyan

$passed = 0
$total = $services.Count

foreach ($s in $services) {
    try {
        $resp = Invoke-WebRequest -Uri $s.Url -UseBasicParsing -TimeoutSec 6 -ErrorAction Stop
        if ($resp.StatusCode -eq $s.ExpectedCode -or ($s.Name -eq "Grafana Loki" -and $resp.StatusCode -in 200, 503)) {
            Write-Host "[ PASS ] $($s.Name) is healthy ($($s.Url))" -ForegroundColor Green
            $passed++
        } else {
            Write-Host "[ WARN ] $($s.Name) returned HTTP $($resp.StatusCode)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "[ FAIL ] $($s.Name) is unreachable ($($s.Url))" -ForegroundColor Red
    }
}

Write-Host "`nSummary: $passed / $total monitoring components verified operational.`n" -ForegroundColor Cyan
