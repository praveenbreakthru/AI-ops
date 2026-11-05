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

export interface DockerOverview {
  is_running: boolean;
  server_version?: string;
  containers_total: number;
  containers_running: number;
  containers_stopped: number;
  containers_paused: number;
  images_total: number;
  storage_driver?: string;
  cpus?: number;
  total_memory_gb?: number;
  operating_system?: string;
  error?: string;
}

export interface DockerContainer {
  id: string;
  name: string;
  image: string;
  command: string;
  created_at: string;
  status: string;
  state: 'running' | 'exited' | 'restarting' | 'paused' | 'dead' | string;
  health: 'healthy' | 'unhealthy' | 'none';
  exit_code: number;
  ports: string;
  is_crashed: boolean;
}

export interface DockerImage {
  id: string;
  repository: string;
  tag: string;
  size: string;
  created_since: string;
}

export interface K8sOverview {
  is_running: boolean;
  cluster_name?: string;
  total_pods: number;
  running_pods: number;
  crashing_pods: number;
  namespaces_count: number;
  error?: string;
}

export interface K8sPod {
  name: string;
  namespace: string;
  status: string;
  phase: string;
  restarts: number;
  ready: string;
  node: string;
  ip: string;
  created_at: string;
  is_crashing: boolean;
}

export interface AppEcosystem {
  name: string;
  process_count: number;
  cpu_percent: number;
  memory_mb: number;
  status: string;
}

export interface AutoHealAction {
  id: number;
  action_type: string;
  target: string;
  status: string;
  requested_by: string;
  command: string;
  result?: string;
  created_at?: string;
}

export interface AutoHealStatus {
  mode: 'automatic' | 'manual_approval';
  max_restarts_per_hour: number;
  total_actions_recorded: number;
  recent_actions: AutoHealAction[];
}


