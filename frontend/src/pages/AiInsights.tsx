import React, { useEffect, useState } from 'react';
import { BrainCircuit, Sparkles, AlertTriangle, ShieldCheck, Play, Loader2 } from 'lucide-react';
import { AnomalyOut, AiDiagnosisResponse } from '../types';
import { api } from '../services/api';

export const AiInsights: React.FC = () => {
  const [anomalies, setAnomalies] = useState<AnomalyOut[]>([]);
  const [diagnosis, setDiagnosis] = useState<AiDiagnosisResponse | null>(null);
  const [loadingDiag, setLoadingDiag] = useState(false);
  const [contextInput, setContextInput] = useState('');

  useEffect(() => {
    api.getAnomalies().then(setAnomalies).catch(console.error);
    const interval = setInterval(() => {
      api.getAnomalies().then(setAnomalies).catch(console.error);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleRunDiagnosis = async () => {
    setLoadingDiag(true);
    try {
      const res = await api.runAiDiagnosis(contextInput || 'Interactive Operator Telemetry Evaluation');
      setDiagnosis(res);
    } catch (e: any) {
      alert(`Diagnosis failed: ${e.message}`);
    } finally {
      setLoadingDiag(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">AI Insights & Anomaly Detection</h2>
        <p className="text-xs text-slate-400 mt-1">
          Machine Learning (Isolation Forest) & Z-Score anomaly detection coupled with LLM Root Cause Diagnosis
        </p>
      </div>

      {/* Interactive AI Diagnosis Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/40 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">AI Diagnostic Assistant</h3>
              <p className="text-xs text-slate-400">Ground-truth incident correlation powered by Ollama & Telemetry Engine</p>
            </div>
          </div>

          <button
            onClick={handleRunDiagnosis}
            disabled={loadingDiag}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-md shadow-blue-600/30 inline-flex items-center gap-2 disabled:opacity-50"
          >
            {loadingDiag ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {loadingDiag ? 'Analyzing Telemetry...' : 'Generate AI Diagnosis'}
          </button>
        </div>

        <div>
          <input
            type="text"
            placeholder="Optional incident context (e.g. 'Investigating CPU spike after opening Docker')..."
            value={contextInput}
            onChange={(e) => setContextInput(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {diagnosis && (
          <div className="mt-4 p-5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="font-bold text-slate-200 text-sm">{diagnosis.incident_summary}</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Provider: {diagnosis.provider}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Technical Explanation</span>
              <p className="text-slate-300 leading-relaxed font-sans text-xs bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
                {diagnosis.technical_explanation}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Likely Root Causes</span>
                <ul className="space-y-1 text-slate-300">
                  {diagnosis.likely_root_causes.map((c, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-blue-400 mt-0.5">•</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Recommended Next Steps</span>
                <ul className="space-y-1 text-slate-300">
                  {diagnosis.recommended_troubleshooting_steps.map((s, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-emerald-400 mt-0.5">✓</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detected Statistical Anomalies */}
      <div className="space-y-4">
        <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
          <BrainCircuit className="w-4 h-4 text-blue-400" />
          Detected Metric Outliers
        </h3>

        {anomalies.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-xs text-slate-500">
            No statistical or ML anomalies detected in current rolling window. All metrics are within 2.5σ expected baseline.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {anomalies.map((ano, idx) => (
              <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-white">{ano.metric_name}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    ano.severity === 'critical' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {ano.severity}
                  </span>
                </div>
                <p className="text-xs text-slate-300">{ano.explanation}</p>
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-2 border-t border-slate-800">
                  <span>Current: {ano.current_value} (Mean: {ano.baseline_mean})</span>
                  <span>Z-Score: +{ano.z_score}σ</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

