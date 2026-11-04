import React, { useEffect, useState } from 'react';
import { Cpu, Zap, Activity } from 'lucide-react';
import { CpuMetrics } from '../types';
import { api } from '../services/api';
import { StatCard } from '../components/StatCard';

export const CpuMonitoring: React.FC = () => {
  const [cpu, setCpu] = useState<CpuMetrics | null>(null);

  useEffect(() => {
    api.getCpu().then(setCpu).catch(console.error);
    const interval = setInterval(() => {
      api.getCpu().then(setCpu).catch(console.error);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!cpu) {
    return <div className="text-slate-400 animate-pulse text-sm">Loading CPU metrics...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">CPU Core Analytics</h2>
          <p className="text-xs text-slate-400 mt-1">Multi-core utilization, hardware frequencies, and kernel interrupts</p>
        </div>
        <div className="text-2xl font-bold text-blue-400 font-mono">
          {cpu.total_utilization_percent}%
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Utilization"
          value={`${cpu.total_utilization_percent}%`}
          subtitle="System aggregate load"
          icon={Cpu}
        />
        <StatCard
          title="User Mode CPU"
          value={`${cpu.user_percent}%`}
          subtitle="Application workloads"
          icon={Zap}
        />
        <StatCard
          title="Kernel (Privileged)"
          value={`${cpu.privileged_percent}%`}
          subtitle="Windows drivers and NT kernel"
          icon={Activity}
        />
        <StatCard
          title="Context Switches"
          value={`${Math.round(cpu.context_switches_per_sec)}/s`}
          subtitle={`Clock interrupts: ${Math.round(cpu.interrupts_per_sec)}/s`}
          icon={Activity}
        />
      </div>

      {/* Per-Core Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-sm font-bold text-white mb-4">Logical Processor Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(cpu.per_core_percent).map(([core, pct]) => {
            const freq = cpu.frequencies_ghz[core] || 1.8;
            return (
              <div key={core} className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/60">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-300">{core}</span>
                  <span className="text-xs font-mono font-bold text-blue-400">{pct}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 mb-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      pct > 85 ? 'bg-rose-500' : (pct > 70 ? 'bg-amber-500' : 'bg-blue-500')
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                  />
                </div>
                <span className="text-[11px] text-slate-500 font-mono">Frequency: {freq} GHz</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
