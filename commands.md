# Windows AIOps Platform - Command Cheatsheet

---

## ⚡ Option 1: Run Both with One Script (Recommended)

From the project root (`D:\Breakthru All Files\AIops-project`), run in PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start.ps1
```

* Automatically launches FastAPI Backend on port `8000` (background).
* Automatically launches React Frontend on port `5173` (background).
* Automatically runs the 5-point health check.

---

## 💻 Option 2: Run in Two Separate Terminals (Live Console Logs)

### Terminal 1: Backend (Python FastAPI)
```powershell
cd "D:\Breakthru All Files\AIops-project\backend"
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
* **URL**: [http://localhost:8000](http://localhost:8000)
* **API Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

### Terminal 2: Frontend (React + Vite)
```powershell
cd "D:\Breakthru All Files\AIops-project\frontend"
npm run dev
```
* **URL**: [http://localhost:5173](http://localhost:5173)

---

## 🛑 Stop the Platform

To stop both background services cleanly:

```powershell
# Windows AIOps Platform - Command Cheatsheet

---

## ⚡ Option 1: Run Both with One Script (Recommended)

From the project root (`D:\Breakthru All Files\AIops-project`), run in PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start.ps1
```

* Automatically launches FastAPI Backend on port `8000` (background).
* Automatically launches React Frontend on port `5173` (background).
* Automatically runs the 5-point health check.

---

## 💻 Option 2: Run in Two Separate Terminals (Live Console Logs)

### Terminal 1: Backend (Python FastAPI)
```powershell
cd "D:\Breakthru All Files\AIops-project\backend"
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
* **URL**: [http://localhost:8000](http://localhost:8000)
* **API Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

### Terminal 2: Frontend (React + Vite)
```powershell
cd "D:\Breakthru All Files\AIops-project\frontend"
npm run dev
```
* **URL**: [http://localhost:5173](http://localhost:5173)

---

## 🛑 Stop the Platform

To stop both background services cleanly:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\stop.ps1
```

*(If running in manual terminals, press `Ctrl + C` in each terminal).*

---

## 🔍 Verify System Health

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\health-check.ps1
```

---

## 🌐 Local URLs

| Interface | URL | Description |
|---|---|---|
| **AIOps React UI** | [http://localhost:5173](http://localhost:5173) | Main Operations Center (14 Views) |
| **FastAPI Swagger API** | [http://localhost:8000/docs](http://localhost:8000/docs) | Interactive Backend API Explorer |
| **Health Check API** | [http://localhost:8000/api/health](http://localhost:8000/api/health) | Subsystem Health Status JSON |
```

*(If running in manual terminals, press `Ctrl + C` in each terminal).*

---

## 🔍 Verify System Health

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\health-check.ps1
```

---

## 🌐 Local URLs

| Interface | URL | Description |
|---|---|---|
| **AIOps React UI** | [http://localhost:5173](http://localhost:5173) | Main Operations Center (14 Views) |
| **FastAPI Swagger API** | [http://localhost:8000/docs](http://localhost:8000/docs) | Interactive Backend API Explorer |
| **Health Check API** | [http://localhost:8000/api/health](http://localhost:8000/api/health) | Subsystem Health Status JSON |
