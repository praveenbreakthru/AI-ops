import json
import logging
import subprocess
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

class DockerService:
    def __init__(self):
        self._last_known_status = False

    def is_daemon_running(self) -> bool:
        """Quick check to see if Docker daemon is responsive."""
        try:
            proc = subprocess.run(
                ["docker", "version", "--format", "{{json .Client.Version}}"],
                capture_output=True,
                text=True,
                timeout=4
            )
            if proc.returncode != 0:
                return False
            # Check ping / info
            info_proc = subprocess.run(
                ["docker", "info", "--format", "{{.ServerVersion}}"],
                capture_output=True,
                text=True,
                timeout=4
            )
            return info_proc.returncode == 0
        except Exception:
            return False

    def get_docker_overview(self) -> Dict[str, Any]:
        """Returns aggregate overview of Docker daemon, containers, and images."""
        if not self.is_daemon_running():
            return {
                "is_running": False,
                "server_version": None,
                "containers_total": 0,
                "containers_running": 0,
                "containers_stopped": 0,
                "containers_paused": 0,
                "images_total": 0,
                "storage_driver": None,
                "memory_limit": True,
                "error": "Docker daemon is offline or starting up."
            }

        try:
            proc = subprocess.run(
                ["docker", "info", "--format", "{{json .}}"],
                capture_output=True,
                text=True,
                timeout=6
            )
            if proc.returncode == 0 and proc.stdout.strip():
                raw = json.loads(proc.stdout.strip())
                return {
                    "is_running": True,
                    "server_version": raw.get("ServerVersion", "Unknown"),
                    "containers_total": raw.get("Containers", 0),
                    "containers_running": raw.get("ContainersRunning", 0),
                    "containers_stopped": raw.get("ContainersStopped", 0),
                    "containers_paused": raw.get("ContainersPaused", 0),
                    "images_total": raw.get("Images", 0),
                    "storage_driver": raw.get("Driver", "overlay2"),
                    "cpus": raw.get("NCPU", 4),
                    "total_memory_gb": round(raw.get("MemTotal", 0) / (1024**3), 2),
                    "operating_system": raw.get("OperatingSystem", "Docker Desktop"),
                    "error": None
                }
        except Exception as e:
            logger.debug(f"Docker info parse error: {e}")

        # Fallback if info json failed
        containers = self.get_containers(all=True)
        running = sum(1 for c in containers if c.get("state") == "running")
        stopped = len(containers) - running
        images = self.get_images()

        return {
            "is_running": True,
            "server_version": "Docker Engine",
            "containers_total": len(containers),
            "containers_running": running,
            "containers_stopped": stopped,
            "containers_paused": 0,
            "images_total": len(images),
            "storage_driver": "overlay2",
            "error": None
        }

    def get_containers(self, all: bool = True) -> List[Dict[str, Any]]:
        """Returns all containers with live state, exit codes, and health."""
        if not self.is_daemon_running():
            return []

        cmd = ["docker", "ps", "--format", "{{json .}}"]
        if all:
            cmd.insert(2, "-a")

        try:
            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=8)
            if proc.returncode != 0 or not proc.stdout.strip():
                return []

            containers = []
            for line in proc.stdout.strip().splitlines():
                line = line.strip()
                if not line:
                    continue
                try:
                    c = json.loads(line)
                    state = c.get("State", "unknown").lower()
                    status_text = c.get("Status", "")

                    # Check health status
                    health = "none"
                    if "healthy" in status_text.lower():
                        health = "healthy"
                    elif "unhealthy" in status_text.lower():
                        health = "unhealthy"

                    # Parse exit code from status (e.g. "Exited (1) 2 minutes ago")
                    exit_code = 0
                    if "exited (" in status_text.lower():
                        try:
                            exit_code = int(status_text.split("(")[1].split(")")[0])
                        except Exception:
                            exit_code = 1

                    is_new = any(kw in status_text.lower() for kw in ["second", "minute", "less than"])

                    containers.append({
                        "id": c.get("ID", "")[:12],
                        "name": c.get("Names", "unnamed").lstrip("/"),
                        "image": c.get("Image", "unknown"),
                        "command": c.get("Command", ""),
                        "created_at": c.get("CreatedAt", ""),
                        "status": status_text,
                        "state": state, # running, exited, restarting, paused, dead
                        "health": health,
                        "exit_code": exit_code,
                        "ports": c.get("Ports", ""),
                        "is_crashed": state == "exited" and exit_code != 0,
                        "is_new": is_new
                    })
                except Exception:
                    pass

            return containers
        except Exception as e:
            logger.debug(f"Error fetching containers: {e}")
            return []

    def get_images(self) -> List[Dict[str, Any]]:
        """Returns all downloaded Docker images."""
        if not self.is_daemon_running():
            return []

        try:
            proc = subprocess.run(
                ["docker", "images", "--format", "{{json .}}"],
                capture_output=True,
                text=True,
                timeout=8
            )
            if proc.returncode != 0 or not proc.stdout.strip():
                return []

            images = []
            for line in proc.stdout.strip().splitlines():
                if not line.strip():
                    continue
                try:
                    img = json.loads(line.strip())
                    images.append({
                        "id": img.get("ID", "")[:12],
                        "repository": img.get("Repository", "<none>"),
                        "tag": img.get("Tag", "<none>"),
                        "size": img.get("Size", "0B"),
                        "created_since": img.get("CreatedSince", "unknown")
                    })
                except Exception:
                    pass
            return images
        except Exception as e:
            logger.debug(f"Error fetching docker images: {e}")
            return []

    def get_container_logs(self, container_id: str, tail: int = 80) -> str:
        """Fetches the latest stdout/stderr logs from a container."""
        try:
            proc = subprocess.run(
                ["docker", "logs", "--tail", str(tail), container_id],
                capture_output=True,
                text=True,
                timeout=6
            )
            return proc.stdout or proc.stderr or "No log output available."
        except Exception as e:
            return f"Error retrieving container logs: {e}"

    def restart_container(self, container_id: str) -> Dict[str, Any]:
        """Restarts a container."""
        try:
            proc = subprocess.run(
                ["docker", "restart", container_id],
                capture_output=True,
                text=True,
                timeout=15
            )
            success = proc.returncode == 0
            return {
                "success": success,
                "container_id": container_id,
                "message": "Container restarted successfully." if success else proc.stderr.strip()
            }
        except Exception as e:
            return {"success": False, "container_id": container_id, "message": str(e)}

    def stop_container(self, container_id: str) -> Dict[str, Any]:
        """Stops a container."""
        try:
            proc = subprocess.run(
                ["docker", "stop", container_id],
                capture_output=True,
                text=True,
                timeout=12
            )
            success = proc.returncode == 0
            return {
                "success": success,
                "container_id": container_id,
                "message": "Container stopped." if success else proc.stderr.strip()
            }
        except Exception as e:
            return {"success": False, "container_id": container_id, "message": str(e)}

    def start_container(self, container_id: str) -> Dict[str, Any]:
        """Starts an existing container."""
        try:
            proc = subprocess.run(
                ["docker", "start", container_id],
                capture_output=True,
                text=True,
                timeout=12
            )
            success = proc.returncode == 0
            return {
                "success": success,
                "container_id": container_id,
                "message": "Container started successfully." if success else proc.stderr.strip()
            }
        except Exception as e:
            return {"success": False, "container_id": container_id, "message": str(e)}

    def delete_container(self, container_id: str, force: bool = True) -> Dict[str, Any]:
        """Deletes/removes a container."""
        try:
            cmd = ["docker", "rm"]
            if force:
                cmd.append("-f")
            cmd.append(container_id)
            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=12)
            success = proc.returncode == 0
            return {
                "success": success,
                "container_id": container_id,
                "message": f"Container {container_id} deleted." if success else proc.stderr.strip()
            }
        except Exception as e:
            return {"success": False, "container_id": container_id, "message": str(e)}

    def delete_image(self, image_id: str, force: bool = True) -> Dict[str, Any]:
        """Deletes a Docker image."""
        try:
            cmd = ["docker", "rmi"]
            if force:
                cmd.append("-f")
            cmd.append(image_id)
            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
            success = proc.returncode == 0
            return {
                "success": success,
                "image_id": image_id,
                "message": f"Image {image_id} deleted." if success else proc.stderr.strip()
            }
        except Exception as e:
            return {"success": False, "image_id": image_id, "message": str(e)}

    def prune_images(self) -> Dict[str, Any]:
        """Prunes unused/dangling images to free disk space."""
        try:
            proc = subprocess.run(
                ["docker", "image", "prune", "-f"],
                capture_output=True,
                text=True,
                timeout=20
            )
            return {
                "success": proc.returncode == 0,
                "output": proc.stdout.strip() or "Images pruned."
            }
        except Exception as e:
            return {"success": False, "output": str(e)}

    def launch_docker_desktop(self) -> Dict[str, Any]:
        """Attempts to start Docker Desktop on Windows."""
        import os
        paths = [
            os.path.expandvars(r"%LOCALAPPDATA%\Programs\DockerDesktop\Docker Desktop.exe"),
            r"C:\Program Files\Docker\Docker\Docker Desktop.exe"
        ]
        for p in paths:
            if os.path.exists(p):
                try:
                    subprocess.Popen([p], shell=True)
                    return {"success": True, "message": "Docker Desktop launch command dispatched."}
                except Exception as e:
                    return {"success": False, "message": f"Failed to start Docker Desktop: {e}"}
        return {"success": False, "message": "Docker Desktop executable not found."}

docker_service = DockerService()

