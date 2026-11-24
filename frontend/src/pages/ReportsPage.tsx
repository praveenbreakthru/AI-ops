import React, { useEffect, useState } from 'react';
import { FileText, Download, Play, FileDown, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { api } from '../services/api';

export const ReportsPage: React.FC = () => {
  const [reports, setReports] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [selectedType, setSelectedType] = useState('daily');

  const fetchReports = () => {
    api.listReports().then(setReports).catch(console.error);
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await api.generateReport(selectedType);
      fetchReports();
    } catch (e: any) {
      alert(`Report generation failed: ${e.message}`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="aiops-card p-6 border-l-4 border-l-blue-500 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-300">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-white tracking-tight">Executive Audit Reports</h2>
                <p className="text-xs text-slate-400 mt-1">
                  On-demand and scheduled compliance reports compiled into PDF summaries and CSV telemetry data
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-obsidian-900 border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
            >
              <option value="daily">Daily Health Summary</option>
              <option value="weekly">Weekly Analysis</option>
              <option value="monthly">Monthly Executive Report</option>
            </select>

            <button
              onClick={handleGenerate}
              disabled={generating}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs transition-all shadow-md shadow-blue-600/30 inline-flex items-center gap-2 disabled:opacity-50 active:scale-95"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
              {generating ? 'Compiling Report...' : 'Generate Report'}
            </button>
          </div>
        </div>
      </div>

      {/* Archive Card */}
      <div className="aiops-card overflow-hidden">
        <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <h3 className="font-bold text-xs text-white uppercase tracking-wider">
              Generated Document Archive ({reports.length} files)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">Storage: Local Disk Export</span>
        </div>

        {reports.length === 0 ? (
          <div className="p-14 text-center text-xs text-slate-400 space-y-2">
            <FileDown className="w-8 h-8 text-slate-500 mx-auto" />
            <p className="font-semibold text-slate-300">No reports generated yet</p>
            <p className="text-[11px] text-slate-500">
              Click "Generate Report" above to compile a PDF executive digest and telemetry CSV bundle.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04] font-mono text-xs">
            {reports.map((rep, idx) => (
              <div key={idx} className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl border ${
                    rep.filename.endsWith('.pdf')
                      ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                      : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  }`}>
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-white block font-sans">{rep.filename}</span>
                    <span className="text-[10px] text-slate-400">File Size: {(rep.size_bytes / 1024).toFixed(1)} KB</span>
                  </div>
                </div>

                <a
                  href={`/api/reports/download/${rep.filename}`}
                  download
                  className="px-3.5 py-1.5 rounded-xl bg-obsidian-900 hover:bg-obsidian-800 text-white border border-white/[0.1] text-xs inline-flex items-center gap-1.5 transition-all font-sans font-semibold hover:border-blue-500/40"
                >
                  <Download className="w-3.5 h-3.5 text-blue-400" />
                  Download
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
