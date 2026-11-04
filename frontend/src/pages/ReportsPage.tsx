import React, { useEffect, useState } from 'react';
import { FileText, Download, Play, FileDown, CheckCircle2 } from 'lucide-react';
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">System Performance Reports</h2>
          <p className="text-xs text-slate-400 mt-1">Exportable audit documentation with PDF and CSV data bundles</p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value="daily">Daily Summary</option>
            <option value="weekly">Weekly Analysis</option>
            <option value="monthly">Monthly Executive</option>
          </select>

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-md shadow-blue-600/30 inline-flex items-center gap-2 disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Compiling Report...' : 'Generate New Report'}
          </button>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 font-bold text-xs text-slate-300">
          Generated Document Archive ({reports.length} files)
        </div>

        {reports.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No reports generated yet. Click "Generate New Report" above to compile a PDF and CSV.
          </div>
        ) : (
          <div className="divide-y divide-slate-800 font-mono text-xs">
            {reports.map((rep, idx) => (
              <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-800/40 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg border ${
                    rep.filename.endsWith('.pdf') ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  }`}>
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-200 block font-sans">{rep.filename}</span>
                    <span className="text-[10px] text-slate-500">Size: {(rep.size_bytes / 1024).toFixed(1)} KB</span>
                  </div>
                </div>

                <a
                  href={`/api/reports/download/${rep.filename}`}
                  download
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs inline-flex items-center gap-1.5 transition-colors font-sans"
                >
                  <Download className="w-3.5 h-3.5" />
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

