import React from 'react';

interface GaugeCardProps {
  title: string;
  percentage: number;
  usedLabel: string;
  totalLabel: string;
  thresholdHigh?: number;
  thresholdCritical?: number;
  colorInverted?: boolean;
}

export const GaugeCard: React.FC<GaugeCardProps> = ({
  title,
  percentage,
  usedLabel,
  totalLabel,
  thresholdHigh = 75,
  thresholdCritical = 90,
  colorInverted = false
}) => {
  let barColor = 'bg-blue-500';

  if (!colorInverted) {
    if (percentage >= thresholdCritical) barColor = 'bg-rose-500';
    else if (percentage >= thresholdHigh) barColor = 'bg-amber-500';
    else barColor = 'bg-emerald-500';
  } else {
    // For free space where low is bad
    if (percentage <= 10) barColor = 'bg-rose-500';
    else if (percentage <= 20) barColor = 'bg-amber-500';
    else barColor = 'bg-emerald-500';
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-slate-400">{title}</span>
        <span className="text-sm font-bold text-white">{percentage}%</span>
      </div>

      <div className="w-full bg-slate-800 rounded-full h-2 mb-3 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
        <span>{usedLabel}</span>
        <span>{totalLabel}</span>
      </div>
    </div>
  );
};

