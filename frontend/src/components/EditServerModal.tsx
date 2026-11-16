import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Server, X, CheckCircle2, AlertCircle, Loader2,
  Eye, EyeOff, Wifi, Sparkles, Pencil
} from 'lucide-react';
import { api } from '../services/api';

interface EditServerModalProps {
  isOpen: boolean;
  nodeId: string | null;
  onClose: () => void;
  onServerUpdated: () => void;
}

export const EditServerModal: React.FC<EditServerModalProps> = ({
  isOpen,
  nodeId,
  onClose,
  onServerUpdated
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [osType, setOsType] = useState<string>('linux');
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

  // Fetch current node configuration when opened
  useEffect(() => {
    if (!isOpen || !nodeId) return;

    let isMounted = true;
    setIsLoading(true);
    setErrorMsg(null);
    setTestResult(null);

    api.getNodeConfig(nodeId)
      .then((cfg) => {
        if (!isMounted) return;
        setName(cfg.name || '');
        setOsType(cfg.os_type || 'linux');
        setHost(cfg.host || '');
        setPort(String(cfg.port || (cfg.os_type === 'linux' ? 22 : 5985)));
        setUsername(cfg.username || '');
        setPassword(cfg.password || '');
      })
      .catch((e) => {
        if (isMounted) setErrorMsg(`Failed to load server configuration: ${e.message}`);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, nodeId]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !nodeId) return null;

  const handleTestConnection = async () => {
    if (!host.trim()) {
      setErrorMsg('Please enter an IP address or hostname.');
      return;
    }
    if (!username.trim()) {
      setErrorMsg('Please enter the login username.');
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
    if (!host.trim() || !username.trim()) {
      setErrorMsg('Host and username are required.');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    try {
      await api.updateNode(nodeId, {
        name: name.trim() || host.trim(),
        host: host.trim(),
        port: port ? parseInt(port, 10) : (osType === 'linux' ? 22 : 5985),
        username: username.trim(),
        password: password || undefined
      });

      onServerUpdated();
      onClose();
    } catch (e: any) {
      setErrorMsg(`Failed to save server changes: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

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
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-900/90 to-indigo-950/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white shrink-0">
              <Pencil className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Edit Server Configuration
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full font-mono uppercase">
                  {nodeId}
                </span>
              </h3>
              <p className="text-xs text-slate-400">Update IP address, credentials, or server label</p>
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

        {/* Loading state */}
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
            <span className="text-xs font-semibold">Loading server configuration...</span>
          </div>
        ) : (
          <form onSubmit={handleSave} className="flex flex-col overflow-hidden flex-1">
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Server Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Server Label / Display Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Linux Production Server"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
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
                    placeholder="e.g. 172.16.10.29"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-indigo-500 transition"
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-indigo-500 transition"
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
                    placeholder="e.g. administrator"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 pr-9 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
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
                  disabled={isTesting || !host.trim() || !username.trim()}
                  className="w-full py-2 px-3 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isTesting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                      <span>Verifying updated credentials & network reachability...</span>
                    </>
                  ) : (
                    <>
                      <Wifi className="w-3.5 h-3.5 text-indigo-400" />
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
                disabled={isSaving || !host.trim() || !username.trim()}
                className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-500 hover:from-indigo-500 hover:to-violet-500 rounded-xl shadow-lg shadow-indigo-500/25 flex items-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Updating Server...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
};

