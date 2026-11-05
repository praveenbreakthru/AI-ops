from fastapi import APIRouter, Query, HTTPException, Body
from typing import List, Dict, Any, Optional
from app.services.docker_service import docker_service
from app.services.k8s_service import k8s_service
from app.services.apps_service import apps_service
from app.ai.auto_heal_engine import auto_heal_engine

router = APIRouter(prefix="/apps", tags=["Applications & Containers"])

# --- Docker Endpoints ---

@router.get("/docker/overview")
def get_docker_overview():
    """Returns overview of the Docker daemon and resource counts."""
    return docker_service.get_docker_overview()

@router.get("/docker/containers")
def get_docker_containers(all: bool = Query(True)):
    """Returns list of Docker containers with live status, ports, and crash states."""
    return docker_service.get_containers(all=all)

@router.get("/docker/images")
def get_docker_images():
    """Returns list of Docker images stored locally."""
    return docker_service.get_images()

@router.get("/docker/containers/{container_id}/logs")
def get_container_logs(container_id: str, tail: int = Query(80, ge=10, le=500)):
    """Fetches real-time stdout/stderr log output from a container."""
    return {"logs": docker_service.get_container_logs(container_id, tail=tail)}

@router.post("/docker/containers/{container_id}/restart")
def restart_docker_container(container_id: str):
    """Restarts a specific container."""
    return docker_service.restart_container(container_id)

@router.post("/docker/containers/{container_id}/stop")
def stop_docker_container(container_id: str):
    """Stops a container."""
    return docker_service.stop_container(container_id)

@router.post("/docker/prune")
def prune_docker_images():
    """Prunes unused/dangling images to free storage space."""
    return docker_service.prune_images()

@router.post("/docker/launch")
def launch_docker_desktop():
    """Launches Docker Desktop on the local Windows host."""
    return docker_service.launch_docker_desktop()

# --- Kubernetes Endpoints ---

@router.get("/k8s/overview")
def get_k8s_overview():
    """Returns Kubernetes cluster status, pod counts, and health."""
    return k8s_service.get_k8s_overview()

@router.get("/k8s/pods")
def get_k8s_pods(namespace: str = Query("all")):
    """Returns list of Kubernetes pods with restarts, node, and crashing state."""
    return k8s_service.get_pods(namespace=namespace)

@router.post("/k8s/pods/restart")
def restart_k8s_pod(payload: Dict[str, str] = Body(...)):
    """Deletes a pod to trigger automatic controller restart."""
    pod_name = payload.get("pod_name")
    namespace = payload.get("namespace", "default")
    if not pod_name:
        raise HTTPException(status_code=400, detail="pod_name is required")
    return k8s_service.restart_pod(pod_name, namespace=namespace)

# --- General Applications & Developer Tools ---

@router.get("/overview")
def get_applications_overview():
    """Returns grouped developer apps and Windows processes with CPU and RAM."""
    return apps_service.get_applications_overview()

@router.post("/services/restart")
def restart_application_service(payload: Dict[str, str] = Body(...)):
    """Restarts an application service."""
    service_name = payload.get("service_name")
    if not service_name:
        raise HTTPException(status_code=400, detail="service_name is required")
    return apps_service.restart_application_service(service_name)

# --- Autonomous Self-Healing Control Center ---

@router.get("/autoheal/status")
def get_autoheal_status():
    """Returns Auto-Heal Engine mode, policies, and recent automated remediation audits."""
    return auto_heal_engine.get_status()

@router.post("/autoheal/mode")
def set_autoheal_mode(payload: Dict[str, str] = Body(...)):
    """Sets mode to 'automatic' (autonomous self-healing) or 'manual_approval'."""
    mode = payload.get("mode", "automatic")
    new_mode = auto_heal_engine.set_mode(mode)
    return {"mode": new_mode, "status": "updated"}

@router.post("/autoheal/trigger")
def trigger_manual_heal(payload: Dict[str, str] = Body(...)):
    """Triggers an immediate remediation action."""
    action_type = payload.get("action_type") # e.g. "docker_restart", "docker_prune", "service_restart"
    target = payload.get("target")
    if not action_type or not target:
        raise HTTPException(status_code=400, detail="action_type and target are required")
    return auto_heal_engine.manual_heal_action(action_type, target)
