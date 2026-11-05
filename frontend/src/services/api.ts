import {
  SystemOverview, CpuMetrics, MemoryMetrics, DiskVolumeInfo,
  ProcessSummary, ServiceSummary, LogEntry, AnomalyOut,
  PredictionOut, AiDiagnosisResponse
} from '../types';

const API_BASE = '/api';

export const api = {
  async getHealth() {
    const res = await fetch(`${API_BASE}/health`);
    return res.json();
  },

  async getOverview(): Promise<SystemOverview> {
    const res = await fetch(`${API_BASE}/system/overview`);
    return res.json();
  },

  async getCpu(): Promise<CpuMetrics> {
    const res = await fetch(`${API_BASE}/system/cpu`);
    return res.json();
  },

  async getMemory(): Promise<MemoryMetrics> {
    const res = await fetch(`${API_BASE}/system/memory`);
    return res.json();
  },

  async getDisk(): Promise<DiskVolumeInfo[]> {
    const res = await fetch(`${API_BASE}/system/disk`);
    return res.json();
  },

  async getProcesses(limit = 15): Promise<ProcessSummary[]> {
    const res = await fetch(`${API_BASE}/system/processes?limit=${limit}`);
    return res.json();
  },

  async getServices(limit = 30): Promise<ServiceSummary[]> {
    const res = await fetch(`${API_BASE}/system/services?limit=${limit}`);
    return res.json();
  },

  async getLogs(channel = 'all', limit = 50): Promise<LogEntry[]> {
    const res = await fetch(`${API_BASE}/system/logs?channel=${channel}&limit=${limit}`);
    return res.json();
  },

  async getAlerts(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/alerts`);
    return res.json();
  },

  async getIncidents(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/incidents`);
    return res.json();
  },

  async getAnomalies(): Promise<AnomalyOut[]> {
    const res = await fetch(`${API_BASE}/ai/anomalies`);
    return res.json();
  },

  async getPredictions(): Promise<PredictionOut[]> {
    const res = await fetch(`${API_BASE}/ai/predictions`);
    return res.json();
  },

  async runAiDiagnosis(contextNotes?: string): Promise<AiDiagnosisResponse> {
    const res = await fetch(`${API_BASE}/ai/diagnosis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ context_notes: contextNotes || 'Interactive Diagnostic Evaluation' })
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
  async getDockerOverview(): Promise<any> {
    const res = await fetch(`${API_BASE}/apps/docker/overview`);
    return res.json();
  },

  async getDockerContainers(all = true): Promise<any[]> {
    const res = await fetch(`${API_BASE}/apps/docker/containers?all=${all}`);
    return res.json();
  },

  async getDockerImages(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/apps/docker/images`);
    return res.json();
  },

  async getContainerLogs(containerId: string): Promise<{ logs: string }> {
    const res = await fetch(`${API_BASE}/apps/docker/containers/${containerId}/logs`);
    return res.json();
  },

  async restartDockerContainer(containerId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/apps/docker/containers/${containerId}/restart`, {
      method: 'POST'
    });
    return res.json();
  },

  async stopDockerContainer(containerId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/apps/docker/containers/${containerId}/stop`, {
      method: 'POST'
    });
    return res.json();
  },

  async pruneDockerImages(): Promise<any> {
    const res = await fetch(`${API_BASE}/apps/docker/prune`, {
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
  async getK8sOverview(): Promise<any> {
    const res = await fetch(`${API_BASE}/apps/k8s/overview`);
    return res.json();
  },

  async getK8sPods(namespace = 'all'): Promise<any[]> {
    const res = await fetch(`${API_BASE}/apps/k8s/pods?namespace=${namespace}`);
    return res.json();
  },

  async restartK8sPod(podName: string, namespace = 'default'): Promise<any> {
    const res = await fetch(`${API_BASE}/apps/k8s/pods/restart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pod_name: podName, namespace })
    });
    return res.json();
  },

  // --- Application Ecosystem ---
  async getAppsOverview(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/apps/overview`);
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

  async triggerAutoHeal(actionType: string, target: string): Promise<any> {
    const res = await fetch(`${API_BASE}/apps/autoheal/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action_type: actionType, target })
    });
    return res.json();
  }
};

