import React, { useEffect, useState } from 'react';
import { Terminal, Search, Filter, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { LogEntry } from '../types';
import { api } from '../services/api';

export const LogsExplorer: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [channel, setChannel] = useState<'all' | 'Application' | 'System'>('all');
  const [levelFilter, setLevelFilter] = useState<'all' | 'critical' | 'error' | 'warning' | 'info'>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchLogs = () => {
    setLoading(true);
    api.getLogs(channel, 100)
      .then(setLogs)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
  }, [channel]);

  const filtered = logs.filter(l => {
    if (levelFilter !== 'all' && l.level.toLowerCase() !== levelFilter) return false;
    if (search && !l.message.toLowerCase().includes(search.toLowerCase()) && !l.provider.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Windows Logs Explorer (Loki)</h2>
          <p className="text-xs text-slate-400 mt-1">Live Windows Event Logs (Application & System) stream</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filter log message or provider..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 w-56"
            />
          </div>

          <select
            value={channel}
            onChange={(e: any) => setChannel(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Channels</option>
            <option value="Application">Application</option>
            <option value="System">System</option>
          </select>

          <select
            value={levelFilter}
            onChange={(e: any) => setLevelFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="error">Error</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>
        </div>
      </div>

      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs overflow-hidden shadow-inner">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-slate-500 text-[11px]">
          <span>STREAMING: {filtered.length} log events</span>
          <span>{loading ? 'Polling Loki...' : 'Up to date'}</span>
        </div>

        <div className="space-y-2 max-h-[550px] overflow-y-auto pr-2">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              No Windows event logs matching the selected filter criteria.
            </div>
          ) : (
            filtered.map((log, idx) => {
              const lvl = log.level.toLowerCase();
              let badgeColor = 'text-blue-400 bg-blue-500/10 border-blue-500/20';
              let Icon = Info;

              if (lvl.includes('crit')) {
                badgeColor = 'text-rose-400 bg-rose-500/10 border-rose-500/20';
                Icon = AlertCircle;
              } else if (lvl.includes('err')) {
                badgeColor = 'text-rose-400 bg-rose-500/10 border-rose-500/20';
                Icon = AlertCircle;
              } else if (lvl.includes('warn')) {
                badgeColor = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
                Icon = AlertTriangle;
              }

              return (
                <div
                  key={`${log.timestamp}-${idx}`}
                  className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border ${badgeColor}`}>
                        <Icon className="w-2.5 h-2.5" />
                        {log.level.toUpperCase()}
                      </span>
                      <span className="text-slate-400 font-semibold">{log.channel}</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-slate-300">{log.provider}</span>
                      <span className="text-slate-500">(EventID: {log.event_id})</span>
                    </div>
                    <span className="text-[10px] text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
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
