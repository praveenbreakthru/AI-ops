import React, { useEffect, useState } from 'react';
import { ShieldAlert, CheckCircle2, Clock, FileSearch, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

export const IncidentsPage: React.FC = () => {
  const [incidents, setIncidents] = useState<any[]>([]);
  const target = api.getTargetNode();
  const isLinux = target === 'linux';

  useEffect(() => {
    api.getIncidents(target).then(setIncidents).catch(console.error);
    const interval = setInterval(() => {
      api.getIncidents(target).then(setIncidents).catch(console.error);
    }, 8000);
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
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-extrabold text-white tracking-tight">Incidents & Root Cause Analysis</h2>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                    isLinux
                      ? 'bg-orange-500/10 text-orange-400 border-orange-500/30 shadow-glow-nodeLinux'
                      : 'bg-sky-500/10 text-sky-400 border-sky-500/30 shadow-glow-nodeLocal'
                  }`}>
                    {isLinux ? '🐧 Ubuntu Node (172.16.10.29)' : '💻 Local Workstation (127.0.0.1)'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Correlated telemetry anomalies, post-mortem incident trails, and MTTR lifecycle tracking
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs text-slate-300 bg-obsidian-950/70 px-4 py-2.5 rounded-xl border border-white/[0.08]">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
            <span>{incidents.length} Historical Incidents</span>
          </div>
        </div>
      </div>

      {incidents.length === 0 ? (
        <div className="aiops-card p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 flex items-center justify-center mx-auto shadow-glow-memory">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">No Incidents Recorded</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              Cross-correlated incident lifecycle engine has detected 0 critical breaches requiring automated RCA.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {incidents.map((inc) => (
            <div key={inc.id} className="aiops-card p-6 space-y-4 hover:border-white/[0.15] transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${
                    inc.severity === 'critical'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  }`}>
                    {inc.severity}
                  </span>
                  <h3 className="font-extrabold text-sm text-white tracking-wide">{inc.alert_name}</h3>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold font-mono inline-flex items-center gap-1.5 ${
                  inc.status === 'resolved'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-glow-storage'
                    : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${inc.status === 'resolved' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                  {inc.status.toUpperCase()}
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed font-sans">{inc.summary}</p>
              {inc.description && (
                <div className="p-3 rounded-xl bg-obsidian-950/80 border border-white/[0.04] text-xs text-slate-400 font-mono">
                  {inc.description}
                </div>
              )}

              <div className="pt-3 border-t border-white/[0.06] flex flex-wrap items-center justify-between text-xs text-slate-400 font-mono gap-2">
                <span>Triggered: {new Date(inc.starts_at).toLocaleString()}</span>
                {inc.resolved_at && (
                  <span className="text-emerald-400">Resolved: {new Date(inc.resolved_at).toLocaleString()}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
