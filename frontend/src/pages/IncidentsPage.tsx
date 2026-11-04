import React, { useEffect, useState } from 'react';
import { ShieldAlert, CheckCircle2, Clock, FileSearch } from 'lucide-react';
import { api } from '../services/api';

export const IncidentsPage: React.FC = () => {
  const [incidents, setIncidents] = useState<any[]>([]);

  useEffect(() => {
    api.getIncidents().then(setIncidents).catch(console.error);
    const interval = setInterval(() => {
      api.getIncidents().then(setIncidents).catch(console.error);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Incidents & Root Cause Analysis</h2>
        <p className="text-xs text-slate-400 mt-1">Historical incident timeline, cross-correlated root causes, and resolution status</p>
      </div>

      {incidents.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">No Incidents Recorded</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            The platform automatically records and correlates incident events when Prometheus alert triggers or critical Windows events occur.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {incidents.map((inc) => (
            <div key={inc.id} className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    inc.severity === 'critical' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {inc.severity}
                  </span>
                  <h3 className="font-bold text-sm text-white">{inc.alert_name}</h3>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  inc.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}>
                  {inc.status.toUpperCase()}
                </span>
              </div>

              <p className="text-xs text-slate-300">{inc.summary}</p>
              {inc.description && <p className="text-xs text-slate-500">{inc.description}</p>}

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500 font-mono">
                <span>Triggered: {new Date(inc.starts_at).toLocaleString()}</span>
                {inc.resolved_at && <span>Resolved: {new Date(inc.resolved_at).toLocaleString()}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
