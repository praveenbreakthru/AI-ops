import os
import sys
import logging
import subprocess
import time
from typing import List, Dict, Any, Optional
import psutil

try:
    import winreg
except ImportError:
    winreg = None

logger = logging.getLogger(__name__)

# Known primary workstation software catalog with verified executable candidates and process signatures
PRIMARY_WINDOWS_CATALOG = [
    {
        "id": "cisco_packet_tracer",
        "name": "Cisco Packet Tracer",
        "category": "Networking & Simulation",
        "description": "Cisco CCNA network simulation, topology builder & protocol modeling suite",
        "paths": [
            r"C:\Program Files\Cisco Packet Tracer 9.0.1\bin\PacketTracer.exe",
            r"C:\Program Files\Cisco Packet Tracer 8.2\bin\PacketTracer.exe",
            r"C:\Program Files\Cisco Packet Tracer 8.1\bin\PacketTracer.exe",
            r"C:\Program Files (x86)\Cisco Packet Tracer\bin\PacketTracer.exe"
        ],
        "sigs": ["packettracer.exe", "packettracer"]
    },
    {
        "id": "android_studio",
        "name": "Android Studio",
        "category": "Mobile App IDE & Emulator",
        "description": "Official Google IDE for Android app development, Kotlin, Jetpack & virtual devices",
        "paths": [
            r"C:\Program Files\Android\Android Studio\bin\studio64.exe",
            r"C:\Program Files\Android\Android Studio\bin\studio.exe",
            r"C:\Program Files (x86)\Android\Android Studio\bin\studio64.exe"
        ],
        "sigs": ["studio64.exe", "studio.exe"]
    },
    {
        "id": "vs_code",
        "name": "Microsoft Visual Studio Code",
        "category": "Code Editor & IDE",
        "description": "Extensible multi-language code editor, debugger & git integrated environment",
        "paths": [
            os.path.expandvars(r"%LOCALAPPDATA%\Programs\Microsoft VS Code\Code.exe"),
            r"C:\Program Files\Microsoft VS Code\Code.exe",
            r"C:\Program Files (x86)\Microsoft VS Code\Code.exe"
        ],
        "sigs": ["code.exe"]
    },
    {
        "id": "ms_teams",
        "name": "Microsoft Teams",
        "category": "Unified Collaboration & Chat",
        "description": "Enterprise chat, meetings, video calling and team workspace hub",
        "paths": [
            os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\WindowsApps\ms-teams.exe"),
            os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\Teams\current\Teams.exe"),
            r"C:\Program Files\WindowsApps\MicrosoftTeams_8wekyb3d8bbwe\ms-teams.exe"
        ],
        "sigs": ["ms-teams.exe", "teams.exe"]
    },
    {
        "id": "ms_outlook",
        "name": "Microsoft Outlook",
        "category": "Productivity & Email",
        "description": "Microsoft 365 enterprise email, calendars, appointments & contact manager",
        "paths": [
            r"C:\Program Files\Microsoft Office\root\Office16\OUTLOOK.EXE",
            r"C:\Program Files (x86)\Microsoft Office\root\Office16\OUTLOOK.EXE",
            os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\WindowsApps\olk.exe")
        ],
        "sigs": ["outlook.exe", "olk.exe"]
    },
    {
        "id": "google_chrome",
        "name": "Google Chrome",
        "category": "Web Browser & DevTools",
        "description": "Fast multi-tab web browser, Chromium engine & web developer inspector",
        "paths": [
            r"C:\Program Files\Google\Chrome\Application\chrome.exe",
            r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
        ],
        "sigs": ["chrome.exe"]
    },
    {
        "id": "docker_desktop",
        "name": "Docker Desktop",
        "category": "Container Runtime & Engine",
        "description": "Docker daemon, containerd runtime, Docker Compose and container management",
        "paths": [
            os.path.expandvars(r"%LOCALAPPDATA%\Programs\DockerDesktop\Docker Desktop.exe"),
            r"C:\Program Files\Docker\Docker\Docker Desktop.exe"
        ],
        "sigs": ["docker desktop.exe", "com.docker.backend.exe", "dockerd.exe", "docker.exe"]
    },
    {
        "id": "antigravity_ide",
        "name": "Antigravity IDE",
        "category": "AI Autonomous Engineering IDE",
        "description": "Advanced autonomous AI development environment and pair-programmer IDE",
        "paths": [
            os.path.expandvars(r"%LOCALAPPDATA%\Programs\Antigravity IDE\Antigravity IDE.exe")
        ],
        "sigs": ["antigravity ide.exe", "agy.exe"]
    },
    {
        "id": "python_fastapi",
        "name": "Python & FastAPI Backend",
        "category": "REST API & Microservices",
        "description": "Python runtime executing AIOps FastAPI backend services and AI engines",
        "paths": [sys.executable or "python.exe"],
        "sigs": ["python.exe", "pythonw.exe", "uvicorn.exe"]
    },
    {
        "id": "node_vite",
        "name": "Node.js & Vite Frontend",
        "category": "Web UI Server & Build Tool",
        "description": "Node.js runtime serving the React Vite dashboard and frontend assets",
        "paths": ["node.exe"],
        "sigs": ["node.exe"]
    },
    {
        "id": "git_scm",
        "name": "Git SCM & Tools",
        "category": "Version Control",
        "description": "Distributed version control system, Git CLI and credential managers",
        "paths": [
            r"C:\Program Files\Git\cmd\git.exe",
            r"C:\Program Files\Git\git-bash.exe"
        ],
        "sigs": ["git.exe", "git-bash.exe"]
    },
    {
        "id": "postman",
        "name": "Postman API Client",
        "category": "API Testing & Development",
        "description": "REST, GraphQL and WebSocket API design, testing and mock server suite",
        "paths": [
            os.path.expandvars(r"%LOCALAPPDATA%\Postman\Postman.exe")
        ],
        "sigs": ["postman.exe"]
    }
]

class AppsService:
    def __init__(self):
        self._registry_cache = None
        self._last_registry_scan = 0
        self._known_app_ids = set()

    def _scan_windows_registry(self) -> List[Dict[str, Any]]:
        """Scans Windows Registry for installed programs if winreg is available."""
        if not winreg or (time.time() - self._last_registry_scan < 10 and self._registry_cache is not None):
            return self._registry_cache or []

        installed = []
        reg_roots = [
            (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall"),
            (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall"),
            (winreg.HKEY_CURRENT_USER, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall")
        ]

        seen_names = set()
        for root, key_path in reg_roots:
            try:
                with winreg.OpenKey(root, key_path) as key:
                    count = winreg.QueryInfoKey(key)[0]
                    for i in range(count):
                        try:
                            subkey_name = winreg.EnumKey(key, i)
                            with winreg.OpenKey(key, subkey_name) as subkey:
                                try:
                                    name = winreg.QueryValueEx(subkey, "DisplayName")[0]
                                except (FileNotFoundError, OSError):
                                    continue

                                if not name or len(name) < 3 or name in seen_names:
                                    continue

                                # Filter out noise (updates, runtimes, KB patches)
                                lower = name.lower()
                                if any(x in lower for x in ["update", "kb", "security patch", "redistributable", "support files", "prerequisite", "framework"]):
                                    continue

                                install_loc = ""
                                try:
                                    install_loc = winreg.QueryValueEx(subkey, "InstallLocation")[0]
                                except (FileNotFoundError, OSError):
                                    pass

                                icon = ""
                                try:
                                    icon = winreg.QueryValueEx(subkey, "DisplayIcon")[0].split(",")[0].strip('"')
                                except (FileNotFoundError, OSError):
                                    pass

                                exe_path = ""
                                if icon and icon.lower().endswith(".exe") and os.path.exists(icon):
                                    exe_path = icon
                                elif install_loc and os.path.isdir(install_loc):
                                    # Look for primary .exe in root of install directory
                                    for fname in os.listdir(install_loc):
                                        if fname.lower().endswith(".exe"):
                                            candidate = os.path.join(install_loc, fname)
                                            if os.path.isfile(candidate):
                                                exe_path = candidate
                                                break

                                if exe_path:
                                    exe_name = os.path.basename(exe_path).lower()
                                    if any(x in exe_name for x in ["uninstall", "unins", "setup", "installer", "patch", "helper", "crashpad"]):
                                        exe_path = ""

                                if exe_path:
                                    seen_names.add(name)
                                    app_id = f"reg_{abs(hash(name)) % 100000}"
                                    is_new = self._registry_cache is not None and app_id not in self._known_app_ids
                                    self._known_app_ids.add(app_id)
                                    installed.append({
                                        "id": app_id,
                                        "name": name,
                                        "category": "Desktop Software",
                                        "description": f"Installed software on Windows host: {install_loc or exe_path}",
                                        "paths": [exe_path],
                                        "sigs": [os.path.basename(exe_path).lower()],
                                        "is_new": is_new,
                                        "is_downloaded": False
                                    })
                        except Exception:
                            continue
            except Exception:
                continue

        self._registry_cache = installed
        self._last_registry_scan = time.time()
        return installed

    def _scan_downloads_folder(self) -> List[Dict[str, Any]]:
        """Scans user Downloads and Desktop directories for newly downloaded tools, installers, and binaries."""
        downloaded = []
        user_dirs = [
            os.path.expandvars(r"%USERPROFILE%\Downloads"),
            os.path.expandvars(r"%USERPROFILE%\Desktop")
        ]
        now = time.time()
        for udir in user_dirs:
            if not os.path.exists(udir):
                continue
            try:
                for f in os.listdir(udir):
                    if f.lower().endswith((".exe", ".msi", ".bat", ".cmd")):
                        full_path = os.path.join(udir, f)
                        try:
                            mtime = os.path.getmtime(full_path)
                            fsize_mb = round(os.path.getsize(full_path) / (1024**2), 1)
                            clean_name = f.rsplit(".", 1)[0].replace("_", " ").replace("-", " ")
                            is_new = (now - mtime) < 86400 * 3 # downloaded within 3 days
                            downloaded.append({
                                "id": f"dl_{abs(hash(full_path)) % 100000}",
                                "name": f"{clean_name} (Downloaded)",
                                "category": "Downloaded Application / Installer",
                                "description": f"Executable in {udir}: {f} ({fsize_mb} MB)",
                                "paths": [full_path],
                                "executable_path": full_path,
                                "sigs": [f.lower()],
                                "is_downloaded": True,
                                "is_new": is_new,
                                "mtime": mtime
                            })
                        except Exception:
                            continue
            except Exception:
                continue

        # Sort newest downloads first
        downloaded.sort(key=lambda x: x.get("mtime", 0), reverse=True)
        return downloaded

    def get_applications_overview(self) -> List[Dict[str, Any]]:
        """
        Returns full inventory of both RUNNING and STOPPED applications on the local Windows laptop.
        Includes desktop software like Cisco Packet Tracer, Android Studio, VS Code, Teams, Outlook, Chrome,
        as well as newly downloaded applications and installers from Downloads.
        """
        # Build comprehensive catalog
        catalog = list(PRIMARY_WINDOWS_CATALOG)
        
        # Merge discovered registry apps if not already in primary catalog
        primary_names_lower = [c["name"].lower() for c in catalog]
        for reg_app in self._scan_windows_registry():
            if not any(pn in reg_app["name"].lower() or reg_app["name"].lower() in pn for pn in primary_names_lower):
                catalog.append(reg_app)

        # Merge downloaded tools & installers
        for dl_app in self._scan_downloads_folder():
            catalog.append(dl_app)

        # Snapshot all running processes with PID, name, CPU, Memory
        running_procs = []
        for p in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_info']):
            try:
                p_name = (p.info['name'] or "").lower()
                p_cpu = float(p.info['cpu_percent'] or 0.0)
                p_mem = (p.info['memory_info'].rss / (1024**2)) if p.info['memory_info'] else 0.0
                running_procs.append({
                    "pid": p.info['pid'],
                    "name": p_name,
                    "cpu": p_cpu,
                    "mem": p_mem
                })
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue

        results = []
        for app in catalog:
            # Check executable path on disk
            executable_path = None
            for p in app.get("paths", []):
                if os.path.exists(p) or p in ["python.exe", "node.exe"]:
                    executable_path = p
                    break

            # Match running processes by signature
            matched_pids = []
            tot_cpu = 0.0
            tot_mem = 0.0
            sigs = [s.lower() for s in app.get("sigs", [])]

            for proc in running_procs:
                if any(sig in proc["name"] for sig in sigs):
                    matched_pids.append(proc["pid"])
                    tot_cpu += proc["cpu"]
                    tot_mem += proc["mem"]

            is_running = len(matched_pids) > 0
            status = "running" if is_running else "stopped"

            # If it's not running and executable doesn't exist, skip (uninstalled app)
            if not is_running and not executable_path:
                continue

            actions = ["stop", "restart", "kill"] if is_running else ["start"]

            results.append({
                "id": app["id"],
                "name": app["name"],
                "category": app.get("category", "Application"),
                "description": app.get("description", ""),
                "status": status,
                "process_count": len(matched_pids),
                "cpu_percent": round(tot_cpu, 1),
                "memory_mb": round(tot_mem, 1),
                "executable_path": executable_path,
                "target": "local",
                "node_name": "Local Windows Laptop",
                "pids": matched_pids[:10],
                "actions": actions,
                "is_new": app.get("is_new", False),
                "is_downloaded": app.get("is_downloaded", False)
            })

        # Sort: Running apps first (by memory descending), then new downloads/apps, then stopped apps alphabetically
        results.sort(key=lambda x: (
            0 if x["status"] == "running" else 1,
            0 if x.get("is_new") else 1,
            -x["memory_mb"],
            x["name"]
        ))
        return results

    def launch_application(self, app_id_or_name: str) -> Dict[str, Any]:
        """
        Launches an application by ID or Name on the Windows host.
        Uses os.startfile or detached subprocess so it opens seamlessly in user's desktop session.
        """
        overview = self.get_applications_overview()
        target_app = None
        for a in overview:
            if a["id"].lower() == app_id_or_name.lower() or a["name"].lower() == app_id_or_name.lower():
                target_app = a
                break

        # Fallback search in catalog
        if not target_app:
            for a in PRIMARY_WINDOWS_CATALOG:
                if a["id"].lower() == app_id_or_name.lower() or a["name"].lower() == app_id_or_name.lower():
                    for p in a["paths"]:
                        if os.path.exists(p):
                            target_app = {"name": a["name"], "executable_path": p}
                            break
                    break

        if not target_app or not target_app.get("executable_path"):
            return {
                "success": False,
                "message": f"Could not locate executable for '{app_id_or_name}' on Windows laptop."
            }

        exe_path = target_app["executable_path"]
        try:
            logger.info(f"Launching Windows application: {exe_path}")
            # os.startfile is the most reliable way to launch interactive GUI apps in Windows
            if hasattr(os, "startfile"):
                os.startfile(exe_path)
            else:
                subprocess.Popen(
                    [exe_path],
                    creationflags=subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP,
                    close_fds=True
                )
            return {
                "success": True,
                "name": target_app["name"],
                "message": f"Successfully launched {target_app['name']} ({os.path.basename(exe_path)})."
            }
        except Exception as e:
            logger.error(f"Failed to launch application {exe_path}: {e}")
            return {
                "success": False,
                "name": target_app.get("name", app_id_or_name),
                "message": f"Failed to launch: {str(e)}"
            }

    def stop_application(self, app_id_or_name: str) -> Dict[str, Any]:
        """Stops all running process instances of the target application."""
        overview = self.get_applications_overview()
        target_app = None
        for a in overview:
            if a["id"].lower() == app_id_or_name.lower() or a["name"].lower() == app_id_or_name.lower():
                target_app = a
                break

        if not target_app:
            return {"success": False, "message": f"Application '{app_id_or_name}' not found."}

        pids = target_app.get("pids", [])
        if not pids:
            return {"success": True, "message": f"Application '{target_app['name']}' is already stopped."}

        killed_count = 0
        for pid in pids:
            try:
                p = psutil.Process(pid)
                p.terminate()
                killed_count += 1
            except Exception:
                pass

        return {
            "success": True,
            "name": target_app["name"],
            "message": f"Stopped {killed_count} process instances of {target_app['name']}."
        }

    def restart_application(self, app_id_or_name: str) -> Dict[str, Any]:
        """Stops and restarts an application."""
        self.stop_application(app_id_or_name)
        time.sleep(1.0)
        return self.launch_application(app_id_or_name)

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

    def stop_application_service(self, service_name: str) -> Dict[str, Any]:
        """Stops a Windows service via PowerShell."""
        try:
            cmd = f"Stop-Service -Name '{service_name}' -Force -ErrorAction Stop"
            proc = subprocess.run(["powershell", "-NoProfile", "-Command", cmd], capture_output=True, text=True, timeout=15)
            success = proc.returncode == 0
            return {
                "success": success,
                "service": service_name,
                "message": f"Service '{service_name}' stopped." if success else proc.stderr.strip()
            }
        except Exception as e:
            return {"success": False, "service": service_name, "message": str(e)}

    def start_application_service(self, service_name: str) -> Dict[str, Any]:
        """Starts a Windows service via PowerShell."""
        try:
            cmd = f"Start-Service -Name '{service_name}' -ErrorAction Stop"
            proc = subprocess.run(["powershell", "-NoProfile", "-Command", cmd], capture_output=True, text=True, timeout=15)
            success = proc.returncode == 0
            return {
                "success": success,
                "service": service_name,
                "message": f"Service '{service_name}' started." if success else proc.stderr.strip()
            }
        except Exception as e:
            return {"success": False, "service": service_name, "message": str(e)}

    def kill_process(self, pid: int) -> Dict[str, Any]:
        """Terminates a process by PID."""
        try:
            p = psutil.Process(pid)
            p_name = p.name()
            p.kill()
            return {"success": True, "pid": pid, "message": f"Process '{p_name}' (PID {pid}) terminated."}
        except Exception as e:
            return {"success": False, "pid": pid, "message": str(e)}

apps_service = AppsService()
