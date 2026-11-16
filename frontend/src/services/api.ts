import {
  SystemOverview, CpuMetrics, MemoryMetrics, DiskVolumeInfo,
  ProcessSummary, ServiceSummary, LogEntry, AnomalyOut,
  PredictionOut, AiDiagnosisResponse
} from '../types';

const API_BASE = '/api';

let currentTargetNode = localStorage.getItem('aiops_selected_node') || 'local';

export interface DatabaseEngine {
  id: string;
  name: string;
  instance_name: string;
  version: string;
  port: number;
  status: 'online' | 'stopped' | 'warning';
  process_count: number;
  memory_mb: number;
  active_connections: number;
  max_connections: number;
  buffer_cache_hit_ratio: number;
  transactions_per_sec: number;
  data_path: string;
  total_databases: number;
  databases: string[];
  total_size_gb: number;
  deadlocks_detected: number;
}

export interface DatabaseOverview {
  node_id: string;
  node_label: string;
  total_engines: number;
  online_engines: number;
  total_active_connections: number;
  overall_buffer_hit_ratio: number;
  total_memory_gb: number;
  slow_queries_count: number;
  engines: DatabaseEngine[];
}

export interface DatabaseQuery {
  id: string;
  engine: string;
  database: string;
  query_pid: number;
  client_ip: string;
  user: string;
  duration_ms: number;
  is_slow: boolean;
  state: string;
  query: string;
  recommendation: string;
  started_at: string;
}

export interface DatabaseTable {
  engine: string;
  database: string;
  table_name: string;
  row_count: number;
  size_mb: number;
  index_size_mb: number;
  total_size_mb: number;
  last_vacuum: string;
}

export interface MonitoredNode {
  id: string;
  name: string;
  hostname: string;
  os: 'windows' | 'linux' | 'windows_server';
  os_display: string;
  ip: string;
  port?: number;
  username?: string;
  status: 'online' | 'offline';
  is_local: boolean;
  is_custom?: boolean;
  can_edit?: boolean;
  can_delete?: boolean;
  created_at?: string;
}

export const api = {
  getTargetNode(): string {
    return currentTargetNode;
  },

  setTargetNode(nodeId: string) {
    currentTargetNode = nodeId;
    localStorage.setItem('aiops_selected_node', nodeId);
  },

  async getNodes(): Promise<MonitoredNode[]> {
    const res = await fetch(`${API_BASE}/system/nodes`);
    return res.json();
  },

  async testNodeConnection(payload: {
    host: string;
    port?: number;
    os_type: string;
    username: string;
    password: string;
  }): Promise<{
    success: boolean;
    latency_ms?: number;
    hostname?: string;
    os_display?: string;
    message: string;
  }> {
    const res = await fetch(`${API_BASE}/system/nodes/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async addCustomNode(payload: {
    name: string;
    host: string;
    port?: number;
    os_type: string;
    username: string;
    password: string;
  }): Promise<MonitoredNode> {
    const res = await fetch(`${API_BASE}/system/nodes/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async getNodeConfig(nodeId: string): Promise<{
    id: string;
    name: string;
    os_type: string;
    host: string;
    port: number;
    username: string;
    password?: string;
  }> {
    const res = await fetch(`${API_BASE}/system/nodes/${nodeId}/config`);
    return res.json();
  },

  async updateNode(nodeId: string, payload: {
    name: string;
    host: string;
    port?: number;
    username: string;
    password?: string;
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/system/nodes/${nodeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async deleteNode(nodeId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/system/nodes/${nodeId}`, {
      method: 'DELETE'
    });
    return res.json();
  },

  async deleteCustomNode(nodeId: string): Promise<any> {
    return this.deleteNode(nodeId);
  },

  async getHealth() {
    const res = await fetch(`${API_BASE}/health`);
    return res.json();
  },

  async getOverview(target = currentTargetNode): Promise<SystemOverview> {
    const res = await fetch(`${API_BASE}/system/overview?target=${target}`);
    return res.json();
  },

  async getCpu(target = currentTargetNode): Promise<CpuMetrics> {
    const res = await fetch(`${API_BASE}/system/cpu?target=${target}`);
    return res.json();
  },

  async getMemory(target = currentTargetNode): Promise<MemoryMetrics> {
    const res = await fetch(`${API_BASE}/system/memory?target=${target}`);
    return res.json();
  },

  async getDisk(target = currentTargetNode): Promise<DiskVolumeInfo[]> {
    const res = await fetch(`${API_BASE}/system/disk?target=${target}`);
    return res.json();
  },

  async getProcesses(limit = 15, target = currentTargetNode): Promise<ProcessSummary[]> {
    const res = await fetch(`${API_BASE}/system/processes?limit=${limit}&target=${target}`);
    return res.json();
  },

  async getServices(limit = 30, target = currentTargetNode): Promise<ServiceSummary[]> {
    const res = await fetch(`${API_BASE}/system/services?limit=${limit}&target=${target}`);
    return res.json();
  },

  async getLogs(channel = 'all', limit = 50, target = currentTargetNode): Promise<LogEntry[]> {
    const res = await fetch(`${API_BASE}/system/logs?channel=${channel}&limit=${limit}&target=${target}`);
    return res.json();
  },

  async getAlerts(target = currentTargetNode): Promise<any[]> {
    const res = await fetch(`${API_BASE}/alerts?target=${target}`);
    return res.json();
  },

  async getIncidents(target = currentTargetNode): Promise<any[]> {
    const res = await fetch(`${API_BASE}/incidents?target=${target}`);
    return res.json();
  },

  async getAnomalies(target = currentTargetNode): Promise<AnomalyOut[]> {
    const res = await fetch(`${API_BASE}/ai/anomalies?target=${target}`);
    return res.json();
  },

  async getPredictions(target = currentTargetNode): Promise<PredictionOut[]> {
    const res = await fetch(`${API_BASE}/ai/predictions?target=${target}`);
    return res.json();
  },

  async runAiDiagnosis(contextNotes?: string, target = currentTargetNode): Promise<AiDiagnosisResponse> {
    const res = await fetch(`${API_BASE}/ai/diagnosis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ context_notes: contextNotes || 'Interactive Diagnostic Evaluation', target })
    });
    return res.json();
  },

  async getRemediationAudit(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/remediation/audit`);
    return res.json();
  },

  async requestRemediation(actionType: string, target: string, reason: string): Promise<any> {
    const res = await fetch(`${API_BASE}/remediation/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action_type: actionType, target, reason })
    });
    return res.json();
  },

  async approveRemediation(actionId: number): Promise<any> {
    const res = await fetch(`${API_BASE}/remediation/approve/${actionId}`, {
      method: 'POST'
    });
    return res.json();
  },

  async listReports(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/reports`);
    return res.json();
  },

  async generateReport(reportType = 'daily'): Promise<any> {
    const res = await fetch(`${API_BASE}/reports/generate?report_type=${reportType}`, {
      method: 'POST'
    });
    return res.json();
  },

  // --- Docker & Container Infrastructure ---
  async getDockerOverview(target = currentTargetNode): Promise<any> {
    const res = await fetch(`${API_BASE}/apps/docker/overview?target=${target}`);
    return res.json();
  },

  async getDockerContainers(all = true, target = currentTargetNode): Promise<any[]> {
    const res = await fetch(`${API_BASE}/apps/docker/containers?all=${all}&target=${target}`);
    return res.json();
  },

  async getDockerImages(target = currentTargetNode): Promise<any[]> {
    const res = await fetch(`${API_BASE}/apps/docker/images?target=${target}`);
    return res.json();
  },

  async getContainerLogs(containerId: string, target = currentTargetNode): Promise<{ logs: string }> {
    const res = await fetch(`${API_BASE}/apps/docker/containers/${containerId}/logs?target=${target}`);
    return res.json();
  },

  async restartDockerContainer(containerId: string, target = currentTargetNode): Promise<any> {
    const res = await fetch(`${API_BASE}/apps/docker/containers/${containerId}/restart?target=${target}`, {
      method: 'POST'
    });
    return res.json();
  },

  async startDockerContainer(containerId: string, target = currentTargetNode): Promise<any> {
    const res = await fetch(`${API_BASE}/apps/docker/containers/${containerId}/start?target=${target}`, {
      method: 'POST'
    });
    return res.json();
  },

  async stopDockerContainer(containerId: string, target = currentTargetNode): Promise<any> {
    const res = await fetch(`${API_BASE}/apps/docker/containers/${containerId}/stop?target=${target}`, {
      method: 'POST'
    });
    return res.json();
  },

  async deleteDockerContainer(containerId: string, target = currentTargetNode): Promise<any> {
    const res = await fetch(`${API_BASE}/apps/docker/containers/${containerId}/delete?target=${target}&force=true`, {
      method: 'POST'
    });
    return res.json();
  },

  async deleteDockerImage(imageId: string, target = currentTargetNode): Promise<any> {
    const res = await fetch(`${API_BASE}/apps/docker/images/${imageId}/delete?target=${target}&force=true`, {
      method: 'POST'
    });
    return res.json();
  },

  async pruneDockerImages(target = currentTargetNode): Promise<any> {
    const res = await fetch(`${API_BASE}/apps/docker/prune?target=${target}`, {
      method: 'POST'
    });
    return res.json();
  },

  async launchDockerDesktop(): Promise<any> {
    const res = await fetch(`${API_BASE}/apps/docker/launch`, {
      method: 'POST'
    });
    return res.json();
  },

  // --- Kubernetes ---
  async getK8sOverview(target = currentTargetNode): Promise<any> {
    const res = await fetch(`${API_BASE}/apps/k8s/overview?target=${target}`);
    return res.json();
  },

  async getK8sPods(namespace = 'all', target = currentTargetNode): Promise<any[]> {
    const res = await fetch(`${API_BASE}/apps/k8s/pods?namespace=${namespace}&target=${target}`);
    return res.json();
  },

  async startK8sPod(podName: string, namespace = 'default', target = currentTargetNode): Promise<any> {
    const res = await fetch(`${API_BASE}/apps/k8s/pods/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pod_name: podName, namespace, target })
    });
    return res.json();
  },

  async stopK8sPod(podName: string, namespace = 'default', target = currentTargetNode): Promise<any> {
    const res = await fetch(`${API_BASE}/apps/k8s/pods/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pod_name: podName, namespace, target })
    });
    return res.json();
  },

  async restartK8sPod(podName: string, namespace = 'default', target = currentTargetNode): Promise<any> {
    const res = await fetch(`${API_BASE}/apps/k8s/pods/restart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pod_name: podName, namespace, target })
    });
    return res.json();
  },

  async deleteK8sPod(podName: string, namespace = 'default', target = currentTargetNode): Promise<any> {
    const res = await fetch(`${API_BASE}/apps/k8s/pods/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pod_name: podName, namespace, target })
    });
    return res.json();
  },

  // --- Application Ecosystem ---
  async getAppsOverview(target = currentTargetNode): Promise<any[]> {
    const res = await fetch(`${API_BASE}/apps/overview?target=${target}`);
    return res.json();
  },

  async launchApp(appIdOrName: string, target = currentTargetNode): Promise<any> {
    const res = await fetch(`${API_BASE}/apps/launch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: appIdOrName, name: appIdOrName, target })
    });
    return res.json();
  },

  async stopApp(appIdOrName: string, target = currentTargetNode): Promise<any> {
    const res = await fetch(`${API_BASE}/apps/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: appIdOrName, name: appIdOrName, target })
    });
    return res.json();
  },

  async restartApp(appIdOrName: string, target = currentTargetNode): Promise<any> {
    const res = await fetch(`${API_BASE}/apps/restart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: appIdOrName, name: appIdOrName, target })
    });
    return res.json();
  },

  async restartService(serviceName: string, target = currentTargetNode): Promise<any> {
    const res = await fetch(`${API_BASE}/apps/services/restart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service_name: serviceName, target })
    });
    return res.json();
  },

  async stopService(serviceName: string, target = currentTargetNode): Promise<any> {
    const res = await fetch(`${API_BASE}/apps/services/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service_name: serviceName, target })
    });
    return res.json();
  },

  async startService(serviceName: string, target = currentTargetNode): Promise<any> {
    const res = await fetch(`${API_BASE}/apps/services/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service_name: serviceName, target })
    });
    return res.json();
  },

  async deleteService(serviceName: string, target = currentTargetNode): Promise<any> {
    const res = await fetch(`${API_BASE}/apps/services/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service_name: serviceName, target })
    });
    return res.json();
  },

  async clearCache(): Promise<any> {
    const res = await fetch(`${API_BASE}/system/cache/clear`, {
      method: 'POST'
    });
    return res.json();
  },

  async killProcess(pid: number, target = currentTargetNode): Promise<any> {
    const res = await fetch(`${API_BASE}/apps/processes/${pid}/kill?target=${target}`, {
      method: 'POST'
    });
    return res.json();
  },

  async resolveAllIssues(target = currentTargetNode): Promise<any> {
    const res = await fetch(`${API_BASE}/apps/autoheal/resolve-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target })
    });
    return res.json();
  },

  // --- Synthetic HTTP & Uptime Probing ---
  async getUptimeOverview(target = currentTargetNode): Promise<any[]> {
    const res = await fetch(`${API_BASE}/uptime/overview?target=${target}`);
    return res.json();
  },

  async probeEndpoint(url: string, name = 'Endpoint', nodeId = currentTargetNode): Promise<any> {
    const res = await fetch(`${API_BASE}/uptime/probe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, name, node_id: nodeId })
    });
    return res.json();
  },

  // --- Embedded Remote Web Terminal ---
  async executeTerminalCommand(command: string, target = currentTargetNode): Promise<any> {
    const res = await fetch(`${API_BASE}/terminal/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command, target })
    });
    return res.json();
  },

  // --- Dynamic Discovery ---
  async getDiscoveredItems(target = currentTargetNode): Promise<any[]> {
    const res = await fetch(`${API_BASE}/apps/discovery?target=${target}`);
    return res.json();
  },

  async triggerTestDiscovery(target = currentTargetNode): Promise<any> {
    const res = await fetch(`${API_BASE}/apps/discovery/test?target=${target}`, {
      method: 'POST'
    });
    return res.json();
  },

  // --- Autonomous Self-Healing ---
  async getAutoHealStatus(): Promise<any> {
    const res = await fetch(`${API_BASE}/apps/autoheal/status`);
    return res.json();
  },

  async setAutoHealMode(mode: 'automatic' | 'manual_approval'): Promise<any> {
    const res = await fetch(`${API_BASE}/apps/autoheal/mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode })
    });
    return res.json();
  },

  async triggerAutoHeal(actionType: string, target: string, nodeTarget = currentTargetNode): Promise<any> {
    const res = await fetch(`${API_BASE}/apps/autoheal/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action_type: actionType, target, node_target: nodeTarget })
    });
    return res.json();
  },

  // --- Database Intelligence & Query Profiling ---
  async getDatabaseOverview(target = currentTargetNode): Promise<DatabaseOverview> {
    const res = await fetch(`${API_BASE}/database/overview?target=${encodeURIComponent(target)}`);
    return res.json();
  },

  async getDatabaseQueries(slowOnly = false, target = currentTargetNode): Promise<DatabaseQuery[]> {
    const res = await fetch(`${API_BASE}/database/queries?target=${encodeURIComponent(target)}&slow_only=${slowOnly}`);
    return res.json();
  },

  async getDatabaseTables(target = currentTargetNode): Promise<DatabaseTable[]> {
    const res = await fetch(`${API_BASE}/database/tables?target=${encodeURIComponent(target)}`);
    return res.json();
  },

  async terminateDatabaseQuery(queryPid: number, engine: string, target = currentTargetNode): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/database/terminate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query_pid: queryPid, engine, target })
    });
    return res.json();
  },

  // --- Authentication ---
  async login(username: string, password: string): Promise<any> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Login failed');
    }
    if (data.user) {
      localStorage.setItem('aiops_user', JSON.stringify(data.user));
      localStorage.setItem('aiops_token', data.token || 'token');
    }
    return data;
  },

  async register(email: string, username: string, password: string): Promise<any> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, username, password })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Registration failed');
    }
    if (data.user) {
      localStorage.setItem('aiops_user', JSON.stringify(data.user));
      localStorage.setItem('aiops_token', data.token || 'token');
    }
    return data;
  },

  getStoredUser(): { id: number; username: string; email: string; role: string } | null {
    try {
      const u = localStorage.getItem('aiops_user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  },

  logout() {
    localStorage.removeItem('aiops_user');
    localStorage.removeItem('aiops_token');
  }
};
