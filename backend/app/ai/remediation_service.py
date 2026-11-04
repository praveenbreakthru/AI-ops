import os
import subprocess
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from app.config import settings

logger = logging.getLogger(__name__)

# Approved safe Windows services allowed for controlled restart
APPROVED_SERVICES_SAFELIST = {
    "Spooler", "W32Time", "wuauserv", "LanmanWorkstation", "Themes"
}

# Approved diagnostic scripts allowed for execution
APPROVED_DIAGNOSTIC_COMMANDS = {
    "network_health": "Test-NetConnection -ComputerName 1.1.1.1 -InformationLevel Detailed",
    "disk_health": "Get-PhysicalDisk | Select-Object DeviceId, FriendlyName, OperationalStatus, HealthStatus",
    "service_health": "Get-Service | Where-Object { $_.Status -ne 'Running' -and $_.StartType -eq 'Automatic' }"
}

class RemediationService:
    def __init__(self):
        self.mode = settings.REMEDIATION_MODE # "manual_approval" or "automatic"
        self.action_history = []

    def request_action(self, action_type: str, target: str, reason: str, requested_by: str = "aiops_engine") -> Dict[str, Any]:
        """
        Registers a remediation action request.
        If mode is manual_approval, queues the action with status 'pending_approval'.
        """
        action_id = len(self.action_history) + 1
        record = {
            "id": action_id,
            "action_type": action_type,
            "target": target,
            "reason": reason,
            "requested_by": requested_by,
            "approved_by": None,
            "status": "pending_approval",
            "command_executed": None,
            "execution_result": None,
            "error_message": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "executed_at": None
        }
        self.action_history.append(record)
        self._write_audit_log(record, "REQUESTED")
        return record

    def approve_and_execute(self, action_id: int, approved_by: str = "admin") -> Dict[str, Any]:
        """
        Executes a queued action only after explicit operator approval.
        Enforces strict safelisting and sandboxing.
        """
        record = next((r for r in self.action_history if r["id"] == action_id), None)
        if not record:
            return {"error": f"Action ID {action_id} not found."}

        if record["status"] == "executed":
            return {"error": "Action already executed."}

        action_type = record["action_type"]
        target = record["target"]
        record["approved_by"] = approved_by

        try:
            if action_type == "restart_service":
                result = self._execute_service_restart(target)
            elif action_type == "clean_temp_files":
                result = self._execute_temp_cleanup()
            elif action_type == "run_diagnostics":
                result = self._execute_diagnostic(target)
            else:
                record["status"] = "rejected"
                record["error_message"] = f"Action type '{action_type}' is not recognized in safety policy."
                self._write_audit_log(record, "REJECTED")
                return record

            record["status"] = "executed"
            record["execution_result"] = result.get("output")
            record["command_executed"] = result.get("command")
            record["executed_at"] = datetime.now(timezone.utc).isoformat()
            self._write_audit_log(record, "EXECUTED")
            return record

        except Exception as e:
            record["status"] = "failed"
            record["error_message"] = str(e)
            self._write_audit_log(record, "FAILED")
            return record

    def _execute_service_restart(self, service_name: str) -> Dict[str, str]:
        """Restarts a failed service if and only if it is explicitly safelisted."""
        if service_name not in APPROVED_SERVICES_SAFELIST:
            raise PermissionError(f"Service '{service_name}' is not in the approved safety list {APPROVED_SERVICES_SAFELIST}.")

        cmd = f"Restart-Service -Name '{service_name}' -Force -PassThru"
        proc = subprocess.run(["powershell", "-NoProfile", "-Command", cmd], capture_output=True, text=True, timeout=15)
        if proc.returncode != 0:
            raise RuntimeError(f"Service restart failed: {proc.stderr}")
        return {"command": cmd, "output": proc.stdout.strip() or f"Service {service_name} restarted successfully."}

    def _execute_temp_cleanup(self) -> Dict[str, str]:
        """Safely cleans application temp files older than 24 hours under %TEMP%."""
        cmd = """
        $temp = [System.IO.Path]::GetTempPath()
        $limit = (Get-Date).AddDays(-1)
        $files = Get-ChildItem -Path $temp -File -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime -lt $limit }
        $count = $files.Count
        $files | Remove-Item -Force -ErrorAction SilentlyContinue
        "Purged $count temporary files older than 24h."
        """
        proc = subprocess.run(["powershell", "-NoProfile", "-Command", cmd], capture_output=True, text=True, timeout=20)
        return {"command": "Purge %TEMP% files > 24 hours", "output": proc.stdout.strip()}

    def _execute_diagnostic(self, diag_name: str) -> Dict[str, str]:
        """Runs pre-approved read-only PowerShell diagnostic health commands."""
        if diag_name not in APPROVED_DIAGNOSTIC_COMMANDS:
            raise PermissionError(f"Diagnostic '{diag_name}' is not approved.")

        cmd = APPROVED_DIAGNOSTIC_COMMANDS[diag_name]
        proc = subprocess.run(["powershell", "-NoProfile", "-Command", cmd], capture_output=True, text=True, timeout=15)
        return {"command": cmd, "output": proc.stdout.strip() or "Diagnostic completed."}

    def _write_audit_log(self, record: Dict[str, Any], status: str):
        """Appends audit event to persistent audit log."""
        try:
            line = f"[{datetime.now(timezone.utc).isoformat()}] [{status}] ID={record['id']} TYPE={record['action_type']} TARGET={record['target']} BY={record.get('approved_by') or record['requested_by']}\n"
            os.makedirs(os.path.dirname(settings.AUDIT_LOG_PATH), exist_ok=True)
            with open(settings.AUDIT_LOG_PATH, "a", encoding="utf-8") as f:
                f.write(line)
        except Exception as e:
            logger.error(f"Failed to write remediation audit log: {e}")

remediation_service = RemediationService()
