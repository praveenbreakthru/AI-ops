from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

# ==============================================================================
# System Schemas
# ==============================================================================
class MetricSample(BaseModel):
    timestamp: float
    value: float

class HostSpecs(BaseModel):
    hostname: str
    os_name: str
    os_version: str
    os_architecture: str
    cpu_model: str
    cpu_cores: int
    cpu_logical: int
    total_ram_gb: float
    uptime_days: float
    last_boot: str
    battery_percent: Optional[float] = None
    battery_runtime_min: Optional[float] = None
    gpu_model: Optional[str] = None
    sensor_thermal_supported: bool = False

class SystemOverview(BaseModel):
    status: str
    cpu_utilization_percent: float
    memory_utilization_percent: float
    memory_used_gb: float
    memory_total_gb: float
    disk_free_c_percent: float
    disk_free_c_gb: float
    disk_total_c_gb: float
    network_rx_mbps: float
    network_tx_mbps: float
    active_alerts_count: int
    recent_incidents_count: int
    uptime_days: float
    exporter_online: bool
    specs: HostSpecs

class CpuMetrics(BaseModel):
    total_utilization_percent: float
    per_core_percent: Dict[str, float]
    user_percent: float
    privileged_percent: float
    interrupts_per_sec: float
    context_switches_per_sec: float
    frequencies_ghz: Dict[str, float]

class MemoryMetrics(BaseModel):
    total_bytes: float
    used_bytes: float
    available_bytes: float
    utilization_percent: float
    committed_bytes: float
    commit_limit_bytes: float
    cache_bytes: float

class DiskVolumeInfo(BaseModel):
    volume: str
    free_bytes: float
    total_bytes: float
    used_percent: float
    read_throughput_mbps: float
    write_throughput_mbps: float

class ProcessSummary(BaseModel):
    name: str
    pid: Optional[int] = None
    cpu_percent: float
    memory_mb: float
    handles: Optional[int] = None

class ServiceSummary(BaseModel):
    name: str
    display_name: str
    status: str # ok, degraded, stopped
    start_mode: str

# ==============================================================================
# Logs & Incidents
# ==============================================================================
class LogEntry(BaseModel):
    timestamp: str
    channel: str
    level: str
    provider: str
    event_id: str
    message: str

class IncidentOut(BaseModel):
    id: int
    alert_name: str
    severity: str
    status: str
    summary: str
    description: Optional[str]
    root_cause: Optional[str]
    recommendations: Optional[str]
    starts_at: datetime
    resolved_at: Optional[datetime]

# ==============================================================================
# AI & Prediction Schemas
# ==============================================================================
class AnomalyOut(BaseModel):
    metric_name: str
    current_value: float
    baseline_mean: float
    z_score: float
    is_anomaly: bool
    severity: str
    explanation: str
    timestamp: datetime

class PredictionOut(BaseModel):
    resource_type: str
    current_utilization: float
    trend_rate_per_hour: float
    estimated_exhaustion_days: Optional[float]
    confidence_score: float
    status: str # safe, warning, critical
    recommendation: str

class AiDiagnosisRequest(BaseModel):
    incident_id: Optional[int] = None
    context_notes: Optional[str] = None

class AiDiagnosisResponse(BaseModel):
    incident_summary: str
    likely_root_causes: List[str]
    technical_explanation: str
    recommended_troubleshooting_steps: List[str]
    severity_assessment: str
    provider: str # "ollama" or "statistical_engine"

# ==============================================================================
# Remediation Schemas
# ==============================================================================
class RemediationActionRequest(BaseModel):
    action_type: str # restart_service, clean_temp_files, collect_diagnostics
    target: str      # e.g., service name or temp policy
    reason: str

class RemediationActionOut(BaseModel):
    id: int
    action_type: str
    target: str
    status: str
    requested_by: str
    approved_by: Optional[str]
    command_executed: Optional[str]
    execution_result: Optional[str]
    created_at: datetime
