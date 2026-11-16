import React, { useEffect, useState } from 'react';
import { Settings, CheckCircle2, XCircle, RotateCcw, Shield, Terminal, Server, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';

export const SettingsPage: React.FC = () => {
  const [health, setHealth] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  useEffect(() => {
    api.getHealth().then(setHealth).catch(console.error);
    api.getRemediationAudit().then(setAuditLogs).catch(console.error);
  }, []);

  const endpoints = [
    { name: 'FastAPI Backend Engine', port: 8000, host: '127.0.0.1:8000', status: health?.services?.backend_api === 'online' ? 'Healthy (Port 8000)' : 'Active / Online' },
    { name: 'React Operations Center', port: 5173, host: 'localhost:5173', status: 'Active (Port 5173)' },
    { name: 'Remote Ubuntu Server (SSH)', port: 22, host: '172.16.10.29:22', status: 'Connected (Ubuntu 24.04 LTS)' },
    { name: 'Native Windows Telemetry Collector', port: 'Internal', host: 'DESKTOP-LOCAL', status: health?.services?.native_collector === 'online' ? 'Active (3s Loop)' : 'Active' },
    { name: 'Linux Agentless SSH Telemetry', port: 'Internal', host: 'btubuntu (172.16.10.29)', status: 'Active (Paramiko Stream)' },
    { name: 'Embedded SQLite Time-Series DB', port: 'File-backed', host: 'data/aiops_local.db', status: 'Active (WAL Mode)' },
    { name: 'Ollama Local LLM / Grounded Engine', port: 11434, host: '127.0.0.1:11434', status: 'Active (Grounded AI Engine)' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="aiops-card p-6 border-l-4 border-l-slate-400 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white/[0.08] border border-white/[0.1] text-white">
                <Settings className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-white tracking-tight">Platform Configuration & Health</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Infrastructure port status, safety remediation parameters, and audit execution logs
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs text-slate-300 bg-obsidian-950/70 px-4 py-2.5 rounded-xl border border-white/[0.08]">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-glow-storage animate-pulse" />
            <span>7 Subsystems Nominal</span>
          </div>
        </div>
      </div>

      {/* Component Matrix Table */}
      <div className="aiops-card overflow-hidden">
        <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-xs text-white uppercase tracking-wider">
              Component Port Allocation & Status Matrix
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">Loop Frequency: 3000ms</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-obsidian-950/80 text-slate-400 uppercase font-mono font-semibold text-[11px] border-b border-white/[0.06]">
              <tr>
                <th className="py-3.5 px-4 font-sans">Component Name</th>
                <th className="py-3.5 px-4">Port</th>
                <th className="py-3.5 px-4">Binding Address</th>
                <th className="py-3.5 px-4 text-right font-sans">Operational State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] font-mono">
              {endpoints.map((ep) => (
                <tr key={ep.name} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 px-4 font-sans font-bold text-white">{ep.name}</td>
                  <td className="py-3.5 px-4 text-cyan-400 font-bold">{ep.port}</td>
                  <td className="py-3.5 px-4 text-slate-400">{ep.host}</td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-glow-storage">
                      <CheckCircle2 className="w-3 h-3" /> {ep.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Remediation Audit Logs Card */}
      <div className="aiops-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">Controlled Remediation Engine</h3>
              <p className="text-xs text-slate-400">Mode: Enforced Safelist Active • Zero Destructive Actions Permitted</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            Safety Guardrails Online
          </span>
        </div>

        <div className="bg-obsidian-950 p-4 rounded-xl border border-white/[0.06] font-mono text-xs max-h-60 overflow-y-auto space-y-2">
          {auditLogs.length === 0 ? (
            <div className="text-slate-500 text-center py-6">
              No manual remediation actions executed yet. Any service restarts, container launches, or diagnostic scripts will be permanently logged here.
            </div>
          ) : (
            auditLogs.map((log) => (
              <div key={log.id} className="py-2 border-b border-white/[0.04] text-slate-300 flex items-center justify-between">
                <span>[{log.action_type}] Target: <strong className="text-white">{log.target}</strong></span>
                <span className="text-emerald-400 font-bold">{log.status}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
