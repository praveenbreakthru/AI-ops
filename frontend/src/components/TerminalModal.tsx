import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Terminal, X, CornerDownLeft, Trash2, Play, Loader2, Sparkles, Server } from 'lucide-react';
import { api } from '../services/api';

interface TerminalModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetNode: string;
}

interface CommandLog {
  id: string;
  command: string;
  output: string;
  exitCode: number;
  latencyMs: number;
  timestamp: string;
}

export const TerminalModal: React.FC<TerminalModalProps> = ({
  isOpen,
  onClose,
  targetNode: initialTargetNode
}) => {
  const [targetNode, setTargetNode] = useState(initialTargetNode);
  const [command, setCommand] = useState('');
  const [history, setHistory] = useState<CommandLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [commandList, setCommandList] = useState<string[]>([]);

  const outputEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTargetNode(initialTargetNode);
  }, [initialTargetNode]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    outputEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, isLoading]);

  if (!isOpen) return null;

  const nodeLabel = (() => {
    if (targetNode === 'winserver') return 'WS (172.16.10.30) • Windows Server PowerShell';
    if (targetNode === 'linux') return 'LS (172.16.10.29) • Ubuntu Linux SSH Shell';
    return 'LL (127.0.0.1) • Local Workstation PowerShell';
  })();

  const promptSymbol = targetNode === 'linux' ? '$' : 'PS C:\\>';

  const quickCommands = targetNode === 'winserver' ? [
    { label: 'IIS Status', cmd: 'iisreset /status' },
    { label: 'Top 5 CPU Procs', cmd: 'Get-Process | Sort-Object CPU -Descending | Select-Object -First 5 -Property Name, CPU, WorkingSet64' },
    { label: 'Disk Space', cmd: 'Get-PSDrive -PSProvider FileSystem | Select-Object Name, Used, Free' },
    { label: 'Running Services', cmd: 'Get-Service | Where-Object Status -eq "Running" | Select-Object -First 8 Name, DisplayName' }
  ] : targetNode === 'linux' ? [
    { label: 'Docker Containers', cmd: 'docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"' },
    { label: 'Memory Free', cmd: 'free -h' },
    { label: 'Disk Usage', cmd: 'df -h /' },
    { label: 'K8s Pods', cmd: 'sudo k3s kubectl get pods -A' }
  ] : [
    { label: 'Local Memory', cmd: 'Get-CimInstance Win32_OperatingSystem | Select-Object TotalVisibleMemorySize, FreePhysicalMemory' },
    { label: 'Top 5 Procs', cmd: 'Get-Process | Sort-Object CPU -Descending | Select-Object -First 5 Name, CPU' },
    { label: 'Active IP Ports', cmd: 'netstat -ano | Select-String "LISTENING" | Select-Object -First 6' }
  ];

  const handleRunCommand = async (cmdToRun?: string) => {
    const rawCmd = (cmdToRun || command).trim();
    if (!rawCmd || isLoading) return;

    setIsLoading(true);
    setCommand('');
    setCommandList(prev => [...prev, rawCmd]);
    setHistoryIndex(-1);

    try {
      const res = await api.executeTerminalCommand(rawCmd, targetNode);
      const newEntry: CommandLog = {
        id: String(Date.now()),
        command: rawCmd,
        output: res.output || '[No output]',
        exitCode: res.exit_code ?? 0,
        latencyMs: res.latency_ms ?? 0,
        timestamp: new Date().toLocaleTimeString()
      };
      setHistory(prev => [...prev, newEntry]);
    } catch (e: any) {
      setHistory(prev => [
        ...prev,
        {
          id: String(Date.now()),
          command: rawCmd,
          output: `Command execution failed: ${e.message}`,
          exitCode: 1,
          latencyMs: 0,
          timestamp: new Date().toLocaleTimeString()
        }
      ]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRunCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandList.length === 0) return;
      const nextIdx = historyIndex === -1 ? commandList.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIdx);
      setCommand(commandList[nextIdx]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === -1) return;
      const nextIdx = historyIndex + 1;
      if (nextIdx >= commandList.length) {
        setHistoryIndex(-1);
        setCommand('');
      } else {
        setHistoryIndex(nextIdx);
        setCommand(commandList[nextIdx]);
      }
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-4xl h-[85vh] bg-[#0c101c] border border-cyan-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden ring-1 ring-white/10 font-mono text-xs">
        {/* Terminal Header */}
        <div className="px-4 py-3 bg-slate-900/90 border-b border-white/[0.08] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 mr-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
            </div>
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-white text-xs tracking-wide">Live Remote Web Terminal</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              {nodeLabel}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setHistory([])}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition"
              title="Clear terminal output"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-rose-500/20 hover:text-rose-300 transition"
              title="Close terminal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Command Pills */}
        <div className="px-4 py-2 bg-slate-950/70 border-b border-white/[0.06] flex items-center gap-2 overflow-x-auto shrink-0">
          <span className="text-[10px] text-slate-500 font-bold uppercase shrink-0">Quick Actions:</span>
          {quickCommands.map((qc) => (
            <button
              key={qc.label}
              onClick={() => handleRunCommand(qc.cmd)}
              disabled={isLoading}
              className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-cyan-500/15 border border-white/[0.08] hover:border-cyan-500/40 text-slate-300 hover:text-cyan-200 transition text-[11px] shrink-0 font-medium active:scale-95 disabled:opacity-40"
            >
              {qc.label}
            </button>
          ))}
        </div>

        {/* Terminal Body */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#070a13] text-slate-200 selection:bg-cyan-500/30 selection:text-white">
          <div className="text-slate-500 text-[11px]">
            Connected to <span className="text-cyan-400 font-bold">{nodeLabel}</span>. Type any command and press [Enter].
          </div>

          {history.map((item) => (
            <div key={item.id} className="space-y-1">
              {/* Command line */}
              <div className="flex items-center gap-2 text-cyan-300">
                <span className="text-emerald-400 font-bold">{promptSymbol}</span>
                <span className="font-bold text-white">{item.command}</span>
                <span className="text-[10px] text-slate-500 ml-auto font-normal">
                  {item.latencyMs}ms • {item.timestamp}
                </span>
              </div>

              {/* Output block */}
              <pre className={`p-3 rounded-xl border text-[11px] leading-relaxed overflow-x-auto whitespace-pre-wrap ${
                item.exitCode === 0
                  ? 'bg-slate-950/80 border-white/[0.06] text-slate-300'
                  : 'bg-rose-950/30 border-rose-500/30 text-rose-300'
              }`}>
                {item.output}
              </pre>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 text-cyan-400 animate-pulse text-xs">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Executing command on remote node...</span>
            </div>
          )}

          <div ref={outputEndRef} />
        </div>

        {/* Terminal Command Input */}
        <div className="p-3 bg-slate-900/90 border-t border-white/[0.08] flex items-center gap-2 shrink-0">
          <span className="text-emerald-400 font-bold pl-2">{promptSymbol}</span>
          <input
            ref={inputRef}
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder="Type a remote command (e.g. iisreset /status, Get-Process, docker ps)..."
            className="flex-1 bg-transparent border-0 outline-none text-white placeholder-slate-500 text-xs font-mono"
          />
          <button
            onClick={() => handleRunCommand()}
            disabled={!command.trim() || isLoading}
            className="px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-40 text-white rounded-lg font-bold flex items-center gap-1.5 transition active:scale-95 shadow-md"
          >
            <span>Run</span>
            <CornerDownLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

