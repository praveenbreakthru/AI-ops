import React from 'react';
import {
  LayoutDashboard, Cpu, HardDrive, Network,
  Layers, Terminal, AlertTriangle, ShieldCheck,
  BrainCircuit, LineChart, FileText, Settings,
  Activity, MemoryStick
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  activeAlerts: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, setCurrentTab, activeAlerts }) => {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'cpu', label: 'CPU Monitoring', icon: Cpu },
    { id: 'memory', label: 'Memory & Swap', icon: MemoryStick },
    { id: 'disk', label: 'Disk & Storage', icon: HardDrive },
    { id: 'network', label: 'Network I/O', icon: Network },
    { id: 'processes', label: 'Processes', icon: Layers },
    { id: 'services', label: 'Windows Services', icon: Activity },
    { id: 'logs', label: 'Logs Explorer', icon: Terminal },
    { id: 'alerts', label: 'Alerts', icon: AlertTriangle, badge: activeAlerts },
    { id: 'incidents', label: 'Incidents & RCA', icon: ShieldCheck },
    { id: 'ai_insights', label: 'AI Insights', icon: BrainCircuit },
    { id: 'predictions', label: 'Predictive Analytics', icon: LineChart },
    { id: 'reports', label: 'Historical Reports', icon: FileText },
    { id: 'settings', label: 'Settings & Control', icon: Settings }
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 min-h-screen">
      <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
          AI
        </div>
        <div>
          <h1 className="font-bold text-sm tracking-wide text-white">Windows AIOps</h1>
          <p className="text-[10px] text-slate-400 font-mono">Platform v1.0</p>
        </div>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                active
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 text-[11px] text-slate-500 space-y-1">
        <div className="flex items-center justify-between">
          <span>Host:</span>
          <span className="text-slate-300 font-mono">DESKTOP-BJOL5Q5</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Engine:</span>
          <span className="text-emerald-400 font-medium">Healthy</span>
        </div>
      </div>
    </aside>
  );
};
