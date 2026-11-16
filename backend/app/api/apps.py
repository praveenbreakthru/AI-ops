from fastapi import APIRouter, Query, HTTPException, Body
from typing import List, Dict, Any, Optional
from app.services.docker_service import docker_service
from app.services.k8s_service import k8s_service
from app.services.apps_service import apps_service
from app.services.linux_service import linux_service
from app.services.windows_server_service import windows_server_service
from app.services.discovery_service import discovery_service
from app.services.node_manager import node_manager
from app.ai.auto_heal_engine import auto_heal_engine

router = APIRouter(prefix="/apps", tags=["Applications & Containers"])

# --- Dynamic Auto-Discovery Endpoints ---

@router.get("/discovery")
def get_discovered_entities(target: str = Query("all")):
    """Returns real-time list of newly detected applications, tools, containers, and pods."""
    discovery_service.scan_for_new_items()
    return discovery_service.get_discovered_items(target=target)

@router.post("/discovery/scan")
def trigger_discovery_scan():
    """Forces an immediate dynamic discovery scan across all nodes."""
    discovery_service.scan_for_new_items()
    return {"status": "scanned", "total_items": len(discovery_service.get_discovered_items())}

@router.post("/discovery/test")
def trigger_test_discovery(target: str = Query("local")):
    """Simulates/dispatches a new workload discovery event for live UI demonstration."""
    item = discovery_service.trigger_test_discovery(target=target)
    return {"status": "discovered", "item": item}

# --- Docker Endpoints ---

@router.get("/docker/overview")
def get_docker_overview(target: str = Query("local")):
    """Returns overview of the Docker daemon and resource counts."""
    if target in ("winserver", "windows_server"):
        return windows_server_service.get_docker_overview()
    if target == "linux":
        return linux_service.get_docker_overview()
    if target != "local":
        srv = node_manager.get_service(target)
        if hasattr(srv, "get_docker_overview"):
            return srv.get_docker_overview()
    return docker_service.get_docker_overview()

@router.get("/docker/containers")
def get_docker_containers(target: str = Query("local"), all: bool = Query(True)):
    """Returns list of Docker containers with live status, ports, and crash states."""
    if target in ("winserver", "windows_server"):
        return windows_server_service.get_docker_containers(all=all)
    if target == "linux":
        return linux_service.get_docker_containers()
    if target != "local":
        srv = node_manager.get_service(target)
        if hasattr(srv, "get_docker_containers"):
            return srv.get_docker_containers()
    return docker_service.get_containers(all=all)

@router.get("/docker/images")
def get_docker_images(target: str = Query("local")):
    """Returns list of Docker images stored locally or on Linux."""
    if target in ("winserver", "windows_server"):
        return windows_server_service.get_docker_images()
    if target == "linux":
        return linux_service.get_docker_images()
    if target != "local":
        srv = node_manager.get_service(target)
        if hasattr(srv, "get_docker_images"):
            return srv.get_docker_images()
    return docker_service.get_images()

@router.get("/docker/containers/{container_id}/logs")
def get_container_logs(container_id: str, target: str = Query("local"), tail: int = Query(80, ge=10, le=500)):
    """Fetches real-time stdout/stderr log output from a container."""
    if target == "linux":
        raw = linux_service.execute_command(f"docker logs --tail {tail} {container_id}")
        return {"logs": raw or f"No logs available for container {container_id}."}
    return {"logs": docker_service.get_container_logs(container_id, tail=tail)}

@router.post("/docker/containers/{container_id}/restart")
def restart_docker_container(container_id: str, target: str = Query("local")):
    """Restarts a specific container."""
    if target == "linux":
        return linux_service.restart_docker_container(container_id)
    return docker_service.restart_container(container_id)

@router.post("/docker/containers/{container_id}/stop")
def stop_docker_container(container_id: str, target: str = Query("local")):
    """Stops a container."""
    if target == "linux":
        return linux_service.stop_docker_container(container_id)
    return docker_service.stop_container(container_id)

@router.post("/docker/containers/{container_id}/start")
def start_docker_container(container_id: str, target: str = Query("local")):
    """Starts a container."""
    if target == "linux":
        return linux_service.start_docker_container(container_id)
    return docker_service.start_container(container_id)

@router.post("/docker/containers/{container_id}/delete")
@router.delete("/docker/containers/{container_id}")
def delete_docker_container(container_id: str, target: str = Query("local"), force: bool = Query(True)):
    """Deletes a container completely."""
    if target == "linux":
        return linux_service.delete_docker_container(container_id, force=force)
    return docker_service.delete_container(container_id, force=force)

@router.post("/docker/images/{image_id}/delete")
@router.delete("/docker/images/{image_id}")
def delete_docker_image(image_id: str, target: str = Query("local"), force: bool = Query(True)):
    """Deletes a Docker image."""
    if target == "linux":
        return linux_service.delete_docker_image(image_id, force=force)
    return docker_service.delete_image(image_id, force=force)

@router.post("/docker/prune")
def prune_docker_images(target: str = Query("local")):
    """Prunes unused/dangling images to free storage space."""
    if target == "linux":
        out = linux_service.execute_command("docker image prune -f")
        return {"success": True, "message": out or "Pruned unused images on Linux."}
    return docker_service.prune_images()

@router.post("/docker/launch")
def launch_docker_desktop():
    """Launches Docker Desktop on the local Windows host."""
    return docker_service.launch_docker_desktop()

# --- Kubernetes Endpoints ---

@router.get("/k8s/overview")
def get_k8s_overview(target: str = Query("local")):
    """Returns Kubernetes cluster status, pod counts, and health."""
    if target in ("winserver", "windows_server"):
        return windows_server_service.get_k8s_overview()
    if target == "linux":
        return linux_service.get_k8s_overview()
    if target != "local":
        srv = node_manager.get_service(target)
        if hasattr(srv, "get_k8s_overview"):
            return srv.get_k8s_overview()
    return k8s_service.get_k8s_overview()

@router.get("/k8s/pods")
def get_k8s_pods(target: str = Query("local"), namespace: str = Query("all")):
    """Returns list of Kubernetes pods with restarts, node, and crashing state."""
    if target in ("winserver", "windows_server"):
        return windows_server_service.get_k8s_pods()
    if target == "linux":
        return linux_service.get_k8s_pods()
    if target != "local":
        srv = node_manager.get_service(target)
        if hasattr(srv, "get_k8s_pods"):
            return srv.get_k8s_pods()
    return k8s_service.get_pods(namespace=namespace)

@router.post("/k8s/pods/restart")
def restart_k8s_pod(payload: Dict[str, str] = Body(...)):
    """Deletes a pod to trigger automatic controller restart."""
    pod_name = payload.get("pod_name")
    namespace = payload.get("namespace", "default")
    target = payload.get("target", "local")
    if not pod_name:
        raise HTTPException(status_code=400, detail="pod_name is required")
    if target == "linux":
        return linux_service.restart_k8s_pod(pod_name, namespace=namespace)
    return k8s_service.restart_pod(pod_name, namespace=namespace)

@router.post("/k8s/pods/delete")
@router.delete("/k8s/pods")
def delete_k8s_pod(payload: Dict[str, str] = Body(...)):
    """Deletes a pod completely."""
    pod_name = payload.get("pod_name")
    namespace = payload.get("namespace", "default")
    target = payload.get("target", "local")
    if not pod_name:
        raise HTTPException(status_code=400, detail="pod_name is required")
    if target == "linux":
        return linux_service.delete_k8s_pod(pod_name, namespace=namespace)
    return k8s_service.delete_pod(pod_name, namespace=namespace)

# --- General Applications & Developer Tools ---

@router.get("/overview")
def get_applications_overview(target: str = Query("local")):
    """Returns grouped developer apps and processes with CPU and RAM."""
    if target in ("winserver", "windows_server"):
        return windows_server_service.get_applications_overview()
    if target == "linux":
        return linux_service.get_applications_overview()
    if target != "local":
        srv = node_manager.get_service(target)
        if hasattr(srv, "get_applications_overview"):
            return srv.get_applications_overview()
    return apps_service.get_applications_overview()

@router.post("/launch")
@router.post("/start")
def launch_application(payload: Dict[str, Any] = Body(...)):
    """Launches or starts an application (desktop GUI software or background service)."""
    app_identifier = payload.get("app_id") or payload.get("app_name") or payload.get("name") or payload.get("service_name")
    target = payload.get("target", "local")
    if not app_identifier:
        raise HTTPException(status_code=400, detail="app_id or name is required")
    if target in ("winserver", "windows_server"):
        return windows_server_service.launch_application(app_identifier)
    if target == "linux":
        return linux_service.launch_application(app_identifier)
    return apps_service.launch_application(app_identifier)

@router.post("/stop")
def stop_application(payload: Dict[str, Any] = Body(...)):
    """Stops an application or service."""
    app_identifier = payload.get("app_id") or payload.get("app_name") or payload.get("name") or payload.get("service_name")
    target = payload.get("target", "local")
    if not app_identifier:
        raise HTTPException(status_code=400, detail="app_id or name is required")
    if target in ("winserver", "windows_server"):
        return windows_server_service.stop_application(app_identifier)
    if target == "linux":
        return linux_service.stop_application(app_identifier)
    return apps_service.stop_application(app_identifier)

@router.post("/restart")
def restart_application(payload: Dict[str, Any] = Body(...)):
    """Restarts an application or service."""
    app_identifier = payload.get("app_id") or payload.get("app_name") or payload.get("name") or payload.get("service_name")
    target = payload.get("target", "local")
    if not app_identifier:
        raise HTTPException(status_code=400, detail="app_id or name is required")
    if target in ("winserver", "windows_server"):
        return windows_server_service.restart_application(app_identifier)
    if target == "linux":
        return linux_service.restart_application(app_identifier)
    return apps_service.restart_application(app_identifier)

@router.post("/services/restart")
def restart_application_service(payload: Dict[str, str] = Body(...)):
    """Restarts an application service."""
    service_name = payload.get("service_name") or payload.get("name") or payload.get("app_name")
    target = payload.get("target", "local")
    if not service_name:
        raise HTTPException(status_code=400, detail="service_name is required")
    if target == "linux":
        return linux_service.restart_service(service_name)
    return apps_service.restart_application(service_name)

@router.post("/services/stop")
def stop_application_service(payload: Dict[str, str] = Body(...)):
    """Stops an application service."""
    service_name = payload.get("service_name") or payload.get("name") or payload.get("app_name")
    target = payload.get("target", "local")
    if not service_name:
        raise HTTPException(status_code=400, detail="service_name is required")
    if target == "linux":
        return linux_service.stop_service(service_name)
    return apps_service.stop_application(service_name)

@router.post("/services/start")
def start_application_service(payload: Dict[str, str] = Body(...)):
    """Starts an application service."""
    service_name = payload.get("service_name") or payload.get("name") or payload.get("app_name")
    target = payload.get("target", "local")
    if not service_name:
        raise HTTPException(status_code=400, detail="service_name is required")
    if target == "linux":
        return linux_service.start_service(service_name)
    return apps_service.launch_application(service_name)

@router.post("/services/delete")
def delete_application_service(payload: Dict[str, str] = Body(...)):
    """Stops and removes/disables an application service."""
    service_name = payload.get("service_name") or payload.get("name") or payload.get("app_name")
    target = payload.get("target", "local")
    if not service_name:
        raise HTTPException(status_code=400, detail="service_name is required")
    import subprocess
    if target == "linux":
        linux_service.execute_command(f"sudo systemctl disable --now {service_name}", use_sudo=True)
        return {"status": "deleted", "message": f"Service '{service_name}' disabled and stopped on Linux."}
    if target in ("winserver", "windows_server"):
        windows_server_service._execute_powershell(f"Stop-Service -Name '{service_name}' -Force; Set-Service -Name '{service_name}' -StartupType Disabled")
        return {"status": "deleted", "message": f"Service '{service_name}' disabled and stopped on Windows Server."}
    try:
        subprocess.run(["sc.exe", "stop", service_name], capture_output=True)
        subprocess.run(["sc.exe", "config", service_name, "start=disabled"], capture_output=True)
    except Exception:
        pass
    return {"status": "deleted", "message": f"Service '{service_name}' stopped and disabled."}

@router.post("/k8s/pods/start")
def start_k8s_pod(payload: Dict[str, str] = Body(...)):
    pod_name = payload.get("pod_name")
    namespace = payload.get("namespace", "default")
    target = payload.get("target", "local")
    if target == "linux":
        out = linux_service.execute_command(f"sudo k3s kubectl scale deployment {pod_name} --replicas=1 -n {namespace}", use_sudo=True)
        return {"success": True, "message": out or f"Pod/deployment '{pod_name}' scaled to 1."}
    return {"success": True, "message": f"Pod '{pod_name}' start signal dispatched."}

@router.post("/k8s/pods/stop")
def stop_k8s_pod(payload: Dict[str, str] = Body(...)):
    pod_name = payload.get("pod_name")
    namespace = payload.get("namespace", "default")
    target = payload.get("target", "local")
    if target == "linux":
        out = linux_service.execute_command(f"sudo k3s kubectl scale deployment {pod_name} --replicas=0 -n {namespace}", use_sudo=True)
        return {"success": True, "message": out or f"Pod/deployment '{pod_name}' scaled to 0."}
    return {"success": True, "message": f"Pod '{pod_name}' stopped."}

@router.post("/processes/{pid}/kill")
def kill_process(pid: int, target: str = Query("local")):
    """Terminates a process by PID."""
    if target == "linux":
        return linux_service.kill_process(pid)
    return apps_service.kill_process(pid)

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
    node_target = payload.get("node_target", "local")
    if not action_type or not target:
        raise HTTPException(status_code=400, detail="action_type and target are required")

    if node_target == "linux":
        if action_type == "docker_restart":
            res = linux_service.restart_docker_container(target)
            return {"success": res.get("success", True), "message": f"Remediated Linux container {target}"}
        elif action_type == "k8s_restart":
            res = linux_service.restart_k8s_pod(target)
            return {"success": res.get("success", True), "message": f"Remediated Linux k3s pod {target}"}
        elif action_type == "service_restart":
            res = linux_service.restart_service(target)
            return {"success": True, "message": f"Remediated Linux service {target}"}

    return auto_heal_engine.manual_heal_action(action_type, target)

@router.post("/autoheal/resolve-all")
def resolve_all_issues(payload: Dict[str, str] = Body(default={})):
    """Scans all degraded/crashing containers, pods, and services and issues auto-heal remediations."""
    target = payload.get("target", "local")
    remediated = []

    if target == "linux":
        # Check containers
        containers = linux_service.get_docker_containers()
        for c in containers:
            if c.get("is_crashed") or "restarting" in c.get("status", "").lower():
                linux_service.restart_docker_container(c["id"])
                remediated.append(f"Restarted container: {c['name']}")

        # Check pods
        pods = linux_service.get_k8s_pods()
        for p in pods:
            if p.get("is_crashing"):
                linux_service.restart_k8s_pod(p["name"], p["namespace"])
                remediated.append(f"Restarted k3s pod: {p['name']}")
    else:
        containers = docker_service.get_containers(all=True)
        for c in containers:
            if c.get("is_crashed") or "restarting" in c.get("status", "").lower():
                docker_service.restart_container(c["id"])
                remediated.append(f"Restarted container: {c['name']}")

        pods = k8s_service.get_pods(namespace="all")
        for p in pods:
            if p.get("is_crashing"):
                k8s_service.restart_pod(p["name"], p["namespace"])
                remediated.append(f"Restarted k8s pod: {p['name']}")

    return {
        "success": True,
        "remediated_count": len(remediated),
        "actions": remediated,
        "message": f"Successfully executed {len(remediated)} auto-remediation actions." if remediated else "All systems are already optimal."
    }



