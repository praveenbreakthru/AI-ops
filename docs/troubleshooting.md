# Windows AIOps Platform - Troubleshooting & Operational Runbook

This guide covers common operational edge cases, diagnosed errors, root causes, and verified solutions encountered when running the Windows AIOps Monitoring & Intelligence Platform on a Windows laptop.

---

## 1. Port Collisions & Bind Errors

### 1.1 PostgreSQL Port 5432 Collision
* **Symptom**: `docker-compose up` fails with `Bind for 0.0.0.0:5432 failed: port is already allocated`.
* **Root Cause**: Windows laptops often have pre-installed developer tools or native database services (e.g., `postgresql-x64-18`) actively listening on port 5432.
* **Solution**: The platform's containerized PostgreSQL is pre-configured to bind to host port `5433` (mapping to container port `5432`). Ensure `.env` sets:
  ```env
  POSTGRES_PORT=5433
  DATABASE_URL=postgresql+psycopg2://aiops:aiops_secret_password@127.0.0.1:5433/aiops_db
  ```
* **Fallback**: If the PostgreSQL container is stopped or unavailable, the FastAPI backend automatically falls back to local SQLite at `data/aiops_local.db` with zero data loss for incident tracking.

### 1.2 Windows Exporter Port 9182 in Use
* **Symptom**: `windows_exporter.exe` exits immediately or logs `listen tcp :9182: bind: Only one usage of each socket address is normally permitted`.
* **Root Cause**: An orphaned instance of `windows_exporter.exe` is already running.
* **Solution**: Kill any lingering processes before launching:
  ```powershell
  Stop-Process -Name "windows_exporter" -Force -ErrorAction SilentlyContinue
  ```

---

## 2. Docker & WSL2 Environment Issues

### 2.1 Named Pipe Disconnection
* **Symptom**: `docker ps` outputs `open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified`.
* **Root Cause**: Docker Desktop background backend was suspended or not running.
* **Solution**:
  1. Restart the Docker Desktop backend helper:
     ```powershell
     & "C:\Users\ABCOM\AppData\Local\Programs\DockerDesktop\resources\com.docker.backend.exe"
     ```
  2. Verify WSL2 is responsive:
     ```powershell
     wsl --list --verbose
     ```
  3. Start Docker Compose:
     ```powershell
     docker compose -f docker/docker-compose.yml up -d
     ```

---

## 3. Network & SSL Revocation Checks on Windows

### 3.1 curl.exe Certificate Revocation Failures
* **Symptom**: `curl.exe` fails with `schannel: Failed to check if a certificate was revoked` when testing endpoints or downloading assets.
* **Root Cause**: Windows Schannel checks OCSP/CRL revocation lists. If firewalls, corporate proxies, or offline networks block revocation endpoints, requests fail.
* **Solution**: Always append `--ssl-no-revoke` when using native Windows `curl.exe`:
  ```powershell
  curl.exe --ssl-no-revoke -s http://127.0.0.1:8000/api/health
  ```

### 3.2 IPv6 vs IPv4 Latency on Windows 11
* **Symptom**: Requests to `http://localhost:8000/api/health` take 2.5-4 seconds, or fail with timeout.
* **Root Cause**: Windows 11 resolves `localhost` to IPv6 `::1` first. If the daemon listens only on IPv4 `127.0.0.1`, Windows waits for the connection attempt to time out before falling back to IPv4.
* **Solution**: Configure all services, scrape configs, and scripts to use `127.0.0.1` explicitly rather than `localhost`.

---

## 4. Telemetry Collectors & Exporters

### 4.1 windows_exporter Collectors
* **Symptom**: `windows_exporter.exe` fails to start with `unknown collector: thermalzone` or `unknown collector: cs`.
* **Root Cause**: In `windows_exporter` v0.32.1+, `thermalzone` is deprecated/removed and `cs` is consolidated inside `system`.
* **Solution**: The verified collector list in `monitoring/windows_exporter/config.yml` is:
  ```yaml
  collectors:
    enabled: "cpu,logical_disk,memory,net,os,physical_disk,process,service,system,tcp,textfile"
  ```

### 4.2 Hardware Sensors & Battery Telemetry
* **Symptom**: CPU temperature sensors return `unsupported`.
* **Root Cause**: Standard laptop BIOS implementations (ACPI) often restrict thermal sensor queries without custom vendor kernel drivers.
* **Solution**: The platform strictly complies with the requirement **not to fabricate dummy data**. Unsupported sensors report `available: false`. Real battery (state of charge, runtime remaining), Intel UHD GPU, and system architecture are collected cleanly via the custom textfile collector at `monitoring/windows_exporter/textfile_inputs/hardware.prom`.

---

## 5. Grafana Alloy & Loki Log Ingestion

### 5.1 Grafana Alloy Attribute Syntax
* **Symptom**: Alloy exits with `unrecognized attribute name "event_log_name"`.
* **Root Cause**: Alloy HCL specification uses `eventlog_name` without an underscore between `event` and `log`.
* **Solution**: Use `eventlog_name = "Application"` and `eventlog_name = "System"` inside `monitoring/alloy/config.alloy`.

### 5.2 Loki 3.x Compactor Retention Requirement
* **Symptom**: Loki container exits on startup with `compactor.delete-request-store should be configured when retention is enabled`.
* **Root Cause**: Loki v3.1+ validates that the delete request store is defined whenever compaction retention is activated.
* **Solution**: Ensure `monitoring/loki/loki-config.yml` includes:
  ```yaml
  compactor:
    working_directory: /tmp/loki/compactor
    compaction_interval: 10m
    retention_enabled: true
    retention_delete_delay: 2h
    delete_request_store: filesystem
  ```

---

## 6. AIOps Intelligence & Ollama Integration

### 6.1 Ollama Offline or Not Installed
* **Symptom**: Backend log reports `Ollama connection failed: connection refused`.
* **Behavior**: The AI engine uses a robust fallback pattern. If Ollama (port 11434) is offline:
  1. The engine logs an informational message (`[INFO] Ollama unavailable, using deterministic grounded AI diagnosis`).
  2. The diagnosis engine performs deterministic metric correlation, identifying top offending processes, anomalous spikes, and correlating Windows Event log warnings.
  3. The response clearly indicates `provider: "Grounded Rule Engine (Ollama Offline)"`.
* **Solution (Optional)**: If you want local LLM synthesis, launch Ollama:
  ```powershell
  ollama run llama3.2
  ```

### 6.2 Anomaly False Positives
* **Symptom**: Normal brief spikes flagged as anomalies.
* **Solution**: The platform implements dual-layer filtering:
  - Dynamic Z-Score requires `Z > 2.5` (99th percentile outlier).
  - Scikit-learn `IsolationForest` runs with contamination rate `0.05` on a rolling 30-minute window to ignore temporary micro-spikes.

---

## 7. Controlled Remediation Permissions

### 7.1 Access Denied when Restarting Services
* **Symptom**: Remediation action returns `Failed to restart service: Access is denied`.
* **Root Cause**: Modifying Windows service state (e.g., `Spooler`, `W32Time`) requires elevated Administrator privileges.
* **Solution**: Run the PowerShell startup script or backend terminal as Administrator:
  ```powershell
  Start-Process powershell -Verb RunAs
  ```
* **Security Safeguard**: Remediation actions only permit pre-approved services on the strict safelist:
  - `Spooler` (Print Spooler)
  - `W32Time` (Windows Time Service)
  - `LanmanWorkstation` (Workstation Service)
  - User `%TEMP%` cache cleanup
  All executions require operator approval and are logged to the database audit trail.

---

## 8. Verification & Health Check Command

To verify all 8 subsystem tiers at any time:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\health-check.ps1
```

Expected output:
```text
[PASS] Windows Exporter (9182) : 200 OK (Metrics flowing)
[PASS] Prometheus (9090)       : 200 OK (Scrape target UP)
[PASS] Grafana (3000)          : 200 OK (9 Dashboards active)
[PASS] Loki (3100)             : 200 OK (Ingester ready)
[PASS] Alertmanager (9093)     : 200 OK (Alert routes active)
[PASS] PostgreSQL (5433)       : Port 5433 Open (Or local SQLite fallback)
[PASS] FastAPI Backend (8000)  : 200 OK (REST & AI Engine healthy)
[PASS] React Frontend (5173)   : 200 OK (UI operational)
```

