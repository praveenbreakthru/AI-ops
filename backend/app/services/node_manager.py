import re
import time
import socket
import logging
import subprocess
from typing import Dict, Any, List, Optional
import paramiko

from app.config import settings
from app.database.session import SessionLocal, init_db
from app.database.models import ManagedNode
from app.services.system_service import system_service
from app.services.linux_service import LinuxService, linux_service
from app.services.windows_server_service import WindowsServerService, windows_server_service

logger = logging.getLogger("node_manager")

class NodeManager:
    def __init__(self):
        self._collectors: Dict[str, Any] = {}
        try:
            init_db()
        except Exception as e:
            logger.warning(f"Database init check: {e}")

    def get_service(self, target: str):
        """
        Returns the appropriate monitoring collector service for a given target node id.
        Supports:
          - 'local': Native Windows Collector
          - 'linux': Pre-configured or edited Linux Server
          - 'winserver' / 'windows_server': Pre-configured or edited Windows Server
          - Custom node IDs registered in the database
        """
        target = target.lower().strip()
        if target == "local":
            return system_service

        # Check in memory collector cache
        if target in self._collectors:
            return self._collectors[target]

        # Look up in database
        db = SessionLocal()
        try:
            node = db.query(ManagedNode).filter(ManagedNode.id == target).first()

            if target == "linux":
                if node and node.status != "deleted" and node.host:
                    collector = LinuxService(
                        host=node.host,
                        port=node.port or 22,
                        user=node.username,
                        password=node.password
                    )
                    self._collectors[target] = collector
                    return collector
                return linux_service

            if target in ("winserver", "windows_server"):
                if node and node.status != "deleted" and node.host:
                    collector = WindowsServerService(
                        host=node.host,
                        user=node.username,
                        password=node.password
                    )
                    self._collectors[target] = collector
                    return collector
                return windows_server_service

            if not node or node.status == "deleted":
                logger.warning(f"Node target '{target}' not found or deleted; defaulting to local.")
                return system_service

            if node.os_type == "linux":
                collector = LinuxService(
                    host=node.host,
                    port=node.port or 22,
                    user=node.username,
                    password=node.password
                )
            else:
                collector = WindowsServerService(
                    host=node.host,
                    user=node.username,
                    password=node.password
                )

            self._collectors[target] = collector
            return collector
        finally:
            db.close()

    def get_all_nodes(self) -> List[Dict[str, Any]]:
        """Returns all active monitored nodes (built-in and custom), respecting deletions and edits."""
        db = SessionLocal()
        try:
            records = {n.id: n for n in db.query(ManagedNode).all()}
            nodes = []

            # 1. Local Laptop
            local_rec = records.get("local")
            if not (local_rec and local_rec.status == "deleted"):
                local_overview = system_service.get_system_overview()
                nodes.append({
                    "id": "local",
                    "name": local_rec.name if (local_rec and local_rec.name) else "Local Windows Laptop",
                    "hostname": local_overview.specs.hostname,
                    "os": "windows",
                    "os_display": f"{local_overview.specs.os_name} {local_overview.specs.os_version}",
                    "ip": "127.0.0.1",
                    "status": "online",
                    "is_local": True,
                    "is_custom": False,
                    "can_edit": False,
                    "can_delete": True
                })

            # 2. Linux Server
            linux_rec = records.get("linux")
            if not (linux_rec and linux_rec.status == "deleted"):
                linux_host = (linux_rec.host if (linux_rec and linux_rec.host) else settings.LINUX_SERVER_HOST)
                linux_srv = self.get_service("linux")
                linux_online = linux_srv.is_connected() if hasattr(linux_srv, "is_connected") else True
                nodes.append({
                    "id": "linux",
                    "name": linux_rec.name if (linux_rec and linux_rec.name) else f"Linux Server ({linux_host})",
                    "hostname": "btubuntu",
                    "os": "linux",
                    "os_display": "Ubuntu 24.04.4 LTS",
                    "ip": linux_host,
                    "status": "online" if linux_online else "offline",
                    "is_local": False,
                    "is_custom": False,
                    "can_edit": True,
                    "can_delete": True
                })

            # 3. Windows Server
            win_rec = records.get("winserver")
            if not (win_rec and win_rec.status == "deleted"):
                win_host = (win_rec.host if (win_rec and win_rec.host) else settings.WINDOWS_SERVER_HOST)
                win_srv = self.get_service("winserver")
                win_online = win_srv.is_connected() if hasattr(win_srv, "is_connected") else True
                nodes.append({
                    "id": "winserver",
                    "name": win_rec.name if (win_rec and win_rec.name) else f"Windows Server ({win_host})",
                    "hostname": "SCOMODE",
                    "os": "windows_server",
                    "os_display": "Windows Server 2016 Standard",
                    "ip": win_host,
                    "status": "online" if win_online else "offline",
                    "is_local": False,
                    "is_custom": False,
                    "can_edit": True,
                    "can_delete": True
                })

            # 4. Custom Registered Nodes
            for n in records.values():
                if n.id not in ("local", "linux", "winserver") and n.status != "deleted":
                    nodes.append({
                        "id": n.id,
                        "name": n.name,
                        "hostname": n.name,
                        "os": n.os_type,
                        "os_display": "Linux Server" if n.os_type == "linux" else "Windows Server",
                        "ip": n.host,
                        "port": n.port,
                        "username": n.username,
                        "status": n.status,
                        "is_local": False,
                        "is_custom": True,
                        "can_edit": True,
                        "can_delete": True,
                        "created_at": n.created_at.isoformat() if n.created_at else None
                    })

            return nodes
        finally:
            db.close()

    def get_node_config(self, node_id: str) -> Optional[Dict[str, Any]]:
        """Returns the editable configuration of a server node, including credentials for editing."""
        db = SessionLocal()
        try:
            node = db.query(ManagedNode).filter(ManagedNode.id == node_id).first()

            if node_id == "linux":
                return {
                    "id": "linux",
                    "name": node.name if (node and node.name) else f"Linux Server ({settings.LINUX_SERVER_HOST})",
                    "os_type": "linux",
                    "host": node.host if (node and node.host) else settings.LINUX_SERVER_HOST,
                    "port": node.port if (node and node.port) else settings.LINUX_SERVER_PORT,
                    "username": node.username if (node and node.username) else settings.LINUX_SERVER_USER,
                    "password": node.password if (node and node.password) else settings.LINUX_SERVER_PASSWORD
                }

            if node_id in ("winserver", "windows_server"):
                return {
                    "id": "winserver",
                    "name": node.name if (node and node.name) else f"Windows Server ({settings.WINDOWS_SERVER_HOST})",
                    "os_type": "windows_server",
                    "host": node.host if (node and node.host) else settings.WINDOWS_SERVER_HOST,
                    "port": node.port if (node and node.port) else settings.WINDOWS_SERVER_PORT,
                    "username": node.username if (node and node.username) else settings.WINDOWS_SERVER_USER,
                    "password": node.password if (node and node.password) else settings.WINDOWS_SERVER_PASSWORD
                }

            if node and node.status != "deleted":
                return {
                    "id": node.id,
                    "name": node.name,
                    "os_type": node.os_type,
                    "host": node.host,
                    "port": node.port,
                    "username": node.username,
                    "password": node.password
                }

            return None
        finally:
            db.close()

    def update_node(self, node_id: str, name: str, host: str, port: int, username: str, password: Optional[str] = None) -> Dict[str, Any]:
        """Updates and persists the configuration of an existing monitored server."""
        db = SessionLocal()
        try:
            node = db.query(ManagedNode).filter(ManagedNode.id == node_id).first()
            if not node:
                os_type = "linux" if node_id == "linux" else "windows_server"
                pwd = password or (settings.LINUX_SERVER_PASSWORD if node_id == "linux" else settings.WINDOWS_SERVER_PASSWORD)
                node = ManagedNode(
                    id=node_id,
                    name=name,
                    os_type=os_type,
                    host=host,
                    port=port,
                    username=username,
                    password=pwd,
                    is_custom=(node_id not in ("local", "linux", "winserver")),
                    status="online"
                )
                db.add(node)
            else:
                node.name = name
                node.host = host
                node.port = port
                node.username = username
                if password:
                    node.password = password
                node.status = "online"

            db.commit()
            db.refresh(node)

            if node_id in self._collectors:
                del self._collectors[node_id]

            return {
                "id": node.id,
                "name": node.name,
                "os": node.os_type,
                "host": node.host,
                "port": node.port,
                "username": node.username,
                "status": "online"
            }
        finally:
            db.close()

    def test_connection(self, host: str, port: int, os_type: str, username: str, password: str) -> Dict[str, Any]:
        """Pre-flight connection probe. Connects to the remote server using credentials."""
        start_time = time.time()
        host = host.strip()
        username = username.strip()

        # 1. Quick TCP socket probe
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(3.5)
            test_port = port or (22 if os_type == "linux" else 135)
            if os_type in ("windows", "windows_server"):
                test_port = 135  # RPC Endpoint Mapper for CIM/DCOM
            result = sock.connect_ex((host, test_port))
            sock.close()
            if result != 0:
                return {
                    "success": False,
                    "message": f"Cannot reach {host} on port {test_port}. Please verify the IP address and firewall settings."
                }
        except Exception as e:
            return {"success": False, "message": f"Network reachability error: {str(e)}"}

        # 2. Authentication probe based on OS type
        if os_type == "linux":
            client = paramiko.SSHClient()
            client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            try:
                client.connect(
                    host,
                    port=port or 22,
                    username=username,
                    password=password,
                    timeout=5,
                    banner_timeout=5,
                    auth_timeout=5
                )
                stdin, stdout, stderr = client.exec_command("hostname; uname -srm; uptime -p 2>/dev/null || uptime", timeout=5)
                output = stdout.read().decode('utf-8', errors='replace').strip().split('\n')
                client.close()

                elapsed_ms = int((time.time() - start_time) * 1000)
                hostname = output[0] if len(output) > 0 else host
                os_info = output[1] if len(output) > 1 else "Linux Kernel"
                uptime = output[2] if len(output) > 2 else "Active"

                return {
                    "success": True,
                    "latency_ms": elapsed_ms,
                    "hostname": hostname,
                    "os_display": f"Linux ({os_info})",
                    "uptime": uptime,
                    "message": f"SSH connection verified successfully ({elapsed_ms}ms)."
                }
            except paramiko.AuthenticationException:
                return {
                    "success": False,
                    "message": f"Authentication failed for user '{username}'. Please verify password."
                }
            except Exception as e:
                return {
                    "success": False,
                    "message": f"SSH connection error: {str(e)}"
                }
            finally:
                try:
                    client.close()
                except Exception:
                    pass

        else:
            # Windows Server CIM / DCOM Probe
            ps_script = """
param($server, $username, $password)
$sec = ConvertTo-SecureString $password -AsPlainText -Force
$cred = New-Object System.Management.Automation.PSCredential ($username, $sec)
$opt = New-CimSessionOption -Protocol Dcom
try {
    $cim = New-CimSession -ComputerName $server -Credential $cred -SessionOption $opt -ErrorAction Stop
    $os = Get-CimInstance -CimSession $cim -ClassName Win32_OperatingSystem -ErrorAction Stop
    $cs = Get-CimInstance -CimSession $cim -ClassName Win32_ComputerSystem -ErrorAction Stop
    Remove-CimSession $cim
    @{
        status = "OK"
        hostname = $cs.Name
        os_display = $os.Caption
    } | ConvertTo-Json -Compress
} catch {
    Write-Output "ERR: $($_.Exception.Message)"
}
"""
            try:
                proc = subprocess.run(
                    [
                        "powershell", "-NoProfile", "-ExecutionPolicy", "Bypass",
                        "-Command", ps_script,
                        host, username, password
                    ],
                    capture_output=True,
                    text=True,
                    timeout=9
                )
                out = proc.stdout.strip()
                elapsed_ms = int((time.time() - start_time) * 1000)

                if "ERR:" in out:
                    err_msg = out.split("ERR:")[1].strip()
                    return {
                        "success": False,
                        "message": f"Windows WMI verification error: {err_msg}"
                    }

                try:
                    import json
                    data = json.loads(out)
                    return {
                        "success": True,
                        "latency_ms": elapsed_ms,
                        "hostname": data.get("hostname", host),
                        "os_display": data.get("os_display", "Windows Server"),
                        "message": f"Windows CIM/WMI connection verified ({elapsed_ms}ms)."
                    }
                except Exception:
                    return {
                        "success": False,
                        "message": out or "Failed to connect to Windows Server WMI."
                    }
            except subprocess.TimeoutExpired:
                return {
                    "success": False,
                    "message": f"Connection timed out connecting to Windows host {host}."
                }
            except Exception as e:
                return {
                    "success": False,
                    "message": f"Windows connection error: {str(e)}"
                }

    def add_node(self, name: str, os_type: str, host: str, port: int, username: str, password: str) -> Dict[str, Any]:
        """Adds and persists a new monitored server node."""
        name = name.strip()
        host = host.strip()
        username = username.strip()
        port = int(port) if port else (22 if os_type == "linux" else 5985)

        slug = re.sub(r'[^a-zA-Z0-9]', '-', name.lower().strip())
        ip_slug = host.replace('.', '-').replace(':', '-')
        node_id = f"custom-{slug}-{ip_slug}"

        db = SessionLocal()
        try:
            existing = db.query(ManagedNode).filter(ManagedNode.id == node_id).first()
            if existing:
                existing.name = name
                existing.os_type = os_type
                existing.host = host
                existing.port = port
                existing.username = username
                existing.password = password
                existing.status = "online"
                db.commit()
                db.refresh(existing)
                saved_node = existing
            else:
                new_node = ManagedNode(
                    id=node_id,
                    name=name,
                    os_type=os_type,
                    host=host,
                    port=port,
                    username=username,
                    password=password,
                    is_custom=True,
                    status="online"
                )
                db.add(new_node)
                db.commit()
                db.refresh(new_node)
                saved_node = new_node

            if node_id in self._collectors:
                del self._collectors[node_id]

            return {
                "id": saved_node.id,
                "name": saved_node.name,
                "hostname": saved_node.name,
                "os": saved_node.os_type,
                "os_display": "Linux Server" if saved_node.os_type == "linux" else "Windows Server",
                "ip": saved_node.host,
                "port": saved_node.port,
                "username": saved_node.username,
                "status": saved_node.status,
                "is_local": False,
                "is_custom": True,
                "can_edit": True,
                "can_delete": True,
                "created_at": saved_node.created_at.isoformat() if saved_node.created_at else None
            }
        finally:
            db.close()

    def delete_node(self, node_id: str) -> bool:
        """Deletes or marks as deleted a monitored server (including local, linux, winserver)."""
        db = SessionLocal()
        try:
            node = db.query(ManagedNode).filter(ManagedNode.id == node_id).first()
            if node_id in ("local", "linux", "winserver"):
                if not node:
                    node = ManagedNode(
                        id=node_id,
                        name=node_id,
                        os_type="linux" if node_id == "linux" else ("windows" if node_id == "local" else "windows_server"),
                        host="",
                        port=0,
                        username="",
                        password="",
                        is_custom=False,
                        status="deleted"
                    )
                    db.add(node)
                else:
                    node.status = "deleted"
                db.commit()
            else:
                if node:
                    db.delete(node)
                    db.commit()
                else:
                    return False

            if node_id in self._collectors:
                del self._collectors[node_id]
            return True
        finally:
            db.close()

node_manager = NodeManager()
