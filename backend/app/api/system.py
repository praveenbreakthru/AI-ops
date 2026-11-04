from fastapi import APIRouter, Query
from typing import List, Dict, Any
from app.services.system_service import system_service
from app.services.eventlog_service import eventlog_service
from app.models.schemas import (
    SystemOverview, CpuMetrics, MemoryMetrics,
    DiskVolumeInfo, ProcessSummary, ServiceSummary, LogEntry
)

router = APIRouter(prefix="/system", tags=["System Telemetry"])

@router.get("/overview", response_model=SystemOverview)
def get_system_overview():
    return system_service.get_system_overview()

@router.get("/cpu", response_model=CpuMetrics)
def get_cpu_metrics():
    return system_service.get_cpu_metrics()

@router.get("/memory", response_model=MemoryMetrics)
def get_memory_metrics():
    return system_service.get_memory_metrics()

@router.get("/disk", response_model=List[DiskVolumeInfo])
def get_disk_metrics():
    return system_service.get_disk_metrics()

@router.get("/network")
def get_network_metrics():
    overview = system_service.get_system_overview()
    return {
        "rx_mbps": overview.network_rx_mbps,
        "tx_mbps": overview.network_tx_mbps,
        "host": overview.specs.hostname
    }

@router.get("/processes", response_model=List[ProcessSummary])
def get_top_processes(limit: int = Query(15, ge=1, le=50)):
    return system_service.get_top_processes(limit=limit)

@router.get("/services", response_model=List[ServiceSummary])
def get_services(limit: int = Query(30, ge=1, le=100)):
    return system_service.get_services(limit=limit)

@router.get("/logs", response_model=List[LogEntry])
def get_logs(channel: str = Query("all"), limit: int = Query(50, ge=1, le=200)):
    return eventlog_service.query_logs(channel=channel, limit=limit)

