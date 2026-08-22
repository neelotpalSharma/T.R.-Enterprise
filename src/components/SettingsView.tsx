import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import {
  Store,
  Database,
  CreditCard,
  FileText,
  Shield,
  Plus,
  Trash2,
  CheckCircle2,
  Copy,
  Download,
  Upload,
  RefreshCw,
  Sun,
  Moon,
  AlertCircle,
  KeyRound,
  Check,
  Zap,
  CheckCircle
} from 'lucide-react';
import { Role } from '../types';
import { SUPABASE_SQL_SCHEMA, testSupabaseConnection, resetSupabaseClient, getSupabaseEnv } from '../lib/supabase';

interface SettingsViewProps {
  onOpenSupabaseModal: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onOpenSupabaseModal }) => {
  const {
    settings,
    updateSettings,
    supabaseConnected,
    isCheckingSupabase,
    syncWithSupabase,
    showToast,
    theme,
    setTheme,
    toggleTheme,
    products,
    invoices,
  } = useApp();

  const { user: currentUser, signOut } = useAuth();

  // Local form states
  const [formData, setFormData] = useState(settings);
  const [activeTab, setActiveTab] = useState<'profile' | 'appearance' | 'invoice' | 'supabase' | 'backup'>('profile');

  // Supabase inline configuration states
  const [sbUrl, setSbUrl] = useState(() => getSupabaseEnv().url);
  const [sbKey, setSbKey] = useState(() => getSupabaseEnv().anonKey);
  const [isTestingSb, setIsTestingSb] = useState(false);
  const [sbTestResult, setSbTestResult] = useState<{ success: boolean; message: string; tablesExist?: boolean } | null>(null);
  const [copiedSchema, setCopiedSchema] = useState(false);

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  useEffect(() => {
    const env = getSupabaseEnv();
    setSbUrl(env.url);
    setSbKey(env.anonKey);
  }, [activeTab]);

  const handleSaveSupabaseConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sbUrl.trim() || !sbKey.trim()) {
      showToast('Please enter both Supabase URL and Anon API Key', 'warning');
      return;
    }

    const saved = resetSupabaseClient(sbUrl.trim(), sbKey.trim());
    if (!saved) {
      showToast('Failed to save Supabase keys', 'error');
      return;
    }

    setIsTestingSb(true);
    const res = await testSupabaseConnection();
    setIsTestingSb(false);
    setSbTestResult(res);

    if (res.success) {
      showToast('Connected to Supabase successfully!', 'success');
      await syncWithSupabase();
    } else {
      showToast(res.message, 'warning');
    }
  };

  const handleDisconnectSupabase = () => {
    resetSupabaseClient();
    setSbUrl('');
    setSbKey('');
    setSbTestResult(null);
    showToast('Supabase disconnected.', 'info');
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formData);
  };

  const handleCopySchema = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSchema(true);
    showToast('SQL schema copied to clipboard', 'info');
    setTimeout(() => setCopiedSchema(false), 2500);
  };

  const handleExportBackup = () => {
    const backupData = {
      settings,
      products,
      invoices,
      exportedAt: new Date().toISOString(),
      version: '2.0-supabase',
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TR_Enterprise_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Data backup JSON file exported', 'success');
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Business & Store Settings
            </h1>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
              Manage GST profile, Supabase Cloud authentication, and invoice formatting
            </p>
          </div>
        </div>

        {/* Current Supabase Auth Status */}
        {currentUser && (
          <div className="flex items-center gap-3 p-2 px-3 rounded-2xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
            <div className="w-7 h-7 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>{currentUser.name}</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 uppercase font-extrabold">
                  {currentUser.role}
                </span>
              </div>
              <p className="text-[10px] text-gray-500 dark:text-slate-400">{currentUser.email}</p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-200 dark:border-slate-800 text-xs font-bold">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition ${
            activeTab === 'profile'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Store Profile</span>
        </button>

        <button
          onClick={() => setActiveTab('appearance')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition ${
            activeTab === 'appearance'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'
          }`}
        >
          <Sun className="w-4 h-4" />
          <span>Appearance & Theme</span>
        </button>

        <button
          onClick={() => setActiveTab('invoice')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition ${
            activeTab === 'invoice'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Invoice & Bank</span>
        </button>

        <button
          onClick={() => setActiveTab('supabase')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition ${
            activeTab === 'supabase'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Supabase Cloud Database</span>
        </button>

        <button
          onClick={() => setActiveTab('backup')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition ${
            activeTab === 'backup'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'
          }`}
        >
          <Download className="w-4 h-4" />
          <span>Backup & Export</span>
        </button>
      </div>

      {/* TAB 1: STORE PROFILE */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveSettings} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-200/80 dark:border-slate-800 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Store Identity & Legal Details</h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Shown on retail tax invoices and official vouchers</p>
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition"
            >
              Save Profile
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Business Name</label>
              <input
                type="text"
                value={formData.businessName}
                onChange={e => setFormData({ ...formData, businessName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Tagline</label>
              <input
                type="text"
                value={formData.tagline}
                onChange={e => setFormData({ ...formData, tagline: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">GSTIN Number</label>
              <input
                type="text"
                value={formData.gstin}
                onChange={e => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Contact Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Full Store Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </form>
      )}

      {/* TAB 2: APPEARANCE */}
      {activeTab === 'appearance' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-200/80 dark:border-slate-800 shadow-xs space-y-6">
          <div className="border-b border-gray-100 dark:border-slate-800 pb-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Theme & UI Preference</h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Customize your display mode</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`p-4 rounded-2xl border-2 text-left flex items-center gap-3 transition ${
                theme === 'light'
                  ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30'
                  : 'border-gray-200 dark:border-slate-800 hover:border-gray-300'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                <Sun className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Light Mode</h4>
                <p className="text-[11px] text-gray-500">Bright, high contrast</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`p-4 rounded-2xl border-2 text-left flex items-center gap-3 transition ${
                theme === 'dark'
                  ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30'
                  : 'border-gray-200 dark:border-slate-800 hover:border-gray-300'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <Moon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Dark Mode</h4>
                <p className="text-[11px] text-gray-500">Slate palette, low glare</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: INVOICE & BANK */}
      {activeTab === 'invoice' && (
        <form onSubmit={handleSaveSettings} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-200/80 dark:border-slate-800 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Bank Account & Invoicing Terms</h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Details printed at the footer of customer bills</p>
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition"
            >
              Save Invoicing Info
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Bank Name</label>
              <input
                type="text"
                value={formData.bankName}
                onChange={e => setFormData({ ...formData, bankName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Account Number</label>
              <input
                type="text"
                value={formData.bankAccountNumber}
                onChange={e => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">IFSC Code</label>
              <input
                type="text"
                value={formData.bankIfsc}
                onChange={e => setFormData({ ...formData, bankIfsc: e.target.value.toUpperCase() })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">UPI ID for QR Payments</label>
              <input
                type="text"
                value={formData.upiId}
                onChange={e => setFormData({ ...formData, upiId: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Invoice Footer Terms & Conditions</label>
              <textarea
                rows={3}
                value={formData.termsAndConditions}
                onChange={e => setFormData({ ...formData, termsAndConditions: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </form>
      )}

      {/* TAB 4: SUPABASE CLOUD DATABASE */}
      {activeTab === 'supabase' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-200/80 dark:border-slate-800 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Supabase Cloud Connection</h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                Single source of truth for authentication, user sessions, products, and invoices
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopySchema}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5"
            >
              {copiedSchema ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSchema ? 'SQL Copied' : 'Copy SQL Schema'}</span>
            </button>
          </div>

          <form onSubmit={handleSaveSupabaseConfig} className="space-y-4 max-w-xl">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Project URL (VITE_SUPABASE_URL)
              </label>
              <input
                type="text"
                value={sbUrl}
                onChange={e => setSbUrl(e.target.value)}
                placeholder="https://your-project.supabase.co"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Anon API Key (VITE_SUPABASE_ANON_KEY)
              </label>
              <input
                type="password"
                value={sbKey}
                onChange={e => setSbKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {sbTestResult && (
              <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2 ${
                sbTestResult.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                  : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
              }`}>
                {sbTestResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />}
                <div>{sbTestResult.message}</div>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={isTestingSb || !sbUrl.trim() || !sbKey.trim()}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition flex items-center gap-2 disabled:opacity-50"
              >
                {isTestingSb ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                <span>Save & Test Connection</span>
              </button>

              {sbUrl && (
                <button
                  type="button"
                  onClick={handleDisconnectSupabase}
                  className="px-4 py-2.5 rounded-xl border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 font-bold text-xs hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                >
                  Disconnect
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* TAB 5: BACKUP & EXPORT */}
      {activeTab === 'backup' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-200/80 dark:border-slate-800 shadow-xs space-y-6">
          <div className="border-b border-gray-100 dark:border-slate-800 pb-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Store Data Backup & JSON Export</h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
              Export all {products.length} products and {invoices.length} invoices for offline archival
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 max-w-lg space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Full JSON Export</h4>
                <p className="text-[11px] text-gray-500">Products, invoices, GST store profiles</p>
              </div>
              <button
                type="button"
                onClick={handleExportBackup}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>Export JSON</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
