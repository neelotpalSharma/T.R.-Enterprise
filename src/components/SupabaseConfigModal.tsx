import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  Database,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Copy,
  Key,
  Globe,
  RefreshCw,
  Trash2,
  UploadCloud
} from 'lucide-react';
import { SUPABASE_SQL_SCHEMA, testSupabaseConnection, resetSupabaseClient, getSupabaseEnv } from '../lib/supabase';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({
  isOpen,
  onClose
}) => {
  const {
    supabaseConnected,
    isCheckingSupabase,
    syncWithSupabase,
    showToast
  } = useApp();

  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; tablesExist?: boolean } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const env = getSupabaseEnv();
      setSupabaseUrl(env.url);
      setSupabaseKey(env.anonKey);
      if (env.url && env.anonKey) {
        setIsTesting(true);
        testSupabaseConnection().then(res => {
          setIsTesting(false);
          setTestResult(res);
        });
      } else {
        setTestResult(null);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseUrl.trim() || !supabaseKey.trim()) {
      showToast('Please enter both Supabase Project URL and Anon API Key', 'warning');
      return;
    }

    const saved = resetSupabaseClient(supabaseUrl.trim(), supabaseKey.trim());
    if (!saved) {
      showToast('Invalid Supabase configuration values', 'error');
      return;
    }

    setIsTesting(true);
    const res = await testSupabaseConnection();
    setIsTesting(false);
    setTestResult(res);

    if (res.success) {
      showToast('Connected to Supabase successfully!', 'success');
      await syncWithSupabase();
    } else {
      showToast(res.message, 'warning');
    }
  };

  const handleDisconnect = () => {
    resetSupabaseClient();
    setSupabaseUrl('');
    setSupabaseKey('');
    setTestResult(null);
    showToast('Supabase disconnected. Switched to local offline storage.', 'info');
  };

  const handleCopySQL = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    showToast('Supabase PostgreSQL table creation SQL script copied!', 'success');
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    await syncWithSupabase();
    setIsSyncing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-6 sm:p-7 relative">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5 pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
              Supabase Cloud Database Link
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Connect your PostgreSQL cloud database, authentication & storage
            </p>
          </div>
        </div>

        {/* Instructions */}
        <div className="space-y-4 text-xs">
          
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
            <h4 className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <span>Quick 3-Step Setup:</span>
            </h4>
            <ol className="list-decimal list-inside space-y-2 text-slate-600 dark:text-slate-300">
              <li>
                Create a free project at{' '}
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-600 dark:text-emerald-400 font-bold underline inline-flex items-center gap-0.5"
                >
                  supabase.com/dashboard <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                Go to <strong>SQL Editor</strong> in Supabase, paste our table schema, and click <strong>Run</strong>:
                <div className="pt-1.5">
                  <button
                    type="button"
                    onClick={handleCopySQL}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all active:scale-95"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy SQL Schema Script (5 Tables)</span>
                  </button>
                </div>
              </li>
              <li>
                In your Supabase project, go to <strong>Project Settings &gt; API</strong>, copy your <strong>Project URL</strong> and <strong>anon public key</strong>, and paste them below.
              </li>
            </ol>
          </div>

          {/* Form */}
          <form onSubmit={handleSaveCredentials} className="space-y-3.5 pt-1">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1">
                Supabase Project URL
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="https://xyzcompany.supabase.co"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1">
                Supabase Anon Public API Key
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={supabaseKey}
                  onChange={(e) => setSupabaseKey(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {testResult && (
              <div className={`p-3.5 rounded-2xl border flex items-start gap-2.5 ${
                testResult.success
                  ? 'bg-emerald-50 text-emerald-950 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800'
                  : 'bg-amber-50 text-amber-950 border-amber-200 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800'
              }`}>
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <p className="font-bold">{testResult.message}</p>
                  {testResult.tablesExist === false && (
                    <button
                      type="button"
                      onClick={handleCopySQL}
                      className="text-xs font-bold underline text-emerald-700 dark:text-emerald-300 block"
                    >
                      Click here to copy the SQL migration script to paste into Supabase
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                {(supabaseUrl || supabaseKey) && (
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Disconnect</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {supabaseConnected && (
                  <button
                    type="button"
                    onClick={handleManualSync}
                    disabled={isSyncing}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 transition-colors"
                  >
                    <UploadCloud className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Syncing...' : 'Sync Cloud Tables'}</span>
                  </button>
                )}

                <button
                  type="submit"
                  disabled={isTesting}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                  <span>{isTesting ? 'Testing Link...' : 'Save & Connect'}</span>
                </button>
              </div>
            </div>
          </form>

        </div>

      </div>
    </div>
  );
};
