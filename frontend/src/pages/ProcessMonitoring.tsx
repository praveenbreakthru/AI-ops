import React, { useEffect, useState } from 'react';
import { Layers, Search, AlertOctagon, RefreshCw, XCircle } from 'lucide-react';
import { ProcessSummary } from '../types';
import { api } from '../services/api';

export const ProcessMonitoring: React.FC = () => {
  const [processes, setProcesses] = useState<ProcessSummary[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'memory_mb' | 'cpu_percent'>('memory_mb');
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const target = api.getTargetNode();
  const isLinux = target === 'linux';

  const fetchProcs = () => {
    api.getProcesses(35, target).then(setProcesses).catch(console.error);
  };

  useEffect(() => {
    fetchProcs();
    const interval = setInterval(fetchProcs, 5000);
    return () => clearInterval(interval);
  }, [target]);

  const handleKill = async (pid: number, name: string) => {
    if (!window.confirm(`Are you sure you want to terminate process "${name}" (PID ${pid})?`)) return;
    try {
      const res = await api.killProcess(pid, target);
      setActionMsg(res.message || `Terminated PID ${pid}`);
      fetchProcs();
      setTimeout(() => setActionMsg(null), 3500);
    } catch (e: any) {
      setActionMsg(`Kill error: ${e.message}`);
    }
  };

  const filtered = processes
    .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => b[sortBy] - a[sortBy]);

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {actionMsg && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center justify-between shadow-lg">
          <span className="font-mono">{actionMsg}</span>
          <button onClick={() => setActionMsg(null)} className="hover:text-white">✕</button>
        </div>
      )}

      {/* Header & Controls */}
      <div className="aiops-card p-6 border-l-4 border-l-violet-500 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="p-2.5 rounded-xl bg-violet-500/15 border border-violet-500/30 text-violet-300 shadow-glow-compute">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-extrabold text-white tracking-tight">
                    {isLinux ? 'Active Linux Server Processes' : 'Active Windows Processes'}
                  </h2>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                    isLinux
                      ? 'bg-orange-500/10 text-orange-400 border-orange-500/30 shadow-glow-nodeLinux'
                      : 'bg-sky-500/10 text-sky-400 border-sky-500/30 shadow-glow-nodeLocal'
                  }`}>
                    {isLinux ? '🐧 Ubuntu Server' : '💻 Local Workstation'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  PID execution tree, working set memory allocation, thread handles, and targeted termination controls
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Filter process name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/[0.08] rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-violet-500 w-52"
              />
            </div>

            <div className="flex bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/[0.08] rounded-xl p-1 text-xs">
              <button
                onClick={() => setSortBy('memory_mb')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  sortBy === 'memory_mb'
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-glow-memory'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                Sort: RAM
              </button>
              <button
                onClick={() => setSortBy('cpu_percent')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  sortBy === 'cpu_percent'
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-glow-compute'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                Sort: CPU
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Process Table */}
      <div className="aiops-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-black/40 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-white/[0.06] uppercase tracking-wider font-semibold font-mono text-[11px]">
              <tr>
                <th className="py-3.5 px-4">PID</th>
                <th className="py-3.5 px-4 font-sans">Process Name</th>
                <th className="py-3.5 px-4 text-right">CPU Load</th>
                <th className="py-3.5 px-4 text-right">RAM (Working Set)</th>
                <th className="py-3.5 px-4 text-right">Handles / Threads</th>
                <th className="py-3.5 px-4 text-right font-sans">Safety Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04] font-mono">
              {filtered.map((proc, idx) => (
                <tr key={`${proc.pid}-${idx}`} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors group">
                  <td className="py-3 px-4 opacity-60 font-bold">{proc.pid || '-'}</td>
                  <td className="py-3 px-4 font-sans font-semibold flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-500 shrink-0">
                      <Layers className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-bold group-hover:text-violet-500 transition-colors">{proc.name}</span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className={`px-2.5 py-0.5 rounded-md font-bold text-[11px] ${
                      proc.cpu_percent > 20
                        ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        : proc.cpu_percent > 5
                        ? 'bg-violet-500/15 text-violet-300 border border-violet-500/20'
                        : 'text-slate-400'
                    }`}>
                      {proc.cpu_percent}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-cyan-300">
                    {proc.memory_mb.toFixed(1)} MB
                  </td>
                  <td className="py-3 px-4 text-right text-slate-400">
                    {proc.handles || '-'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {proc.pid && (
                      <button
                        onClick={() => handleKill(proc.pid, proc.name)}
                        className="px-2.5 py-1 bg-rose-600/15 hover:bg-rose-600/30 text-rose-400 hover:text-rose-200 border border-rose-500/30 rounded-lg text-[10px] font-sans font-bold transition shadow-sm inline-flex items-center gap-1"
                        title="Terminate Process"
                      >
                        <XCircle className="w-3 h-3" />
                        Kill
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
