import time
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from app.services.docker_service import docker_service
from app.services.k8s_service import k8s_service
from app.services.apps_service import apps_service
from app.database.session import SessionLocal
from app.database.models import RemediationAudit, Incident

logger = logging.getLogger(__name__)

class AutoHealEngine:
    def __init__(self):
        # Default mode: "automatic" (can be switched to "manual_approval")
        self.mode = "automatic"
        self._restart_tracker: Dict[str, List[float]] = {} # target -> list of timestamps
        self.max_restarts_per_hour = 3

    def get_status(self) -> Dict[str, Any]:
        """Returns overall auto-healing engine configuration and recent metrics."""
        recent_actions = self.get_recent_actions(limit=10)
        return {
            "mode": self.mode,
            "max_restarts_per_hour": self.max_restarts_per_hour,
            "total_actions_recorded": len(recent_actions),
            "recent_actions": recent_actions
        }

    def set_mode(self, mode: str) -> str:
        """Sets engine mode to 'automatic' or 'manual_approval'."""
        if mode in ["automatic", "manual_approval"]:
            self.mode = mode
            logger.info(f"Auto-Heal Engine mode changed to: {mode}")
        return self.mode

    def _can_restart(self, target: str) -> bool:
        """Rate limiting / infinite loop protection: max 3 attempts per hour."""
        now = time.time()
        one_hour_ago = now - 3600
        if target not in self._restart_tracker:
            self._restart_tracker[target] = []

        # Filter out timestamps older than 1 hour
        self._restart_tracker[target] = [t for t in self._restart_tracker[target] if t > one_hour_ago]

        if len(self._restart_tracker[target]) >= self.max_restarts_per_hour:
            return False

        self._restart_tracker[target].append(now)
        return True

    def run_self_healing_cycle(self):
        """Scans Docker, Kubernetes, and OS applications for failures and self-heals."""
        # 1. Inspect Docker Containers
        if docker_service.is_daemon_running():
            containers = docker_service.get_containers(all=True)
            for c in containers:
                if c.get("is_crashed") or c.get("health") == "unhealthy":
                    self._handle_container_failure(c)

        # 2. Inspect Kubernetes Pods (if cluster is active)
        if k8s_service.is_k8s_available():
            pods = k8s_service.get_pods(namespace="all")
            for p in pods:
                if p.get("is_crashing"):
                    self._handle_pod_failure(p)

    def _handle_container_failure(self, container: Dict[str, Any]):
        """Resolves a crashed or unhealthy Docker container."""
        c_id = container.get("id")
        name = container.get("name", c_id)
        exit_code = container.get("exit_code", 1)
        reason = f"Docker container '{name}' exited abnormally with exit code {exit_code}."

        # Check loop protection
        if not self._can_restart(name):
            logger.warning(f"Auto-Heal loop protection: container '{name}' has exceeded {self.max_restarts_per_hour} restarts/hr.")
            self._record_incident(
                alert_name="DockerContainerPersistentCrash",
                severity="critical",
                summary=f"Persistent failure on Docker container '{name}'",
                description=f"Container failed repeatedly. Throttled automated restarts to prevent boot-loop. Manual inspection required."
            )
            return

        if self.mode == "automatic":
            logger.info(f"[AUTO-HEALING] Restarting failed Docker container: {name} (ID: {c_id})")
            res = docker_service.restart_container(c_id)
            status = "executed" if res.get("success") else "failed"

            self._record_audit(
                action_type="docker_container_auto_restart",
                target=name,
                status=status,
                command_executed=f"docker restart {c_id}",
                execution_result=res.get("message", "Restart command dispatched.")
            )

            if res.get("success"):
                logger.info(f"[AUTO-HEALED] Docker container '{name}' successfully recovered!")
        else:
            # Stage for manual operator approval
            self._record_audit(
                action_type="docker_container_restart",
                target=name,
                status="pending",
                command_executed=f"docker restart {c_id}",
                execution_result="Awaiting operator confirmation to restart."
            )

    def _handle_pod_failure(self, pod: Dict[str, Any]):
        """Resolves a CrashLoopBackOff Kubernetes pod."""
        pod_name = pod.get("name")
        ns = pod.get("namespace", "default")
        status_reason = pod.get("status", "CrashLoopBackOff")

        if not self._can_restart(f"{ns}/{pod_name}"):
            logger.warning(f"Auto-Heal loop protection: Pod '{pod_name}' in namespace '{ns}' exceeded restart threshold.")
            return

        if self.mode == "automatic":
            logger.info(f"[AUTO-HEALING] Deleting broken pod to trigger clean replica: {pod_name} (NS: {ns})")
            res = k8s_service.restart_pod(pod_name, namespace=ns)
            self._record_audit(
                action_type="k8s_pod_auto_restart",
                target=f"{ns}/{pod_name}",
                status="executed" if res.get("success") else "failed",
                command_executed=f"kubectl delete pod {pod_name} -n {ns}",
                execution_result=res.get("message")
            )

    def manual_heal_action(self, action_type: str, target: str) -> Dict[str, Any]:
        """Executes a manual self-healing action requested from the UI."""
        if action_type == "docker_restart":
            res = docker_service.restart_container(target)
            self._record_audit(
                action_type="docker_manual_restart",
                target=target,
                status="executed" if res.get("success") else "failed",
                command_executed=f"docker restart {target}",
                execution_result=res.get("message")
            )
            return res
        elif action_type == "docker_prune":
            res = docker_service.prune_images()
            self._record_audit(
                action_type="docker_prune_images",
                target="system",
                status="executed" if res.get("success") else "failed",
                command_executed="docker image prune -f",
                execution_result=res.get("output")
            )
            return res
        elif action_type == "k8s_pod_restart":
            parts = target.split("/")
            ns = parts[0] if len(parts) > 1 else "default"
            pod_name = parts[1] if len(parts) > 1 else target
            res = k8s_service.restart_pod(pod_name, namespace=ns)
            self._record_audit(
                action_type="k8s_manual_pod_restart",
                target=target,
                status="executed" if res.get("success") else "failed",
                command_executed=f"kubectl delete pod {pod_name} -n {ns}",
                execution_result=res.get("message")
            )
            return res
        elif action_type == "service_restart":
            res = apps_service.restart_application_service(target)
            self._record_audit(
                action_type="service_manual_restart",
                target=target,
                status="executed" if res.get("success") else "failed",
                command_executed=f"Restart-Service -Name '{target}'",
                execution_result=res.get("message")
            )
            return res
        elif action_type == "start_docker":
            return docker_service.launch_docker_desktop()

        return {"success": False, "message": f"Unsupported action type: {action_type}"}

    def _record_audit(self, action_type: str, target: str, status: str, command_executed: str, execution_result: str):
        """Persists self-healing action in SQLite audit trail."""
        if not SessionLocal:
            return
        try:
            with SessionLocal() as db:
                audit = RemediationAudit(
                    action_type=action_type,
                    target=target,
                    status=status,
                    requested_by="auto_healing_engine",
                    command_executed=command_executed,
                    execution_result=execution_result,
                    executed_at=datetime.now(timezone.utc) if status == "executed" else None
                )
                db.add(audit)
                db.commit()
        except Exception as e:
            logger.debug(f"Audit log error: {e}")

    def _record_incident(self, alert_name: str, severity: str, summary: str, description: str):
        """Records an incident if not already firing."""
        if not SessionLocal:
            return
        try:
            with SessionLocal() as db:
                existing = db.query(Incident).filter(
                    Incident.alert_name == alert_name,
                    Incident.status == "firing"
                ).first()
                if not existing:
                    inc = Incident(
                        alert_name=alert_name,
                        severity=severity,
                        status="firing",
                        summary=summary,
                        description=description
                    )
                    db.add(inc)
                    db.commit()
        except Exception as e:
            logger.debug(f"Incident record error: {e}")

    def get_recent_actions(self, limit: int = 20) -> List[Dict[str, Any]]:
        """Retrieves recent auto-healing actions from SQLite."""
        if not SessionLocal:
            return []
        try:
            with SessionLocal() as db:
                records = db.query(RemediationAudit).order_by(RemediationAudit.created_at.desc()).limit(limit).all()
                return [
                    {
                        "id": r.id,
                        "action_type": r.action_type,
                        "target": r.target,
                        "status": r.status,
                        "requested_by": r.requested_by,
                        "command": r.command_executed,
                        "result": r.execution_result,
                        "created_at": r.created_at.isoformat() if r.created_at else None
                    }
                    for r in records
                ]
        except Exception as e:
            logger.debug(f"Error fetching audits: {e}")
            return []

auto_heal_engine = AutoHealEngine()
