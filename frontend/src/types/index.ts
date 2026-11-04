export interface HostSpecs {
  hostname: string;
  os_name: string;
  os_version: string;
  os_architecture: string;
  cpu_model: string;
  cpu_cores: number;
  cpu_logical: number;
  total_ram_gb: number;
  uptime_days: number;
  last_boot: string;
  battery_percent?: number;
  battery_runtime_min?: number;
  gpu_model?: string;
  sensor_thermal_supported: boolean;
}

export interface SystemOverview {
  status: 'healthy' | 'degraded' | 'critical';
  cpu_utilization_percent: number;
  memory_utilization_percent: number;
  memory_used_gb: number;
  memory_total_gb: number;
  disk_free_c_percent: number;
  disk_free_c_gb: number;
  disk_total_c_gb: number;
  network_rx_mbps: number;
  network_tx_mbps: number;
  active_alerts_count: number;
  recent_incidents_count: number;
  uptime_days: number;
  exporter_online: boolean;
  specs: HostSpecs;
}

export interface CpuMetrics {
  total_utilization_percent: number;
  per_core_percent: Record<string, number>;
  user_percent: number;
  privileged_percent: number;
  interrupts_per_sec: number;
  context_switches_per_sec: number;
  frequencies_ghz: Record<string, number>;
}

export interface MemoryMetrics {
  total_bytes: number;
  used_bytes: number;
  available_bytes: number;
  utilization_percent: number;
  committed_bytes: number;
  commit_limit_bytes: number;
  cache_bytes: number;
}

export interface DiskVolumeInfo {
  volume: string;
  free_bytes: number;
  total_bytes: number;
  used_percent: number;
  read_throughput_mbps: number;
  write_throughput_mbps: number;
}

export interface ProcessSummary {
  name: string;
  pid?: number;
  cpu_percent: number;
  memory_mb: number;
  handles?: number;
}

export interface ServiceSummary {
  name: string;
  display_name: string;
  status: string;
  start_mode: string;
}

export interface LogEntry {
  timestamp: string;
  channel: string;
  level: string;
  provider: string;
  event_id: string;
  message: string;
}

export interface AnomalyOut {
  metric_name: string;
  current_value: number;
  baseline_mean: number;
  z_score: number;
  is_anomaly: boolean;
  severity: string;
  explanation: string;
  timestamp: string;
}

export interface PredictionOut {
  resource_type: string;
  current_utilization: number;
  trend_rate_per_hour: number;
  estimated_exhaustion_days?: number;
  confidence_score: number;
  status: 'safe' | 'warning' | 'critical';
  recommendation: string;
}

export interface AiDiagnosisResponse {
  incident_summary: string;
  likely_root_causes: string[];
  technical_explanation: string;
  recommended_troubleshooting_steps: string[];
  severity_assessment: string;
  provider: string;
}

