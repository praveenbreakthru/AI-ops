import React from 'react';

interface GaugeCardProps {
  title: string;
  percentage: number;
  usedLabel: string;
  totalLabel: string;
  thresholdHigh?: number;
  thresholdCritical?: number;
  colorInverted?: boolean;
  metricTheme?: 'compute' | 'memory' | 'storage' | 'default';
}

export const GaugeCard: React.FC<GaugeCardProps> = ({
  title,
  percentage,
  usedLabel,
  totalLabel,
  thresholdHigh = 75,
  thresholdCritical = 90,
  colorInverted = false,
  metricTheme = 'default'
}) => {
  const safePercent = Math.min(100, Math.max(0, percentage));

  let statusBadge = { label: 'Optimal', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
  let gradientBar = 'from-emerald-500 via-teal-500 to-cyan-400';

  if (!colorInverted) {
    if (safePercent >= thresholdCritical) {
      statusBadge = { label: 'Critical', color: 'bg-rose-500/15 text-rose-400 border-rose-500/30' };
      gradientBar = 'from-rose-500 to-amber-500';
    } else if (safePercent >= thresholdHigh) {
      statusBadge = { label: 'Elevated', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' };
      gradientBar = 'from-amber-500 to-yellow-400';
    } else {
      if (metricTheme === 'compute') gradientBar = 'from-violet-600 via-fuchsia-600 to-cyan-400';
      else if (metricTheme === 'memory') gradientBar = 'from-cyan-500 via-blue-500 to-indigo-500';
      else if (metricTheme === 'storage') gradientBar = 'from-emerald-500 via-teal-500 to-cyan-400';
    }
  } else {
    // Inverted logic (e.g. free disk space where lower is dangerous)
    if (safePercent <= 10) {
      statusBadge = { label: 'Exhaustion', color: 'bg-rose-500/15 text-rose-400 border-rose-500/30' };
      gradientBar = 'from-rose-500 to-amber-500';
    } else if (safePercent <= 20) {
      statusBadge = { label: 'Warning', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' };
      gradientBar = 'from-amber-500 to-yellow-400';
    } else {
      statusBadge = { label: 'Healthy', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
      gradientBar = 'from-emerald-500 via-teal-500 to-cyan-400';
    }
  }

  return (
    <div className="aiops-card p-5 transition-all duration-200">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-bold opacity-75 uppercase tracking-wider font-mono">{title}</span>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBadge.color}`}>
          {statusBadge.label}
        </span>
      </div>

      <div className="flex items-baseline justify-between mb-2">
        <span className="text-3xl font-black font-mono tracking-tight">{safePercent}%</span>
        <span className="text-xs font-mono opacity-70">{usedLabel}</span>
      </div>

      {/* Track */}
      <div className="w-full bg-slate-900/30 dark:bg-black/40 rounded-full h-2.5 overflow-hidden border border-white/[0.08] p-0.5">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${gradientBar} transition-all duration-500`}
          style={{ width: `${Math.max(2, safePercent)}%` }}
        />
      </div>

      <div className="flex justify-between items-center text-[11px] opacity-60 font-mono mt-2">
        <span>Capacity Target</span>
        <span>{totalLabel}</span>
      </div>
    </div>
  );
};
