import React, { useEffect, useState } from 'react';
import { AlertTriangle, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

export const AlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    api.getAlerts().then(setAlerts).catch(console.error);
    const interval = setInterval(() => {
      api.getAlerts().then(setAlerts).catch(console.error);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Active Alerts & Notifications</h2>
        <p className="text-xs text-slate-400 mt-1">Real-time alerts evaluated by Prometheus and dispatched by Alertmanager</p>
      </div>

      {alerts.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">All Monitored Targets Healthy</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Prometheus alerting rules are actively evaluating telemetry. Zero critical or warning thresholds are currently firing.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {alerts.map((a, idx) => {
            const isCrit = a.labels?.severity === 'critical';
            return (
              <div
                key={idx}
                className={`p-5 rounded-xl border bg-slate-900 space-y-3 ${
                  isCrit ? 'border-rose-500/40 shadow-rose-950/20 shadow-lg' : 'border-amber-500/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      isCrit ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {a.labels?.severity || 'warning'}
                    </span>
                    <h3 className="font-bold text-sm text-white">{a.labels?.alertname}</h3>
                  </div>
                  <span className="text-xs font-mono text-slate-500">
                    Active since: {new Date(a.startsAt).toLocaleTimeString()}
                  </span>
                </div>

                <p className="text-xs text-slate-300">
                  {a.annotations?.description || a.annotations?.summary || 'No description provided.'}
                </p>

                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800 text-[11px] font-mono text-slate-400">
                  {Object.entries(a.labels || {}).map(([k, v]) => (
                    <span key={k} className="bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                      {k}: {String(v)}
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
