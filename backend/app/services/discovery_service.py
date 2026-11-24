import os
import time
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Set
import psutil

from app.services.docker_service import docker_service
from app.services.k8s_service import k8s_service
from app.services.linux_service import linux_service
from app.services.apps_service import apps_service
from app.services.windows_server_service import windows_server_service

logger = logging.getLogger(__name__)

# Key tools & applications to monitor for new launches
NOTABLE_TOOLS = [
    "python", "node", "npm", "docker", "dockerd", "kubectl", "k3s", "java", "dotnet",
    "nginx", "apache2", "redis-server", "mongod", "postgres", "mysql", "git", "ssh",
    "curl", "wget", "uvicorn", "vite", "code", "opensearch", "rabbitmq", "packettracer", "studio"
]

class DynamicDiscoveryService:
    def __init__(self):
        # Known sets for local Windows node
        self.known_local_containers: Set[str] = set()
        self.known_local_pods: Set[str] = set()
        self.known_local_pids: Set[int] = set()
        self.known_local_downloads: Set[str] = set()
        self.known_local_reg_apps: Set[str] = set()

        # Known sets for remote Linux node
        self.known_linux_containers: Set[str] = set()
        self.known_linux_pods: Set[str] = set()
        self.known_linux_services: Set[str] = set()
        self.known_linux_downloads: Set[str] = set()

        # Initialized flags so baseline is populated cleanly
        self.local_initialized = False
        self.linux_initialized = False
        self.winserver_initialized = False

        # Feed of discovered items
        self.discovered_items: List[Dict[str, Any]] = []

    def scan_for_new_items(self):
        """Periodically detects newly downloaded applications, installed tools, containers, and services."""
        self._scan_local_node()
        self._scan_linux_node()
        self._scan_winserver_node()

    def _scan_local_node(self):
        now_str = datetime.now(timezone.utc).isoformat()

        # 1. Newly Downloaded Applications & Installers (in Downloads & Desktop)
        try:
            downloads = apps_service._scan_downloads_folder()
            current_dl_paths = {d.get("executable_path") or (d["paths"][0] if d.get("paths") else "") for d in downloads}

            if not self.local_initialized:
                self.known_local_downloads = set(current_dl_paths)
                # Include very recent downloads (e.g. Cisco Packet Tracer) in initial feed
                for d in downloads:
                    if d.get("is_new"):
                        self._add_discovery_item({
                            "id": f"local-dl-{d['id']}",
                            "raw_id": d["id"],
                            "name": d["name"],
                            "type": "Downloaded Application / Installer",
                            "category": "download",
                            "node": "local",
                            "node_name": "Local Windows Laptop",
                            "details": d["description"],
                            "discovered_at": now_str,
                            "status": "Ready to Run",
                            "state": "stopped",
                            "cpu_percent": 0.0,
                            "memory_mb": 0.0,
                            "is_crashed": False,
                            "actions": ["start", "delete"]
                        })
            else:
                new_dls = current_dl_paths - self.known_local_downloads
                for d in downloads:
                    exe_p = d.get("executable_path") or (d["paths"][0] if d.get("paths") else "")
                    if exe_p in new_dls:
                        self.known_local_downloads.add(exe_p)
                        self._add_discovery_item({
                            "id": f"local-dl-{d['id']}",
                            "raw_id": d["id"],
                            "name": d["name"],
                            "type": "Downloaded Application / Installer",
                            "category": "download",
                            "node": "local",
                            "node_name": "Local Windows Laptop",
                            "details": d["description"],
                            "discovered_at": now_str,
                            "status": "Ready to Run",
                            "state": "stopped",
                            "cpu_percent": 0.0,
                            "memory_mb": 0.0,
                            "is_crashed": False,
                            "actions": ["start", "delete"]
                        })
        except Exception as e:
            logger.debug(f"Local downloads discovery error: {e}")

        # 2. Newly Installed Windows Software (Registry)
        try:
            reg_apps = apps_service._scan_windows_registry()
            current_reg_names = {a["name"] for a in reg_apps}

            if not self.local_initialized:
                self.known_local_reg_apps = current_reg_names
            else:
                new_apps = current_reg_names - self.known_local_reg_apps
                for a in reg_apps:
                    if a["name"] in new_apps:
                        self.known_local_reg_apps.add(a["name"])
                        self._add_discovery_item({
                            "id": f"local-reg-{a['id']}",
                            "raw_id": a["id"],
                            "name": a["name"],
                            "type": "Installed Desktop Software",
                            "category": "tool",
                            "node": "local",
                            "node_name": "Local Windows Laptop",
                            "details": a.get("description", "Newly installed software on Windows"),
                            "discovered_at": now_str,
                            "status": "Installed (Ready)",
                            "state": "stopped",
                            "cpu_percent": 0.0,
                            "memory_mb": 0.0,
                            "is_crashed": False,
                            "actions": ["start"]
                        })
        except Exception as e:
            logger.debug(f"Local registry discovery error: {e}")

        # 3. Local Docker Containers
        try:
            containers = docker_service.get_containers(all=True)
            current_ids = {c["id"] for c in containers}

            if not self.local_initialized:
                self.known_local_containers = current_ids
            else:
                new_ids = current_ids - self.known_local_containers
                for c in containers:
                    if c["id"] in new_ids:
                        self.known_local_containers.add(c["id"])
                        self._add_discovery_item({
                            "id": f"local-docker-{c['id']}",
                            "raw_id": c["id"],
                            "name": c["name"],
                            "type": "Docker Container",
                            "category": "container",
                            "node": "local",
                            "node_name": "Local Windows Laptop",
                            "details": f"Image: {c['image']} • Status: {c['status']}",
                            "discovered_at": now_str,
                            "status": c["status"],
                            "state": c["state"],
                            "cpu_percent": 0.0,
                            "memory_mb": 0.0,
                            "is_crashed": c.get("is_crashed", False),
                            "actions": ["start", "stop", "restart", "delete"]
                        })
        except Exception as e:
            logger.debug(f"Local docker discovery error: {e}")

        # 4. Local Kubernetes Pods
        try:
            pods = k8s_service.get_pods(namespace="all")
            current_pod_keys = {f"{p['namespace']}/{p['name']}" for p in pods}

            if not self.local_initialized:
                self.known_local_pods = current_pod_keys
            else:
                new_pods = current_pod_keys - self.known_local_pods
                for p in pods:
                    pkey = f"{p['namespace']}/{p['name']}"
                    if pkey in new_pods:
                        self.known_local_pods.add(pkey)
                        self._add_discovery_item({
                            "id": f"local-k8s-{pkey}",
                            "raw_id": p["name"],
                            "name": p["name"],
                            "namespace": p["namespace"],
                            "type": "Kubernetes Pod",
                            "category": "pod",
                            "node": "local",
                            "node_name": "Local Windows Laptop",
                            "details": f"Namespace: {p['namespace']} • Status: {p['status']}",
                            "discovered_at": now_str,
                            "status": p["status"],
                            "state": p.get("phase", "Running"),
                            "cpu_percent": 0.0,
                            "memory_mb": 0.0,
                            "is_crashed": p.get("is_crashing", False),
                            "actions": ["restart", "delete"]
                        })
        except Exception as e:
            logger.debug(f"Local k8s discovery error: {e}")

        # 5. Local Notable Tools / Processes
        try:
            current_pids = set()
            for p in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_info']):
                try:
                    pid = p.info['pid']
                    pname = (p.info['name'] or "").lower()
                    current_pids.add(pid)

                    # Inspect notable tools, browsers and development applications
                    if any(tool in pname for tool in NOTABLE_TOOLS):
                        if self.local_initialized and pid not in self.known_local_pids:
                            mem_mb = round(p.info['memory_info'].rss / (1024**2), 1) if p.info['memory_info'] else 0.0
                            self._add_discovery_item({
                                "id": f"local-proc-{pid}",
                                "raw_id": str(pid),
                                "name": p.info['name'],
                                "type": "Tool / Process",
                                "category": "tool",
                                "node": "local",
                                "node_name": "Local Windows Laptop",
                                "details": f"PID {pid} • Memory: {mem_mb} MB",
                                "discovered_at": now_str,
                                "status": "Running",
                                "state": "running",
                                "cpu_percent": round(p.info['cpu_percent'] or 0.0, 1),
                                "memory_mb": mem_mb,
                                "is_crashed": False,
                                "actions": ["restart", "stop"]
                            })
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass

            self.known_local_pids = current_pids
            self.local_initialized = True
        except Exception as e:
            logger.debug(f"Local process discovery error: {e}")

    def _scan_linux_node(self):
        now_str = datetime.now(timezone.utc).isoformat()
        if not linux_service.is_connected():
            return

        # 1. Linux Downloaded Packages / Deployment Scripts
        try:
            raw_dl = linux_service.execute_command("find /home/administrator/ /opt/ /tmp/ -maxdepth 2 -type f \\( -name '*.deb' -o -name '*.sh' -o -name '*.tar.gz' -o -name '*.bin' \\) -mtime -15 2>/dev/null | head -n 12")
            current_dl_paths = set(filter(None, [line.strip() for line in raw_dl.splitlines()]))

            if not self.linux_initialized:
                self.known_linux_downloads = current_dl_paths
                for dpath in list(current_dl_paths)[:4]:
                    fname = os.path.basename(dpath)
                    self._add_discovery_item({
                        "id": f"linux-dl-{abs(hash(dpath)) % 100000}",
                        "raw_id": dpath,
                        "name": fname,
                        "type": "Linux Package / Script",
                        "category": "download",
                        "node": "linux",
                        "node_name": "Linux Server (172.16.10.29)",
                        "details": f"Package / Deployment script at: {dpath}",
                        "discovered_at": now_str,
                        "status": "Ready",
                        "state": "stopped",
                        "cpu_percent": 0.0,
                        "memory_mb": 0.0,
                        "is_crashed": False,
                        "actions": ["start"]
                    })
            else:
                new_dls = current_dl_paths - self.known_linux_downloads
                for dpath in new_dls:
                    self.known_linux_downloads.add(dpath)
                    fname = os.path.basename(dpath)
                    self._add_discovery_item({
                        "id": f"linux-dl-{abs(hash(dpath)) % 100000}",
                        "raw_id": dpath,
                        "name": fname,
                        "type": "Linux Package / Script",
                        "category": "download",
                        "node": "linux",
                        "node_name": "Linux Server (172.16.10.29)",
                        "details": f"Newly downloaded package/script: {dpath}",
                        "discovered_at": now_str,
                        "status": "Ready",
                        "state": "stopped",
                        "cpu_percent": 0.0,
                        "memory_mb": 0.0,
                        "is_crashed": False,
                        "actions": ["start"]
                    })
        except Exception as e:
            logger.debug(f"Linux downloads discovery error: {e}")

        # 2. Linux Systemd Services
        try:
            raw_units = linux_service.execute_command("systemctl list-units --type=service --state=running --no-pager --no-legend")
            current_services = set()
            for line in raw_units.splitlines():
                parts = line.split()
                if len(parts) >= 4 and parts[0].endswith(".service"):
                    s_name = parts[0]
                    if not any(noise in s_name.lower() for noise in ["systemd-", "dbus", "getty", "udev", "user@"]):
                        current_services.add(s_name)

            if not self.linux_initialized:
                self.known_linux_services = current_services
            else:
                new_services = current_services - self.known_linux_services
                for s_name in new_services:
                    self.known_linux_services.add(s_name)
                    self._add_discovery_item({
                        "id": f"linux-srv-{s_name}",
                        "raw_id": s_name,
                        "name": s_name,
                        "type": "Linux Service (systemd)",
                        "category": "tool",
                        "node": "linux",
                        "node_name": "Linux Server (172.16.10.29)",
                        "details": f"Newly active systemd service discovered on Linux: {s_name}",
                        "discovered_at": now_str,
                        "status": "Running",
                        "state": "running",
                        "cpu_percent": 0.0,
                        "memory_mb": 0.0,
                        "is_crashed": False,
                        "actions": ["restart", "stop"]
                    })
        except Exception as e:
            logger.debug(f"Linux service discovery error: {e}")

        # 3. Linux Docker Containers
        try:
            containers = linux_service.get_docker_containers()
            current_ids = {c["id"] for c in containers}

            if not self.linux_initialized:
                self.known_linux_containers = current_ids
            else:
                new_ids = current_ids - self.known_linux_containers
                for c in containers:
                    if c["id"] in new_ids:
                        self.known_linux_containers.add(c["id"])
                        self._add_discovery_item({
                            "id": f"linux-docker-{c['id']}",
                            "raw_id": c["id"],
                            "name": c["name"],
                            "type": "Docker Container",
                            "category": "container",
                            "node": "linux",
                            "node_name": "Linux Server (172.16.10.29)",
                            "details": f"Image: {c['image']} • Status: {c['status']}",
                            "discovered_at": now_str,
                            "status": c["status"],
                            "state": c["state"],
                            "cpu_percent": 0.0,
                            "memory_mb": 0.0,
                            "is_crashed": c.get("is_crashed", False),
                            "actions": ["start", "stop", "restart", "delete"]
                        })
        except Exception as e:
            logger.debug(f"Linux docker discovery error: {e}")

        # 4. Linux Kubernetes Pods
        try:
            pods = linux_service.get_k8s_pods()
            current_pod_keys = {f"{p['namespace']}/{p['name']}" for p in pods}

            if not self.linux_initialized:
                self.known_linux_pods = current_pod_keys
            else:
                new_pods = current_pod_keys - self.known_linux_pods
                for p in pods:
                    pkey = f"{p['namespace']}/{p['name']}"
                    if pkey in new_pods:
                        self.known_linux_pods.add(pkey)
                        self._add_discovery_item({
                            "id": f"linux-k8s-{pkey}",
                            "raw_id": p["name"],
                            "name": p["name"],
                            "namespace": p["namespace"],
                            "type": "Kubernetes Pod (k3s)",
                            "category": "pod",
                            "node": "linux",
                            "node_name": "Linux Server (172.16.10.29)",
                            "details": f"Namespace: {p['namespace']} • Status: {p['status']}",
                            "discovered_at": now_str,
                            "status": p["status"],
                            "state": p.get("phase", "Running"),
                            "cpu_percent": 0.0,
                            "memory_mb": 0.0,
                            "is_crashed": p.get("is_crashing", False),
                            "actions": ["restart", "delete"]
                        })
        except Exception as e:
            logger.debug(f"Linux k8s discovery error: {e}")

        self.linux_initialized = True

    def _scan_winserver_node(self):
        now_str = datetime.now(timezone.utc).isoformat()
        try:
            apps = windows_server_service.get_applications_overview()
            for app in apps:
                # Add running IIS sites and services to discovered list
                if app.get("status") == "running":
                    self._add_discovery_item({
                        "id": f"winserver-app-{app['id']}",
                        "raw_id": app["id"],
                        "name": app["name"],
                        "type": app.get("category", "IIS Web Application"),
                        "category": "application",
                        "node": "winserver",
                        "node_name": "Windows Server (172.16.10.30)",
                        "details": f"{app['description']} • {app.get('executable_path', '')}",
                        "discovered_at": now_str,
                        "status": "Running",
                        "state": "running",
                        "cpu_percent": app.get("cpu_percent", 0.0),
                        "memory_mb": app.get("memory_mb", 0.0),
                        "is_crashed": False,
                        "actions": ["start", "stop", "restart"]
                    })
            self.winserver_initialized = True
        except Exception as e:
            logger.debug(f"WinServer discovery error: {e}")

    def _add_discovery_item(self, item: Dict[str, Any]):
        """Prepends a new item to the discovery list with deduplication."""
        for ex in self.discovered_items:
            if ex["id"] == item["id"]:
                ex.update(item)
                return

        self.discovered_items.insert(0, item)
        if len(self.discovered_items) > 80:
            self.discovered_items = self.discovered_items[:80]

        logger.info(f"✨ NEW ENTITY DISCOVERED: {item['type']} '{item['name']}' on {item['node_name']}")

    def get_discovered_items(self, target: str = "all") -> List[Dict[str, Any]]:
        """Returns the list of recently discovered entities for the requested node."""
        if target == "all":
            return self.discovered_items
        return [item for item in self.discovered_items if item["node"] == target]

    def trigger_test_discovery(self, target: str = "local") -> Dict[str, Any]:
        """Injects or forces a live discovery check for testing and demonstrations."""
        now_str = datetime.now(timezone.utc).isoformat()
        sample_item = {
            "id": f"{target}-demo-{int(time.time())}",
            "raw_id": f"demo-{int(time.time()) % 1000}",
            "name": f"telemetry-agent-{int(time.time()) % 1000}",
            "type": "Docker Container" if target == "linux" else "Tool / Process",
            "category": "container" if target == "linux" else "tool",
            "node": target,
            "node_name": "Linux Server (172.16.10.29)" if target == "linux" else "Local Windows Laptop",
            "details": "Newly deployed workload discovered by AIOps Dynamic Engine.",
            "discovered_at": now_str,
            "status": "Running",
            "state": "running",
            "cpu_percent": 1.2,
            "memory_mb": 42.5,
            "is_crashed": False,
            "actions": ["start", "stop", "restart", "delete"]
        }
        self._add_discovery_item(sample_item)
        return sample_item

discovery_service = DynamicDiscoveryService()
