# Windows AIOps Platform - Installation & Quickstart

## Prerequisites

- **Host OS**: Microsoft Windows 10/11 Pro 64-bit
- **Memory**: Minimum 8 GB RAM
- **Docker**: Docker Desktop with WSL2 backend
- **Python**: Python 3.10+ (Python 3.12 verified)
- **Node.js**: Node 18+ & npm (Node 24 verified)
- **PowerShell**: Windows PowerShell 5.1 or PowerShell 7+

---

## 1. Initial Setup

1. Open PowerShell and clone or navigate to the project directory:
   ```powershell
   cd "D:\Breakthru All Files\AIops-project"
   ```

2. Verify environment configuration:
   ```powershell
   Copy-Item .env.example .env
   ```

3. Install Python dependencies:
   ```powershell
   cd backend
   pip install -r requirements.txt
   cd ..
   ```

4. Install Frontend dependencies and compile:
   ```powershell
   cd frontend
   npm install
   npm run build
   cd ..
   ```

---

## 2. Launching the Entire Platform

Launch all native services and Docker containers with a single command:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start.ps1
```

This master script automatically orchestrates:
1. `windows_exporter` native binary on port `9182`.
2. `Grafana Alloy` Windows Event Log collector on port `12345`.
3. Docker Compose stack:
   - Prometheus on `9090`
   - Grafana on `3000`
   - Loki on `3100`
   - Alertmanager on `9093`
   - PostgreSQL on `5433`
4. FastAPI AIOps Backend on `8000`.
5. Vite React Frontend on `5173`.
6. Automated health verification across all 8 endpoints.

---

## 3. Stopping the Platform

To cleanly terminate all running processes and containers:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\stop.ps1
```

---

## 4. Automatic Startup on Windows Boot

To ensure the platform starts automatically after a reboot or user login:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-windows-autostart.ps1
```

