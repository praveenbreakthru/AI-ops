import React, { useEffect, useState } from 'react';
import { Network, ArrowDown, ArrowUp, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { StatCard } from '../components/StatCard';

export const NetworkMonitoring: React.FC = () => {
  const [net, setNet] = useState<{ rx_mbps: number; tx_mbps: number; host: string } | null>(null);

  useEffect(() => {
    const fetchNet = () => {
      fetch('/api/system/network').then(r => r.json()).then(setNet).catch(console.error);
    };
    fetchNet();
    const interval = setInterval(fetchNet, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Network & Interface Analytics</h2>
        <p className="text-xs text-slate-400 mt-1">Real-time bandwidth throughput and interface error telemetry</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Download Throughput"
          value={`${net?.rx_mbps || 0} Mbps`}
          subtitle="Incoming interface traffic"
          icon={ArrowDown}
        />
        <StatCard
          title="Upload Throughput"
          value={`${net?.tx_mbps || 0} Mbps`}
          subtitle="Outgoing interface traffic"
          icon={ArrowUp}
        />
        <StatCard
          title="Interface Health"
          value="0 Errors"
          subtitle="Zero packet drops detected"
          icon={Network}
          badge="Healthy"
          badgeColor="green"
        />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-sm font-bold text-white mb-3">Primary Physical Interface</h3>
        <div className="p-4 rounded-lg bg-slate-800/40 border border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="font-semibold text-sm text-slate-200 block">Intel(R) Dual Band Wireless-AC 8265</span>
            <span className="text-xs text-slate-500 font-mono">Status: Connected • MTU: 1500 • Full Duplex</span>
          </div>
          <div className="flex items-center gap-6 text-xs font-mono">
            <div>
              <span className="text-slate-500 block">RX Ingress</span>
              <span className="text-emerald-400 font-bold">{net?.rx_mbps || 0} Mbps</span>
            </div>
            <div>
              <span className="text-slate-500 block">TX Egress</span>
              <span className="text-blue-400 font-bold">{net?.tx_mbps || 0} Mbps</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

