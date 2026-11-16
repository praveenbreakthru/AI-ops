import React, { useEffect, useState } from 'react';
import {
  Activity, RotateCcw, CheckCircle, XCircle, Cog,
  Loader2, Play, Square, Trash2, Sparkles
} from 'lucide-react';
import { ServiceSummary } from '../types';
import { api } from '../services/api';

export const ServicesMonitoring: React.FC = () => {
  const [services, setServices] = useState<ServiceSummary[]>([]);
  const [filter, setFilter] = useState<'all' | 'ok' | 'stopped'>('all');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const target = api.getTargetNode();
  const isLinux = target === 'linux';
  const isWinServer = target === 'winserver';

  const fetchServices = () => {
    api.getServices(40, target).then(setServices).catch(console.error);
  };

  useEffect(() => {
    fetchServices();
  }, [target]);

  const handleServiceAction = async (action: 'start' | 'stop' | 'restart' | 'delete', svcName: string) => {
    if (action === 'delete') {
      if (!window.confirm(`Are you sure you want to disable and remove service '${svcName}'?`)) return;
    }

    setActionInProgress(`${svcName}-${action}`);
    try {
      let res;
      if (action === 'start') {
        res = await api.startService(svcName, target);
        setActionMessage(res.message || `Service '${svcName}' started successfully.`);
      } else if (action === 'stop') {
        res = await api.stopService(svcName, target);
        setActionMessage(res.message || `Service '${svcName}' stopped.`);
      } else if (action === 'restart') {
        res = await api.restartService(svcName, target);
        setActionMessage(res.message || `Service '${svcName}' restarted.`);
      } else if (action === 'delete') {
        res = await api.deleteService(svcName, target);
        setActionMessage(res.message || `Service '${svcName}' disabled and removed.`);
      }
      setTimeout(() => setActionMessage(null), 5000);
    } catch (e: any) {
      setActionMessage(`Error with ${action}: ${e.message}`);
    } finally {
      setActionInProgress(null);
      fetchServices();
    }
  };

  const filtered = services.filter(s => {
    if (filter === 'ok') return s.status === 'ok' || s.status === 'running';
    if (filter === 'stopped') return s.status !== 'ok' && s.status !== 'running';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="aiops-card p-6 border-l-4 border-l-blue-500 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="p-2.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-300">
                <Cog className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-extrabold text-white tracking-tight">
                    {isWinServer ? 'Windows Server 2016 Services' : isLinux ? 'Linux systemd Daemons' : 'Windows Service Control Manager'}
                  </h2>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                    isWinServer
                      ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                      : isLinux
                      ? 'bg-orange-500/10 text-orange-400 border-orange-500/30'
                      : 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                  }`}>
                    {isWinServer ? '🖥️ SCOMODE Services' : isLinux ? '🐧 systemd Units' : '💻 Local Services'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Full lifecycle supervision: Start, Stop, Restart, and Delete system services
                </p>
              </div>
            </div>
          </div>

          <div className="flex bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/[0.08] rounded-xl p-1 text-xs">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                filter === 'all' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              All ({services.length})
            </button>
            <button
              onClick={() => setFilter('ok')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                filter === 'ok' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Running
            </button>
            <button
              onClick={() => setFilter('stopped')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                filter === 'stopped' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Stopped
            </button>
          </div>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionMessage && (
        <div className="p-3.5 bg-blue-950/80 border border-blue-500/40 text-blue-200 text-xs rounded-2xl flex items-center justify-between shadow-lg backdrop-blur-xl animate-fade-in font-mono">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span>{actionMessage}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-white p-1">✕</button>
        </div>
      )}

      {/* Services Table */}
      <div className="aiops-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-black/40 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-white/[0.06] uppercase tracking-wider font-semibold font-mono text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Service Identifier</th>
                <th className="py-3.5 px-4 font-sans">Description</th>
                <th className="py-3.5 px-4">Startup Mode</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right font-sans">Supervision Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04] font-mono">
              {filtered.map((s) => {
                const isRunning = s.status === 'ok' || s.status === 'running' || s.status === 'Running';
                return (
                  <tr key={s.name} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors group">
                    <td className="py-3.5 px-4 font-bold font-mono group-hover:text-blue-500 transition-colors">
                      {s.name}
                    </td>
                    <td className="py-3.5 px-4 font-sans text-slate-300 max-w-xs truncate">
                      {s.display_name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">{s.start_mode}</td>
                    <td className="py-3.5 px-4">
                      {isRunning ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle className="w-3 h-3" /> ACTIVE / RUNNING
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                          <XCircle className="w-3 h-3" /> STOPPED / INACTIVE
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {!isRunning ? (
                          <button
                            onClick={() => handleServiceAction('start', s.name)}
                            disabled={actionInProgress === `${s.name}-start`}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[10px] font-sans font-bold transition flex items-center gap-1 disabled:opacity-50"
                            title="Start Service"
                          >
                            <Play className="w-3 h-3 fill-emerald-400" /> Start
                          </button>
                        ) : (
                          <button
                            onClick={() => handleServiceAction('stop', s.name)}
                            disabled={actionInProgress === `${s.name}-stop`}
                            className="px-2.5 py-1 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-[10px] font-sans font-bold transition flex items-center gap-1 disabled:opacity-50"
                            title="Stop Service"
                          >
                            <Square className="w-3 h-3" /> Stop
                          </button>
                        )}

                        <button
                          onClick={() => handleServiceAction('restart', s.name)}
                          disabled={actionInProgress === `${s.name}-restart`}
                          className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-[10px] font-sans font-bold transition flex items-center gap-1 disabled:opacity-50"
                          title="Restart Service"
                        >
                          {actionInProgress === `${s.name}-restart` ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <RotateCcw className="w-3 h-3" />
                          )}
                          Restart
                        </button>

                        <button
                          onClick={() => handleServiceAction('delete', s.name)}
                          disabled={actionInProgress === `${s.name}-delete`}
                          className="px-2 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 text-[10px] font-sans font-bold transition flex items-center gap-1 disabled:opacity-50"
                          title="Delete / Disable Service"
                        >
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
