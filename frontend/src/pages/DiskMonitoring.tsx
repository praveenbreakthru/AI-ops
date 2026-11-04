import React, { useEffect, useState } from 'react';
import { HardDrive, ArrowDown, ArrowUp } from 'lucide-react';
import { DiskVolumeInfo } from '../types';
import { api } from '../services/api';

export const DiskMonitoring: React.FC = () => {
  const [volumes, setVolumes] = useState<DiskVolumeInfo[]>([]);

  useEffect(() => {
    api.getDisk().then(setVolumes).catch(console.error);
    const interval = setInterval(() => {
      api.getDisk().then(setVolumes).catch(console.error);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Logical Volume & Disk Storage</h2>
        <p className="text-xs text-slate-400 mt-1">Mounted partitions, free capacity, and real-time read/write throughput</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {volumes.map((vol) => {
          const freeGb = (vol.free_bytes / 1024**3).toFixed(1);
          const totalGb = (vol.total_bytes / 1024**3).toFixed(1);
          const usedGb = ((vol.total_bytes - vol.free_bytes) / 1024**3).toFixed(1);

          return (
            <div key={vol.volume} className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <HardDrive className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Volume {vol.volume}</h3>
                    <p className="text-xs text-slate-500">NTFS Logical Partition</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-slate-200">{vol.used_percent}%</span>
                  <span className="text-[10px] text-slate-500 block uppercase">Used</span>
                </div>
              </div>

              {/* Capacity Bar */}
              <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    vol.used_percent > 90 ? 'bg-rose-500' : (vol.used_percent > 80 ? 'bg-amber-500' : 'bg-blue-500')
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, vol.used_percent))}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>Free: {freeGb} GB</span>
                <span>Used: {usedGb} GB / {totalGb} GB</span>
              </div>

              {/* Throughput */}
              <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-4 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <ArrowDown className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-slate-400">Read:</span>
                  <span className="text-slate-200 font-semibold">{vol.read_throughput_mbps} MB/s</span>
                </div>
                <div className="flex items-center gap-2">
                  <ArrowUp className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-slate-400">Write:</span>
                  <span className="text-slate-200 font-semibold">{vol.write_throughput_mbps} MB/s</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
