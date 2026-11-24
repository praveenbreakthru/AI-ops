import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  RefreshCw, Clock, ChevronDown, Check, Menu, Sun, Moon,
  LogOut, Search, ChevronLeft, ChevronRight, X, ArrowRight,
  LayoutDashboard, Cpu, HardDrive, Network, MemoryStick,
  Boxes, Layers, Activity, BrainCircuit, AlertTriangle,
  ShieldCheck, LineChart, Terminal, FileText, Settings, Sparkles, Plus, Trash2, Pencil, Database
} from 'lucide-react';
import { MonitoredNode, api } from '../services/api';
import { AddServerModal } from './AddServerModal';
import { EditServerModal } from './EditServerModal';
import { TerminalModal } from './TerminalModal';

interface NavbarProps {
  lastUpdated: Date;
  onRefresh: () => void;
  isRefreshing: boolean;
  refreshInterval: number;
  setRefreshInterval: (sec: number) => void;
  status: string;
  selectedNode: string;
  onNodeChange: (nodeId: string) => void;
  nodes: MonitoredNode[];
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  currentUser?: { username: string; email: string; role: string } | null;
  onLogout?: () => void;
  onNavigate: (tabId: string) => void;
  onRefreshNodes?: () => void;
}

interface SearchItem {
  id: string;
  label: string;
  category: string;
  keywords: string[];
  description: string;
  icon: any;
}

const SEARCH_CATALOG: SearchItem[] = [
  { id: 'overview', label: 'Mission Control', category: 'Core Observability', keywords: ['overview', 'dashboard', 'home', 'summary', 'status', 'mission control'], description: 'Multi-node telemetry overview and system vital signs', icon: LayoutDashboard },
  { id: 'cpu', label: 'CPU & Compute', category: 'Core Observability', keywords: ['cpu', 'processor', 'cores', 'load', 'frequency', 'utilization', 'compute'], description: 'CPU core metrics, frequency profiles & hardware load', icon: Cpu },
  { id: 'memory', label: 'Memory & Swap', category: 'Core Observability', keywords: ['memory', 'ram', 'swap', 'allocated', 'buffer', 'cache', 'working set'], description: 'Physical RAM allocation, committed heap & swap activity', icon: MemoryStick },
  { id: 'disk', label: 'Disk & Storage', category: 'Core Observability', keywords: ['disk', 'storage', 'partition', 'ext4', 'ntfs', 'c drive', 'mount', 'i/o', 'read', 'write'], description: 'Partition capacity, filesystem health & live I/O rates', icon: HardDrive },
  { id: 'network', label: 'Network I/O', category: 'Core Observability', keywords: ['network', 'ethernet', 'wifi', 'throughput', 'bandwidth', 'packets', 'rx', 'tx'], description: 'Active adapters, interface throughput & packet rates', icon: Network },
  { id: 'apps_containers', label: 'Applications & Docker', category: 'Workloads & Runtimes', keywords: ['apps', 'applications', 'docker', 'containers', 'jenkins', 'cisco', 'packet tracer', 'android studio', 'k3s', 'kubernetes', 'pods', 'restart'], description: 'Docker containers, Jenkins, Cisco Packet Tracer & ecosystem', icon: Boxes },
  { id: 'databases', label: 'Database Intelligence', category: 'Workloads & Runtimes', keywords: ['database', 'postgres', 'postgresql', 'mssql', 'sql server', 'queries', 'slow queries', 'mariadb', 'sqlite', 'profiling'], description: 'Internal database query profiler, connection pool vitals & index advisor', icon: Database },
  { id: 'processes', label: 'Processes & Threads', category: 'Workloads & Runtimes', keywords: ['processes', 'threads', 'pid', 'tasks', 'kill', 'priority', 'top'], description: 'Process tree inspector, runtime threads & top CPU/RAM consumers', icon: Layers },
  { id: 'services', label: 'System Daemons', category: 'Workloads & Runtimes', keywords: ['services', 'daemons', 'systemd', 'windows services', 'units', 'status'], description: 'Windows system services and Linux systemd units', icon: Activity },
  { id: 'ai_insights', label: 'AI Diagnostic Engine', category: 'Intelligence & Health', keywords: ['ai', 'diagnostic', 'insights', 'q&a', 'questions', 'neural', 'jenkins status', 'ask', 'troubleshoot'], description: 'Interactive AI diagnostic Q&A for real-time infrastructure troubleshooting', icon: BrainCircuit },
  { id: 'alerts', label: 'Alert Command', category: 'Intelligence & Health', keywords: ['alerts', 'warning', 'critical', 'thresholds', 'notifications', 'alarm'], description: 'Telemetry threshold alerts, anomalies & incident firing feed', icon: AlertTriangle },
  { id: 'incidents', label: 'Incidents & RCA', category: 'Intelligence & Health', keywords: ['incidents', 'rca', 'root cause', 'correlation', 'remediation', 'self heal'], description: 'Automated root cause analysis & one-click self-healing', icon: ShieldCheck },
  { id: 'predictions', label: 'Anomaly Prediction', category: 'Intelligence & Health', keywords: ['predictions', 'forecast', 'capacity', 'runway', 'ml', 'trend'], description: 'Capacity exhaustion models & predictive resource runways', icon: LineChart },
  { id: 'logs', label: 'Telemetry Logs', category: 'Intelligence & Health', keywords: ['logs', 'eventlog', 'journalctl', 'docker logs', 'events', 'audit', 'telemetry'], description: 'Unified live log streaming from Windows EventLog and Linux journalctl', icon: Terminal },
  { id: 'reports', label: 'Executive Reports', category: 'Management', keywords: ['reports', 'pdf', 'executive', 'summary', 'audit', 'export'], description: 'Infrastructure health summaries and executive PDF audits', icon: FileText },
  { id: 'settings', label: 'Settings & Auto-Heal', category: 'Management', keywords: ['settings', 'config', 'auto heal', 'thresholds', 'tuning'], description: 'Autonomous remediation policies and collector intervals', icon: Settings },
];

export const Navbar: React.FC<NavbarProps> = ({
  lastUpdated,
  onRefresh,
  isRefreshing,
  refreshInterval,
  setRefreshInterval,
  status,
  selectedNode,
  onNodeChange,
  nodes,
  sidebarCollapsed,
  onToggleSidebar,
  theme,
  onToggleTheme,
  currentUser,
  onLogout,
  onNavigate,
  onRefreshNodes
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [controlsExpanded, setControlsExpanded] = useState(true);
  const [clearingCache, setClearingCache] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const isLinux = selectedNode === 'linux';
  const isWinServer = selectedNode === 'winserver';
  const isDark = theme === 'dark';

  const currentNode = nodes.find(n => n.id === selectedNode);
  const selectedNodeLabel = (() => {
    if (selectedNode === 'local') return 'LL';
    if (selectedNode === 'linux') return currentNode ? `LS (${currentNode.ip})` : 'LS (172.16.10.29)';
    if (selectedNode === 'winserver') return currentNode ? `WS (${currentNode.ip})` : 'WS (172.16.10.30)';
    if (currentNode) {
      if (currentNode.os === 'linux') return `LS (${currentNode.ip})`;
      if (currentNode.os === 'windows_server') return `WS (${currentNode.ip})`;
      return `${currentNode.name} (${currentNode.ip})`;
    }
    return isWinServer ? 'WS (172.16.10.30)' : isLinux ? 'LS (172.16.10.29)' : 'LL';
  })();
  const selectedNodeIcon = currentNode
    ? (currentNode.os === 'linux' ? '🐧' : currentNode.os === 'windows_server' ? '🖥️' : '💻')
    : isWinServer ? '🖥️' : isLinux ? '🐧' : '💻';

  const handleDeleteNode = async (nodeId: string, nodeName: string) => {
    if (!window.confirm(`Are you sure you want to remove '${nodeName}' from monitoring?`)) return;
    try {
      await api.deleteNode(nodeId);
      if (selectedNode === nodeId) {
        const remaining = nodes.filter(n => n.id !== nodeId);
        if (remaining.length > 0) {
          onNodeChange(remaining[0].id);
        }
      }
      if (onRefreshNodes) {
        onRefreshNodes();
      }
    } catch (e: any) {
      alert(`Failed to delete server: ${e.message}`);
    }
  };

  const handleServerAdded = (newNode: MonitoredNode) => {
    if (onRefreshNodes) {
      onRefreshNodes();
    }
    onNodeChange(newNode.id);
  };

  const handleServerUpdated = () => {
    if (onRefreshNodes) {
      onRefreshNodes();
    }
    onRefresh();
  };

  const handleClearCache = async () => {
    setClearingCache(true);
    try {
      const res = await api.clearCache();
      alert(`✅ ${res.message || 'System telemetry caches cleared successfully! (Redis cache preserved intact)'}`);
      onRefresh();
    } catch (e: any) {
      alert(`Cache clear error: ${e.message}`);
    } finally {
      setClearingCache(false);
    }
  };

  // Filter searchable items based on user query
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return SEARCH_CATALOG.filter(item => {
      return (
        item.label.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.keywords.some(k => k.toLowerCase().includes(q))
      );
    });
  }, [searchQuery]);

  // Reset selected search index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchResults]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut Ctrl+K or / to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.key.toLowerCase() === 'k') || (e.key === '/' && document.activeElement?.tagName !== 'INPUT')) {
        e.preventDefault();
        searchInputRef.current?.focus();
        setSearchFocused(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelectPage = (tabId: string) => {
    onNavigate(tabId);
    setSearchQuery('');
    setSearchFocused(false);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, searchResults.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + searchResults.length) % Math.max(1, searchResults.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (searchResults.length > 0) {
        handleSelectPage(searchResults[selectedIndex]?.id || searchResults[0].id);
      }
    } else if (e.key === 'Escape') {
      setSearchFocused(false);
    }
  };

  return (
    <header className={`h-16 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 backdrop-blur-2xl border-b transition-colors duration-200 ${
      isDark
        ? 'bg-[#0b0e1a]/85 border-white/[0.08] text-slate-100'
        : 'bg-white/90 border-slate-200 text-slate-900 shadow-sm'
    }`}>
      {/* LEFT: Sidebar Toggle Push-Button + Direct Search Bar */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        {/* Push-Button to Toggle Sidebar */}
        <button
          onClick={onToggleSidebar}
          className={`w-9 h-9 rounded-full border transition-all duration-150 flex items-center justify-center shrink-0 shadow-sm ${
            isDark
              ? 'bg-slate-900/80 border-white/[0.1] text-slate-200 hover:bg-white/[0.1] hover:text-white'
              : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
          }`}
          title={sidebarCollapsed ? "Expand Sidebar" : "Hide Sidebar"}
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* SEARCH BAR (Left Side of Header) */}
        <div className="relative flex-1" ref={searchContainerRef}>
          <div className={`relative flex items-center w-full rounded-full border transition-all duration-200 ${
            searchFocused
              ? isDark
                ? 'bg-slate-900 border-fuchsia-500/60 ring-2 ring-fuchsia-500/20 shadow-lg'
                : 'bg-white border-fuchsia-500/60 ring-2 ring-fuchsia-500/20 shadow-md'
              : isDark
                ? 'bg-slate-900/70 border-white/[0.08] hover:border-white/[0.15]'
                : 'bg-slate-100/80 border-slate-200 hover:border-slate-300'
          }`}>
            <Search className="w-4 h-4 text-slate-400 ml-3.5 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchFocused(true);
              }}
              onFocus={() => setSearchFocused(true)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search any page, metric, or action... (Press Enter)"
              className={`w-full py-2 pl-2.5 pr-14 text-xs font-medium rounded-full bg-transparent focus:outline-none placeholder:text-slate-400 ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            />
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="absolute right-3 hidden sm:flex items-center gap-1 font-mono text-[10px] text-slate-400 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded-full">
                <span>Ctrl</span>
                <span>K</span>
              </div>
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {searchFocused && searchQuery.trim().length > 0 && (
            <div className={`absolute left-0 mt-2 w-full max-w-lg rounded-2xl border p-2 z-50 backdrop-blur-2xl shadow-2xl space-y-1 ${
              isDark ? 'bg-slate-900/95 border-white/[0.12] text-slate-100' : 'bg-white border-slate-200 text-slate-900 shadow-xl'
            }`}>
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-white/[0.06] flex items-center justify-between">
                <span>Search Suggestions ({searchResults.length})</span>
                <span className="font-mono text-[9px] text-fuchsia-400">[Enter] to open</span>
              </div>

              {searchResults.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  No matching pages or features found for "{searchQuery}"
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto space-y-1 py-1">
                  {searchResults.map((item, index) => {
                    const Icon = item.icon;
                    const isSelected = index === selectedIndex;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelectPage(item.id)}
                        className={`w-full text-left p-2.5 rounded-xl flex items-center justify-between transition-all text-xs ${
                          isSelected
                            ? 'bg-gradient-to-r from-violet-600/20 via-fuchsia-600/20 to-cyan-500/20 border border-fuchsia-500/40 text-white font-bold'
                            : isDark ? 'hover:bg-white/[0.05] text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 rounded-lg bg-fuchsia-500/10 text-fuchsia-400 shrink-0">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="block font-bold text-xs truncate">{item.label}</span>
                            <span className="text-[10px] text-slate-400 block truncate">{item.description}</span>
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-2" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Round Collapsible Action Controls + Round Arrow Toggle Button (< / >) */}
      <div className="flex items-center gap-2 select-none">
        {/* COLLAPSIBLE GROUP OF ROUND CONTROLS */}
        <div className={`flex items-center gap-2 transition-all duration-300 ${
          controlsExpanded
            ? 'opacity-100 max-w-[850px] overflow-visible'
            : 'opacity-0 max-w-0 overflow-hidden pointer-events-none'
        }`}>
          {/* TARGET NODE DROPDOWN SELECTOR (ROUND PILL) */}
          <div className="relative flex items-center gap-1.5" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border transition-all duration-150 shadow-sm text-xs font-bold ${
                isWinServer || currentNode?.os === 'windows_server'
                  ? 'bg-gradient-to-r from-violet-500/15 to-purple-500/15 border-purple-500/40 text-purple-400 hover:border-purple-400'
                  : isLinux || currentNode?.os === 'linux'
                  ? 'bg-gradient-to-r from-orange-500/15 to-amber-500/15 border-orange-500/40 text-orange-400 hover:border-orange-400'
                  : 'bg-gradient-to-r from-sky-500/15 to-blue-500/15 border-sky-500/40 text-sky-400 hover:border-sky-400'
              }`}
              title="Switch Target Node"
            >
              <span className="text-sm">{selectedNodeIcon}</span>
              <span className="hidden md:inline">
                {selectedNodeLabel}
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {dropdownOpen && (
              <div className={`absolute right-0 top-full mt-2 w-84 rounded-3xl border p-2.5 z-50 backdrop-blur-2xl shadow-2xl space-y-1.5 ${
                isDark ? 'bg-slate-900/95 border-white/[0.12] text-slate-100' : 'bg-white border-slate-200 text-slate-900'
              }`}>
                <div className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border-b flex items-center justify-between ${
                  isDark ? 'border-white/[0.06] text-slate-400' : 'border-slate-100 text-slate-500'
                }`}>
                  <span>Switch Active Node</span>
                  <span className="text-[9px] text-fuchsia-400 font-mono">Live Telemetry</span>
                </div>

                {/* Nodes List */}
                <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
                  {nodes.map((node) => {
                    const isSelected = selectedNode === node.id;
                    const icon = node.os === 'linux' ? '🐧' : node.os === 'windows_server' ? '🖥️' : '💻';
                    return (
                      <div
                        key={node.id}
                        className={`group flex items-center justify-between p-2 rounded-2xl transition-all text-xs ${
                          isSelected
                            ? node.os === 'linux'
                              ? 'bg-orange-500/15 border border-orange-500/40 font-bold'
                              : node.os === 'windows_server'
                              ? 'bg-purple-500/15 border border-purple-500/40 font-bold'
                              : 'bg-sky-500/15 border border-sky-500/40 font-bold'
                            : isDark ? 'hover:bg-white/[0.04] text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <button
                          onClick={() => { onNodeChange(node.id); setDropdownOpen(false); }}
                          className="flex-1 text-left flex items-center gap-2.5 overflow-hidden"
                        >
                          <span className="text-base shrink-0">{icon}</span>
                          <div className="truncate">
                            <span className="block font-semibold truncate flex items-center gap-1.5">
                              {node.id === 'local' || node.is_local
                                ? 'LL'
                                : node.os === 'linux' || node.id === 'linux'
                                ? `LS (${node.ip || '172.16.10.29'})`
                                : node.os === 'windows_server' || node.id === 'winserver'
                                ? `WS (${node.ip || '172.16.10.30'})`
                                : node.name}
                              {node.is_custom && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                  CUSTOM
                                </span>
                              )}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono block truncate">
                              {node.ip} • {node.os_display || (node.os === 'linux' ? 'Ubuntu Linux' : 'Windows Server')}
                            </span>
                          </div>
                        </button>

                        <div className="flex items-center gap-1 ml-2 shrink-0">
                          {isSelected && <Check className="w-4 h-4 text-emerald-400 mr-0.5" />}
                          {/* EDIT BUTTON (for Linux and Windows servers) */}
                          {node.id !== 'local' && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDropdownOpen(false);
                                setEditingNodeId(node.id);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-300 hover:bg-indigo-500/20 transition"
                              title={`Edit ${node.name} Configuration`}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {/* DELETE BUTTON (for all servers, including Local Laptop) */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteNode(node.id, node.name);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 transition"
                            title={`Remove ${node.name} from monitoring`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Bottom Plus Button */}
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    setIsAddModalOpen(true);
                  }}
                  className="w-full mt-2 py-2 px-3 rounded-2xl border border-dashed border-blue-500/40 hover:border-blue-400 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 hover:text-blue-200 font-bold text-xs flex items-center justify-center gap-2 transition active:scale-[0.98] shadow-sm"
                >
                  <Plus className="w-4 h-4 text-blue-400" />
                  <span>Add New Server (IP & Credentials)</span>
                </button>
              </div>
            )}
          </div>

          {/* CACHE CLEAR BUTTON (ROUND PILL) - Replaces Healthy badge */}
          <button
            onClick={handleClearCache}
            disabled={clearingCache}
            className={`px-3.5 py-1.5 rounded-full border transition-all text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50 ${
              isDark
                ? 'bg-rose-500/15 border-rose-500/30 text-rose-300 hover:bg-rose-500/25 hover:border-rose-400'
                : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
            }`}
            title="Clear system telemetry caches (Preserves Redis cache intact)"
          >
            <Sparkles className={`w-3.5 h-3.5 ${clearingCache ? 'animate-spin text-rose-400' : 'text-rose-400'}`} />
            <span>{clearingCache ? 'Clearing...' : 'Clear Cache'}</span>
          </button>

          {/* REMOTE WEB TERMINAL BUTTON (ROUND PILL) */}
          <button
            onClick={() => setTerminalOpen(true)}
            className={`px-3.5 py-1.5 rounded-full border transition-all text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 ${
              isDark
                ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/25 hover:border-cyan-400'
                : 'bg-cyan-50 border-cyan-200 text-cyan-700 hover:bg-cyan-100'
            }`}
            title="Open Live Remote Web Terminal (PowerShell / SSH)"
          >
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Terminal</span>
          </button>

          {/* POLLING RATE SELECTOR (ROUND PILL) */}
          <div className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs ${
            isDark ? 'bg-slate-950/70 border-white/[0.08] text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
          }`}>
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="bg-transparent font-mono text-xs focus:outline-none cursor-pointer font-bold"
            >
              <option value={3} className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>3s</option>
              <option value={5} className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>5s</option>
              <option value={10} className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>10s</option>
              <option value={0} className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>Off</option>
            </select>
          </div>

          {/* REFRESH SWEEP BUTTON (ROUND CIRCLE) */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className={`w-9 h-9 rounded-full border transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center shrink-0 shadow-sm ${
              isDark
                ? 'bg-slate-900/80 border-white/[0.08] text-slate-300 hover:text-white'
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900'
            }`}
            title="Manual Telemetry Sweep"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-fuchsia-400' : ''}`} />
          </button>

          {/* THEME TOGGLE BUTTON (ROUND PILL/CIRCLE) */}
          <button
            onClick={onToggleTheme}
            className={`px-3 py-1.5 rounded-full border transition-all duration-200 flex items-center gap-1.5 font-bold active:scale-95 shadow-sm ${
              isDark
                ? 'bg-slate-900/90 border-amber-500/30 text-amber-400 hover:bg-slate-800'
                : 'bg-slate-100 border-indigo-300 text-indigo-600 hover:bg-slate-200'
            }`}
            title={isDark ? "Switch to Crisp Light Theme" : "Switch to Deep Dark Theme"}
          >
            {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            <span className="text-[11px] hidden sm:inline">{isDark ? 'Light' : 'Dark'}</span>
          </button>

          {/* USER ACCOUNT MENU (ROUND PILL) */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className={`flex items-center gap-1.5 p-1 sm:px-2.5 sm:py-1 rounded-full border transition-all text-xs font-bold ${
                isDark
                  ? 'bg-slate-900/80 border-white/[0.08] hover:border-white/[0.15] text-slate-200'
                  : 'bg-slate-100 border-slate-200 hover:border-slate-300 text-slate-800'
              }`}
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-violet-600 to-cyan-500 flex items-center justify-center text-white text-[10px] font-bold shadow-sm">
                {currentUser?.username?.[0]?.toUpperCase() || 'A'}
              </div>
              <span className="hidden sm:inline">{currentUser?.username || 'admin'}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {userMenuOpen && (
              <div className={`absolute right-0 mt-2 w-48 rounded-3xl border p-2 z-50 backdrop-blur-2xl shadow-2xl space-y-1 ${
                isDark ? 'bg-slate-900/95 border-white/[0.12] text-slate-100' : 'bg-white border-slate-200 text-slate-900'
              }`}>
                <div className="px-3 py-2 border-b border-white/[0.06]">
                  <span className="text-[10px] text-slate-400 block font-mono">Logged in as:</span>
                  <span className="font-bold text-xs truncate block">{currentUser?.username || 'admin'}</span>
                  <span className="text-[10px] text-fuchsia-400 font-mono truncate block">{currentUser?.email || 'admin@gmail.com'}</span>
                </div>

                {onLogout && (
                  <button
                    onClick={() => { setUserMenuOpen(false); onLogout(); }}
                    className="w-full text-left px-3 py-2 rounded-2xl text-xs text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ROUND ARROW BUTTON (< / >) TO COLLAPSE/REVEAL THE ROUND CONTROLS */}
        <button
          onClick={() => setControlsExpanded(!controlsExpanded)}
          className={`w-9 h-9 rounded-full border transition-all duration-200 flex items-center justify-center shrink-0 shadow-md ${
            controlsExpanded
              ? isDark
                ? 'bg-slate-900 border-white/[0.1] text-slate-300 hover:bg-white/[0.08] hover:text-white'
                : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
              : 'bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-500 text-white border-transparent hover:opacity-90 animate-pulse'
          }`}
          title={controlsExpanded ? "Click arrow to hide round header buttons" : "Click arrow to show round header buttons"}
        >
          {controlsExpanded ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* ADD SERVER MODAL */}
      <AddServerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onServerAdded={handleServerAdded}
      />

      {/* EDIT SERVER CONFIGURATION MODAL */}
      <EditServerModal
        isOpen={!!editingNodeId}
        nodeId={editingNodeId}
        onClose={() => setEditingNodeId(null)}
        onServerUpdated={handleServerUpdated}
      />

      {/* EMBEDDED WEB TERMINAL MODAL */}
      <TerminalModal
        isOpen={terminalOpen}
        onClose={() => setTerminalOpen(false)}
        targetNode={selectedNode}
      />
    </header>
  );
};
