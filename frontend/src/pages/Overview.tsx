import React from 'react';
import {
  Cpu, HardDrive, Network, Battery,
  Clock, ShieldAlert, Activity, MemoryStick
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
      <div className="flex items-center justify-center h-64 text-slate-400 animate-pulse text-sm">
        Gathering live telemetry from Windows Host...
      </div>
    );
  }

  const { specs } = overview;

  return (
    <div className="space-y-6">
      {/* Top Header Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">System Status Dashboard</h2>
          <p className="text-xs text-slate-400 mt-1">
            {specs.hostname} • {specs.os_name} {specs.os_version} ({specs.os_architecture})
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Uptime</span>
            <span className="text-sm font-semibold text-slate-200">{overview.uptime_days} Days</span>
          </div>
          <div className="h-8 w-px bg-slate-800" />
          <div className="text-right">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Battery</span>
            <span className="text-sm font-semibold text-emerald-400">
              {specs.battery_percent ? `${specs.battery_percent}%` : 'AC Power'}
            </span>
          </div>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="CPU Utilization"
          value={`${overview.cpu_utilization_percent}%`}
          subtitle={`${specs.cpu_cores} Cores / ${specs.cpu_logical} Threads`}
          icon={Cpu}
          badge={overview.cpu_utilization_percent > 85 ? 'High' : 'Normal'}
          badgeColor={overview.cpu_utilization_percent > 85 ? 'red' : 'green'}
        />

        <StatCard
          title="Memory Consumption"
          value={`${overview.memory_used_gb} GB`}
          subtitle={`Total: ${overview.memory_total_gb} GB (${overview.memory_utilization_percent}%)`}
          icon={MemoryStick}
          badge={overview.memory_utilization_percent > 90 ? 'Critical' : 'Stable'}
          badgeColor={overview.memory_utilization_percent > 90 ? 'red' : 'green'}
        />

        <StatCard
          title="Disk Free (C:)"
          value={`${overview.disk_free_c_gb} GB`}
          subtitle={`${overview.disk_free_c_percent}% available space`}
          icon={HardDrive}
          badge={overview.disk_free_c_percent < 15 ? 'Low' : 'Healthy'}
          badgeColor={overview.disk_free_c_percent < 15 ? 'amber' : 'green'}
        />

        <StatCard
          title="Network Ingress"
          value={`${overview.network_rx_mbps} Mbps`}
          subtitle={`Egress: ${overview.network_tx_mbps} Mbps`}
          icon={Network}
          badge="Active"
          badgeColor="blue"
        />
      </div>

      {/* Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GaugeCard
          title="CPU Core Load"
          percentage={overview.cpu_utilization_percent}
          usedLabel={`${overview.cpu_utilization_percent}% Used`}
          totalLabel="100% Max"
          thresholdHigh={75}
          thresholdCritical={90}
        />

        <GaugeCard
          title="RAM Utilization"
          percentage={overview.memory_utilization_percent}
          usedLabel={`${overview.memory_used_gb} GB Used`}
          totalLabel={`${overview.memory_total_gb} GB Total`}
          thresholdHigh={80}
          thresholdCritical={92}
        />

        <GaugeCard
          title="Disk C: Free Capacity"
          percentage={overview.disk_free_c_percent}
          usedLabel={`${overview.disk_free_c_gb} GB Free`}
          totalLabel={`${overview.disk_total_c_gb} GB Total`}
          colorInverted={true}
        />
      </div>

      {/* Hardware & Sensor Diagnostics */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-400" />
          Hardware & Sensor Subsystems
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/60">
            <span className="text-slate-500 block mb-1">Processor Model</span>
            <span className="font-semibold text-slate-200">{specs.cpu_model}</span>
          </div>
          <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/60">
            <span className="text-slate-500 block mb-1">GPU Accelerator</span>
            <span className="font-semibold text-slate-200">{specs.gpu_model || 'Intel UHD Graphics 620'}</span>
          </div>
          <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/60">
            <span className="text-slate-500 block mb-1">Battery Health</span>
            <span className="font-semibold text-slate-200">
              {specs.battery_percent ? `${specs.battery_percent}% (${specs.battery_runtime_min || '~'} min)` : 'AC Mains Connected'}
            </span>
          </div>
          <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/60">
            <span className="text-slate-500 block mb-1">Thermal Zone Sensor</span>
            <span className={`font-semibold ${specs.sensor_thermal_supported ? 'text-emerald-400' : 'text-slate-400'}`}>
              {specs.sensor_thermal_supported ? 'Operational' : 'Unsupported on this ACPI bios'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

