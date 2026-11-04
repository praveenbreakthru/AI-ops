import React from 'react';
import { RefreshCw, Clock, Laptop, Moon, Sun } from 'lucide-react';

interface NavbarProps {
  lastUpdated: Date;
  onRefresh: () => void;
  isRefreshing: boolean;
  refreshInterval: number;
  setRefreshInterval: (sec: number) => void;
  status: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  lastUpdated,
  onRefresh,
  isRefreshing,
  refreshInterval,
  setRefreshInterval,
  status
}) => {
  return (
    <header className="h-16 bg-slate-900/60 backdrop-blur-md border-b border-slate-800 px-8 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Laptop className="w-5 h-5 text-blue-400" />
          <span className="font-semibold text-sm text-slate-200">Windows 11 Workstation</span>
        </div>
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium border bg-slate-800/80 border-slate-700">
          <span
            className={`w-2 h-2 rounded-full ${
              status === 'healthy' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-ping'
            }`}
          />
          <span className="capitalize text-slate-300">{status}</span>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-1.5 font-mono">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>Updated: {lastUpdated.toLocaleTimeString()}</span>
        </div>

        <div className="flex items-center gap-2 bg-slate-800 px-2 py-1 rounded-md border border-slate-700">
          <span className="text-slate-400">Auto:</span>
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className="bg-transparent text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value={5} className="bg-slate-900 text-slate-200">5s</option>
            <option value={10} className="bg-slate-900 text-slate-200">10s</option>
            <option value={30} className="bg-slate-900 text-slate-200">30s</option>
            <option value={0} className="bg-slate-900 text-slate-200">Off</option>
          </select>
        </div>

        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700 disabled:opacity-50"
          title="Manual Refresh"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
        </button>
      </div>
    </header>
  );
};

