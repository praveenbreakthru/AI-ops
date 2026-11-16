import React, { useEffect, useState } from 'react';
import { MemoryStick, Layers, Database, HardDrive, ShieldCheck, Cpu } from 'lucide-react';
import { MemoryMetrics } from '../types';
import { api } from '../services/api';
import { StatCard } from '../components/StatCard';
import { GaugeCard } from '../components/GaugeCard';

export const MemoryMonitoring: React.FC = () => {
  const [mem, setMem] = useState<MemoryMetrics | null>(null);
  const target = api.getTargetNode();
  const isLinux = target === 'linux';

  useEffect(() => {
    api.getMemory(target).then(setMem).catch(console.error);
    const interval = setInterval(() => {
      api.getMemory(target).then(setMem).catch(console.error);
    }, 5000);
    return () => clearInterval(interval);
  }, [target]);

  if (!mem) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-mono animate-pulse">
          <MemoryStick className="w-4 h-4 animate-spin" />
          <span>Polling memory subsystem telemetry for {isLinux ? 'Ubuntu Server' : 'Local Laptop'}...</span>
        </div>
      </div>
    );
  }

  const usedGb = (mem.used_bytes / 1024**3).toFixed(2);
  const totalGb = (mem.total_bytes / 1024**3).toFixed(2);
  const availGb = (mem.available_bytes / 1024**3).toFixed(2);
  const commitGb = (mem.committed_bytes / 1024**3).toFixed(2);
  const limitGb = (mem.commit_limit_bytes / 1024**3).toFixed(2);
  const cacheMb = (mem.cache_bytes / 1024**2).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="aiops-card p-6 border-l-4 border-l-cyan-500 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-32 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="p-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 shadow-glow-memory">
                <MemoryStick className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-extrabold tracking-tight">Physical Memory & Swap</h2>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                    isLinux
                      ? 'bg-orange-500/10 text-orange-400 border-orange-500/30'
                      : 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                  }`}>
                    {isLinux ? 'Linux (12 GB)' : 'Local Laptop (16 GB)'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono opacity-70 mt-1">
                  <span>Capacity: {totalGb} GB</span>
                  <span>•</span>
                  <span>Available: {availGb} GB</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-obsidian-950/70 p-3 px-5 rounded-2xl border border-cyan-500/20 shadow-inner">
            <div className="text-right">
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest block font-mono">RAM Allocated</span>
              <span className="text-3xl font-extrabold text-white font-mono tracking-tight">
                {mem.utilization_percent}%
              </span>
            </div>
            <div className={`w-3.5 h-3.5 rounded-full ${
              mem.utilization_percent > 85 ? 'bg-rose-500 shadow-glow-card' : 'bg-cyan-400 shadow-glow-memory'
            } animate-pulse`} />
          </div>
        </div>
      </div>

      {/* Metric Cards - Cyan theme */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Working Set"
          value={`${usedGb} GB`}
          subtitle={`Installed Capacity: ${totalGb} GB`}
          icon={MemoryStick}
          metricTheme="memory"
        />
        <StatCard
          title="Available Memory"
          value={`${availGb} GB`}
          subtitle={isLinux ? "Free pages & reclaimable buffer" : "Standby & free physical pages"}
          icon={Layers}
          metricTheme="memory"
        />
        <StatCard
          title={isLinux ? "Swap Allocation" : "Committed Charge"}
          value={`${commitGb} GB`}
          subtitle={isLinux ? `Swap Capacity: ${limitGb} GB` : `Commit Ceiling: ${limitGb} GB`}
          icon={Database}
          metricTheme="memory"
        />
        <StatCard
          title="Page & File Cache"
          value={`${cacheMb} MB`}
          subtitle={isLinux ? "Linux buffer & PageCache" : "NT fast-path working cache"}
          icon={HardDrive}
          metricTheme="memory"
        />
      </div>

      {/* Gauges & Pressure Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GaugeCard
          title="Physical RAM Load Matrix"
          percentage={mem.utilization_percent}
          usedLabel={`${usedGb} GB Active`}
          totalLabel={`${totalGb} GB Installed`}
          thresholdHigh={80}
          thresholdCritical={92}
        />

        <div className="aiops-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white tracking-wide">Memory Pressure Thresholds & OOM Policy</h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                ACTIVE
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.04]">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm" />
                  <span className="text-xs font-semibold">Optimal Operating Zone</span>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-500">&lt; 80% Utilization</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.04]">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm" />
                  <span className="text-xs font-semibold">Elevated Paging Alert</span>
                </div>
                <span className="text-xs font-mono font-bold text-amber-500">80% – 92% (Warning)</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.04]">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm" />
                  <span className="text-xs font-semibold">Critical OOM Danger</span>
                </div>
                <span className="text-xs font-mono font-bold text-rose-500">&gt; 92% (Auto-Mitigate)</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.06] text-[11px] text-slate-400 font-mono flex items-center justify-between">
            <span>Kernel Page Size: 4096 bytes</span>
            <span className="text-cyan-400">Paging Rate: Normal</span>
          </div>
        </div>
      </div>
    </div>
  );
};
