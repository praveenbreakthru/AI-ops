import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  badge?: string;
  badgeColor?: 'green' | 'amber' | 'red' | 'blue' | 'purple' | 'cyan';
  metricTheme?: 'compute' | 'memory' | 'storage' | 'network' | 'default';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  badge,
  badgeColor = 'blue',
  metricTheme = 'default'
}) => {
  const badgeClasses = {
    green: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    amber: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    red: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    blue: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    purple: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
    cyan: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
  };

  const themeConfig = {
    compute: {
      border: 'hover:border-violet-500/50',
      iconBg: 'bg-gradient-to-tr from-violet-600/20 to-fuchsia-600/20 text-violet-400 border-violet-500/30',
      accentGlow: 'from-violet-500/15 via-fuchsia-500/10 to-transparent'
    },
    memory: {
      border: 'hover:border-cyan-500/50',
      iconBg: 'bg-gradient-to-tr from-cyan-600/20 to-blue-600/20 text-cyan-400 border-cyan-500/30',
      accentGlow: 'from-cyan-500/15 via-blue-500/10 to-transparent'
    },
    storage: {
      border: 'hover:border-emerald-500/50',
      iconBg: 'bg-gradient-to-tr from-emerald-600/20 to-teal-600/20 text-emerald-400 border-emerald-500/30',
      accentGlow: 'from-emerald-500/15 via-teal-500/10 to-transparent'
    },
    network: {
      border: 'hover:border-amber-500/50',
      iconBg: 'bg-gradient-to-tr from-amber-600/20 to-orange-600/20 text-amber-400 border-amber-500/30',
      accentGlow: 'from-amber-500/15 via-orange-500/10 to-transparent'
    },
    default: {
      border: 'hover:border-blue-500/50',
      iconBg: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      accentGlow: 'from-blue-500/15 to-transparent'
    }
  };

  const currentTheme = themeConfig[metricTheme] || themeConfig.default;

  return (
    <div className={`aiops-card p-5 relative overflow-hidden group transition-all duration-200 ${currentTheme.border}`}>
      {/* Ambient Gradient Glow */}
      <div className={`absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br ${currentTheme.accentGlow} rounded-full blur-2xl pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity`} />

      <div className="flex items-center justify-between mb-3 relative z-10">
        <span className="text-[11px] font-bold opacity-75 uppercase tracking-wider font-mono">{title}</span>
        <div className={`p-2.5 rounded-xl border shadow-sm ${currentTheme.iconBg}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="flex items-baseline justify-between relative z-10">
        <div className="text-2xl sm:text-3xl font-black tracking-tight font-mono">{value}</div>
        {badge && (
          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border shadow-sm ${badgeClasses[badgeColor]}`}>
            {badge}
          </span>
        )}
      </div>

      {subtitle && <p className="mt-1.5 text-xs opacity-70 font-medium relative z-10 truncate">{subtitle}</p>}
    </div>
  );
};
