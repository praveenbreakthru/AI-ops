import React, { useEffect, useState } from 'react';
import { HardDrive, ArrowDown, ArrowUp, Disc, CheckCircle2, AlertTriangle } from 'lucide-react';
import { DiskVolumeInfo } from '../types';
import { api } from '../services/api';

export const DiskMonitoring: React.FC = () => {
  const [volumes, setVolumes] = useState<DiskVolumeInfo[]>([]);
  const target = api.getTargetNode();
  const isLinux = target === 'linux';

  useEffect(() => {
    api.getDisk(target).then(setVolumes).catch(console.error);
    const interval = setInterval(() => {
      api.getDisk(target).then(setVolumes).catch(console.error);
    }, 5000);
    return () => clearInterval(interval);
  }, [target]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="aiops-card p-6 border-l-4 border-l-emerald-500 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-32 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 shadow-glow-storage">
                <HardDrive className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-extrabold tracking-tight">Disk & Storage Partitions</h2>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                    isLinux
                      ? 'bg-orange-500/10 text-orange-400 border-orange-500/30'
                      : 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                  }`}>
                    {isLinux ? 'Linux (ext4)' : 'Local Laptop (NTFS)'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono opacity-70 mt-1">
                  <span>Partitions: {volumes.length} Mounted</span>
                  <span>•</span>
                  <span>Throughput: Real-Time</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs px-4 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{volumes.length} Mounted Partitions Online</span>
          </div>
        </div>
      </div>

      {/* Storage Volume Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {volumes.map((vol) => {
          const freeGb = (vol.free_bytes / 1024**3).toFixed(1);
          const totalGb = (vol.total_bytes / 1024**3).toFixed(1);
          const usedGb = ((vol.total_bytes - vol.free_bytes) / 1024**3).toFixed(1);
          const isCritical = vol.used_percent > 90;
          const isWarning = vol.used_percent > 80;

          return (
            <div
              key={vol.volume}
              className="aiops-card p-6 space-y-5 hover:border-emerald-500/40 transition-all duration-300 relative group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="p-3 rounded-xl bg-emerald-500/15 text-emerald-500 border border-emerald-500/25 group-hover:scale-105 transition-transform">
                    <Disc className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-base tracking-wide">Mount {vol.volume}</h3>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        {isLinux ? 'ext4' : 'NTFS'}
                      </span>
                    </div>
                    <p className="text-xs opacity-70 mt-0.5">
                      {isLinux ? 'Linux system partition' : 'Windows primary drive'}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`text-2xl font-extrabold font-mono ${
                    isCritical ? 'text-rose-500' : isWarning ? 'text-amber-500' : 'text-emerald-500'
                  }`}>
                    {vol.used_percent}%
                  </span>
                  <span className="text-[10px] opacity-60 block uppercase font-mono tracking-wider font-semibold">Allocated</span>
                </div>
              </div>

              {/* Progress Track */}
              <div className="space-y-2">
                <div className="w-full bg-slate-200 dark:bg-black/50 rounded-full h-2.5 overflow-hidden border border-slate-300 dark:border-white/[0.08] p-0.5">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isCritical
                        ? 'bg-gradient-to-r from-rose-500 to-amber-500'
                        : isWarning
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                        : 'bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-400'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(2, vol.used_percent))}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-emerald-500 font-bold">{freeGb} GB Free</span>
                  <span className="opacity-70">{usedGb} GB / {totalGb} GB</span>
                </div>
              </div>

              {/* Real-Time Throughput Grid */}
              <div className="pt-3 border-t border-slate-200 dark:border-white/[0.06] grid grid-cols-2 gap-4 text-xs font-mono">
                <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.04]">
                  <div className="p-1 rounded bg-emerald-500/20 text-emerald-500">
                    <ArrowDown className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-[10px] opacity-60 block font-sans">Read Rate</span>
                    <span className="font-bold">{vol.read_throughput_mbps} MB/s</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.04]">
                  <div className="p-1 rounded bg-cyan-500/20 text-cyan-500">
                    <ArrowUp className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-[10px] opacity-60 block font-sans">Write Rate</span>
                    <span className="font-bold">{vol.write_throughput_mbps} MB/s</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
