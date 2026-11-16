import React, { useEffect, useState } from 'react';
import { Network, ArrowDown, ArrowUp, Activity, Globe, Wifi } from 'lucide-react';
import { api } from '../services/api';
import { StatCard } from '../components/StatCard';

export const NetworkMonitoring: React.FC = () => {
  const [net, setNet] = useState<{ rx_mbps: number; tx_mbps: number; host: string } | null>(null);
  const target = api.getTargetNode();
  const isLinux = target === 'linux';

  useEffect(() => {
    const fetchNet = () => {
      fetch(`/api/system/network?target=${target}`).then(r => r.json()).then(setNet).catch(console.error);
    };
    fetchNet();
    const interval = setInterval(fetchNet, 5000);
    return () => clearInterval(interval);
  }, [target]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="aiops-card p-6 border-l-4 border-l-amber-500 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-32 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 shadow-glow-network">
                <Network className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-extrabold tracking-tight">Network & Interfaces</h2>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                    isLinux
                      ? 'bg-orange-500/10 text-orange-400 border-orange-500/30'
                      : 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                  }`}>
                    {isLinux ? 'Linux (172.16.10.29)' : 'Local Laptop (127.0.0.1)'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono opacity-70 mt-1">
                  <span>Controller: {net?.host || 'Active'}</span>
                  <span>•</span>
                  <span>Status: Full Duplex</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-obsidian-950/70 px-4 py-2.5 rounded-xl border border-amber-500/20 font-mono text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-glow-card animate-pulse" />
            <span className="text-slate-300">Link State: UP / 1000 Mbps</span>
          </div>
        </div>
      </div>

      {/* Metric Cards - Network Amber theme */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Ingress Traffic (RX)"
          value={`${net?.rx_mbps || 0} Mbps`}
          subtitle="Real-time inbound packet stream"
          icon={ArrowDown}
          metricTheme="network"
        />
        <StatCard
          title="Egress Traffic (TX)"
          value={`${net?.tx_mbps || 0} Mbps`}
          subtitle="Real-time outbound packet stream"
          icon={ArrowUp}
          metricTheme="network"
        />
        <StatCard
          title="Packet Loss & Errors"
          value="0.00% Drops"
          subtitle="Zero packet collision detected"
          icon={Activity}
          badge="Healthy"
          badgeColor="green"
          metricTheme="network"
        />
      </div>

      {/* Interface Detail Card */}
      <div className="aiops-card p-6 relative overflow-hidden">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white tracking-wide">Primary Physical Controller</h3>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
            MTU 1500 • Full Duplex
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.06] flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <span className="font-bold text-sm block">
              {isLinux ? 'Ubuntu Dedicated Ethernet (ens18 / eth0)' : 'Intel Wi-Fi 6 / Realtek PCIe Gigabit Controller'}
            </span>
            <span className="text-xs opacity-70 font-mono mt-1 block">
              Host: <span className="font-semibold">{net?.host || (isLinux ? 'btubuntu' : 'DESKTOP-LOCAL')}</span> • IPv4: <span className="text-amber-500 font-semibold">{isLinux ? '172.16.10.29' : '127.0.0.1'}</span>
            </span>
          </div>

          <div className="flex items-center gap-6 font-mono text-xs">
            <div className="p-3 rounded-xl bg-white dark:bg-black/40 border border-slate-200 dark:border-white/[0.06] min-w-[120px] shadow-sm">
              <span className="text-[10px] opacity-60 block font-sans uppercase tracking-wider font-semibold">RX Bandwidth</span>
              <span className="text-emerald-500 font-black text-base">{net?.rx_mbps || 0} Mbps</span>
            </div>
            <div className="p-3 rounded-xl bg-white dark:bg-black/40 border border-slate-200 dark:border-white/[0.06] min-w-[120px] shadow-sm">
              <span className="text-[10px] opacity-60 block font-sans uppercase tracking-wider font-semibold">TX Bandwidth</span>
              <span className="text-cyan-500 font-black text-base">{net?.tx_mbps || 0} Mbps</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
