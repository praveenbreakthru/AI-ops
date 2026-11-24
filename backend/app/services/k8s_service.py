import json
import logging
import subprocess
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

class KubernetesService:
    def is_k8s_available(self) -> bool:
        """Checks if kubectl can reach a local or configured cluster."""
        try:
            proc = subprocess.run(
                ["kubectl", "cluster-info"],
                capture_output=True,
                text=True,
                timeout=4
            )
            return proc.returncode == 0
        except Exception:
            return False

    def get_k8s_overview(self) -> Dict[str, Any]:
        """Returns aggregate overview of the Kubernetes cluster."""
        available = self.is_k8s_available()
        if not available:
            return {
                "is_running": False,
                "cluster_name": None,
                "total_pods": 0,
                "running_pods": 0,
                "crashing_pods": 0,
                "namespaces_count": 0,
                "error": "Kubernetes cluster is offline or unreachable."
            }

        pods = self.get_pods(namespace="all")
        running = sum(1 for p in pods if p.get("status") == "Running")
        crashing = sum(1 for p in pods if p.get("is_crashing", False))
        namespaces = len(set(p.get("namespace") for p in pods))

        return {
            "is_running": True,
            "cluster_name": "Local Cluster",
            "total_pods": len(pods),
            "running_pods": running,
            "crashing_pods": crashing,
            "namespaces_count": namespaces,
            "error": None
        }

    def get_pods(self, namespace: str = "all") -> List[Dict[str, Any]]:
        """Returns pod telemetry across namespaces."""
        if not self.is_k8s_available():
            return []

        cmd = ["kubectl", "get", "pods", "-o", "json"]
        if namespace == "all":
            cmd.append("-A")
        else:
            cmd.extend(["-n", namespace])

        try:
            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=8)
            if proc.returncode != 0 or not proc.stdout.strip():
                return []

            data = json.loads(proc.stdout.strip())
            items = data.get("items", [])
            pods = []

            for item in items:
                meta = item.get("metadata", {})
                status = item.get("status", {})
                spec = item.get("spec", {})

                name = meta.get("name", "unknown")
                ns = meta.get("namespace", "default")
                phase = status.get("phase", "Unknown")

                # Container statuses
                container_statuses = status.get("containerStatuses", [])
                restarts = sum(cs.get("restartCount", 0) for cs in container_statuses)
                ready_count = sum(1 for cs in container_statuses if cs.get("ready", False))
                total_containers = len(spec.get("containers", []))

                # Check for CrashLoopBackOff or Error state
                is_crashing = False
                state_reason = phase
                for cs in container_statuses:
                    waiting = cs.get("state", {}).get("waiting", {})
                    terminated = cs.get("state", {}).get("terminated", {})
                    reason = waiting.get("reason") or terminated.get("reason")
                    if reason in ["CrashLoopBackOff", "ImagePullBackOff", "Error", "OOMKilled"]:
                        is_crashing = True
                        state_reason = reason
                        break

                pods.append({
                    "name": name,
                    "namespace": ns,
                    "status": state_reason,
                    "phase": phase,
                    "restarts": restarts,
                    "ready": f"{ready_count}/{total_containers}",
                    "node": spec.get("nodeName", "N/A"),
                    "ip": status.get("podIP", "N/A"),
                    "created_at": meta.get("creationTimestamp", ""),
                    "is_crashing": is_crashing
                })

            return pods
        except Exception as e:
            logger.debug(f"Error fetching k8s pods: {e}")
            return []

    def restart_pod(self, pod_name: str, namespace: str = "default") -> Dict[str, Any]:
        """Deletes a pod so the ReplicaSet/Deployment controller restarts it."""
        try:
            proc = subprocess.run(
                ["kubectl", "delete", "pod", pod_name, "-n", namespace],
                capture_output=True,
                text=True,
                timeout=15
            )
            success = proc.returncode == 0
            return {
                "success": success,
                "message": f"Pod {pod_name} deleted for restart." if success else proc.stderr.strip()
            }
        except Exception as e:
            return {"success": False, "message": str(e)}

    def delete_pod(self, pod_name: str, namespace: str = "default", force: bool = True) -> Dict[str, Any]:
        """Deletes a pod completely."""
        try:
            cmd = ["kubectl", "delete", "pod", pod_name, "-n", namespace]
            if force:
                cmd.extend(["--grace-period=0", "--force"])
            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
            success = proc.returncode == 0
            return {
                "success": success,
                "message": f"Pod {pod_name} deleted." if success else proc.stderr.strip()
            }
        except Exception as e:
            return {"success": False, "message": str(e)}

    def restart_deployment(self, deployment_name: str, namespace: str = "default") -> Dict[str, Any]:
        """Triggers a zero-downtime rolling restart of a deployment."""
        try:
            proc = subprocess.run(
                ["kubectl", "rollout", "restart", f"deployment/{deployment_name}", "-n", namespace],
                capture_output=True,
                text=True,
                timeout=15
            )
            success = proc.returncode == 0
            return {
                "success": success,
                "message": f"Deployment {deployment_name} restarted." if success else proc.stderr.strip()
            }
        except Exception as e:
            return {"success": False, "message": str(e)}

k8s_service = KubernetesService()

