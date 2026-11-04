import React, { useEffect, useState } from 'react';
import { Layers, Search } from 'lucide-react';
import { ProcessSummary } from '../types';
import { api } from '../services/api';

export const ProcessMonitoring: React.FC = () => {
  const [processes, setProcesses] = useState<ProcessSummary[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'memory_mb' | 'cpu_percent'>('memory_mb');

  const fetchProcs = () => {
    api.getProcesses(30).then(setProcesses).catch(console.error);
  };

  useEffect(() => {
    fetchProcs();
    const interval = setInterval(fetchProcs, 5000);
    return () => clearInterval(interval);
  }, []);

  const filtered = processes
    .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => b[sortBy] - a[sortBy]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Active Windows Processes</h2>
          <p className="text-xs text-slate-400 mt-1">Resource consumption tracking by executable PID</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search process name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
            <button
              onClick={() => setSortBy('memory_mb')}
              className={`px-2.5 py-1 rounded font-medium ${
                sortBy === 'memory_mb' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              RAM
            </button>
            <button
              onClick={() => setSortBy('cpu_percent')}
              className={`px-2.5 py-1 rounded font-medium ${
                sortBy === 'cpu_percent' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              CPU
            </button>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/60 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">PID</th>
                <th className="py-3 px-4">Process Name</th>
                <th className="py-3 px-4 text-right">CPU Load</th>
                <th className="py-3 px-4 text-right">Memory (Working Set)</th>
                <th className="py-3 px-4 text-right">Handles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filtered.map((proc, idx) => (
                <tr key={`${proc.pid}-${idx}`} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 text-slate-500">{proc.pid || '-'}</td>
                  <td className="py-3 px-4 font-sans font-medium text-slate-200 flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span>{proc.name}</span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className={`px-2 py-0.5 rounded text-[11px] ${
                      proc.cpu_percent > 20 ? 'bg-rose-500/10 text-rose-400 font-bold' : 'text-slate-300'
                    }`}>
                      {proc.cpu_percent}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-slate-200 font-bold">
                    {proc.memory_mb.toFixed(1)} MB
                  </td>
                  <td className="py-3 px-4 text-right text-slate-400">
                    {proc.handles || '-'}
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
