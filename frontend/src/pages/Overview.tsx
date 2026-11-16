import React from 'react';
import {
  Cpu, HardDrive, Network, Battery,
  Clock, ShieldAlert, Activity, MemoryStick,
  Boxes, Sparkles, Server, Laptop, CheckCircle2, Zap
} from 'lucide-react';
import { SystemOverview } from '../types';
import { StatCard } from '../components/StatCard';
import { GaugeCard } from '../components/GaugeCard';

interface OverviewProps {
  overview: SystemOverview | null;
}

export const Overview: React.FC<OverviewProps> = ({ overview }) => {
  if (!overview) {
    return (
      <div className="flex flex-col items-center justify-center h-80 space-y-3">
        <div className="w-10 h-10 border-2 border-fuchsia-500/30 border-t-fuchsia-400 rounded-full animate-spin" />
        <span className="text-xs font-mono tracking-wider opacity-70">Connecting to telemetry stream...</span>
      </div>
    );
  }

  const { specs } = overview;
  const isLinux = specs.os_name?.toLowerCase().includes('linux') || specs.hostname?.toLowerCase().includes('btubuntu');
  const isWinServer = specs.hostname?.toLowerCase().includes('scomode') || specs.os_name?.toLowerCase().includes('server');

  return (
    <div className="space-y-6">
      {/* Node Hero Card with Triple-Color Accent Banner */}
      <div className="aiops-card p-6 sm:p-7 relative overflow-hidden">
        {/* Top Triple-Color Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-400" />

        {/* Ambient Glow */}
        <div className={`absolute -top-16 -right-16 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-30 ${
          isWinServer ? 'bg-purple-500' : isLinux ? 'bg-orange-500' : 'bg-sky-500'
        }`} />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className={`p-2.5 rounded-2xl border shadow-md ${
                isWinServer
                  ? 'bg-gradient-to-tr from-purple-600/20 to-fuchsia-600/20 text-purple-400 border-purple-500/40'
                  : isLinux
                  ? 'bg-gradient-to-tr from-orange-600/20 to-amber-600/20 text-orange-400 border-orange-500/40'
                  : 'bg-gradient-to-tr from-sky-600/20 to-cyan-600/20 text-sky-400 border-sky-500/40'
              }`}>
                {isLinux || isWinServer ? <Server className="w-6 h-6" /> : <Laptop className="w-6 h-6" />}
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                    {isWinServer
                      ? 'Windows Server Infrastructure Node'
                      : isLinux
                      ? 'Ubuntu Linux Infrastructure Node'
                      : 'Windows Laptop Operations Node'}
                  </h2>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono border uppercase tracking-wider ${
                    isWinServer
                      ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                      : isLinux
                      ? 'bg-orange-500/15 text-orange-400 border-orange-500/30'
                      : 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                  }`}>
                    {isWinServer ? '172.16.10.30 (SCOMODE)' : isLinux ? '172.16.10.29' : '127.0.0.1'}
                  </span>
                </div>
                {/* Concise Spec Pills */}
                <div className="flex items-center gap-2 mt-2 flex-wrap text-xs font-mono opacity-80">
                  <span className="font-semibold">{specs.os_name} {specs.os_version}</span>
                  <span>•</span>
                  <span>{specs.cpu_model}</span>
                  <span>•</span>
                  <span className="text-fuchsia-400 font-bold">{specs.cpu_cores}C / {specs.cpu_logical}T</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <div className="p-3 px-4 rounded-2xl border border-white/[0.08] shadow-sm text-center">
              <span className="text-[10px] opacity-60 block tracking-wider uppercase font-semibold">Uptime</span>
              <span className="text-sm font-black tracking-tight">{overview.uptime_days} Days</span>
            </div>

            <div className="p-3 px-4 rounded-2xl border border-white/[0.08] shadow-sm text-center">
              <span className="text-[10px] opacity-60 block tracking-wider uppercase font-semibold">Power</span>
              <span className="text-sm font-black text-emerald-400 tracking-tight">
                {specs.battery_percent ? `${specs.battery_percent}% Battery` : (isLinux ? 'Server Rack PSU' : 'AC Connected')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stat Cards (Glanceable, Clean, Big Numbers) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="CPU Utilization"
          value={`${overview.cpu_utilization_percent}%`}
          subtitle={`${specs.cpu_cores} Cores Active`}
          icon={Cpu}
          metricTheme="compute"
          badge={overview.cpu_utilization_percent > 85 ? 'High Load' : 'Normal'}
          badgeColor={overview.cpu_utilization_percent > 85 ? 'red' : 'purple'}
        />

        <StatCard
          title={isLinux ? "RAM Consumption" : "Physical Memory"}
          value={`${overview.memory_used_gb} GB`}
          subtitle={`Total: ${overview.memory_total_gb} GB (${overview.memory_utilization_percent}%)`}
          icon={MemoryStick}
          metricTheme="memory"
          badge={overview.memory_utilization_percent > 90 ? 'Critical' : 'Stable'}
          badgeColor={overview.memory_utilization_percent > 90 ? 'red' : 'cyan'}
        />

        <StatCard
          title={isLinux ? "Root Volume (/)" : "System Volume (C:)"}
          value={`${overview.disk_free_c_gb} GB`}
          subtitle={`${overview.disk_free_c_percent}% Available`}
          icon={HardDrive}
          metricTheme="storage"
          badge={overview.disk_free_c_percent < 15 ? 'Low Space' : 'Healthy'}
          badgeColor={overview.disk_free_c_percent < 15 ? 'amber' : 'green'}
        />

        <StatCard
          title="Network Throughput"
          value={`${overview.network_rx_mbps} Mbps`}
          subtitle={`Egress: ${overview.network_tx_mbps} Mbps`}
          icon={Network}
          metricTheme="network"
          badge="Live"
          badgeColor="amber"
        />
      </div>

      {/* Observability Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GaugeCard
          title="CPU Compute Load"
          percentage={overview.cpu_utilization_percent}
          usedLabel={`${overview.cpu_utilization_percent}% Active`}
          totalLabel="100% Target"
          metricTheme="compute"
          thresholdHigh={75}
          thresholdCritical={90}
        />

        <GaugeCard
          title={isLinux ? "RAM Utilization" : "Commit Memory"}
          percentage={overview.memory_utilization_percent}
          usedLabel={`${overview.memory_used_gb} GB In-Use`}
          totalLabel={`${overview.memory_total_gb} GB Total`}
          metricTheme="memory"
          thresholdHigh={80}
          thresholdCritical={92}
        />

        <GaugeCard
          title={isLinux ? "Root Mount Free Space" : "Disk Free Space"}
          percentage={overview.disk_free_c_percent}
          usedLabel={`${overview.disk_free_c_gb} GB Free`}
          totalLabel={`${overview.disk_total_c_gb} GB Capacity`}
          metricTheme="storage"
          colorInverted={true}
        />
      </div>

      {/* Hardware Architecture Overview (Concise & Glanceable) */}
      <div className="aiops-card p-6">
        <div className="flex items-center justify-between mb-4 border-b border-white/[0.06] pb-3">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Activity className="w-4 h-4 text-fuchsia-400" />
            <span>Hardware Architecture & Units</span>
          </h3>
          <span className="text-[10px] font-mono opacity-60 uppercase tracking-widest">
            {specs.os_architecture}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
          <div className="p-4 rounded-xl border border-white/[0.06] shadow-sm">
            <span className="text-[10px] opacity-60 uppercase tracking-wider block mb-1">Processor</span>
            <span className="font-bold line-clamp-1">{specs.cpu_model}</span>
          </div>

          <div className="p-4 rounded-xl border border-white/[0.06] shadow-sm">
            <span className="text-[10px] opacity-60 uppercase tracking-wider block mb-1">Display / GPU</span>
            <span className="font-bold">{specs.gpu_model || (isLinux ? 'Integrated Display Driver' : 'Intel UHD Graphics')}</span>
          </div>

          <div className="p-4 rounded-xl border border-white/[0.06] shadow-sm">
            <span className="text-[10px] opacity-60 uppercase tracking-wider block mb-1">Power Source</span>
            <span className="font-bold text-emerald-400">
              {specs.battery_percent ? `${specs.battery_percent}% Battery` : (isLinux ? 'Server Rack PSU' : 'AC Connected')}
            </span>
          </div>

          <div className="p-4 rounded-xl border border-white/[0.06] shadow-sm">
            <span className="text-[10px] opacity-60 uppercase tracking-wider block mb-1">Thermal Health</span>
            <span className="font-bold text-emerald-400">Nominal • Standard</span>
          </div>
        </div>
      </div>
    </div>
  );
};
