import React from 'react';
import {
  LayoutDashboard, Cpu, HardDrive, Network,
  Layers, Terminal, AlertTriangle, ShieldCheck,
  BrainCircuit, LineChart, FileText, Settings,
  Activity, MemoryStick, Boxes, Sparkles, ChevronRight,
  PanelLeftClose, X, Database
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  activeAlerts: number;
  collapsed: boolean;
  onToggleCollapse: () => void;
  theme: 'dark' | 'light';
}

interface NavSection {
  title: string;
  items: {
    id: string;
    label: string;
    icon: any;
    badge?: number | string;
    badgeColor?: string;
    accentColor: string;
  }[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  activeAlerts,
  collapsed,
  onToggleCollapse,
  theme
}) => {
  const isDark = theme === 'dark';

  const sections: NavSection[] = [
    {
      title: 'CORE OBSERVABILITY',
      items: [
        { id: 'overview', label: 'Mission Control', icon: LayoutDashboard, accentColor: 'text-cyan-400' },
        { id: 'cpu', label: 'CPU & Compute', icon: Cpu, accentColor: 'text-violet-400' },
        { id: 'memory', label: 'Memory & Swap', icon: MemoryStick, accentColor: 'text-cyan-400' },
        { id: 'disk', label: 'Disk & Storage', icon: HardDrive, accentColor: 'text-emerald-400' },
        { id: 'network', label: 'Network I/O', icon: Network, accentColor: 'text-amber-400' }
      ]
    },
    {
      title: 'WORKLOADS & RUNTIMES',
      items: [
        { id: 'apps_containers', label: 'Applications & Docker', icon: Boxes, badge: 'Live', badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', accentColor: 'text-sky-400' },
        { id: 'databases', label: 'Database Intelligence', icon: Database, badge: 'PG/SQL', badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30', accentColor: 'text-indigo-400' },
        { id: 'processes', label: 'Processes & Threads', icon: Layers, accentColor: 'text-slate-400' },
        { id: 'services', label: 'System Daemons', icon: Activity, accentColor: 'text-teal-400' }
      ]
    },
    {
      title: 'INTELLIGENCE & HEALTH',
      items: [
        { id: 'ai_insights', label: 'AI Diagnostic Engine', icon: BrainCircuit, badge: 'AI', badgeColor: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30', accentColor: 'text-fuchsia-400' },
        { id: 'alerts', label: 'Alert Command', icon: AlertTriangle, badge: activeAlerts, badgeColor: 'bg-rose-500 text-white font-bold', accentColor: 'text-rose-400' },
        { id: 'incidents', label: 'Incidents & RCA', icon: ShieldCheck, accentColor: 'text-indigo-400' },
        { id: 'predictions', label: 'Anomaly Prediction', icon: LineChart, accentColor: 'text-purple-400' },
        { id: 'logs', label: 'Telemetry Logs', icon: Terminal, accentColor: 'text-emerald-400' }
      ]
    },
    {
      title: 'MANAGEMENT',
      items: [
        { id: 'reports', label: 'Executive Reports', icon: FileText, accentColor: 'text-slate-400' },
        { id: 'settings', label: 'Settings & Auto-Heal', icon: Settings, accentColor: 'text-slate-400' }
      ]
    }
  ];

  return (
    <aside
      className={`shrink-0 flex flex-col transition-all duration-300 ease-in-out z-30 select-none ${
        collapsed
          ? 'w-0 m-0 opacity-0 pointer-events-none -translate-x-8 overflow-hidden'
          : 'w-64 my-3 ml-3 opacity-100 translate-x-0'
      } ${
        isDark
          ? 'bg-[#0e1222]/90 backdrop-blur-2xl border border-white/[0.1] text-slate-100 shadow-2xl shadow-black/60'
          : 'bg-white/95 backdrop-blur-2xl border border-slate-200 text-slate-900 shadow-xl shadow-slate-300/40'
      } rounded-3xl h-[calc(100vh-1.5rem)] sticky top-3 overflow-hidden`}
    >
      {/* Brand & Push-Button Header */}
      <div className={`h-16 flex items-center justify-between px-4 border-b ${
        isDark ? 'border-white/[0.07] bg-slate-950/60' : 'border-slate-200 bg-slate-50/80'
      }`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 via-fuchsia-600 to-cyan-500 flex items-center justify-center font-black text-white shadow-md shadow-fuchsia-950/30 ring-1 ring-white/20">
            <Sparkles className="w-4 h-4 fill-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm tracking-tight truncate">Hybrid AIOps</span>
              <span className="text-[9px] px-1 py-0.2 rounded font-mono font-bold bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/30">2.0</span>
            </div>
            <p className={`text-[10px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Multi-Node Control
            </p>
          </div>
        </div>

        {/* Push-Button to Hide Sidebar */}
        <button
          onClick={onToggleCollapse}
          className={`p-1.5 rounded-lg transition-colors ${
            isDark ? 'text-slate-400 hover:text-white hover:bg-white/[0.08]' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
          }`}
          title="Push to Hide Sidebar"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 py-3 px-3 space-y-4 overflow-y-auto">
        {sections.map((sec) => (
          <div key={sec.title} className="space-y-1">
            <div className={`px-3 pb-1 text-[10px] font-bold uppercase tracking-widest font-mono ${
              isDark ? 'text-slate-500' : 'text-slate-400'
            }`}>
              {sec.title}
            </div>
            {sec.items.map((item) => {
              const Icon = item.icon;
              const active = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentTab(item.id)}
                  className={`group w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-medium transition-all duration-150 ${
                    active
                      ? 'bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-500 text-white shadow-lg shadow-fuchsia-950/40 ring-1 ring-white/20 font-bold'
                      : isDark
                      ? 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <div className={`p-1 rounded-lg transition-colors ${active ? 'bg-white/20 text-white' : item.accentColor}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="truncate">{item.label}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    {item.badge !== undefined && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold border ${item.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'}`}>
                        {item.badge}
                      </span>
                    )}
                    {active && <ChevronRight className="w-3 h-3 text-white/80" />}
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom Status Dock */}
      <div className={`p-3 border-t ${
        isDark ? 'border-white/[0.07] bg-slate-950/60' : 'border-slate-200 bg-slate-50'
      }`}>
        <div className={`p-2.5 rounded-xl border flex items-center justify-between text-[11px] ${
          isDark ? 'bg-slate-900/60 border-white/[0.06]' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-semibold text-xs">Autonomous Core</span>
          </div>
          <span className="text-emerald-500 font-mono text-[10px] font-bold">ONLINE</span>
        </div>
      </div>
    </aside>
  );
};
