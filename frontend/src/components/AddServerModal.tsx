import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Server, X, CheckCircle2, AlertCircle, Loader2,
  Eye, EyeOff, Wifi, Sparkles
} from 'lucide-react';
import { api, MonitoredNode } from '../services/api';

interface AddServerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onServerAdded: (node: MonitoredNode) => void;
}

export const AddServerModal: React.FC<AddServerModalProps> = ({
  isOpen,
  onClose,
  onServerAdded
}) => {
  const [osType, setOsType] = useState<'linux' | 'windows_server'>('linux');
  const [name, setName] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState<string>('22');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Testing & Saving states
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    latency_ms?: number;
    hostname?: string;
    os_display?: string;
  } | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleOsChange = (type: 'linux' | 'windows_server') => {
    setOsType(type);
    setPort(type === 'linux' ? '22' : '5985');
    setTestResult(null);
    setErrorMsg(null);
  };

  const handleTestConnection = async () => {
    if (!host.trim()) {
      setErrorMsg('Please enter an IP address or hostname.');
      return;
    }
    if (!username.trim()) {
      setErrorMsg('Please enter the login username.');
      return;
    }
    if (!password) {
      setErrorMsg('Please enter the server password.');
      return;
    }

    setErrorMsg(null);
    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await api.testNodeConnection({
        host: host.trim(),
        port: port ? parseInt(port, 10) : (osType === 'linux' ? 22 : 5985),
        os_type: osType,
        username: username.trim(),
        password: password
      });
      setTestResult(res);
      if (res.success && !name.trim() && res.hostname) {
        setName(res.hostname);
      }
    } catch (e: any) {
      setTestResult({
        success: false,
        message: `Connection probe failed: ${e.message}`
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!host.trim() || !username.trim() || !password) {
      setErrorMsg('Host, username, and password are required.');
      return;
    }

    const serverName = name.trim() || (testResult?.hostname || `${osType === 'linux' ? 'Linux' : 'Windows'} Server (${host.trim()})`);

    setIsSaving(true);
    setErrorMsg(null);

    try {
      const savedNode = await api.addCustomNode({
        name: serverName,
        host: host.trim(),
        port: port ? parseInt(port, 10) : (osType === 'linux' ? 22 : 5985),
        os_type: osType,
        username: username.trim(),
        password: password
      });

      onServerAdded(savedNode);
      onClose();
    } catch (e: any) {
      setErrorMsg(`Failed to save server: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Render via React Portal directly into document.body so no parent CSS contains or shifts it
  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col relative my-auto max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-900/90 to-blue-950/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white shrink-0">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Add New Monitored Server
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full">
                  Live Telemetry
                </span>
              </h3>
              <p className="text-xs text-slate-400">Stream metrics, procs, and workloads on-the-fly</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex flex-col overflow-hidden flex-1">
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            {/* OS Type Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Server Operating System
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleOsChange('linux')}
                  className={`py-2.5 px-4 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2.5 transition-all ${
                    osType === 'linux'
                      ? 'bg-amber-500/15 border-amber-500/50 text-amber-300 shadow-md shadow-amber-500/10'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <span className="text-base">🐧</span>
                  <span>Linux Server (SSH)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOsChange('windows_server')}
                  className={`py-2.5 px-4 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2.5 transition-all ${
                    osType === 'windows_server'
                      ? 'bg-blue-500/15 border-blue-500/50 text-blue-300 shadow-md shadow-blue-500/10'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <span className="text-base">🪟</span>
                  <span>Windows Server (CIM)</span>
                </button>
              </div>
            </div>

            {/* Server Display Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Server Name / Friendly Label (Optional)
              </label>
              <input
                type="text"
                placeholder={osType === 'linux' ? 'e.g. Staging Database (Ubuntu)' : 'e.g. Production MSSQL (Windows 2016)'}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            {/* IP and Port */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  IP Address / Hostname <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 172.16.10.40"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-blue-500 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Port
                </label>
                <input
                  type="number"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  placeholder={osType === 'linux' ? '22' : '5985'}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-blue-500 transition"
                />
              </div>
            </div>

            {/* Username & Password */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Username <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={osType === 'linux' ? 'e.g. root or administrator' : 'e.g. administrator'}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Password <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 pr-9 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Test Connection Button & Result */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting || !host.trim() || !username.trim() || !password}
                className="w-full py-2 px-3 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                    <span>Testing credentials & probing port...</span>
                  </>
                ) : (
                  <>
                    <Wifi className="w-3.5 h-3.5 text-blue-400" />
                    <span>Test Live Connection</span>
                  </>
                )}
              </button>

              {/* Test Connection Banner */}
              {testResult && (
                <div
                  className={`mt-2.5 p-3 rounded-xl text-xs flex items-start gap-2.5 border ${
                    testResult.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="font-semibold">{testResult.message}</div>
                    {testResult.success && testResult.hostname && (
                      <div className="text-[11px] text-emerald-400/80 mt-0.5 font-mono">
                        Host: {testResult.hostname} • OS: {testResult.os_display}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {errorMsg && (
                <div className="mt-2.5 p-3 rounded-xl text-xs bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-end gap-3 bg-slate-900/90 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !host.trim() || !username.trim() || !password}
              className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 rounded-xl shadow-lg shadow-blue-500/25 flex items-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Server...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Save & Start Monitoring</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
