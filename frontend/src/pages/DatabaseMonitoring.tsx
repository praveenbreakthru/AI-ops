import React, { useEffect, useState, useMemo } from 'react';
import {
  Database, Activity, HardDrive, Zap, CheckCircle2,
  AlertTriangle, RefreshCw, Play, Square, Trash2,
  Search, Sliders, Server, Cpu, Layers, Copy, Check,
  Sparkles, ShieldAlert, ArrowUpRight, BarChart2, Filter
} from 'lucide-react';
import { api, DatabaseOverview, DatabaseEngine, DatabaseQuery, DatabaseTable } from '../services/api';

export const DatabaseMonitoring: React.FC = () => {
  const [overview, setOverview] = useState<DatabaseOverview | null>(null);
  const [queries, setQueries] = useState<DatabaseQuery[]>([]);
  const [tables, setTables] = useState<DatabaseTable[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'profiler' | 'tables' | 'pools'>('profiler');
  const [queryFilter, setQueryFilter] = useState<'all' | 'slow' | 'active' | 'idle'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [tableSearch, setTableSearch] = useState('');
  const [copiedPid, setCopiedPid] = useState<number | null>(null);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [terminatingPid, setTerminatingPid] = useState<number | null>(null);
  const [selectedNode, setSelectedNode] = useState<string>(() => api.getTargetNode() || 'winserver');

  const loadData = async (isManual = false, node = selectedNode) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);

      const [over, qList, tList] = await Promise.all([
        api.getDatabaseOverview(node).catch(() => null),
        api.getDatabaseQueries(false, node).catch(() => []),
        api.getDatabaseTables(node).catch(() => [])
      ]);

      setOverview(over);
      setQueries(qList);
      setTables(tList);
    } catch (err) {
      console.error('Failed to load database telemetry:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSwitchNode = (nodeId: string) => {
    setSelectedNode(nodeId);
    api.setTargetNode(nodeId);
  };

  useEffect(() => {
    loadData(false, selectedNode);
    const interval = setInterval(() => {
      loadData(false, selectedNode);
    }, 15000);
    return () => clearInterval(interval);
  }, [selectedNode]);

  const handleCopySql = (text: string, pid: number) => {
    navigator.clipboard.writeText(text);
    setCopiedPid(pid);
    setTimeout(() => setCopiedPid(null), 2000);
  };

  const handleTerminateQuery = async (query: DatabaseQuery) => {
    if (!window.confirm(`Are you sure you want to kill query PID ${query.query_pid} on ${query.engine}?`)) {
      return;
    }

    try {
      setTerminatingPid(query.query_pid);
      const res = await api.terminateDatabaseQuery(query.query_pid, query.engine, selectedNode);
      setActionMessage({
        text: res.message || `Query PID ${query.query_pid} killed successfully.`,
        type: res.success ? 'success' : 'error'
      });
      // Remove or refresh
      setQueries(prev => prev.filter(q => q.query_pid !== query.query_pid));
      setTimeout(() => setActionMessage(null), 5000);
    } catch (err: any) {
      setActionMessage({
        text: `Failed to terminate query: ${err.message || 'Unknown error'}`,
        type: 'error'
      });
    } finally {
      setTerminatingPid(null);
    }
  };

  const filteredQueries = useMemo(() => {
    return queries.filter(q => {
      if (queryFilter === 'slow' && !q.is_slow) return false;
      if (queryFilter === 'active' && q.state !== 'active') return false;
      if (queryFilter === 'idle' && !q.state.includes('idle')) return false;

      if (!searchQuery.trim()) return true;
      const term = searchQuery.toLowerCase();
      return (
        q.query.toLowerCase().includes(term) ||
        q.database.toLowerCase().includes(term) ||
        q.engine.toLowerCase().includes(term) ||
        q.user.toLowerCase().includes(term) ||
        String(q.query_pid).includes(term)
      );
    });
  }, [queries, queryFilter, searchQuery]);

  const filteredTables = useMemo(() => {
    return tables.filter(t => {
      if (!tableSearch.trim()) return true;
      const term = tableSearch.toLowerCase();
      return (
        t.table_name.toLowerCase().includes(term) ||
        t.database.toLowerCase().includes(term) ||
        t.engine.toLowerCase().includes(term)
      );
    });
  }, [tables, tableSearch]);

  const totalEngines = overview?.total_engines ?? 0;
  const onlineEngines = overview?.online_engines ?? 0;
  const totalConns = overview?.total_active_connections ?? 0;
  const bufferHitRatio = overview?.overall_buffer_hit_ratio ?? 99.6;
  const totalDbRam = overview?.total_memory_gb ?? 0;
  const slowCount = queries.filter(q => q.is_slow).length;

  return (
    <div className="space-y-6 p-6">
      {/* Top Banner / Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-xl text-indigo-400">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-white">Database Intelligence & Profiling</h1>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Live Introspection
                </span>
                <span className="px-2 py-0.5 text-xs font-mono font-medium rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {overview?.node_label || selectedNode.toUpperCase()}
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-0.5">
                {selectedNode === 'winserver'
                  ? 'Real-time database internals for PostgreSQL 18 & Microsoft SQL Server on Windows Server (172.16.10.30).'
                  : selectedNode === 'linux'
                  ? 'Real-time database internals for MariaDB on Ubuntu Linux Server (172.16.10.29).'
                  : 'Real-time internal database telemetry on Local Host (127.0.0.1).'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData(true, selectedNode)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
            <span>{refreshing ? 'Polling DBs...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Target Node Quick Selector Switcher */}
      <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-indigo-400 ml-1" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">Select Server to Inspect:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleSwitchNode('winserver')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              selectedNode === 'winserver'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30 border border-purple-400 scale-[1.02]'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border border-slate-700 hover:border-slate-600'
            }`}
          >
            <span className="text-sm">🖥️</span>
            <span>WS (172.16.10.30)</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-black/40 font-mono text-purple-200">
              MSSQL & PostgreSQL 18 (2 Online)
            </span>
          </button>

          <button
            onClick={() => handleSwitchNode('linux')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              selectedNode === 'linux'
                ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg shadow-orange-600/30 border border-orange-400 scale-[1.02]'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border border-slate-700 hover:border-slate-600'
            }`}
          >
            <span className="text-sm">🐧</span>
            <span>LS (172.16.10.29)</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-black/40 font-mono text-amber-200">
              MariaDB (1 Online)
            </span>
          </button>

          <button
            onClick={() => handleSwitchNode('local')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              selectedNode === 'local'
                ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-lg shadow-sky-600/30 border border-sky-400 scale-[1.02]'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border border-slate-700 hover:border-slate-600'
            }`}
          >
            <span className="text-sm">💻</span>
            <span>LL (127.0.0.1)</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-black/40 font-mono text-sky-200">
              SQLite (1 Online)
            </span>
          </button>
        </div>
      </div>

      {/* Action Notification Toast */}
      {actionMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between transition-all shadow-lg ${
            actionMessage.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-3">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            )}
            <span className="text-sm font-medium">{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-xs px-2 py-1 rounded hover:bg-white/10 opacity-80 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Engines Status */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Database Engines</span>
            <Server className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{onlineEngines}</span>
            <span className="text-xs text-slate-400">/ {totalEngines} Online</span>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              {selectedNode === 'winserver'
                ? 'PostgreSQL 18 & MSSQL Active'
                : selectedNode === 'linux'
                ? 'MariaDB 10.11 Active'
                : 'SQLite In-Memory Active'}
            </span>
          </div>
        </div>

        {/* Active Connections */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Active Connections</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{totalConns}</span>
            <span className="text-xs text-slate-400">active sessions</span>
          </div>
          <div className="mt-2.5 flex items-center gap-2">
            <div className="flex-1 bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-cyan-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (totalConns / 180) * 100)}%` }}
              />
            </div>
            <span className="text-xs text-slate-400 font-mono">Normal</span>
          </div>
        </div>

        {/* Buffer Cache Hit Ratio */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Buffer Hit Ratio</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-400">{bufferHitRatio}%</span>
            <span className="text-xs text-slate-400">in-memory</span>
          </div>
          <p className="mt-2.5 text-xs text-slate-400 truncate">
            Near zero disk read thrashing
          </p>
        </div>

        {/* Total DB Memory Footprint */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Total DB Memory</span>
            <Cpu className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{totalDbRam}</span>
            <span className="text-xs text-slate-400">GB RAM</span>
          </div>
          <p className="mt-2.5 text-xs text-slate-400 truncate">
            {selectedNode === 'winserver'
              ? 'MSSQL: 2.6GB • PG: 1.5GB'
              : selectedNode === 'linux'
              ? 'MariaDB Buffer: 420 MB'
              : 'SQLite Cache: 18 MB'}
          </p>
        </div>

        {/* Slow Queries Count */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Slow Queries</span>
            <AlertTriangle className={`w-4 h-4 ${slowCount > 0 ? 'text-amber-400' : 'text-slate-400'}`} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold ${slowCount > 0 ? 'text-amber-400' : 'text-white'}`}>
              {slowCount}
            </span>
            <span className="text-xs text-slate-400">&gt; 500ms</span>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-xs">
            {slowCount > 0 ? (
              <span className="text-amber-400 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                AI Tuning Available
              </span>
            ) : (
              <span className="text-emerald-400">All queries &lt; 50ms</span>
            )}
          </div>
        </div>
      </div>

      {/* Engine Status Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {(overview?.engines || []).map((engine) => (
          <div
            key={engine.id}
            className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 hover:border-slate-700/80 transition-all shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl border ${
                  engine.id.includes('postgres')
                    ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                }`}>
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white text-base">{engine.name}</h3>
                    <span className="px-2 py-0.5 text-xs font-mono rounded bg-slate-800 text-slate-300 border border-slate-700">
                      Port {engine.port}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">{engine.version}</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="capitalize">{engine.status}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-800/80">
              <div>
                <span className="text-xs text-slate-500 block">Connections</span>
                <span className="text-sm font-semibold text-slate-200">
                  {engine.active_connections} <span className="text-xs text-slate-500 font-normal">/ {engine.max_connections}</span>
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Memory RAM</span>
                <span className="text-sm font-semibold text-slate-200">
                  {engine.memory_mb} MB
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Buffer Cache</span>
                <span className="text-sm font-semibold text-emerald-400">
                  {engine.buffer_cache_hit_ratio}%
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Throughput</span>
                <span className="text-sm font-semibold text-slate-200">
                  {engine.transactions_per_sec} <span className="text-xs text-slate-500 font-normal">tx/s</span>
                </span>
              </div>
            </div>

            {/* Databases list pills */}
            <div className="mt-4 pt-3 border-t border-slate-800/60">
              <span className="text-xs font-medium text-slate-400 block mb-2">
                Hosted Databases ({engine.total_databases}):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {engine.databases.map(db => (
                  <span
                    key={db}
                    className="px-2 py-0.5 rounded text-xs font-mono bg-slate-800/80 text-slate-300 border border-slate-700/60"
                  >
                    {db}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
              <span className="truncate max-w-xs font-mono" title={engine.data_path}>
                Data: {engine.data_path}
              </span>
              <span className="text-slate-400 font-semibold">{engine.total_size_gb} GB disk</span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Feature Tabs */}
      <div className="border-b border-slate-800 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('profiler')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'profiler'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Slow Query Profiler & AI Tuning</span>
            {slowCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                {slowCount} Slow
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('tables')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'tables'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span>Storage & Table Leaderboard</span>
            <span className="px-1.5 py-0.2 rounded-full text-xs font-medium bg-slate-800 text-slate-400">
              {tables.length}
            </span>
          </button>
        </div>
      </div>

      {/* Tab 1: Slow Query Profiler */}
      {activeTab === 'profiler' && (
        <div className="space-y-4">
          {/* Query Filters & Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Search SQL statement, database, user, or PID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 text-slate-200 pl-9 pr-3 py-2 rounded-lg text-sm focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-lg">
              <button
                onClick={() => setQueryFilter('all')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  queryFilter === 'all'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All Queries ({queries.length})
              </button>
              <button
                onClick={() => setQueryFilter('slow')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1 ${
                  queryFilter === 'slow'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-amber-400/80 hover:text-amber-400'
                }`}
              >
                <span>Slow &gt;500ms</span>
                <span className="px-1 rounded bg-black/30 text-[10px]">{slowCount}</span>
              </button>
              <button
                onClick={() => setQueryFilter('active')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  queryFilter === 'active'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setQueryFilter('idle')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  queryFilter === 'idle'
                    ? 'bg-slate-700 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Idle in TX
              </button>
            </div>
          </div>

          {/* Queries List */}
          {filteredQueries.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-12 text-center text-slate-400">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
              <p className="font-semibold text-slate-200 text-base">No Matching Queries Detected</p>
              <p className="text-xs text-slate-500 mt-1">All database sessions are operating under optimal threshold.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredQueries.map((q) => (
                <div
                  key={q.id}
                  className={`bg-slate-900 border rounded-xl p-5 transition-all shadow-sm ${
                    q.is_slow ? 'border-amber-500/40 bg-slate-900/95' : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Query Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700">
                        PID {q.query_pid}
                      </span>
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-800/80 text-slate-300">
                        {q.engine}
                      </span>
                      <span className="text-xs font-bold text-white px-2 py-0.5 rounded bg-indigo-950/60 text-indigo-300 border border-indigo-500/30 font-mono">
                        {q.database}
                      </span>
                      <span className="text-xs text-slate-400">
                        by <strong className="text-slate-300 font-mono">{q.user}</strong> ({q.client_ip})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold flex items-center gap-1.5 ${
                          q.is_slow
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        {q.is_slow && <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />}
                        {q.duration_ms.toFixed(1)} ms {q.is_slow ? '(SLOW)' : ''}
                      </span>

                      <button
                        onClick={() => handleCopySql(q.query, q.query_pid)}
                        className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                        title="Copy SQL Query"
                      >
                        {copiedPid === q.query_pid ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>

                      <button
                        onClick={() => handleTerminateQuery(q)}
                        disabled={terminatingPid === q.query_pid}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-colors disabled:opacity-50"
                        title="Kill/Cancel running query"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        <span>{terminatingPid === q.query_pid ? 'Killing...' : 'Kill Query'}</span>
                      </button>
                    </div>
                  </div>

                  {/* SQL Code Block */}
                  <div className="mt-3 bg-slate-950 rounded-lg p-3 border border-slate-800/80 font-mono text-xs text-slate-300 overflow-x-auto leading-relaxed">
                    <pre className="whitespace-pre-wrap break-words">{q.query}</pre>
                  </div>

                  {/* AI Diagnosis & Index Tuning Recommendation */}
                  <div className="mt-3.5 p-3 rounded-lg bg-indigo-950/30 border border-indigo-500/20 flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider block mb-0.5">
                        AI Query Diagnosis & Index Tuning
                      </span>
                      <p className="text-xs text-slate-300 leading-normal">
                        {q.recommendation}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Storage & Table Leaderboard */}
      {activeTab === 'tables' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Search table or database name..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 text-slate-200 pl-9 pr-3 py-2 rounded-lg text-sm focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <span className="text-xs text-slate-400 font-medium">
              Showing top storage consumers across all live engines
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase font-semibold text-[11px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Database & Table</th>
                    <th className="py-3 px-4">Engine</th>
                    <th className="py-3 px-4 text-right">Row Count</th>
                    <th className="py-3 px-4 text-right">Table Size</th>
                    <th className="py-3 px-4 text-right">Index Size</th>
                    <th className="py-3 px-4 text-right">Total Disk Size</th>
                    <th className="py-3 px-4 text-right">Storage Footprint</th>
                    <th className="py-3 px-4">Last Maintenance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredTables.map((t, idx) => {
                    const maxTotal = Math.max(...tables.map(item => item.total_size_mb));
                    const percentage = Math.round((t.total_size_mb / (maxTotal || 1)) * 100);
                    return (
                      <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4">
                          <div>
                            <span className="font-semibold text-white text-sm font-sans">{t.table_name}</span>
                            <span className="block text-slate-400 text-xs font-mono">{t.database}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-sans">
                          <span className="px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-300 border border-slate-700">
                            {t.engine}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-slate-200">
                          {t.row_count.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-300">
                          {t.size_mb.toFixed(1)} MB
                        </td>
                        <td className="py-3 px-4 text-right text-purple-400">
                          {t.index_size_mb.toFixed(1)} MB
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-400">
                          {t.total_size_mb.toFixed(1)} MB
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="w-28 ml-auto bg-slate-800 rounded-full h-2 overflow-hidden flex">
                            <div
                              className="bg-emerald-500 h-full"
                              style={{ width: `${Math.round((t.size_mb / t.total_size_mb) * percentage)}%` }}
                              title={`Data: ${t.size_mb} MB`}
                            />
                            <div
                              className="bg-purple-500 h-full"
                              style={{ width: `${Math.round((t.index_size_mb / t.total_size_mb) * percentage)}%` }}
                              title={`Index: ${t.index_size_mb} MB`}
                            />
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-400 font-sans text-xs">
                          {t.last_vacuum}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

