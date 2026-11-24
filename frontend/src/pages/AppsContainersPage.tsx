import React, { useEffect, useState } from 'react';
import {
  Boxes, Box, Layers, Play, Square, RotateCw, Trash2,
  CheckCircle2, AlertTriangle, XCircle, ShieldCheck, Zap,
  Terminal, Server, RefreshCw, Power, AlertOctagon, Sparkles,
  Globe, ExternalLink
} from 'lucide-react';
import { api } from '../services/api';
import {
  DockerOverview, DockerContainer, DockerImage,
  K8sOverview, K8sPod, AppEcosystem, AutoHealStatus
} from '../types';

export const AppsContainersPage: React.FC = () => {
  const targetNode = api.getTargetNode();
  const [activeSubTab, setActiveSubTab] = useState<'iis' | 'docker' | 'k8s' | 'apps' | 'discovery' | 'autoheal'>(
    targetNode === 'winserver' ? 'iis' : 'docker'
  );
  const [dockerOverview, setDockerOverview] = useState<DockerOverview | null>(null);
  const [containers, setContainers] = useState<DockerContainer[]>([]);
  const [images, setImages] = useState<DockerImage[]>([]);
  const [k8sOverview, setK8sOverview] = useState<K8sOverview | null>(null);
  const [pods, setPods] = useState<K8sPod[]>([]);
  const [apps, setApps] = useState<AppEcosystem[]>([]);
  const [appFilter, setAppFilter] = useState<'all' | 'running' | 'stopped' | 'databases' | 'tools' | 'downloaded'>('all');
  const [appSearch, setAppSearch] = useState('');
  const [iisFilter, setIisFilter] = useState<'all' | 'running' | 'stopped' | 'frontend' | 'backend'>('all');
  const [iisSearch, setIisSearch] = useState('');
  const [discoveredItems, setDiscoveredItems] = useState<any[]>([]);
  const [uptimeData, setUptimeData] = useState<any[]>([]);
  const [autoHealStatus, setAutoHealStatus] = useState<AutoHealStatus | null>(null);
  const [showImagesViewer, setShowImagesViewer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<{ title: string; text: string } | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const target = api.getTargetNode();
      const [docOver, docCont, docImg, k8sOver, k8sP, appEco, healSt, disc, upt] = await Promise.all([
        api.getDockerOverview(target).catch(() => null),
        api.getDockerContainers(true, target).catch(() => []),
        api.getDockerImages(target).catch(() => []),
        api.getK8sOverview(target).catch(() => null),
        api.getK8sPods('all', target).catch(() => []),
        api.getAppsOverview(target).catch(() => []),
        api.getAutoHealStatus().catch(() => null),
        api.getDiscoveredItems(target).catch(() => []),
        api.getUptimeOverview(target).catch(() => [])
      ]);

      setDockerOverview(docOver);
      setContainers(docCont);
      setImages(docImg);
      setK8sOverview(k8sOver);
      setPods(k8sP);
      setApps(appEco);
      setAutoHealStatus(healSt);
      setDiscoveredItems(disc);
      setUptimeData(upt);
    } catch (e) {
      console.error('Error fetching container/app data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAppAction = async (action: 'launch' | 'stop' | 'restart', app: AppEcosystem) => {
    try {
      const target = app.target || targetNode;
      const idOrName = app.id || app.name;
      if (action === 'launch') {
        setActionMessage(`▶ Launching ${app.name}...`);
        const res = await api.launchApp(idOrName, target);
        setActionMessage(res.message || `Launched ${app.name} successfully.`);
      } else if (action === 'stop') {
        setActionMessage(`⏹ Stopping ${app.name}...`);
        const res = await api.stopApp(idOrName, target);
        setActionMessage(res.message || `Stopped ${app.name}.`);
      } else if (action === 'restart') {
        setActionMessage(`🔄 Restarting ${app.name}...`);
        const res = await api.restartApp(idOrName, target);
        setActionMessage(res.message || `Restarted ${app.name}.`);
      }
      fetchData();
      setTimeout(() => setActionMessage(null), 5000);
    } catch (e: any) {
      setActionMessage(`Action error: ${e.message}`);
    }
  };

  const handleKillPid = async (pid: number, appName: string) => {
    try {
      if (!window.confirm(`Are you sure you want to terminate PID ${pid} for ${appName}?`)) return;
      setActionMessage(`⚡ Terminating PID ${pid}...`);
      await api.killProcess(pid, targetNode);
      setActionMessage(`Terminated PID ${pid}.`);
      fetchData();
      setTimeout(() => setActionMessage(null), 4000);
    } catch (e: any) {
      setActionMessage(`Kill error: ${e.message}`);
    }
  };

  const handleTestDiscovery = async () => {
    try {
      setActionMessage('Dispatched test discovery event to dynamic engine...');
      const res = await api.triggerTestDiscovery();
      setActionMessage(`✨ New workload discovered: ${res.item?.name} (${res.item?.type}) on ${res.item?.node_name}!`);
      fetchData();
      setTimeout(() => setActionMessage(null), 5000);
    } catch (e: any) {
      setActionMessage(`Discovery test error: ${e.message}`);
    }
  };

  const handleProbeEndpoint = async (url: string, name: string) => {
    try {
      setActionMessage(`⚡ Probing endpoint ${name} (${url})...`);
      const res = await api.probeEndpoint(url, name, targetNode);
      setActionMessage(`Ping ${name}: ${res.status.toUpperCase()} (${res.status_code || 'Err'}, ${res.latency_ms}ms)`);
      setUptimeData(prev => {
        const remaining = prev.filter(p => p.url !== url);
        return [...remaining, res];
      });
      setTimeout(() => setActionMessage(null), 5000);
    } catch (e: any) {
      setActionMessage(`Ping failed: ${e.message}`);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (targetNode === 'winserver') {
      setActiveSubTab('iis');
    } else if (activeSubTab === 'iis') {
      setActiveSubTab('apps');
    }
  }, [targetNode]);

  // Dynamic Partitioning: IIS Hosted Applications vs General Applications & Workloads
  const isIISApp = (app: AppEcosystem) => {
    const id = (app.id || '').toLowerCase();
    const cat = (app.category || '').toLowerCase();
    const srv = (app.service_name || '').toLowerCase();
    const path = (app.executable_path || '').toLowerCase();
    const desc = (app.description || '').toLowerCase();
    return (
      id.startsWith('iis_') ||
      cat.includes('iis') ||
      cat.includes('frontend portal') ||
      cat.includes('backend api') ||
      cat.includes('microservice') ||
      srv.startsWith('w3svc') ||
      desc.includes('iis') ||
      path.startsWith('http://172.16.10.30') ||
      path.startsWith('https://172.16.10.30') ||
      (path.startsWith('http://') && path.includes(':'))
    );
  };

  const iisApps = apps.filter(isIISApp);
  const workloadApps = apps.filter(a => !isIISApp(a));

  const iisRunning = iisApps.filter(a => a.status === 'running');
  const iisStopped = iisApps.filter(a => a.status !== 'running');
  const iisFrontend = iisApps.filter(a =>
    (a.category || '').toLowerCase().includes('frontend') ||
    (a.category || '').toLowerCase().includes('portal') ||
    (a.category || '').toLowerCase().includes('ui') ||
    a.name.toLowerCase().includes('ui') ||
    a.name.toLowerCase().includes('admin')
  );
  const iisBackend = iisApps.filter(a =>
    (a.category || '').toLowerCase().includes('backend') ||
    (a.category || '').toLowerCase().includes('api') ||
    (a.category || '').toLowerCase().includes('microservice') ||
    (a.category || '').toLowerCase().includes('gateway') ||
    a.name.toLowerCase().includes('api') ||
    a.name.toLowerCase().includes('gateway')
  );

  const workloadRunning = workloadApps.filter(a => a.status === 'running');
  const workloadStopped = workloadApps.filter(a => a.status !== 'running');
  const workloadDatabases = workloadApps.filter(a =>
    (a.category || '').toLowerCase().includes('database') ||
    a.name.toLowerCase().includes('sql') ||
    a.name.toLowerCase().includes('postgres') ||
    a.name.toLowerCase().includes('xampp')
  );
  const workloadTools = workloadApps.filter(a =>
    (a.category || '').toLowerCase().includes('tool') ||
    (a.category || '').toLowerCase().includes('software') ||
    (a.category || '').toLowerCase().includes('runtime') ||
    (a.category || '').toLowerCase().includes('desktop')
  );

  // Compute active down/degraded items
  const crashedContainers = containers.filter(c => c.is_crashed || c.status.toLowerCase().includes('restarting'));
  const crashedPods = pods.filter(p => p.is_crashing);
  const totalIssues = crashedContainers.length + crashedPods.length;

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

  // 1-Click Resolve All Issues
  const handleResolveAll = async () => {
    try {
      setActionMessage('Scanning system and executing auto-remediation actions...');
      const res = await api.resolveAllIssues();
      setActionMessage(res.message || 'Auto-healing executed successfully.');
      fetchData();
      setTimeout(() => setActionMessage(null), 5000);
    } catch (e: any) {
      setActionMessage(`Auto-healing error: ${e.message}`);
    }
  };

  // Docker Container Actions: start, stop, restart, delete
  const handleContainerAction = async (action: 'start' | 'stop' | 'restart' | 'delete', id: string, name: string) => {
    try {
      if (action === 'start') {
        setActionMessage(`Starting container ${name}...`);
        await api.startDockerContainer(id);
      } else if (action === 'stop') {
        setActionMessage(`Stopping container ${name}...`);
        await api.stopDockerContainer(id);
      } else if (action === 'restart') {
        setActionMessage(`Restarting container ${name}...`);
        await api.restartDockerContainer(id);
      } else if (action === 'delete') {
        if (!window.confirm(`Are you sure you want to permanently delete container "${name}"?`)) return;
        setActionMessage(`Deleting container ${name}...`);
        await api.deleteDockerContainer(id);
      }
      fetchData();
      setTimeout(() => setActionMessage(null), 4000);
    } catch (e: any) {
      setActionMessage(`Action error: ${e.message}`);
    }
  };

  // Docker Image Delete
  const handleDeleteImage = async (imageId: string, repo: string) => {
    try {
      if (!window.confirm(`Are you sure you want to delete image "${repo}" (${imageId})?`)) return;
      setActionMessage(`Deleting image ${repo}...`);
      await api.deleteDockerImage(imageId);
      fetchData();
      setTimeout(() => setActionMessage(null), 4000);
    } catch (e: any) {
      setActionMessage(`Error deleting image: ${e.message}`);
    }
  };

  // Kubernetes Pod Actions: start, stop, restart, delete
  const handlePodAction = async (action: 'start' | 'stop' | 'restart' | 'delete', podName: string, namespace: string) => {
    try {
      if (action === 'start') {
        setActionMessage(`Starting pod ${podName}...`);
        await api.startK8sPod(podName, namespace);
      } else if (action === 'stop') {
        setActionMessage(`Stopping pod ${podName}...`);
        await api.stopK8sPod(podName, namespace);
      } else if (action === 'restart') {
        setActionMessage(`Restarting pod ${podName}...`);
        await api.restartK8sPod(podName, namespace);
      } else if (action === 'delete') {
        if (!window.confirm(`Are you sure you want to forcefully delete pod "${podName}"?`)) return;
        setActionMessage(`Force deleting pod ${podName}...`);
        await api.deleteK8sPod(podName, namespace);
      }
      fetchData();
      setTimeout(() => setActionMessage(null), 4000);
    } catch (e: any) {
      setActionMessage(`Pod error: ${e.message}`);
    }
  };

  // Application Service Actions: start, stop, restart, delete
  const handleServiceAction = async (action: 'start' | 'stop' | 'restart' | 'delete', serviceName: string) => {
    try {
      if (action === 'delete') {
        if (!window.confirm(`Are you sure you want to disable and delete service "${serviceName}"?`)) return;
      }
      setActionMessage(`${action.toUpperCase()} command issued for ${serviceName}...`);
      if (action === 'start') await api.startService(serviceName);
      else if (action === 'stop') await api.stopService(serviceName);
      else if (action === 'restart') await api.restartService(serviceName);
      else if (action === 'delete') await api.deleteService(serviceName);
      fetchData();
      setTimeout(() => setActionMessage(null), 4000);
    } catch (e: any) {
      setActionMessage(`Service error: ${e.message}`);
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

  return (
    <div className="space-y-6">
      {/* TOP ROW: Two Boxes Side by Side (Next to Next on the same line) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Box 1: Workload & Applications Center */}
        <div className="aiops-card p-5 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-400" />
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-violet-600 to-cyan-500 text-white shadow-md ring-1 ring-white/20">
                <Boxes className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black tracking-tight">Workload & Applications Center</h2>
                <div className="flex items-center gap-2 text-[11px] opacity-70 mt-0.5 font-mono">
                  <span>Auto-Discovery: Active</span>
                  <span>•</span>
                  <span>Target: {targetNode === 'linux' ? 'Ubuntu Server' : targetNode === 'winserver' ? 'Windows Server' : 'Local Workstation'}</span>
                </div>
              </div>
            </div>

            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-xl border border-white/[0.08] transition shadow-sm active:scale-95"
              title="Refresh workloads"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : 'text-slate-300'}`} />
            </button>
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.08] flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400">Autonomous Supervisor</span>
            <button
              onClick={handleToggleAutoHeal}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all duration-200 shadow-sm active:scale-95 ${
                autoHealStatus?.mode === 'automatic'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
              }`}
            >
              <Zap className={`w-3.5 h-3.5 ${autoHealStatus?.mode === 'automatic' ? 'animate-pulse text-emerald-400' : 'text-amber-400'}`} />
              <span>{autoHealStatus?.mode === 'automatic' ? 'Autonomous Healing: ACTIVE' : 'Guarded Mode'}</span>
            </button>
          </div>
        </div>

        {/* Box 2: Degraded Workload Alert / Health Guard (Side by Side next to Box 1) */}
        {totalIssues > 0 ? (
          <div className="p-5 bg-gradient-to-r from-rose-950/70 via-obsidian-900 to-amber-950/40 border border-rose-500/40 rounded-3xl flex flex-col justify-between gap-3 shadow-xl backdrop-blur-2xl">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 shrink-0 border border-rose-500/30">
                <AlertOctagon className="w-5 h-5 animate-pulse" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-white truncate">
                    {totalIssues} Degraded Workload{totalIssues > 1 ? 's' : ''} Requiring Remediation
                  </span>
                  <span className="px-2 py-0.5 text-[9px] font-bold font-mono bg-rose-500/20 text-rose-300 rounded-full border border-rose-500/30 shrink-0">
                    DEGRADED
                  </span>
                </div>
                <p className="text-[11px] text-rose-200/80 mt-1 font-mono truncate">
                  {crashedContainers.map(c => `'${c.name}' (${c.status})`).join(' • ')}
                  {crashedPods.length > 0 && ` • Pods: ${crashedPods.map(p => p.name).join(', ')}`}
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={handleResolveAll}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white shadow-lg transition active:scale-95"
              >
                <Zap className="w-3.5 h-3.5 fill-white" />
                <span>⚡ 1-Click Auto-Resolve & Restore Health</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-5 bg-gradient-to-r from-emerald-950/50 via-obsidian-900 to-teal-950/30 border border-emerald-500/30 rounded-3xl flex flex-col justify-between gap-3 shadow-lg backdrop-blur-2xl">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0 border border-emerald-500/30">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-white">All Workloads Healthy & Guarded</span>
                  <span className="px-2 py-0.5 text-[9px] font-bold font-mono bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30">
                    OPTIMAL
                  </span>
                </div>
                <p className="text-[11px] text-emerald-200/80 mt-1 font-mono">
                  {containers.length} containers & {pods.length} pods operational. Zero crash-loops detected.
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between text-[11px] font-mono text-slate-400 border-t border-white/[0.06]">
              <span>Self-Healing Sweep: Every 15s</span>
              <span className="text-emerald-400 font-bold">100% Availability Target</span>
            </div>
          </div>
        )}
      </div>

      {/* Action Notification Banner */}
      {actionMessage && (
        <div className="p-4 bg-obsidian-900/90 border border-cyan-500/40 text-cyan-200 text-xs rounded-2xl flex items-center justify-between shadow-glow-card backdrop-blur-xl animate-fade-in font-mono">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>{actionMessage}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-white p-1">✕</button>
        </div>
      )}

      {/* Sub Navigation Segmented Tabs */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-obsidian-950/60 rounded-2xl border border-white/[0.06] text-xs font-medium">
        {(targetNode === 'winserver' || iisApps.length > 0) && (
          <button
            onClick={() => setActiveSubTab('iis')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all duration-150 font-bold ${
              activeSubTab === 'iis'
                ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/25 ring-1 ring-white/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-cyan-300" /> IIS Hosted Applications ({iisApps.length})
          </button>
        )}
        <button
          onClick={() => setActiveSubTab('apps')}
          className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all duration-150 font-bold ${
            activeSubTab === 'apps'
              ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-md shadow-violet-500/25 ring-1 ring-white/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
          }`}
        >
          <Server className="w-3.5 h-3.5" /> Applications & Workloads ({workloadApps.length})
        </button>
        <button
          onClick={() => setActiveSubTab('docker')}
          className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all duration-150 font-bold ${
            activeSubTab === 'docker'
              ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-md shadow-sky-500/25 ring-1 ring-white/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
          }`}
        >
          <Box className="w-3.5 h-3.5" /> Docker Engines ({containers.length})
        </button>
        <button
          onClick={() => setActiveSubTab('k8s')}
          className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all duration-150 font-bold ${
            activeSubTab === 'k8s'
              ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25 ring-1 ring-white/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" /> Kubernetes ({pods.length})
        </button>
        <button
          onClick={() => setActiveSubTab('discovery')}
          className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all duration-150 font-bold ${
            activeSubTab === 'discovery'
              ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md shadow-amber-500/25 ring-1 ring-white/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300" /> ✨ Auto-Discovery ({discoveredItems.length})
        </button>
        <button
          onClick={() => setActiveSubTab('autoheal')}
          className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all duration-150 font-bold ${
            activeSubTab === 'autoheal'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/25 ring-1 ring-white/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" /> Self-Healing Timeline ({autoHealStatus?.total_actions_recorded || 0})
        </button>
      </div>

      {/* ==================== IIS HOSTED APPLICATIONS VIEW ==================== */}
      {activeSubTab === 'iis' && (
        <div className="space-y-6">
          {/* Top KPI Stat Cards (5 Cards across) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* Card 1: Total IIS Sites */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
              <span className="text-[11px] text-slate-400 font-medium">Total IIS Sites</span>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xl font-bold text-white flex items-center gap-2">
                  <Globe className="w-4 h-4 text-cyan-400" />
                  {iisApps.length}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  PORT 80-9999
                </span>
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">Configured in IIS root/webadministration</span>
            </div>

            {/* Card 2: Running Websites */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
              <span className="text-[11px] text-slate-400 font-medium">Running Websites</span>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xl font-bold text-emerald-400 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  {iisRunning.length}
                </span>
                <span className="text-[10px] text-emerald-300 font-mono bg-emerald-500/10 px-2 py-0.5 rounded">
                  Active
                </span>
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">Live & serving web traffic</span>
            </div>

            {/* Card 3: Stopped / Standby */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
              <span className="text-[11px] text-slate-400 font-medium">Stopped Sites</span>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xl font-bold text-slate-300 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                  {iisStopped.length}
                </span>
                <span className="text-[10px] text-slate-400 font-mono bg-slate-800 px-2 py-0.5 rounded">
                  Standby
                </span>
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">Can be launched on-demand</span>
            </div>

            {/* Card 4: Frontend Portals */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
              <span className="text-[11px] text-slate-400 font-medium">Frontend Portals</span>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xl font-bold text-purple-400 flex items-center gap-2">
                  {iisFrontend.length}
                </span>
                <span className="text-[10px] text-purple-300 font-mono bg-purple-500/10 px-2 py-0.5 rounded">
                  Web UIs
                </span>
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">User dashboards & admin portals</span>
            </div>

            {/* Card 5: Backend APIs */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
              <span className="text-[11px] text-slate-400 font-medium">Backend APIs</span>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xl font-bold text-cyan-400 flex items-center gap-2">
                  {iisBackend.length}
                </span>
                <span className="text-[10px] text-cyan-300 font-mono bg-cyan-500/10 px-2 py-0.5 rounded">
                  Microservices
                </span>
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">REST APIs & microservices</span>
            </div>
          </div>

          {/* Filter Pills and Search */}
          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIisFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  iisFilter === 'all'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                All IIS Sites ({iisApps.length})
              </button>
              <button
                onClick={() => setIisFilter('running')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  iisFilter === 'running'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                Running ({iisRunning.length})
              </button>
              <button
                onClick={() => setIisFilter('stopped')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  iisFilter === 'stopped'
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                Stopped / Standby ({iisStopped.length})
              </button>
              <button
                onClick={() => setIisFilter('frontend')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  iisFilter === 'frontend'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                🌐 Frontend Portals ({iisFrontend.length})
              </button>
              <button
                onClick={() => setIisFilter('backend')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  iisFilter === 'backend'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                ⚡ Backend APIs ({iisBackend.length})
              </button>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Search IIS site name, port, bindings, URL..."
                value={iisSearch}
                onChange={(e) => setIisSearch(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 w-full md:w-64"
              />
            </div>
          </div>

          {/* IIS Applications Grid */}
          {iisApps
            .filter(a => {
              if (iisFilter === 'running' && a.status !== 'running') return false;
              if (iisFilter === 'stopped' && a.status === 'running') return false;
              if (iisFilter === 'frontend') {
                const isF = (a.category || '').toLowerCase().includes('frontend') || (a.category || '').toLowerCase().includes('portal') || (a.category || '').toLowerCase().includes('ui') || a.name.toLowerCase().includes('ui') || a.name.toLowerCase().includes('admin');
                if (!isF) return false;
              }
              if (iisFilter === 'backend') {
                const isB = (a.category || '').toLowerCase().includes('backend') || (a.category || '').toLowerCase().includes('api') || (a.category || '').toLowerCase().includes('microservice') || (a.category || '').toLowerCase().includes('gateway') || a.name.toLowerCase().includes('api') || a.name.toLowerCase().includes('gateway');
                if (!isB) return false;
              }
              if (iisSearch) {
                const q = iisSearch.toLowerCase();
                return (
                  a.name.toLowerCase().includes(q) ||
                  (a.category && a.category.toLowerCase().includes(q)) ||
                  (a.description && a.description.toLowerCase().includes(q)) ||
                  (a.executable_path && a.executable_path.toLowerCase().includes(q))
                );
              }
              return true;
            })
            .length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 p-12 text-center rounded-xl text-slate-500 text-xs">
              <Globe className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="font-semibold text-slate-400">No IIS hosted applications match the current filter.</p>
              <p className="mt-1">Try switching to All IIS Sites or clearing your search filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {iisApps
                .filter(a => {
                  if (iisFilter === 'running' && a.status !== 'running') return false;
                  if (iisFilter === 'stopped' && a.status === 'running') return false;
                  if (iisFilter === 'frontend') {
                    const isF = (a.category || '').toLowerCase().includes('frontend') || (a.category || '').toLowerCase().includes('portal') || (a.category || '').toLowerCase().includes('ui') || a.name.toLowerCase().includes('ui') || a.name.toLowerCase().includes('admin');
                    if (!isF) return false;
                  }
                  if (iisFilter === 'backend') {
                    const isB = (a.category || '').toLowerCase().includes('backend') || (a.category || '').toLowerCase().includes('api') || (a.category || '').toLowerCase().includes('microservice') || (a.category || '').toLowerCase().includes('gateway') || a.name.toLowerCase().includes('api') || a.name.toLowerCase().includes('gateway');
                    if (!isB) return false;
                  }
                  if (iisSearch) {
                    const q = iisSearch.toLowerCase();
                    return (
                      a.name.toLowerCase().includes(q) ||
                      (a.category && a.category.toLowerCase().includes(q)) ||
                      (a.description && a.description.toLowerCase().includes(q)) ||
                      (a.executable_path && a.executable_path.toLowerCase().includes(q))
                    );
                  }
                  return true;
                })
                .map((app) => {
                  const isRunning = app.status === 'running';
                  return (
                    <div
                      key={app.id || app.name}
                      className={`bg-obsidian-900/85 backdrop-blur-2xl border rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 hover:border-cyan-500/40 shadow-glass-card group ${
                        isRunning ? 'border-cyan-500/25 shadow-glow-card' : 'border-white/[0.05] bg-obsidian-900/50 opacity-90 hover:opacity-100'
                      }`}
                    >
                      <div>
                        {/* Title & Badges */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-white flex items-center gap-1.5 flex-wrap tracking-tight">
                              <span className="truncate">{app.name}</span>
                            </h4>
                            {app.category && (
                              <span className={`inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border font-mono ${
                                app.category.includes('Frontend') || app.category.includes('Portal')
                                  ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                                  : app.category.includes('Backend') || app.category.includes('API')
                                  ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                                  : 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                              }`}>
                                {app.category}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono flex items-center gap-1.5 border shadow-sm ${
                                isRunning
                                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                  : 'bg-obsidian-950 text-slate-400 border-white/[0.08]'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                                }`}
                              ></span>
                              {isRunning ? 'RUNNING' : 'STOPPED'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              IIS Site
                            </span>
                          </div>
                        </div>

                        {/* Description & Clickable URL */}
                        {app.executable_path && (
                          <div className="mt-3">
                            <a
                              href={app.executable_path}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition truncate max-w-full"
                              title={`Open ${app.name} at ${app.executable_path}`}
                            >
                              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{app.executable_path}</span>
                            </a>
                          </div>
                        )}

                        {app.description && (
                          <p className="text-[11px] text-slate-400 mt-1 font-mono truncate" title={app.description}>
                            {app.description}
                          </p>
                        )}

                        {/* Synthetic Health Probe Telemetry */}
                        {(() => {
                          const probe = uptimeData.find(u => u.url === app.executable_path || u.name === app.name);
                          return (
                            <div className="mt-2.5 p-2 bg-slate-950/80 rounded-xl border border-white/[0.06] flex items-center justify-between gap-2 text-[10px] font-mono">
                              <div className="flex items-center gap-1.5 truncate">
                                {probe?.status === 'healthy' ? (
                                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                    HTTP {probe.status_code || 200} OK
                                  </span>
                                ) : probe?.status === 'warning' ? (
                                  <span className="text-amber-400 font-bold flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                    HTTP {probe.status_code || 404}
                                  </span>
                                ) : probe?.status === 'degraded' ? (
                                  <span className="text-rose-400 font-bold flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                                    HTTP {probe.status_code || 500}
                                  </span>
                                ) : probe?.status === 'down' ? (
                                  <span className="text-rose-400 font-bold flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                    Offline
                                  </span>
                                ) : (
                                  <span className="text-slate-400 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                                    Ready to Probe
                                  </span>
                                )}
                                {probe && probe.latency_ms > 0 && (
                                  <span className="text-slate-400">• {probe.latency_ms}ms</span>
                                )}
                                {probe && (
                                  <span className="text-cyan-400 font-bold">• {probe.uptime_percent}% SLA</span>
                                )}
                              </div>

                              {app.executable_path && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleProbeEndpoint(app.executable_path!, app.name);
                                  }}
                                  className="px-2 py-0.5 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition text-[9px] font-bold active:scale-95 shrink-0"
                                  title="Test endpoint latency & response code"
                                >
                                  Ping
                                </button>
                              )}
                            </div>
                          );
                        })()}

                        {/* Live Telemetry / Metrics */}
                        {isRunning ? (
                          <div className="grid grid-cols-3 gap-2 mt-4 text-center font-mono">
                            <div className="bg-obsidian-950/70 p-2.5 rounded-xl border border-white/[0.06]">
                              <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-bold">App Pool</span>
                              <span className="text-xs font-bold text-emerald-400">Online</span>
                            </div>
                            <div className="bg-obsidian-950/70 p-2.5 rounded-xl border border-white/[0.06]">
                              <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-bold">CPU</span>
                              <span className="text-xs font-bold text-violet-400">{app.cpu_percent}%</span>
                            </div>
                            <div className="bg-obsidian-950/70 p-2.5 rounded-xl border border-white/[0.06]">
                              <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-bold">RAM</span>
                              <span className="text-xs font-bold text-cyan-400">{app.memory_mb} MB</span>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-4 p-2.5 rounded-xl bg-obsidian-950/50 border border-white/[0.05] text-center">
                            <span className="text-[11px] text-slate-400 font-mono">
                              IIS Site is currently stopped / standby.
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Control Action Buttons */}
                      <div className="mt-5 pt-3.5 border-t border-white/[0.08] flex items-center justify-end gap-2">
                        {!isRunning ? (
                          <button
                            onClick={() => handleAppAction('launch', app)}
                            className="w-full py-2.5 px-4 text-xs font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98] ring-1 ring-white/20"
                            title={`Start IIS site: ${app.name}`}
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>▶ Start IIS Site</span>
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => handleAppAction('restart', app)}
                              className="px-3 py-1.5 text-xs font-semibold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl flex items-center gap-1.5 transition active:scale-95"
                              title={`Restart IIS site: ${app.name}`}
                            >
                              <RotateCw className="w-3 h-3" /> Restart
                            </button>
                            <button
                              onClick={() => handleAppAction('stop', app)}
                              className="px-3 py-1.5 text-xs font-semibold bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 rounded-xl flex items-center gap-1.5 transition active:scale-95"
                              title={`Stop IIS site: ${app.name}`}
                            >
                              <Square className="w-3 h-3" /> Stop
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* ==================== DOCKER VIEW ==================== */}
      {activeSubTab === 'docker' && (
        <div className="space-y-6">
          {/* KPI Stat Cards (5 Cards across) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* Card 1: Docker Daemon */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
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

            {/* Card 2: Active Containers */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
              <span className="text-[11px] text-slate-400 font-medium">Active Containers</span>
              <div className="text-2xl font-bold text-emerald-400 mt-1">
                {dockerOverview?.containers_running || 0}
                <span className="text-xs text-slate-400 font-normal ml-1.5">
                  / {dockerOverview?.containers_total || 0}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                {dockerOverview?.containers_stopped || 0} stopped / idle
              </span>
            </div>

            {/* Card 3: Degraded Workloads */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
              <span className="text-[11px] text-slate-400 font-medium">Degraded Containers</span>
              <div className={`text-2xl font-bold mt-1 ${crashedContainers.length > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {crashedContainers.length}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                {crashedContainers.length > 0 ? 'Remediation needed' : 'Zero crash-loops'}
              </span>
            </div>

            {/* Card 4: Auto-Recovery Status */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
              <span className="text-[11px] text-slate-400 font-medium">Auto-Recovery</span>
              <div className="text-2xl font-bold text-purple-400 mt-1 flex items-center gap-2">
                <Zap className="w-5 h-5 text-purple-400" />
                {autoHealStatus?.mode === 'automatic' ? 'Autonomous' : 'Guarded'}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Continuous 15s health guard
              </span>
            </div>

            {/* Card 5: Docker Images (Clickable - opens Downloaded Images Viewer) */}
            <div
              onClick={() => setShowImagesViewer(!showImagesViewer)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer select-none shadow-sm ${
                showImagesViewer
                  ? 'bg-sky-500/15 border-sky-500/50 ring-2 ring-sky-500/30'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-medium">Docker Images</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                  showImagesViewer ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-300'
                }`}>
                  {showImagesViewer ? 'OPEN [✕]' : 'CLICK'}
                </span>
              </div>
              <div className="text-2xl font-bold text-sky-400 mt-1 flex items-center justify-between">
                <span>{dockerOverview?.images_total || images.length}</span>
                <Boxes className={`w-5 h-5 transition-transform ${showImagesViewer ? 'rotate-90 text-sky-400' : 'text-slate-500'}`} />
              </div>
              <span className="text-[10px] text-sky-300/80 mt-1 block">
                {showImagesViewer ? 'Click to close viewer' : 'Click to view images'}
              </span>
            </div>
          </div>

          {/* DEDICATED DOCKER IMAGES VIEWER (Opens when Card 5 is clicked) */}
          {showImagesViewer && (
            <div className="aiops-card p-5 border border-sky-500/40 shadow-2xl rounded-3xl space-y-4 animate-fade-in relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400">
                    <Boxes className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">Downloaded Container Images ({images.length})</h3>
                    <p className="text-[11px] text-slate-400">Inspect repository tags, image sizes, or prune dangling layers</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePruneImages}
                    className="px-3 py-1.5 text-xs font-semibold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-xl transition flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Prune Unused
                  </button>
                  <button
                    onClick={() => setShowImagesViewer(false)}
                    className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition"
                  >
                    ✕ Close Viewer
                  </button>
                </div>
              </div>

              {images.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 font-mono">
                  No local images found on this target node. Pull an image with `docker pull`.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-800/60 text-slate-400 uppercase font-semibold font-mono text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Repository</th>
                        <th className="py-2.5 px-3">Tag</th>
                        <th className="py-2.5 px-3">Image ID</th>
                        <th className="py-2.5 px-3">Size</th>
                        <th className="py-2.5 px-3">Created</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                      {images.map((img) => (
                        <tr key={img.id} className="hover:bg-slate-800/40">
                          <td className="py-2.5 px-3 font-sans font-bold text-slate-200">{img.repository}</td>
                          <td className="py-2.5 px-3 text-sky-400 font-bold">{img.tag}</td>
                          <td className="py-2.5 px-3 text-slate-500">{img.id}</td>
                          <td className="py-2.5 px-3 text-emerald-400 font-bold">{img.size}</td>
                          <td className="py-2.5 px-3 text-slate-400">{img.created_since}</td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => handleDeleteImage(img.id, img.repository)}
                              className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                              title="Delete Image"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Containers Table with Start, Stop, Restart, Delete */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Box className="w-4 h-4 text-blue-400" /> Container Runtimes & Full Management Controls
              </h3>
              <span className="text-xs text-slate-400">{containers.length} containers registered</span>
            </div>

            {containers.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                {dockerOverview?.is_running
                  ? 'No containers currently created or running. Launch containers using docker run or compose.'
                  : 'Docker is currently stopped. Click "Start Docker" above to activate.'}
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
                      <th className="py-3 px-4 text-right">Controls (Start / Stop / Restart / Delete)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {containers.map((c) => {
                      const isRunning = c.state === 'running';
                      const isCrashed = c.is_crashed || c.status.toLowerCase().includes('restarting');
                      return (
                        <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-200 block">{c.name}</span>
                              {c.is_new && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  <Sparkles className="w-2.5 h-2.5" /> NEW
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-[10px] text-slate-500">{c.id}</span>
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-300 max-w-xs truncate">
                            {c.image}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                              isCrashed
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse'
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
                              <span className="text-rose-400 font-bold">Crashing (Auto-Healing ready)</span>
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
                              {/* START (if stopped) */}
                              {!isRunning && (
                                <button
                                  onClick={() => handleContainerAction('start', c.id, c.name)}
                                  className="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded text-[10px] font-semibold flex items-center gap-1 transition"
                                  title="Start Container"
                                >
                                  <Play className="w-3 h-3" /> Start
                                </button>
                              )}

                              {/* STOP (if running) */}
                              {isRunning && (
                                <button
                                  onClick={() => handleContainerAction('stop', c.id, c.name)}
                                  className="px-2 py-1 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-500/30 rounded text-[10px] font-semibold flex items-center gap-1 transition"
                                  title="Stop Container"
                                >
                                  <Square className="w-3 h-3" /> Stop
                                </button>
                              )}

                              {/* RESTART */}
                              <button
                                onClick={() => handleContainerAction('restart', c.id, c.name)}
                                className="px-2 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded text-[10px] font-semibold flex items-center gap-1 transition"
                                title="Restart Container"
                              >
                                <RotateCw className="w-3 h-3" /> Restart
                              </button>

                              {/* DELETE */}
                              <button
                                onClick={() => handleContainerAction('delete', c.id, c.name)}
                                className="px-2 py-1 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 rounded text-[10px] font-semibold flex items-center gap-1 transition"
                                title="Permanently Delete Container"
                              >
                                <Trash2 className="w-3 h-3" /> Delete
                              </button>

                              {/* LOGS */}
                              <button
                                onClick={() => handleViewLogs(c.id, c.name)}
                                className="p-1 text-slate-400 hover:bg-slate-700/50 rounded transition"
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
            <div className="p-4 border-b border-slate-800 font-bold text-xs text-slate-300 flex items-center justify-between">
              <span>Kubernetes Pod Inventory & Controls</span>
              <span className="text-xs text-slate-400">{pods.length} active pods</span>
            </div>
            {pods.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No active pods discovered. Start a cluster or switch target node to view telemetry.
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
                      <th className="py-3 px-4 text-right">Actions (Start / Stop / Restart / Delete)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {pods.map((p) => (
                      <tr key={`${p.namespace}/${p.name}`} className="hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-semibold text-slate-200">
                          <div className="flex items-center gap-1.5">
                            <span>{p.name}</span>
                            {p.is_new && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                <Sparkles className="w-2.5 h-2.5" /> NEW
                              </span>
                            )}
                          </div>
                        </td>
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
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handlePodAction('start', p.name, p.namespace)}
                              className="px-2 py-1 text-[10px] font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded flex items-center gap-1 transition"
                              title="Start / Scale Pod"
                            >
                              <Play className="w-3 h-3 fill-emerald-400" /> Start
                            </button>
                            <button
                              onClick={() => handlePodAction('stop', p.name, p.namespace)}
                              className="px-2 py-1 text-[10px] font-semibold bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 rounded flex items-center gap-1 transition"
                              title="Stop Pod"
                            >
                              <Square className="w-3 h-3" /> Stop
                            </button>
                            <button
                              onClick={() => handlePodAction('restart', p.name, p.namespace)}
                              className="px-2 py-1 text-[10px] font-semibold bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded transition flex items-center gap-1"
                              title="Restart Pod"
                            >
                              <RotateCw className="w-3 h-3" /> Restart
                            </button>
                            <button
                              onClick={() => handlePodAction('delete', p.name, p.namespace)}
                              className="px-2 py-1 text-[10px] font-semibold bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded transition flex items-center gap-1"
                              title="Delete Pod"
                            >
                              <Trash2 className="w-3 h-3" /> Delete
                            </button>
                          </div>
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

      {/* ==================== APPLICATIONS VIEW (RUNNING & STOPPED) ==================== */}
      {activeSubTab === 'apps' && (
        <div className="space-y-6">
          {/* Top Bar: Node info, Filter pills, and Search */}
          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setAppFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  appFilter === 'all'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                All Workloads ({workloadApps.length})
              </button>
              <button
                onClick={() => setAppFilter('running')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  appFilter === 'running'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                Running ({workloadRunning.length})
              </button>
              <button
                onClick={() => setAppFilter('stopped')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  appFilter === 'stopped'
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                Stopped / Standby ({workloadStopped.length})
              </button>
              <button
                onClick={() => setAppFilter('databases')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  appFilter === 'databases'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                🗄️ Databases & Engines ({workloadDatabases.length})
              </button>
              <button
                onClick={() => setAppFilter('tools')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  appFilter === 'tools'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                🛠️ Installed Tools ({workloadTools.length})
              </button>
              <button
                onClick={() => setAppFilter('downloaded')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  appFilter === 'downloaded'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                📥 Downloaded ({workloadApps.filter(a => a.is_downloaded).length})
              </button>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Search applications, engines, daemons, tools..."
                value={appSearch}
                onChange={(e) => setAppSearch(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 w-full md:w-64"
              />
            </div>
          </div>

          {/* Applications Grid */}
          {workloadApps
            .filter(a => {
              if (appFilter === 'running' && a.status !== 'running') return false;
              if (appFilter === 'stopped' && a.status === 'running') return false;
              if (appFilter === 'databases') {
                const isDb = (a.category || '').toLowerCase().includes('database') || a.name.toLowerCase().includes('sql') || a.name.toLowerCase().includes('postgres') || a.name.toLowerCase().includes('xampp');
                if (!isDb) return false;
              }
              if (appFilter === 'tools') {
                const isTool = (a.category || '').toLowerCase().includes('tool') || (a.category || '').toLowerCase().includes('software') || (a.category || '').toLowerCase().includes('runtime') || (a.category || '').toLowerCase().includes('desktop');
                if (!isTool) return false;
              }
              if (appFilter === 'downloaded' && !a.is_downloaded) return false;
              if (appSearch) {
                const q = appSearch.toLowerCase();
                return (
                  a.name.toLowerCase().includes(q) ||
                  (a.category && a.category.toLowerCase().includes(q)) ||
                  (a.description && a.description.toLowerCase().includes(q))
                );
              }
              return true;
            })
            .length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 p-12 text-center rounded-xl text-slate-500 text-xs">
              <Server className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="font-semibold text-slate-400">No applications match the current filter.</p>
              <p className="mt-1">Try switching the filter to All Applications or clearing your search query.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workloadApps
                .filter(a => {
                  if (appFilter === 'running' && a.status !== 'running') return false;
                  if (appFilter === 'stopped' && a.status === 'running') return false;
                  if (appFilter === 'databases') {
                    const isDb = (a.category || '').toLowerCase().includes('database') || a.name.toLowerCase().includes('sql') || a.name.toLowerCase().includes('postgres') || a.name.toLowerCase().includes('xampp');
                    if (!isDb) return false;
                  }
                  if (appFilter === 'tools') {
                    const isTool = (a.category || '').toLowerCase().includes('tool') || (a.category || '').toLowerCase().includes('software') || (a.category || '').toLowerCase().includes('runtime') || (a.category || '').toLowerCase().includes('desktop');
                    if (!isTool) return false;
                  }
                  if (appFilter === 'downloaded' && !a.is_downloaded) return false;
                  if (appSearch) {
                    const q = appSearch.toLowerCase();
                    return (
                      a.name.toLowerCase().includes(q) ||
                      (a.category && a.category.toLowerCase().includes(q)) ||
                      (a.description && a.description.toLowerCase().includes(q))
                    );
                  }
                  return true;
                })
                .map((app) => {
                  const isRunning = app.status === 'running';
                  return (
                    <div
                      key={app.id || app.name}
                      className={`bg-obsidian-900/85 backdrop-blur-2xl border rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 hover:border-white/[0.18] shadow-glass-card group ${
                        isRunning ? 'border-white/[0.1] shadow-glow-card' : 'border-white/[0.05] bg-obsidian-900/50 opacity-90 hover:opacity-100'
                      }`}
                    >
                      <div>
                        {/* Title & Status Badges */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="text-sm font-bold text-white flex items-center gap-1.5 flex-wrap tracking-tight">
                              <span>{app.name}</span>
                              {app.is_new && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                                  <Sparkles className="w-2.5 h-2.5" /> NEW
                                </span>
                              )}
                              {app.is_downloaded && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                                  📥 DOWNLOADED
                                </span>
                              )}
                            </h4>
                            {app.category && (
                              <span className="inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-obsidian-950/80 text-slate-300 border border-white/[0.06] font-mono">
                                {app.category}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-col items-end gap-1">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono flex items-center gap-1.5 border shadow-sm ${
                                isRunning
                                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                  : 'bg-obsidian-950 text-slate-400 border-white/[0.08]'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                                }`}
                              ></span>
                              {isRunning ? 'RUNNING' : 'STOPPED'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {app.target === 'winserver' || app.target === 'windows_server' ? '🖥️ Win Server' : app.target === 'linux' ? '🐧 Linux' : '💻 Local'}
                            </span>
                          </div>
                        </div>

                        {/* Description & Path */}
                        {app.description && (
                          <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                            {app.description}
                          </p>
                        )}

                        {app.executable_path && (
                          <p
                            className="text-[10px] font-mono text-slate-400 mt-2 truncate bg-obsidian-950/80 px-2.5 py-1.5 rounded-xl border border-white/[0.06]"
                            title={app.executable_path}
                          >
                            {app.executable_path}
                          </p>
                        )}

                        {/* Live Telemetry / Metrics */}
                        {isRunning ? (
                          <div className="grid grid-cols-3 gap-2 mt-4 text-center font-mono">
                            <div className="bg-obsidian-950/70 p-2.5 rounded-xl border border-white/[0.06]">
                              <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-bold">Procs</span>
                              <span className="text-xs font-bold text-white">{app.process_count}</span>
                            </div>
                            <div className="bg-obsidian-950/70 p-2.5 rounded-xl border border-white/[0.06]">
                              <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-bold">CPU</span>
                              <span className="text-xs font-bold text-violet-400">{app.cpu_percent}%</span>
                            </div>
                            <div className="bg-obsidian-950/70 p-2.5 rounded-xl border border-white/[0.06]">
                              <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-bold">RAM</span>
                              <span className="text-xs font-bold text-cyan-400">{app.memory_mb} MB</span>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-4 p-2.5 rounded-xl bg-obsidian-950/50 border border-white/[0.05] text-center">
                            <span className="text-[11px] text-slate-400 font-mono">
                              {app.is_downloaded
                                ? 'Downloaded file ready to run or install.'
                                : 'Workload is stopped / standby.'}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Control Action Buttons */}
                      <div className="mt-5 pt-3.5 border-t border-white/[0.08] flex items-center justify-end gap-2">
                        {!isRunning ? (
                          <button
                            onClick={() => handleAppAction('launch', app)}
                            className="w-full py-2.5 px-4 text-xs font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98] ring-1 ring-white/20"
                            title={app.is_downloaded ? `Run installer: ${app.name}` : `Launch ${app.name}`}
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>{app.is_downloaded ? '▶ Run / Launch Installer' : '▶ Start / Launch Application'}</span>
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => handleAppAction('restart', app)}
                              className="px-3 py-1.5 text-xs font-semibold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl flex items-center gap-1.5 transition active:scale-95"
                              title={`Restart ${app.name}`}
                            >
                              <RotateCw className="w-3 h-3" /> Restart
                            </button>
                            <button
                              onClick={() => handleAppAction('stop', app)}
                              className="px-3 py-1.5 text-xs font-semibold bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 rounded-xl flex items-center gap-1.5 transition active:scale-95"
                              title={`Stop ${app.name}`}
                            >
                              <Square className="w-3 h-3" /> Stop
                            </button>
                            {app.pids && app.pids.length > 0 && (
                              <button
                                onClick={() => handleKillPid(app.pids![0], app.name)}
                                className="px-3 py-1.5 text-xs font-semibold bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-xl flex items-center gap-1.5 transition active:scale-95"
                                title={`Force kill PID ${app.pids[0]}`}
                              >
                                <Zap className="w-3 h-3" /> Kill
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* ==================== AUTO-DISCOVERY VIEW ==================== */}
      {activeSubTab === 'discovery' && (
        <div className="space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" /> Dynamic Auto-Discovery & Real-Time Inventory
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                The engine continuously sweeps the operating system every 5 seconds. Any newly spun-up container,
                newly applied Kubernetes pod, or launched tool is automatically discovered, categorized, and brought under live CPU & RAM telemetry.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleTestDiscovery}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition"
                title="Test dynamic detection by injecting a simulated workload"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Simulate New Workload Discovery</span>
              </button>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-800 font-bold text-xs text-slate-300 flex items-center justify-between">
              <span>Recently Discovered Workloads & Applications ({discoveredItems.length})</span>
              <span className="text-xs text-slate-400">Auto-detected across Local Laptop & Linux Server</span>
            </div>

            {discoveredItems.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs">
                <Sparkles className="w-8 h-8 text-amber-400/50 mx-auto mb-2 animate-pulse" />
                <p className="font-semibold text-slate-400">Discovery Engine is actively monitoring...</p>
                <p className="mt-1">Launch any new container (<code className="text-blue-400 font-mono">docker run</code>), pod, or tool to watch it appear here automatically.</p>
                <button
                  onClick={handleTestDiscovery}
                  className="mt-4 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600/20 text-blue-300 border border-blue-500/30 hover:bg-blue-600/30 transition"
                >
                  Click to test live discovery
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/60 text-slate-400 uppercase font-semibold">
                    <tr>
                      <th className="py-3 px-4">Entity Name</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Monitored Node</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Details</th>
                      <th className="py-3 px-4 text-right">Controls (Start / Stop / Restart / Delete)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {discoveredItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/40">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-100">{item.name}</span>
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              <Sparkles className="w-2.5 h-2.5" /> NEW
                            </span>
                          </div>
                          <span className="font-mono text-[10px] text-slate-500">{item.id}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            {item.type}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <span>{item.node === 'linux' ? '🐧' : '💻'}</span>
                            <span className="font-medium text-slate-300">{item.node_name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-2.5 h-2.5" /> {item.status || 'Active'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-[11px] max-w-xs truncate">
                          {item.details}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {item.category === 'container' && (
                              <>
                                <button
                                  onClick={() => handleContainerAction('start', item.raw_id, item.name)}
                                  className="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded text-[10px] font-semibold flex items-center gap-1 transition"
                                  title="Start Container"
                                >
                                  <Play className="w-3 h-3 fill-emerald-400" /> Start
                                </button>
                                <button
                                  onClick={() => handleContainerAction('stop', item.raw_id, item.name)}
                                  className="px-2 py-1 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 rounded text-[10px] font-semibold flex items-center gap-1 transition"
                                  title="Stop Container"
                                >
                                  <Square className="w-3 h-3" /> Stop
                                </button>
                                <button
                                  onClick={() => handleContainerAction('restart', item.raw_id, item.name)}
                                  className="px-2 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded text-[10px] font-semibold flex items-center gap-1 transition"
                                  title="Restart Container"
                                >
                                  <RotateCw className="w-3 h-3" /> Restart
                                </button>
                                <button
                                  onClick={() => handleContainerAction('delete', item.raw_id, item.name)}
                                  className="px-2 py-1 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded text-[10px] font-semibold flex items-center gap-1 transition"
                                  title="Delete Container"
                                >
                                  <Trash2 className="w-3 h-3" /> Delete
                                </button>
                              </>
                            )}

                            {item.category === 'pod' && (
                              <>
                                <button
                                  onClick={() => handlePodAction('start', item.raw_id, item.namespace || 'default')}
                                  className="px-2 py-1 text-[10px] font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded flex items-center gap-1 transition"
                                  title="Start Pod"
                                >
                                  <Play className="w-3 h-3 fill-emerald-400" /> Start
                                </button>
                                <button
                                  onClick={() => handlePodAction('stop', item.raw_id, item.namespace || 'default')}
                                  className="px-2 py-1 text-[10px] font-semibold bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 rounded flex items-center gap-1 transition"
                                  title="Stop Pod"
                                >
                                  <Square className="w-3 h-3" /> Stop
                                </button>
                                <button
                                  onClick={() => handlePodAction('restart', item.raw_id, item.namespace || 'default')}
                                  className="px-2 py-1 text-[10px] font-semibold bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded flex items-center gap-1 transition"
                                  title="Restart Pod"
                                >
                                  <RotateCw className="w-3 h-3" /> Restart
                                </button>
                                <button
                                  onClick={() => handlePodAction('delete', item.raw_id, item.namespace || 'default')}
                                  className="px-2 py-1 text-[10px] font-semibold bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded flex items-center gap-1 transition"
                                  title="Delete Pod"
                                >
                                  <Trash2 className="w-3 h-3" /> Delete
                                </button>
                              </>
                            )}

                            {item.category === 'tool' && (
                              <>
                                <button
                                  onClick={() => handleServiceAction('start', item.name)}
                                  className="px-2 py-1 text-[10px] font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded flex items-center gap-1 transition"
                                  title="Start Service"
                                >
                                  <Play className="w-3 h-3 fill-emerald-400" /> Start
                                </button>
                                <button
                                  onClick={() => handleServiceAction('stop', item.name)}
                                  className="px-2 py-1 text-[10px] font-semibold bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 rounded flex items-center gap-1 transition"
                                  title="Stop Service"
                                >
                                  <Square className="w-3 h-3" /> Stop
                                </button>
                                <button
                                  onClick={() => handleServiceAction('restart', item.name)}
                                  className="px-2 py-1 text-[10px] font-semibold bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded flex items-center gap-1 transition"
                                  title="Restart Service"
                                >
                                  <RotateCw className="w-3 h-3" /> Restart
                                </button>
                                <button
                                  onClick={() => handleServiceAction('delete', item.name)}
                                  className="px-2 py-1 text-[10px] font-semibold bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded flex items-center gap-1 transition"
                                  title="Delete Service"
                                >
                                  <Trash2 className="w-3 h-3" /> Delete
                                </button>
                              </>
                            )}
                          </div>
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
                        <td className="py-3 px-4 text-slate-400 max-w-xs truncate">{act.command}</td>
                        <td className="py-3 px-4 text-emerald-400">{act.result || 'Success'}</td>
                        <td className="py-3 px-4 text-right text-slate-500">{act.created_at || 'Just now'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal for viewing Container Logs */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/50">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-blue-400" />
                <span className="font-semibold text-xs text-white">{selectedLog.title}</span>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800"
              >
                ✕ Close
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 font-mono text-xs bg-slate-950 text-slate-300 whitespace-pre-wrap leading-relaxed">
              {selectedLog.text}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
