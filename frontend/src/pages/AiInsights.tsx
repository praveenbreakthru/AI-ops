import React, { useEffect, useState } from 'react';
import {
  BrainCircuit, Sparkles, AlertTriangle, ShieldCheck,
  Send, Loader2, Lightbulb, CheckCircle2, MessageSquare,
  HelpCircle, Bot, User, RefreshCw
} from 'lucide-react';
import { AnomalyOut, AiDiagnosisResponse } from '../types';
import { api } from '../services/api';

export const AiInsights: React.FC = () => {
  const [anomalies, setAnomalies] = useState<AnomalyOut[]>([]);
  const [diagnosis, setDiagnosis] = useState<AiDiagnosisResponse | null>(null);
  const [lastQuestion, setLastQuestion] = useState<string | null>(null);
  const [loadingDiag, setLoadingDiag] = useState(false);
  const [contextInput, setContextInput] = useState('');
  const target = api.getTargetNode();
  const isLinux = target === 'linux';

  useEffect(() => {
    api.getAnomalies(target).then(setAnomalies).catch(console.error);
    const interval = setInterval(() => {
      api.getAnomalies(target).then(setAnomalies).catch(console.error);
    }, 10000);
    return () => clearInterval(interval);
  }, [target]);

  const handleAskQuestion = async (queryText?: string) => {
    const questionToAsk = (queryText || contextInput).trim();
    if (!questionToAsk) return;

    setLoadingDiag(true);
    setLastQuestion(questionToAsk);
    try {
      const res = await api.runAiDiagnosis(questionToAsk, target);
      setDiagnosis(res);
      setContextInput('');
    } catch (e: any) {
      alert(`AI Diagnosis failed: ${e.message}`);
    } finally {
      setLoadingDiag(false);
    }
  };

  const quickPrompts = [
    { label: 'Check Jenkins on Linux', query: 'What is Jenkins status and memory usage on Linux server?' },
    { label: 'Check Cisco Packet Tracer', query: 'Is Cisco Packet Tracer installed or downloaded on this laptop?' },
    { label: 'Analyze Memory Bottlenecks', query: 'Analyze current RAM utilization and top memory consuming workloads' },
    { label: 'Diagnose CPU & Load', query: 'Check CPU core utilization and tell me if there are any performance bottlenecks' },
    { label: 'Docker Container Health', query: 'Are there any failing or crash-looping Docker containers?' }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="aiops-card p-6 border-l-4 border-l-fuchsia-500 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-fuchsia-600/20 to-violet-600/20 border border-fuchsia-500/30 text-fuchsia-500 shadow-md">
                <BrainCircuit className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-black tracking-tight">AI Diagnostic Q&A Assistant</h2>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                    isLinux
                      ? 'bg-orange-500/10 text-orange-400 border-orange-500/30'
                      : 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                  }`}>
                    {isLinux ? 'Linux (172.16.10.29)' : 'Local Laptop (127.0.0.1)'}
                  </span>
                </div>
                <p className="text-xs opacity-70 mt-1">
                  Ask any question about running apps, telemetry anomalies, Jenkins, or hardware states
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs px-4 py-2 rounded-xl border border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-500">
            <Sparkles className="w-4 h-4 animate-spin" />
            <span>Telemetry Neural Engine Active</span>
          </div>
        </div>
      </div>

      {/* Interactive Q&A Input Box */}
      <div className="aiops-card p-6 space-y-4 border-fuchsia-500/30 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-fuchsia-500" />
            <h3 className="text-sm font-bold tracking-wide">Ask the AIOps Diagnostic Engine</h3>
          </div>
          <span className="text-[10px] font-mono opacity-60">Press [Enter] or Click Send</span>
        </div>

        {/* Quick Suggestion Pills */}
        <div className="flex flex-wrap gap-2 pt-1">
          {quickPrompts.map((p, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleAskQuestion(p.query)}
              disabled={loadingDiag}
              className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95 flex items-center gap-1.5 bg-slate-100 hover:bg-fuchsia-500/15 border-slate-200 hover:border-fuchsia-500/40 text-slate-700 hover:text-fuchsia-600 dark:bg-slate-900/60 dark:hover:bg-fuchsia-500/20 dark:border-white/[0.08] dark:text-slate-300 dark:hover:text-fuchsia-300 disabled:opacity-50"
            >
              <Lightbulb className="w-3 h-3 text-amber-500 shrink-0" />
              <span>{p.label}</span>
            </button>
          ))}
        </div>

        {/* Question Submission Form */}
        <form
          onSubmit={(e) => { e.preventDefault(); handleAskQuestion(); }}
          className="flex flex-col sm:flex-row gap-2.5 pt-2"
        >
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Ask a question (e.g. 'Is Jenkins running?', 'Why is RAM high?', 'Is Cisco Packet Tracer installed?')..."
              value={contextInput}
              onChange={(e) => setContextInput(e.target.value)}
              disabled={loadingDiag}
              className="w-full pl-4 pr-10 py-3 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-fuchsia-500 transition-all font-mono bg-slate-50 dark:bg-slate-950/80 border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white placeholder-slate-400"
            />
          </div>

          <button
            type="submit"
            disabled={loadingDiag || !contextInput.trim()}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 shrink-0"
          >
            {loadingDiag ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>{loadingDiag ? 'Analyzing Telemetry...' : 'Ask AI'}</span>
          </button>
        </form>

        {/* Answer Display */}
        {diagnosis && (
          <div className="mt-4 p-5 sm:p-6 rounded-2xl border border-fuchsia-500/30 bg-slate-50/80 dark:bg-slate-950/90 space-y-4 animate-in fade-in duration-200">
            {/* Header: User Question & Provider */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-fuchsia-500" />
                <h4 className="font-extrabold text-sm text-fuchsia-600 dark:text-fuchsia-400">
                  {diagnosis.incident_summary}
                </h4>
              </div>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-500 font-bold self-start sm:self-auto">
                Provider: {diagnosis.provider}
              </span>
            </div>

            {lastQuestion && (
              <div className="text-xs p-3 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.06] font-mono">
                <span className="font-bold opacity-60 uppercase text-[10px] block mb-0.5">Your Question:</span>
                <span className="font-semibold">"{lastQuestion}"</span>
              </div>
            )}

            {/* Direct Answer Explanation */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold opacity-60 uppercase tracking-wider block font-mono">
                Diagnostic Answer & Live Evidence
              </span>
              <div className="text-xs leading-relaxed p-4 rounded-xl border border-slate-200 dark:border-white/[0.04] bg-white dark:bg-slate-900/50 whitespace-pre-line font-mono font-medium">
                {diagnosis.technical_explanation}
              </div>
            </div>

            {/* Root Causes & Next Steps Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div className="space-y-2 p-4 rounded-xl border border-rose-500/25 bg-rose-500/5">
                <span className="text-[11px] font-bold text-rose-500 uppercase tracking-wider block font-mono">
                  Identified Key Factors
                </span>
                <ul className="space-y-1.5 text-xs font-sans">
                  {diagnosis.likely_root_causes.map((c, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-rose-500 font-bold">•</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2 p-4 rounded-xl border border-emerald-500/25 bg-emerald-500/5">
                <span className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider block font-mono">
                  Prescribed Action Checklist
                </span>
                <ul className="space-y-1.5 text-xs font-sans">
                  {diagnosis.recommended_troubleshooting_steps.map((s, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-emerald-500 font-bold">✓</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Statistical Outliers / Anomalies */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-4 h-4 text-fuchsia-500" />
            <h3 className="font-bold text-sm tracking-wide">Statistical Metric Outliers (Rolling Window)</h3>
          </div>
          <span className="text-xs opacity-60 font-mono">Filter: 2.5σ Deviation</span>
        </div>

        {anomalies.length === 0 ? (
          <div className="aiops-card p-10 text-center text-xs opacity-80 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <p className="font-bold text-sm">All Monitored Metrics Within Expected Baselines</p>
            <p className="text-[11px] opacity-60">
              No anomalies detected in rolling window across CPU, RAM, Disk I/O, or Network throughput.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {anomalies.map((ano, idx) => (
              <div key={idx} className="aiops-card p-5 space-y-3 border-amber-500/30">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm">{ano.metric_name}</span>
                  <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                    ano.severity === 'critical'
                      ? 'bg-rose-500/20 text-rose-500 border border-rose-500/30'
                      : 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                  }`}>
                    {ano.severity}
                  </span>
                </div>
                <p className="text-xs opacity-80 leading-relaxed">{ano.explanation}</p>
                <div className="flex items-center justify-between text-[11px] opacity-70 font-mono pt-3 border-t border-slate-200 dark:border-white/[0.06]">
                  <span>Current: <strong>{ano.current_value}</strong> (Mean: {ano.baseline_mean})</span>
                  <span className="text-amber-500 font-bold">Deviation: +{ano.z_score}σ</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
