import React, { useEffect, useState } from 'react';
import { Activity, RotateCcw, CheckCircle, XCircle } from 'lucide-react';
import { ServiceSummary } from '../types';
import { api } from '../services/api';

export const ServicesMonitoring: React.FC = () => {
  const [services, setServices] = useState<ServiceSummary[]>([]);
  const [filter, setFilter] = useState<'all' | 'ok' | 'stopped'>('all');
  const [restarting, setRestarting] = useState<string | null>(null);

  const fetchServices = () => {
    api.getServices(30).then(setServices).catch(console.error);
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleRestart = async (svcName: string) => {
    setRestarting(svcName);
    try {
      const req = await api.requestRemediation('restart_service', svcName, `Operator manually restarted ${svcName}`);
      if (req.id) {
        await api.approveRemediation(req.id);
        alert(`Service '${svcName}' restart triggered successfully.`);
      }
    } catch (e: any) {
      alert(`Restart failed: ${e.message}`);
    } finally {
      setRestarting(null);
      fetchServices();
    }
  };

  const filtered = services.filter(s => {
    if (filter === 'ok') return s.status === 'ok';
    if (filter === 'stopped') return s.status !== 'ok';
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Windows Services Health</h2>
          <p className="text-xs text-slate-400 mt-1">Automatic startup services availability and state management</p>
        </div>
        <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded font-medium ${filter === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
          >
            All ({services.length})
          </button>
          <button
            onClick={() => setFilter('ok')}
            className={`px-3 py-1 rounded font-medium ${filter === 'ok' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
          >
            Running
          </button>
          <button
            onClick={() => setFilter('stopped')}
            className={`px-3 py-1 rounded font-medium ${filter === 'stopped' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
          >
            Stopped
          </button>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-800/60 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold">
            <tr>
              <th className="py-3 px-4">Service Name</th>
              <th className="py-3 px-4">Display Name</th>
              <th className="py-3 px-4">Startup</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {filtered.map((s) => (
              <tr key={s.name} className="hover:bg-slate-800/40 transition-colors">
                <td className="py-3 px-4 font-bold text-slate-200">{s.name}</td>
                <td className="py-3 px-4 font-sans text-slate-400">{s.display_name}</td>
                <td className="py-3 px-4 text-slate-500">{s.start_mode}</td>
                <td className="py-3 px-4">
                  {s.status === 'ok' ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <CheckCircle className="w-3 h-3" /> Running
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                      <XCircle className="w-3 h-3" /> Stopped
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 text-right">
                  <button
                    onClick={() => handleRestart(s.name)}
                    disabled={restarting === s.name}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors inline-flex items-center gap-1 disabled:opacity-50 text-[11px]"
                  >
                    <RotateCcw className={`w-3 h-3 ${restarting === s.name ? 'animate-spin' : ''}`} />
                    Restart
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

