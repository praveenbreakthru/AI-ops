import React, { useEffect, useState } from 'react';
import { LineChart, HardDrive, AlertTriangle, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { PredictionOut } from '../types';
import { api } from '../services/api';

export const PredictionsPage: React.FC = () => {
  const [predictions, setPredictions] = useState<PredictionOut[]>([]);

  useEffect(() => {
    api.getPredictions().then(setPredictions).catch(console.error);
    const interval = setInterval(() => {
      api.getPredictions().then(setPredictions).catch(console.error);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Predictive Resource Forecasting</h2>
        <p className="text-xs text-slate-400 mt-1">
          Time-series linear regression and Holt-Winters trend modeling to anticipate resource exhaustion
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {predictions.map((p, idx) => {
          const isCrit = p.status === 'critical';
          const isWarn = p.status === 'warning';

          return (
            <div
              key={idx}
              className={`bg-slate-900 border rounded-2xl p-6 space-y-4 shadow-sm ${
                isCrit ? 'border-rose-500/50' : (isWarn ? 'border-amber-500/50' : 'border-slate-800')
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl border ${
                    isCrit ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                  }`}>
                    <LineChart className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">{p.resource_type}</h3>
                    <span className="text-[10px] text-slate-500">Regression Forecast</span>
                  </div>
                </div>

                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  isCrit ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : (
                    isWarn ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  )
                }`}>
                  {p.status}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Current Load:</span>
                  <span className="font-bold text-slate-200">{p.current_utilization}%</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Trend Rate:</span>
                  <span className="font-mono text-slate-300">
                    {p.trend_rate_per_hour > 0 ? `+${p.trend_rate_per_hour}` : p.trend_rate_per_hour} MB/hr
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Exhaustion Horizon:</span>
                  <span className={`font-mono font-bold ${isCrit ? 'text-rose-400' : 'text-slate-200'}`}>
                    {p.estimated_exhaustion_days !== null && p.estimated_exhaustion_days !== undefined
                      ? `${p.estimated_exhaustion_days} Days`
                      : 'Indefinite (> 365d)'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Confidence Score:</span>
                  <span className="font-mono text-blue-400">{Math.round(p.confidence_score * 100)}%</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 text-xs text-slate-300 bg-slate-950/60 p-3 rounded-lg leading-relaxed">
                {p.recommendation}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
