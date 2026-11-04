import React, { useEffect, useState } from 'react';
import { MemoryStick, Layers, Database } from 'lucide-react';
import { MemoryMetrics } from '../types';
import { api } from '../services/api';
import { StatCard } from '../components/StatCard';
import { GaugeCard } from '../components/GaugeCard';

export const MemoryMonitoring: React.FC = () => {
  const [mem, setMem] = useState<MemoryMetrics | null>(null);

  useEffect(() => {
    api.getMemory().then(setMem).catch(console.error);
    const interval = setInterval(() => {
      api.getMemory().then(setMem).catch(console.error);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!mem) return <div className="text-slate-400 animate-pulse text-sm">Loading memory telemetry...</div>;

  const usedGb = (mem.used_bytes / 1024**3).toFixed(2);
  const totalGb = (mem.total_bytes / 1024**3).toFixed(2);
  const availGb = (mem.available_bytes / 1024**3).toFixed(2);
  const commitGb = (mem.committed_bytes / 1024**3).toFixed(2);
  const limitGb = (mem.commit_limit_bytes / 1024**3).toFixed(2);
  const cacheMb = (mem.cache_bytes / 1024**2).toFixed(1);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Physical Memory & Paging Activity</h2>
        <p className="text-xs text-slate-400 mt-1">Physical RAM allocation, Windows commit charge, and file cache</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Used Physical RAM"
          value={`${usedGb} GB`}
          subtitle={`Total Installed: ${totalGb} GB`}
          icon={MemoryStick}
        />
        <StatCard
          title="Available Memory"
          value={`${availGb} GB`}
          subtitle="Standby, Free, and Zero pages"
          icon={Layers}
        />
        <StatCard
          title="Committed Memory"
          value={`${commitGb} GB`}
          subtitle={`Commit Limit: ${limitGb} GB`}
          icon={Database}
        />
        <StatCard
          title="File System Cache"
          value={`${cacheMb} MB`}
          subtitle="Active NT cache working set"
          icon={Layers}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <GaugeCard
          title="Physical RAM Utilization"
          percentage={mem.utilization_percent}
          usedLabel={`${usedGb} GB Used`}
          totalLabel={`${totalGb} GB Total`}
          thresholdHigh={80}
          thresholdCritical={92}
        />

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-xs font-semibold text-slate-400 mb-3">Memory Pressure Thresholds</h3>
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-2 rounded bg-slate-800/50">
              <span className="text-slate-300">Target Commit Charge</span>
              <span className="font-mono text-emerald-400">&lt; 85%</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-slate-800/50">
              <span className="text-slate-300">Warning Threshold</span>
              <span className="font-mono text-amber-400">85% - 92%</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-slate-800/50">
              <span className="text-slate-300">Critical Exhaustion</span>
              <span className="font-mono text-rose-400">&gt; 92%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
