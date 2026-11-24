import React, { useEffect, useState } from 'react';
import { LineChart, HardDrive, AlertTriangle, ShieldCheck, CheckCircle2, TrendingUp, Sparkles } from 'lucide-react';
import { PredictionOut } from '../types';
import { api } from '../services/api';

export const PredictionsPage: React.FC = () => {
  const [predictions, setPredictions] = useState<PredictionOut[]>([]);
  const target = api.getTargetNode();
  const isLinux = target === 'linux';

  useEffect(() => {
    api.getPredictions(target).then(setPredictions).catch(console.error);
    const interval = setInterval(() => {
      api.getPredictions(target).then(setPredictions).catch(console.error);
    }, 10000);
    return () => clearInterval(interval);
  }, [target]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="aiops-card p-6 border-l-4 border-l-cyan-500 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="p-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 shadow-glow-memory">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-extrabold text-white tracking-tight">Predictive Capacity Forecasting</h2>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                    isLinux
                      ? 'bg-orange-500/10 text-orange-400 border-orange-500/30 shadow-glow-nodeLinux'
                      : 'bg-sky-500/10 text-sky-400 border-sky-500/30 shadow-glow-nodeLocal'
                  }`}>
                    {isLinux ? '🐧 Ubuntu Node' : '💻 Local Workstation'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Time-series linear regression and runway slope forecasting to anticipate storage and memory exhaustion
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs text-slate-300 bg-obsidian-950/70 px-4 py-2.5 rounded-xl border border-white/[0.08]">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>Linear Runway Slope Active</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {predictions.map((p, idx) => {
          const isCrit = p.status === 'critical';
          const isWarn = p.status === 'warning';

          return (
            <div
              key={idx}
              className={`aiops-card p-6 space-y-4 transition-all duration-300 relative group ${
                isCrit
                  ? 'border-rose-500/50 shadow-rose-950/30'
                  : isWarn
                  ? 'border-amber-500/50 shadow-amber-950/20'
                  : 'hover:border-white/[0.15]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl border ${
                    isCrit
                      ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                      : 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
                  }`}>
                    <LineChart className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-white">{p.resource_type}</h3>
                    <span className="text-[10px] text-slate-400 font-mono">Runway Horizon</span>
                  </div>
                </div>

                <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                  isCrit
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    : isWarn
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                }`}>
                  {p.status}
                </span>
              </div>

              <div className="space-y-2.5 pt-2 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-sans">Current Utilization:</span>
                  <span className="font-extrabold text-white text-sm">{p.current_utilization}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-sans">Hourly Trend Rate:</span>
                  <span className={`font-bold ${p.trend_rate_per_hour > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {p.trend_rate_per_hour > 0 ? `+${p.trend_rate_per_hour}` : p.trend_rate_per_hour} MB/hr
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-sans">Exhaustion Horizon:</span>
                  <span className={`font-extrabold ${isCrit ? 'text-rose-400' : 'text-slate-200'}`}>
                    {p.estimated_exhaustion_days !== null && p.estimated_exhaustion_days !== undefined
                      ? `${p.estimated_exhaustion_days} Days Remaining`
                      : 'Indefinite (> 365 Days)'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-sans">Prediction Confidence:</span>
                  <span className="font-bold text-cyan-400">{Math.round(p.confidence_score * 100)}%</span>
                </div>
              </div>

              <div className="pt-3 border-t border-white/[0.06] text-xs text-slate-300 bg-obsidian-950/80 p-3.5 rounded-xl leading-relaxed font-sans border border-white/[0.04]">
                <strong className="text-slate-200 block text-[11px] uppercase tracking-wider mb-1 font-mono">Forecast Advice:</strong>
                {p.recommendation}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
