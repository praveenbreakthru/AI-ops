import psutil
import subprocess
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

# Key application process signatures to group and track
APP_SIGNATURES = {
    "Docker Desktop": ["docker", "com.docker.backend", "com.docker.proxy", "vpnkit"],
    "WSL2 Linux VM": ["vmmem", "vmmemWSL", "wsl", "wslhost"],
    "PostgreSQL Database": ["postgres", "pg_ctl"],
    "Python Applications": ["python", "pythonw", "uvicorn"],
    "Node.js Applications": ["node", "npm", "vite", "next"],
    "Web Browsers": ["firefox", "chrome", "msedge"],
    "Antigravity IDE & Tools": ["Antigravity IDE", "agy"],
    "VS Code": ["Code"],
    "Windows Subsystems": ["explorer", "SearchHost", "StartMenuExperienceHost", "svchost"]
}

class AppsService:
    def get_applications_overview(self) -> List[Dict[str, Any]]:
        """Groups running processes into known application ecosystems with CPU & RAM metrics."""
        app_metrics = {}
        for app_name in APP_SIGNATURES:
            app_metrics[app_name] = {
                "name": app_name,
                "process_count": 0,
                "cpu_percent": 0.0,
                "memory_mb": 0.0,
                "status": "stopped",
                "pids": []
            }

        unmatched_procs = []

        for p in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_info']):
            try:
                p_name = p.info['name'] or ""
                p_cpu = float(p.info['cpu_percent'] or 0.0)
                p_mem = (p.info['memory_info'].rss / (1024**2)) if p.info['memory_info'] else 0.0
                pid = p.info['pid']

                matched = False
                for app_name, sigs in APP_SIGNATURES.items():
                    if any(sig.lower() in p_name.lower() for sig in sigs):
                        app_metrics[app_name]["process_count"] += 1
                        app_metrics[app_name]["cpu_percent"] += p_cpu
                        app_metrics[app_name]["memory_mb"] += p_mem
                        app_metrics[app_name]["status"] = "running"
                        app_metrics[app_name]["pids"].append(pid)
                        matched = True
                        break

                if not matched and p_mem > 150: # track significant standalone applications
                    unmatched_procs.append({
                        "name": p_name,
                        "pid": pid,
                        "cpu_percent": round(p_cpu, 1),
                        "memory_mb": round(p_mem, 1)
                    })
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass

        # Format results
        results = []
        for app_name, data in app_metrics.items():
            if data["process_count"] > 0:
                results.append({
                    "name": app_name,
                    "process_count": data["process_count"],
                    "cpu_percent": round(data["cpu_percent"], 1),
                    "memory_mb": round(data["memory_mb"], 1),
                    "status": "running"
                })

        # Sort by memory descending
        results.sort(key=lambda x: x["memory_mb"], reverse=True)
        return results

    def restart_application_service(self, service_name: str) -> Dict[str, Any]:
        """Restarts a Windows service safely via PowerShell."""
        try:
            cmd = f"Restart-Service -Name '{service_name}' -Force -ErrorAction Stop"
            proc = subprocess.run(["powershell", "-NoProfile", "-Command", cmd], capture_output=True, text=True, timeout=15)
            success = proc.returncode == 0
            return {
                "success": success,
                "service": service_name,
                "message": f"Service '{service_name}' restarted successfully." if success else proc.stderr.strip()
            }
        except Exception as e:
            return {"success": False, "service": service_name, "message": str(e)}

apps_service = AppsService()
