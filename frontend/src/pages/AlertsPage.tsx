import React, { useEffect, useState } from 'react';
import { AlertTriangle, ShieldCheck, CheckCircle2, BellRing, Clock, Info } from 'lucide-react';
import { api } from '../services/api';

export const AlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const target = api.getTargetNode();
  const isLinux = target === 'linux';

  useEffect(() => {
    api.getAlerts(target).then(setAlerts).catch(console.error);
    const interval = setInterval(() => {
      api.getAlerts(target).then(setAlerts).catch(console.error);
    }, 5000);
    return () => clearInterval(interval);
  }, [target]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="aiops-card p-6 border-l-4 border-l-rose-500 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400">
                <BellRing className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-extrabold text-white tracking-tight">Active Alerts & Notifications</h2>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                    isLinux
                      ? 'bg-orange-500/10 text-orange-400 border-orange-500/30 shadow-glow-nodeLinux'
                      : 'bg-sky-500/10 text-sky-400 border-sky-500/30 shadow-glow-nodeLocal'
                  }`}>
                    {isLinux ? '🐧 Ubuntu Node (172.16.10.29)' : '💻 Local Workstation (127.0.0.1)'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Threshold breaches, newly discovered apps, and health anomalies dispatched in real-time
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs text-slate-300 bg-obsidian-950/70 px-4 py-2.5 rounded-xl border border-white/[0.08]">
            <span className={`w-2.5 h-2.5 rounded-full ${alerts.length > 0 ? 'bg-rose-500 animate-ping' : 'bg-emerald-400'}`} />
            <span>{alerts.length} Active Notifications</span>
          </div>
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="aiops-card p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-glow-storage">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">All Monitored Targets Operating Normally</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              Zero threshold triggers or abnormal telemetry spikes detected on {isLinux ? 'Ubuntu Linux server' : 'local workstation'}.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {alerts.map((a, idx) => {
            const severity = a.labels?.severity || 'info';
            const isCrit = severity === 'critical';
            const isWarn = severity === 'warning';

            return (
              <div
                key={idx}
                className={`p-5 rounded-2xl border bg-obsidian-900/90 backdrop-blur-md space-y-3 transition-all ${
                  isCrit
                    ? 'border-rose-500/50 shadow-rose-950/30 shadow-lg'
                    : isWarn
                    ? 'border-amber-500/50 shadow-amber-950/20 shadow-md'
                    : 'border-cyan-500/40 shadow-cyan-950/20 shadow-sm'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${
                      isCrit
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                        : isWarn
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                    }`}>
                      {severity}
                    </span>
                    <h3 className="font-extrabold text-sm text-white tracking-wide">{a.labels?.alertname || 'Telemetry Event'}</h3>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>{new Date(a.startsAt).toLocaleTimeString()}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {a.annotations?.description || a.annotations?.summary || 'No description provided.'}
                </p>

                <div className="flex flex-wrap gap-2 pt-3 border-t border-white/[0.06] text-[11px] font-mono">
                  {Object.entries(a.labels || {}).map(([k, v]) => (
                    <span key={k} className="bg-obsidian-950 px-2.5 py-1 rounded-lg text-slate-300 border border-white/[0.06]">
                      <span className="text-slate-500">{k}:</span> {String(v)}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
