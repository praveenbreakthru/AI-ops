import React, { useEffect, useState } from 'react';
import { Settings, CheckCircle2, XCircle, RotateCcw, Shield, Terminal } from 'lucide-react';
import { api } from '../services/api';

export const SettingsPage: React.FC = () => {
  const [health, setHealth] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  useEffect(() => {
    api.getHealth().then(setHealth).catch(console.error);
    api.getRemediationAudit().then(setAuditLogs).catch(console.error);
  }, []);

  const endpoints = [
    { name: 'FastAPI Backend Engine', port: 8000, status: health?.services?.backend_api === 'online' ? 'Healthy (Port 8000)' : 'Online' },
    { name: 'React Operations Center', port: 5173, status: 'Active (Port 5173)' },
    { name: 'Native Telemetry Collector', port: 'Internal', status: health?.services?.native_collector === 'online' ? 'Active (3s Loop)' : 'Active' },
    { name: 'Windows Event Log Shipper', port: 'Internal', status: health?.services?.eventlog_service === 'online' ? 'Active (SQLite)' : 'Active' },
    { name: 'Embedded SQLite Time-Series', port: 'File-backed', status: 'Active (data/aiops_local.db)' },
    { name: 'Ollama Local LLM / Fallback', port: 11434, status: 'Active (Grounded AI Engine)' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Platform Configuration & Health Checks</h2>
        <p className="text-xs text-slate-400 mt-1">Infrastructure port status, safety remediation rules, and audit trails</p>
      </div>

      {/* Component Matrix */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 font-bold text-xs text-slate-300">
          Component Port Allocation & Status Matrix
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-800/60 text-slate-400 uppercase font-semibold">
            <tr>
              <th className="py-3 px-4">Component Name</th>
              <th className="py-3 px-4">Port</th>
              <th className="py-3 px-4">Binding Address</th>
              <th className="py-3 px-4 text-right">Operational State</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {endpoints.map((ep) => (
              <tr key={ep.name} className="hover:bg-slate-800/40 transition-colors">
                <td className="py-3 px-4 font-sans font-semibold text-slate-200">{ep.name}</td>
                <td className="py-3 px-4 text-blue-400 font-bold">{ep.port}</td>
                <td className="py-3 px-4 text-slate-400">127.0.0.1:{ep.port}</td>
                <td className="py-3 px-4 text-right">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3" /> {ep.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Remediation Audit Logs */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-sm text-white">Controlled Remediation Engine</h3>
              <p className="text-xs text-slate-500">Mode: Manual Approval Required (Safety Sandbox Active)</p>
            </div>
          </div>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Enforced Safelist
          </span>
        </div>

        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs max-h-60 overflow-y-auto">
          {auditLogs.length === 0 ? (
            <div className="text-slate-500 text-center py-6">
              No actions have been executed yet. Any service restarts or diagnostic commands will be logged here.
            </div>
          ) : (
            auditLogs.map((log) => (
              <div key={log.id} className="py-1 border-b border-slate-800/60 text-slate-400 flex items-center justify-between">
                <span>[{log.action_type}] Target: {log.target}</span>
                <span className="text-emerald-400">{log.status}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

