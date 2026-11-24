import time
import subprocess
from fastapi import APIRouter, Body, HTTPException
from typing import Dict, Any
from app.services.linux_service import linux_service
from app.services.windows_server_service import windows_server_service
from app.services.node_manager import node_manager

router = APIRouter(prefix="/terminal", tags=["Embedded Web Terminal"])

@router.post("/execute")
def execute_terminal_command(payload: Dict[str, Any] = Body(...)):
    """
    Executes a command on the selected target node (Linux SSH, Windows Server PowerShell CIM, or Local shell).
    Returns stdout/stderr, exit code, and execution latency.
    """
    command = payload.get("command", "").strip()
    target = payload.get("target", "winserver").lower()

    if not command:
        raise HTTPException(status_code=400, detail="Command cannot be empty.")

    start_time = time.perf_counter()

    try:
        if target == "linux":
            # Execute on Ubuntu Linux node via SSH
            output = linux_service.execute_command(command, use_sudo=False)
            latency = (time.perf_counter() - start_time) * 1000.0
            return {
                "target": "linux",
                "node_label": f"LS ({linux_service.host})",
                "command": command,
                "output": output or "[Process completed with no output]",
                "exit_code": 0,
                "latency_ms": round(latency, 1)
            }

        elif target in ("winserver", "windows_server"):
            # Execute on Windows Server via remote PowerShell CIM/DCOM wrapper
            res = windows_server_service._execute_powershell(f"""
            try {{
                $out = Invoke-Expression '{command}' | Out-String
                @{{ output = $out; exit_code = 0 }} | ConvertTo-Json
            }} catch {{
                @{{ output = $_.Exception.Message; exit_code = 1 }} | ConvertTo-Json
            }}
            """, timeout=15)

            latency = (time.perf_counter() - start_time) * 1000.0
            if isinstance(res, dict):
                return {
                    "target": "winserver",
                    "node_label": f"WS ({windows_server_service.host})",
                    "command": command,
                    "output": res.get("output") or "[Process completed with no output]",
                    "exit_code": res.get("exit_code", 0),
                    "latency_ms": round(latency, 1)
                }
            return {
                "target": "winserver",
                "node_label": f"WS ({windows_server_service.host})",
                "command": command,
                "output": str(res) if res else "Command sent to Windows Server.",
                "exit_code": 0,
                "latency_ms": round(latency, 1)
            }

        else:
            # Local Laptop
            proc = subprocess.run(
                ["powershell", "-NoProfile", "-Command", command],
                capture_output=True,
                text=True,
                timeout=15
            )
            latency = (time.perf_counter() - start_time) * 1000.0
            out = proc.stdout if proc.stdout else proc.stderr
            return {
                "target": "local",
                "node_label": "LL (127.0.0.1)",
                "command": command,
                "output": out or "[Process completed with no output]",
                "exit_code": proc.returncode,
                "latency_ms": round(latency, 1)
            }

    except subprocess.TimeoutExpired:
        return {
            "target": target,
            "command": command,
            "output": "Command timed out after 15 seconds.",
            "exit_code": 124,
            "latency_ms": 15000.0
        }
    except Exception as e:
        return {
            "target": target,
            "command": command,
            "output": f"Execution error: {str(e)}",
            "exit_code": 1,
            "latency_ms": round((time.perf_counter() - start_time) * 1000.0, 1)
        }

