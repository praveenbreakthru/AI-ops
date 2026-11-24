import React, { useEffect, useState } from 'react';
import { Cpu, Zap, Activity, Clock, Layers, Sparkles } from 'lucide-react';
import { CpuMetrics } from '../types';
import { api } from '../services/api';
import { StatCard } from '../components/StatCard';

export const CpuMonitoring: React.FC = () => {
  const [cpu, setCpu] = useState<CpuMetrics | null>(null);
  const target = api.getTargetNode();
  const isLinux = target === 'linux';

  useEffect(() => {
    api.getCpu(target).then(setCpu).catch(console.error);
    const interval = setInterval(() => {
      api.getCpu(target).then(setCpu).catch(console.error);
    }, 5000);
    return () => clearInterval(interval);
  }, [target]);

  if (!cpu) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-mono animate-pulse">
          <Cpu className="w-4 h-4 animate-spin" />
          <span>Polling logical processor telemetry for {isLinux ? 'Ubuntu Server' : 'Local Laptop'}...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="aiops-card p-6 border-l-4 border-l-violet-500 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-32 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="p-2.5 rounded-xl bg-violet-500/15 border border-violet-500/30 text-violet-300 shadow-glow-compute">
                <Cpu className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-extrabold tracking-tight">CPU Core Analytics</h2>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                    isLinux
                      ? 'bg-orange-500/10 text-orange-400 border-orange-500/30'
                      : 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                  }`}>
                    {isLinux ? 'Linux (4 Cores)' : 'Local Laptop (8+ Threads)'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono opacity-70 mt-1">
                  <span>Frequency: {cpu.frequencies_ghz['core_0'] || 2.4} GHz</span>
                  <span>•</span>
                  <span>Context Switches: {Math.round(cpu.context_switches_per_sec)}/s</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-obsidian-950/70 p-3 px-5 rounded-2xl border border-violet-500/20 shadow-inner">
            <div className="text-right">
              <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest block font-mono">Aggregated Load</span>
              <span className="text-3xl font-extrabold text-white font-mono tracking-tight">
                {cpu.total_utilization_percent}%
              </span>
            </div>
            <div className={`w-3.5 h-3.5 rounded-full ${
              cpu.total_utilization_percent > 85 ? 'bg-rose-500 shadow-glow-card' : 'bg-violet-400 shadow-glow-compute'
            } animate-pulse`} />
          </div>
        </div>
      </div>

      {/* Metric Cards - violet theme */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Processor Load"
          value={`${cpu.total_utilization_percent}%`}
          subtitle="Real-time multi-core aggregate"
          icon={Cpu}
          metricTheme="compute"
        />
        <StatCard
          title="User Mode Execution"
          value={`${cpu.user_percent}%`}
          subtitle="Applications & services load"
          icon={Zap}
          metricTheme="compute"
        />
        <StatCard
          title="Kernel / System Mode"
          value={`${cpu.privileged_percent}%`}
          subtitle={isLinux ? "Linux kernel & syscall latency" : "Windows NT kernel & drivers"}
          icon={Activity}
          metricTheme="compute"
        />
        <StatCard
          title="Context Switches"
          value={`${Math.round(cpu.context_switches_per_sec).toLocaleString()}/s`}
          subtitle={`Interrupts: ${Math.round(cpu.interrupts_per_sec).toLocaleString()}/s`}
          icon={Clock}
          metricTheme="compute"
        />
      </div>

      {/* Logical Core Grid Breakdown */}
      <div className="aiops-card p-6 relative">
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-violet-400" />
            <h3 className="text-sm font-bold text-white tracking-wide">Logical Core Topology & Frequency</h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {Object.keys(cpu.per_core_percent).length} Physical / Hyperthreaded Units
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(cpu.per_core_percent).map(([core, pct]) => {
            const freq = cpu.frequencies_ghz[core] || 2.4;
            const isHot = pct > 85;
            const isWarm = pct > 65;

            return (
              <div
                key={core}
                className="p-4 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.06] hover:border-violet-500/40 transition-all duration-200 group"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-violet-500 group-hover:bg-violet-400" />
                    <span className="text-xs font-semibold">{core}</span>
                  </div>
                  <span className={`text-xs font-mono font-bold ${
                    isHot ? 'text-rose-500' : isWarm ? 'text-amber-500' : 'text-violet-500 dark:text-violet-300'
                  }`}>
                    {pct}%
                  </span>
                </div>

                {/* Core Usage Track */}
                <div className="w-full bg-slate-200 dark:bg-black/50 rounded-full h-2 mb-3 overflow-hidden border border-slate-300 dark:border-white/[0.05]">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isHot
                        ? 'bg-gradient-to-r from-rose-500 to-amber-500'
                        : isWarm
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                        : 'bg-gradient-to-r from-violet-600 via-indigo-500 to-cyan-400'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(2, pct))}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] opacity-70 font-mono">
                  <span>Clock Freq</span>
                  <span className="font-semibold">{freq} GHz</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
