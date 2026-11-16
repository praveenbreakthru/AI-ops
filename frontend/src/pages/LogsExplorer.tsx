import React, { useEffect, useState } from 'react';
import { Terminal, Search, Filter, AlertTriangle, AlertCircle, Info, RefreshCw, Cpu } from 'lucide-react';
import { LogEntry } from '../types';
import { api } from '../services/api';

export const LogsExplorer: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [channel, setChannel] = useState<'all' | 'Application' | 'System' | 'journald'>('all');
  const [levelFilter, setLevelFilter] = useState<'all' | 'critical' | 'error' | 'warning' | 'info'>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const target = api.getTargetNode();
  const isLinux = target === 'linux';

  const fetchLogs = () => {
    setLoading(true);
    api.getLogs(channel, 100, target)
      .then(setLogs)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
  }, [channel, target]);

  const filtered = logs.filter(l => {
    if (levelFilter !== 'all' && l.level.toLowerCase() !== levelFilter) return false;
    if (search && !l.message.toLowerCase().includes(search.toLowerCase()) && !l.provider.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="aiops-card p-6 border-l-4 border-l-cyan-500 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="p-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 shadow-glow-memory">
                <Terminal className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-extrabold text-white tracking-tight">
                    {isLinux ? 'Ubuntu journald Syslog Streams' : 'Windows Event Telemetry Logs'}
                  </h2>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                    isLinux
                      ? 'bg-orange-500/10 text-orange-400 border-orange-500/30 shadow-glow-nodeLinux'
                      : 'bg-sky-500/10 text-sky-400 border-sky-500/30 shadow-glow-nodeLocal'
                  }`}>
                    {isLinux ? '🐧 systemd journalctl' : '💻 Windows EventViewer'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  High-speed structured event query engine with multi-channel and severity filtering
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search log messages..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-obsidian-900 border border-white/[0.08] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-52 font-mono"
              />
            </div>

            <select
              value={channel}
              onChange={(e: any) => setChannel(e.target.value)}
              className="bg-obsidian-900 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
            >
              <option value="all">All Channels</option>
              <option value="Application">Application</option>
              <option value="System">System</option>
            </select>

            <select
              value={levelFilter}
              onChange={(e: any) => setLevelFilter(e.target.value)}
              className="bg-obsidian-900 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="error">Error</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>
          </div>
        </div>
      </div>

      {/* Terminal Canvas */}
      <div className="aiops-card overflow-hidden p-4 space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] text-slate-400 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-bold text-white">STREAMING: {filtered.length} Structured Log Events</span>
          </div>
          <span className="text-slate-500">{loading ? 'Querying Buffer...' : 'Synced Real-Time'}</span>
        </div>

        <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
          {filtered.length === 0 ? (
            <div className="py-14 text-center text-slate-500 font-mono">
              No matching log records found for current filter selection.
            </div>
          ) : (
            filtered.map((log, idx) => {
              const lvl = log.level.toLowerCase();
              let badgeColor = 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
              let Icon = Info;

              if (lvl.includes('crit') || lvl.includes('err')) {
                badgeColor = 'text-rose-400 bg-rose-500/15 border-rose-500/30';
                Icon = AlertCircle;
              } else if (lvl.includes('warn')) {
                badgeColor = 'text-amber-400 bg-amber-500/15 border-amber-500/30';
                Icon = AlertTriangle;
              }

              return (
                <div
                  key={`${log.timestamp}-${idx}`}
                  className="p-3.5 rounded-xl bg-obsidian-950/70 border border-white/[0.04] hover:border-cyan-500/30 transition-all space-y-2 group"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${badgeColor}`}>
                        <Icon className="w-3 h-3" />
                        {log.level.toUpperCase()}
                      </span>
                      <span className="text-slate-300 font-bold">{log.channel}</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-slate-400 group-hover:text-cyan-300 transition-colors">{log.provider}</span>
                      <span className="text-slate-500 text-[10px]">(EventID: {log.event_id})</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-slate-300 font-sans text-xs leading-relaxed break-words">
                    {log.message}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
