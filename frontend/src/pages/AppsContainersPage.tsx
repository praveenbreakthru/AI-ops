import React, { useEffect, useState } from 'react';
import {
  Boxes, Box, Layers, Play, Square, RotateCw, Trash2,
  CheckCircle2, AlertTriangle, XCircle, ShieldCheck, Zap,
  Terminal, Server, RefreshCw, Power
} from 'lucide-react';
import { api } from '../services/api';
import {
  DockerOverview, DockerContainer, DockerImage,
  K8sOverview, K8sPod, AppEcosystem, AutoHealStatus
} from '../types';

export const AppsContainersPage: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'docker' | 'k8s' | 'apps' | 'autoheal'>('docker');
  const [dockerOverview, setDockerOverview] = useState<DockerOverview | null>(null);
  const [containers, setContainers] = useState<DockerContainer[]>([]);
  const [images, setImages] = useState<DockerImage[]>([]);
  const [k8sOverview, setK8sOverview] = useState<K8sOverview | null>(null);
  const [pods, setPods] = useState<K8sPod[]>([]);
  const [apps, setApps] = useState<AppEcosystem[]>([]);
  const [autoHealStatus, setAutoHealStatus] = useState<AutoHealStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<{ title: string; text: string } | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [docOver, docCont, docImg, k8sOver, k8sP, appEco, healSt] = await Promise.all([
        api.getDockerOverview().catch(() => null),
        api.getDockerContainers(true).catch(() => []),
        api.getDockerImages().catch(() => []),
        api.getK8sOverview().catch(() => null),
        api.getK8sPods('all').catch(() => []),
        api.getAppsOverview().catch(() => []),
        api.getAutoHealStatus().catch(() => null)
      ]);

      setDockerOverview(docOver);
      setContainers(docCont);
      setImages(docImg);
      setK8sOverview(k8sOver);
      setPods(k8sP);
      setApps(appEco);
      setAutoHealStatus(healSt);
    } catch (e) {
      console.error('Error fetching container/app data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleAutoHeal = async () => {
    const nextMode = autoHealStatus?.mode === 'automatic' ? 'manual_approval' : 'automatic';
    try {
      const res = await api.setAutoHealMode(nextMode);
      setActionMessage(`Auto-Healing switched to ${res.mode.toUpperCase()}`);
      fetchData();
      setTimeout(() => setActionMessage(null), 4000);
    } catch (e: any) {
      setActionMessage(`Error changing mode: ${e.message}`);
    }
  };

  const handleContainerAction = async (action: 'restart' | 'stop', id: string, name: string) => {
    try {
      if (action === 'restart') {
        setActionMessage(`Restarting container ${name}...`);
        await api.restartDockerContainer(id);
      } else {
        setActionMessage(`Stopping container ${name}...`);
        await api.stopDockerContainer(id);
      }
      fetchData();
      setTimeout(() => setActionMessage(null), 3500);
    } catch (e: any) {
      setActionMessage(`Action error: ${e.message}`);
    }
  };

  const handleViewLogs = async (id: string, name: string) => {
    try {
      const res = await api.getContainerLogs(id);
      setSelectedLog({ title: `Logs for Container: ${name} (${id})`, text: res.logs });
    } catch (e: any) {
      setSelectedLog({ title: `Logs: ${name}`, text: `Failed to retrieve logs: ${e.message}` });
    }
  };

  const handlePruneImages = async () => {
    try {
      setActionMessage('Pruning unused Docker images...');
      const res = await api.pruneDockerImages();
      setActionMessage(`Docker prune complete: ${res.output || 'Images cleaned'}`);
      fetchData();
      setTimeout(() => setActionMessage(null), 5000);
    } catch (e: any) {
      setActionMessage(`Prune error: ${e.message}`);
    }
  };

  const handleLaunchDocker = async () => {
    try {
      setActionMessage('Dispatched launch command for Docker Desktop...');
      await api.launchDockerDesktop();
      setTimeout(() => {
        fetchData();
        setActionMessage('Checking Docker daemon status...');
      }, 5000);
    } catch (e: any) {
      setActionMessage(`Failed to launch Docker: ${e.message}`);
    }
  };

  const handleRestartPod = async (podName: string, namespace: string) => {
    try {
      setActionMessage(`Restarting Kubernetes pod ${podName}...`);
      await api.restartK8sPod(podName, namespace);
      fetchData();
      setTimeout(() => setActionMessage(null), 3500);
    } catch (e: any) {
      setActionMessage(`Pod restart error: ${e.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Auto-Healing Mode Toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <Boxes className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-bold text-white tracking-tight">Application & Container Ecosystem</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time monitoring for Docker containers, Kubernetes pods, developer stacks, and autonomous self-healing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Auto-Healing Toggle */}
          <button
            onClick={handleToggleAutoHeal}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
              autoHealStatus?.mode === 'automatic'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
            }`}
          >
            <Zap className={`w-4 h-4 ${autoHealStatus?.mode === 'automatic' ? 'animate-pulse' : ''}`} />
            <span>
              Self-Healing: {autoHealStatus?.mode === 'automatic' ? 'AUTONOMOUS (ACTIVE)' : 'MANUAL APPROVAL'}
            </span>
          </button>

          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition"
            title="Refresh now"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionMessage && (
        <div className="p-3 bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs rounded-xl flex items-center justify-between animate-fade-in">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Sub Navigation Tabs */}
      <div className="flex border-b border-slate-800 gap-6 text-xs font-medium">
        <button
          onClick={() => setActiveSubTab('docker')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeSubTab === 'docker' ? 'border-blue-500 text-blue-400 font-semibold' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Box className="w-4 h-4" /> Docker ({containers.length})
        </button>
        <button
          onClick={() => setActiveSubTab('k8s')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeSubTab === 'k8s' ? 'border-blue-500 text-blue-400 font-semibold' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" /> Kubernetes ({pods.length})
        </button>
        <button
          onClick={() => setActiveSubTab('apps')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeSubTab === 'apps' ? 'border-blue-500 text-blue-400 font-semibold' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Server className="w-4 h-4" /> Running Apps ({apps.length})
        </button>
        <button
          onClick={() => setActiveSubTab('autoheal')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeSubTab === 'autoheal' ? 'border-emerald-500 text-emerald-400 font-semibold' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4" /> Self-Healing History ({autoHealStatus?.total_actions_recorded || 0})
        </button>
      </div>

      {/* ==================== DOCKER VIEW ==================== */}
      {activeSubTab === 'docker' && (
        <div className="space-y-6">
          {/* KPI Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <span className="text-[11px] text-slate-400 font-medium">Docker Daemon</span>
              <div className="flex items-center justify-between mt-2">
                <span className="text-base font-bold text-white flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${dockerOverview?.is_running ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  {dockerOverview?.is_running ? 'Online' : 'Stopped'}
                </span>
                {!dockerOverview?.is_running && (
                  <button
                    onClick={handleLaunchDocker}
                    className="text-[10px] bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded font-semibold"
                  >
                    Start Docker
                  </button>
                )}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                {dockerOverview?.server_version ? `v${dockerOverview.server_version}` : 'Daemon not reachable'}
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <span className="text-[11px] text-slate-400 font-medium">Active Containers</span>
              <div className="text-2xl font-bold text-emerald-400 mt-1">
                {dockerOverview?.containers_running || 0}
                <span className="text-xs text-slate-400 font-normal ml-1.5">
                  / {dockerOverview?.containers_total || 0} total
                </span>
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                {dockerOverview?.containers_stopped || 0} stopped / crashed
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <span className="text-[11px] text-slate-400 font-medium">Docker Images</span>
              <div className="text-2xl font-bold text-blue-400 mt-1">
                {dockerOverview?.images_total || images.length}
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-[10px] text-slate-500">Stored locally</span>
                <button
                  onClick={handlePruneImages}
                  className="text-[10px] text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Prune Unused
                </button>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <span className="text-[11px] text-slate-400 font-medium">Auto-Recovery Status</span>
              <div className="text-2xl font-bold text-purple-400 mt-1 flex items-center gap-2">
                <Zap className="w-5 h-5 text-purple-400" />
                {autoHealStatus?.mode === 'automatic' ? 'Autonomous' : 'Guarded'}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Crashed containers are recovered automatically
              </span>
            </div>
          </div>

          {/* Containers Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Box className="w-4 h-4 text-blue-400" /> Container Runtimes & Self-Healing
              </h3>
              <span className="text-xs text-slate-400">{containers.length} containers registered</span>
            </div>

            {containers.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                {dockerOverview?.is_running
                  ? 'No containers currently created or running. Launch containers using docker run or compose.'
                  : 'Docker Desktop is currently stopped. Click "Start Docker" above to activate.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/60 text-slate-400 uppercase font-semibold">
                    <tr>
                      <th className="py-3 px-4">Container</th>
                      <th className="py-3 px-4">Image</th>
                      <th className="py-3 px-4">State</th>
                      <th className="py-3 px-4">Health / Exit</th>
                      <th className="py-3 px-4">Ports</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {containers.map((c) => {
                      const isRunning = c.state === 'running';
                      const isCrashed = c.is_crashed;
                      return (
                        <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-200 block">{c.name}</span>
                            <span className="font-mono text-[10px] text-slate-500">{c.id}</span>
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-300">
                            {c.image}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                              isCrashed
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : isRunning
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                            }`}>
                              {isCrashed ? (
                                <XCircle className="w-3 h-3 text-rose-400" />
                              ) : isRunning ? (
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Square className="w-2.5 h-2.5" />
                              )}
                              {c.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px]">
                            {isCrashed ? (
                              <span className="text-rose-400 font-bold">Exit code: {c.exit_code} (Auto-Healing)</span>
                            ) : c.health !== 'none' ? (
                              <span className={c.health === 'healthy' ? 'text-emerald-400' : 'text-amber-400'}>
                                {c.health}
                              </span>
                            ) : (
                              <span className="text-slate-500">Normal</span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono text-[10px] text-slate-400 max-w-xs truncate">
                            {c.ports || 'None'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleContainerAction('restart', c.id, c.name)}
                                className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded transition"
                                title="Restart Container"
                              >
                                <RotateCw className="w-3.5 h-3.5" />
                              </button>
                              {isRunning && (
                                <button
                                  onClick={() => handleContainerAction('stop', c.id, c.name)}
                                  className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded transition"
                                  title="Stop Container"
                                >
                                  <Square className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => handleViewLogs(c.id, c.name)}
                                className="p-1.5 text-slate-400 hover:bg-slate-700/50 rounded transition"
                                title="View Container Logs"
                              >
                                <Terminal className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Images Table */}
          {images.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-800 font-bold text-xs text-slate-300 flex items-center justify-between">
                <span>Downloaded Container Images ({images.length})</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/60 text-slate-400 uppercase font-semibold">
                    <tr>
                      <th className="py-2.5 px-4">Repository</th>
                      <th className="py-2.5 px-4">Tag</th>
                      <th className="py-2.5 px-4">Image ID</th>
                      <th className="py-2.5 px-4">Size</th>
                      <th className="py-2.5 px-4">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                    {images.map((img) => (
                      <tr key={img.id} className="hover:bg-slate-800/40">
                        <td className="py-2.5 px-4 font-sans font-semibold text-slate-200">{img.repository}</td>
                        <td className="py-2.5 px-4 text-blue-400">{img.tag}</td>
                        <td className="py-2.5 px-4 text-slate-500">{img.id}</td>
                        <td className="py-2.5 px-4 text-emerald-400">{img.size}</td>
                        <td className="py-2.5 px-4 text-slate-400">{img.created_since}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== KUBERNETES VIEW ==================== */}
      {activeSubTab === 'k8s' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${k8sOverview?.is_running ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <h3 className="text-base font-bold text-white">Kubernetes Cluster Status</h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {k8sOverview?.is_running
                  ? `Connected to cluster. Tracking ${pods.length} pods across ${k8sOverview.namespaces_count} namespaces.`
                  : 'Kubernetes cluster is not currently running or configured with kubectl.'}
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="bg-slate-800/80 px-3 py-2 rounded-lg border border-slate-700">
                <span className="text-slate-400 block text-[10px]">TOTAL PODS</span>
                <span className="text-white font-bold text-sm">{pods.length}</span>
              </div>
              <div className="bg-slate-800/80 px-3 py-2 rounded-lg border border-slate-700">
                <span className="text-slate-400 block text-[10px]">CRASHING</span>
                <span className={`font-bold text-sm ${k8sOverview?.crashing_pods ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {k8sOverview?.crashing_pods || 0}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-800 font-bold text-xs text-slate-300">
              Kubernetes Pod Inventory & CrashLoop Detection
            </div>
            {pods.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No active pods discovered. Start a local cluster (Docker Desktop K8s, Minikube, Kind, or K3s) to view telemetry.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/60 text-slate-400 uppercase font-semibold">
                    <tr>
                      <th className="py-3 px-4">Pod Name</th>
                      <th className="py-3 px-4">Namespace</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Ready</th>
                      <th className="py-3 px-4">Restarts</th>
                      <th className="py-3 px-4">Node</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {pods.map((p) => (
                      <tr key={`${p.namespace}/${p.name}`} className="hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-semibold text-slate-200">{p.name}</td>
                        <td className="py-3 px-4 text-blue-400 font-mono text-[11px]">{p.namespace}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                            p.is_crashing
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : p.status === 'Running'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px]">{p.ready}</td>
                        <td className="py-3 px-4 font-mono text-[11px] text-amber-400">{p.restarts}</td>
                        <td className="py-3 px-4 text-slate-400 text-[11px]">{p.node}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleRestartPod(p.name, p.namespace)}
                            className="px-2.5 py-1 text-[10px] font-semibold bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 rounded transition"
                          >
                            Restart Pod
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== APPLICATIONS VIEW ==================== */}
      {activeSubTab === 'apps' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {apps.map((app) => (
              <div key={app.name} className="bg-slate-900 border border-slate-800 p-5 rounded-xl hover:border-slate-700 transition">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white">{app.name}</h4>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Running
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                  <div className="bg-slate-800/50 p-2 rounded-lg">
                    <span className="text-[10px] text-slate-500 uppercase block">Procs</span>
                    <span className="text-xs font-bold text-slate-200">{app.process_count}</span>
                  </div>
                  <div className="bg-slate-800/50 p-2 rounded-lg">
                    <span className="text-[10px] text-slate-500 uppercase block">CPU</span>
                    <span className="text-xs font-bold text-blue-400">{app.cpu_percent}%</span>
                  </div>
                  <div className="bg-slate-800/50 p-2 rounded-lg">
                    <span className="text-[10px] text-slate-500 uppercase block">RAM</span>
                    <span className="text-xs font-bold text-purple-400">{app.memory_mb} MB</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== AUTO-HEALING TIMELINE VIEW ==================== */}
      {activeSubTab === 'autoheal' && (
        <div className="space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-xl flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-emerald-400" /> Autonomous Self-Healing Engine
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                The engine continuously evaluates Docker containers and system applications every 15 seconds.
                Crashes, memory exhaustions, and unhealthy services are remediated with automatic rate-limit safeguards.
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Loop Protection</span>
              <span className="text-xs font-semibold text-emerald-400">Max {autoHealStatus?.max_restarts_per_hour || 3} restarts/hr</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-800 font-bold text-xs text-slate-300">
              Automated Remediation Audit Log ({autoHealStatus?.recent_actions?.length || 0})
            </div>
            {!autoHealStatus?.recent_actions || autoHealStatus.recent_actions.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No self-healing events triggered yet. All monitored containers and applications are healthy.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/60 text-slate-400 uppercase font-semibold">
                    <tr>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Target Application</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">CLI Command Executed</th>
                      <th className="py-3 px-4">Result</th>
                      <th className="py-3 px-4 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                    {autoHealStatus.recent_actions.map((act) => (
                      <tr key={act.id} className="hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-sans font-semibold text-slate-200">{act.action_type}</td>
                        <td className="py-3 px-4 text-blue-400">{act.target}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            act.status === 'executed'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            <CheckCircle2 className="w-3 h-3" /> {act.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-300 max-w-xs truncate">{act.command}</td>
                        <td className="py-3 px-4 text-slate-400 max-w-xs truncate">{act.result || 'OK'}</td>
                        <td className="py-3 px-4 text-slate-500 text-right">
                          {act.created_at ? new Date(act.created_at).toLocaleTimeString() : 'Recent'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Container Logs Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/40">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-blue-400" /> {selectedLog.title}
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 font-mono text-[11px] bg-slate-950 text-slate-300 whitespace-pre-wrap leading-relaxed">
              {selectedLog.text}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
