import gc
from fastapi import APIRouter, Query, HTTPException
from typing import List, Dict, Any
from app.config import settings
from app.services.system_service import system_service
from app.services.eventlog_service import eventlog_service
from app.services.linux_service import linux_service
from app.services.windows_server_service import windows_server_service
from app.services.node_manager import node_manager
from app.models.schemas import (
    SystemOverview, CpuMetrics, MemoryMetrics,
    DiskVolumeInfo, ProcessSummary, ServiceSummary, LogEntry,
    NodeTestRequest, NodeAddRequest, NodeUpdateRequest
)

router = APIRouter(prefix="/system", tags=["System Telemetry"])

@router.get("/nodes")
def get_monitored_nodes():
    """Returns available monitoring targets: Built-in nodes + any dynamically added custom servers."""
    return node_manager.get_all_nodes()

@router.get("/nodes/{node_id}/config")
def get_node_config(node_id: str):
    """Fetches editable node details including credentials for editing."""
    cfg = node_manager.get_node_config(node_id)
    if not cfg:
        raise HTTPException(status_code=404, detail=f"Node '{node_id}' not found.")
    return cfg

@router.put("/nodes/{node_id}")
def update_node(node_id: str, req: NodeUpdateRequest):
    """Updates configuration (IP, port, credentials) of an existing monitored server."""
    port = req.port or (22 if "linux" in node_id else 5985)
    return node_manager.update_node(
        node_id=node_id,
        name=req.name,
        host=req.host,
        port=port,
        username=req.username,
        password=req.password
    )

@router.post("/nodes/test")
def test_node_connection(req: NodeTestRequest):
    """Pre-flight test to verify IP address, port, and credentials before saving."""
    port = req.port or (22 if req.os_type == "linux" else 5985)
    return node_manager.test_connection(
        host=req.host,
        port=port,
        os_type=req.os_type,
        username=req.username,
        password=req.password
    )

@router.post("/nodes/add")
def add_custom_node(req: NodeAddRequest):
    """Registers and stores a new monitored server."""
    port = req.port or (22 if req.os_type == "linux" else 5985)
    node = node_manager.add_node(
        name=req.name,
        os_type=req.os_type,
        host=req.host,
        port=port,
        username=req.username,
        password=req.password
    )
    return node

@router.delete("/nodes/{node_id}")
def delete_custom_node(node_id: str):
    """Removes a monitored server from registry."""
    success = node_manager.delete_node(node_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Server node '{node_id}' not found.")
    return {"status": "success", "message": f"Server node '{node_id}' removed."}

@router.get("/overview", response_model=SystemOverview)
def get_system_overview(target: str = Query("local")):
    if target == "local":
        return system_service.get_system_overview()
    srv = node_manager.get_service(target)
    if hasattr(srv, "get_overview"):
        return srv.get_overview()
    return system_service.get_system_overview()

@router.get("/cpu", response_model=CpuMetrics)
def get_cpu_metrics(target: str = Query("local")):
    if target == "local":
        return system_service.get_cpu_metrics()
    srv = node_manager.get_service(target)
    if hasattr(srv, "get_cpu_metrics"):
        return srv.get_cpu_metrics()
    return system_service.get_cpu_metrics()

@router.get("/memory", response_model=MemoryMetrics)
def get_memory_metrics(target: str = Query("local")):
    if target == "local":
        return system_service.get_memory_metrics()
    srv = node_manager.get_service(target)
    if hasattr(srv, "get_memory_metrics"):
        return srv.get_memory_metrics()
    return system_service.get_memory_metrics()

@router.get("/disk", response_model=List[DiskVolumeInfo])
def get_disk_metrics(target: str = Query("local")):
    if target == "local":
        return system_service.get_disk_metrics()
    srv = node_manager.get_service(target)
    if hasattr(srv, "get_disk_metrics"):
        return srv.get_disk_metrics()
    return system_service.get_disk_metrics()

@router.get("/network")
def get_network_metrics(target: str = Query("local")):
    if target == "local":
        overview = system_service.get_system_overview()
    else:
        srv = node_manager.get_service(target)
        overview = srv.get_overview() if hasattr(srv, "get_overview") else system_service.get_system_overview()
    return {
        "rx_mbps": overview.network_rx_mbps,
        "tx_mbps": overview.network_tx_mbps,
        "host": overview.specs.hostname
    }

@router.get("/processes", response_model=List[ProcessSummary])
def get_top_processes(target: str = Query("local"), limit: int = Query(15, ge=1, le=50)):
    if target == "local":
        return system_service.get_top_processes(limit=limit)
    srv = node_manager.get_service(target)
    if hasattr(srv, "get_top_processes"):
        return srv.get_top_processes(limit=limit)
    return system_service.get_top_processes(limit=limit)

@router.get("/services", response_model=List[ServiceSummary])
def get_services(target: str = Query("local"), limit: int = Query(30, ge=1, le=100)):
    if target == "local":
        return system_service.get_services(limit=limit)
    srv = node_manager.get_service(target)
    if hasattr(srv, "get_services"):
        return srv.get_services(limit=limit)
    return system_service.get_services(limit=limit)

@router.get("/logs", response_model=List[LogEntry])
def get_logs(target: str = Query("local"), channel: str = Query("all"), limit: int = Query(50, ge=1, le=200)):
    if target == "local":
        return eventlog_service.query_logs(channel=channel, limit=limit)
    srv = node_manager.get_service(target)
    if hasattr(srv, "get_logs"):
        return srv.get_logs(limit=limit)
    return eventlog_service.query_logs(channel=channel, limit=limit)

@router.post("/cache/clear")
def clear_system_cache():
    """
    Clears all system memory caches, telemetry buffers, and ephemeral snapshots.
    Explicitly preserves all Redis caches and key-value stores intact.
    """
    if hasattr(system_service, "_specs_cache"):
        system_service._specs_cache = None
    if hasattr(windows_server_service, "_cache"):
        windows_server_service._cache = {}
        windows_server_service._cache_time = 0.0

    # Also clear any custom node caches
    for collector in node_manager._collectors.values():
        if hasattr(collector, "_cache"):
            collector._cache = {}
            collector._cache_time = 0.0

    collected = gc.collect()

    return {
        "status": "success",
        "message": "System telemetry and memory caches cleared successfully. Redis cache preserved intact.",
        "redis_preserved": True,
        "garbage_collected_objects": collected,
        "cleared_caches": [
            "telemetry_metric_buffers",
            "host_hardware_snapshots",
            "process_tree_cache",
            "windows_remote_cache",
            "custom_nodes_cache"
        ]
    }
