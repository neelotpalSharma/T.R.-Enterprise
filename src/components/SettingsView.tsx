import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Settings,
  Store,
  UserCheck,
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
  ExternalLink,
  Sparkles,
  Sun,
  Moon,
  Monitor,
  AlertCircle,
  KeyRound,
  UserX,
  Lock,
  Unlock,
  Globe,
  Key,
  UploadCloud
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
    usersList,
    addUser,
    deleteUser,
    user: currentUser,
    switchRoleDemo,
    isAdmin,
    supabaseConnected,
    isCheckingSupabase,
    syncWithSupabase,
    showToast,
    theme,
    setTheme,
    toggleTheme,
    previousCredentialsCount,
    previousOwnerEmails,
    deletePreviousCredentials,
    checkPreviousCredentials,
    isRegistrationLocked,
    toggleRegistrationLock,
    systemStatus
  } = useApp();

  // Local form states
  const [formData, setFormData] = useState(settings);
  const [activeTab, setActiveTab] = useState<'profile' | 'appearance' | 'invoice' | 'owner' | 'registration-lock' | 'supabase' | 'backup'>('profile');
  const [isDeletingCredentials, setIsDeletingCredentials] = useState(false);
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const [isTogglingLock, setIsTogglingLock] = useState(false);

  // Supabase inline configuration states
  const [sbUrl, setSbUrl] = useState(() => getSupabaseEnv().url);
  const [sbKey, setSbKey] = useState(() => getSupabaseEnv().anonKey);
  const [isTestingSb, setIsTestingSb] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [sbTestResult, setSbTestResult] = useState<{ success: boolean; message: string; tablesExist?: boolean } | null>(null);

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
    showToast('Supabase disconnected. Switched to local storage.', 'info');
  };

  const handleTriggerManualSync = async () => {
    setIsManualSyncing(true);
    await syncWithSupabase();
    setIsManualSyncing(false);
  };

  // Handle store profile update
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formData);
  };

  // Copy SQL Schema to clipboard
  const handleCopySchema = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    showToast('Supabase PostgreSQL Schema SQL copied to clipboard!', 'success');
  };

  // Export Full JSON Backup
  const handleExportBackup = () => {
    const backupData = {
      storeSettings: settings,
      products: localStorage.getItem('tr_products'),
      invoices: localStorage.getItem('tr_invoices'),
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TR_Enterprise_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    showToast('Application backup JSON exported successfully', 'success');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-in fade-in">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
          <Settings className="w-7 h-7 text-blue-600" />
          <span>Business & System Settings</span>
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-1">
          Configure {settings.businessName} store identity, GST invoice details, team permissions & Supabase cloud
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200/80 dark:border-slate-800 space-x-2 sm:space-x-3 overflow-x-auto pb-2">
        {[
          { id: 'profile', label: 'Store Identity & GST', icon: <Store className="w-4 h-4" /> },
          { id: 'appearance', label: 'Theme & Appearance', icon: <Sun className="w-4 h-4" /> },
          { id: 'invoice', label: 'Invoice & Bank Details', icon: <CreditCard className="w-4 h-4" /> },
          { id: 'owner', label: 'Owner Profile & Security', icon: <Shield className="w-4 h-4" /> },
          { id: 'registration-lock', label: 'Registration Lock', icon: <Lock className="w-4 h-4" /> },
          { id: 'supabase', label: 'Supabase Cloud DB', icon: <Database className="w-4 h-4" /> },
          { id: 'backup', label: 'Data & Backup', icon: <Download className="w-4 h-4" /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.id === 'registration-lock' && (
              <span className={`w-2 h-2 rounded-full ${isRegistrationLocked ? 'bg-amber-400' : 'bg-emerald-400'}`} />
            )}
          </button>
        ))}
      </div>

      {/* Appearance & Theme Setting */}
      {activeTab === 'appearance' && (
        <div className="p-6 rounded-[28px] border border-gray-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Sun className="w-5 h-5 text-amber-500" />
              <span>Theme & Visual Appearance</span>
            </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
              Choose your preferred interface appearance for daytime retail counter work or nighttime stock audits.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Light Theme Card */}
            <button
              type="button"
              onClick={() => {
                setTheme('light');
                showToast('Switched to Light Mode', 'info');
              }}
              className={`p-5 rounded-2xl border text-left transition-all ${
                theme === 'light'
                  ? 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/40 dark:bg-slate-800/80'
                  : 'border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
                    <Sun className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">Light Mode</h4>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400">Crisp off-white canvas with high contrast</p>
                  </div>
                </div>
                {theme === 'light' && (
                  <CheckCircle2 className="w-5 h-5 text-blue-600 fill-blue-50" />
                )}
              </div>
              <div className="p-3 rounded-xl bg-[#F8F9FB] border border-gray-200 flex items-center justify-between text-[10px] text-slate-700">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-600" />
                  <span className="font-bold">Berger Retail POS</span>
                </div>
                <span className="font-mono bg-white px-2 py-0.5 rounded border text-slate-900 font-bold">₹1,450.00</span>
              </div>
            </button>

            {/* Dark Theme Card */}
            <button
              type="button"
              onClick={() => {
                setTheme('dark');
                showToast('Switched to Dark Mode', 'info');
              }}
              className={`p-5 rounded-2xl border text-left transition-all ${
                theme === 'dark'
                  ? 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-950/20 dark:bg-slate-800/80'
                  : 'border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-slate-800 text-amber-400 flex items-center justify-center font-bold">
                    <Moon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">Dark Mode</h4>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400">Eye-safe slate canvas for low-light environments</p>
                  </div>
                </div>
                {theme === 'dark' && (
                  <CheckCircle2 className="w-5 h-5 text-blue-500 fill-blue-950" />
                )}
              </div>
              <div className="p-3 rounded-xl bg-[#0B0F17] border border-slate-700 flex items-center justify-between text-[10px] text-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="font-bold">Berger Retail POS</span>
                </div>
                <span className="font-mono bg-slate-800 px-2 py-0.5 rounded border border-slate-700 text-white font-bold">₹1,450.00</span>
              </div>
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-blue-50 dark:bg-slate-800/60 border border-blue-100 dark:border-slate-700 text-xs text-gray-600 dark:text-slate-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>Theme preference is saved locally and applies instantly across all views, modals, and PDF invoice tools.</span>
            </div>
            <button
              onClick={toggleTheme}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-bold text-xs shadow-xs border border-gray-200 dark:border-slate-600 hover:bg-gray-50 transition-colors shrink-0"
            >
              Toggle Now
            </button>
          </div>
        </div>
      )}

      {/* 1. Store Identity & GST */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="p-6 rounded-[28px] border border-gray-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-5">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Store Identity & Legal Details</h3>
            <p className="text-xs text-gray-500">Appears on tax invoices and retail reports</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-gray-600 dark:text-slate-300 block mb-1">Business Name</label>
              <input
                type="text"
                value={formData.businessName}
                onChange={e => setFormData({ ...formData, businessName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
              />
            </div>

            <div>
              <label className="font-bold text-gray-600 dark:text-slate-300 block mb-1">Tagline</label>
              <input
                type="text"
                value={formData.tagline}
                onChange={e => setFormData({ ...formData, tagline: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="font-bold text-gray-600 dark:text-slate-300 block mb-1">GSTIN</label>
              <input
                type="text"
                value={formData.gstin}
                onChange={e => setFormData({ ...formData, gstin: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold"
              />
            </div>

            <div>
              <label className="font-bold text-gray-600 dark:text-slate-300 block mb-1">Dealer Classification</label>
              <input
                type="text"
                value={formData.dealerFor}
                onChange={e => setFormData({ ...formData, dealerFor: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="font-bold text-gray-600 dark:text-slate-300 block mb-1">Contact Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="font-bold text-gray-600 dark:text-slate-300 block mb-1">Contact Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="font-bold text-gray-600 dark:text-slate-300 block mb-1">Store Address / Landmark</label>
              <input
                type="text"
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                placeholder="Kahikuchi, Ganakpara, SOS Road"
                className="w-full px-3.5 py-2.5 rounded-2xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="font-bold text-gray-600 dark:text-slate-300 block mb-1">City / District</label>
              <input
                type="text"
                value={formData.city}
                onChange={e => setFormData({ ...formData, city: e.target.value })}
                placeholder="Kamrup (M)"
                className="w-full px-3.5 py-2.5 rounded-2xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="font-bold text-gray-600 dark:text-slate-300 block mb-1">State</label>
              <input
                type="text"
                value={formData.state}
                onChange={e => setFormData({ ...formData, state: e.target.value })}
                placeholder="Assam"
                className="w-full px-3.5 py-2.5 rounded-2xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="font-bold text-gray-600 dark:text-slate-300 block mb-1">PIN Code</label>
              <input
                type="text"
                value={formData.pincode}
                onChange={e => setFormData({ ...formData, pincode: e.target.value })}
                placeholder="781017"
                className="w-full px-3.5 py-2.5 rounded-2xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-slate-800">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-2xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-all active:scale-95"
            >
              Save Profile Changes
            </button>
          </div>
        </form>
      )}

      {/* 2. Invoice & Bank Details */}
      {activeTab === 'invoice' && (
        <form onSubmit={handleSaveProfile} className="p-6 rounded-[28px] border border-gray-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-5">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Tax Invoice & Bank Account Configuration</h3>
            <p className="text-xs text-gray-500">Printed directly on generated customer invoices and QR receipts</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-gray-600 dark:text-slate-300 block mb-1">Bank Name</label>
              <input
                type="text"
                value={formData.bankName}
                onChange={e => setFormData({ ...formData, bankName: e.target.value })}
                placeholder="UCO Bank"
                className="w-full px-3.5 py-2.5 rounded-2xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="font-bold text-gray-600 dark:text-slate-300 block mb-1">Account Holder / Beneficiary Name</label>
              <input
                type="text"
                value={formData.accountName || ''}
                onChange={e => setFormData({ ...formData, accountName: e.target.value })}
                placeholder="T R ENTERPRISE"
                className="w-full px-3.5 py-2.5 rounded-2xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
              />
            </div>

            <div>
              <label className="font-bold text-gray-600 dark:text-slate-300 block mb-1">Account Number</label>
              <input
                type="text"
                value={formData.accountNumber}
                onChange={e => setFormData({ ...formData, accountNumber: e.target.value })}
                placeholder="10390210001868"
                className="w-full px-3.5 py-2.5 rounded-2xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div>
              <label className="font-bold text-gray-600 dark:text-slate-300 block mb-1">IFSC Code</label>
              <input
                type="text"
                value={formData.ifscCode}
                onChange={e => setFormData({ ...formData, ifscCode: e.target.value })}
                placeholder="UCBA0001039"
                className="w-full px-3.5 py-2.5 rounded-2xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono uppercase"
              />
            </div>

            <div>
              <label className="font-bold text-gray-600 dark:text-slate-300 block mb-1">UPI ID (VPA)</label>
              <input
                type="text"
                value={formData.upiId}
                onChange={e => setFormData({ ...formData, upiId: e.target.value })}
                placeholder="10390210001868@ucobank"
                className="w-full px-3.5 py-2.5 rounded-2xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="font-bold text-gray-600 dark:text-slate-300 block mb-1">Invoice Prefix</label>
              <input
                type="text"
                value={formData.invoicePrefix}
                onChange={e => setFormData({ ...formData, invoicePrefix: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div>
              <label className="font-bold text-gray-600 dark:text-slate-300 block mb-1">Default GST Rate (%)</label>
              <input
                type="number"
                value={formData.defaultTaxPercent}
                onChange={e => setFormData({ ...formData, defaultTaxPercent: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="font-bold text-gray-600 dark:text-slate-300 block mb-1">Terms & Conditions (Printed on PDF)</label>
              <textarea
                rows={3}
                value={formData.termsAndConditions}
                onChange={e => setFormData({ ...formData, termsAndConditions: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-slate-800">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-2xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-all active:scale-95"
            >
              Save Invoice Settings
            </button>
          </div>
        </form>
      )}

      {/* 3. Owner Profile & Single-User Access Control */}
      {activeTab === 'owner' && (
        <div className="space-y-6">
          
          {/* Registered Store Owner Profile Card */}
          <div className="p-6 rounded-[28px] border border-gray-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-amber-500" />
                  <span>Store Owner Profile & Security</span>
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                  Single-User Portal Protection: Only this authorized store owner account has access to billing, inventory, and ledger
                </p>
              </div>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <span>👑 Sole Store Owner (Admin)</span>
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-50/70 to-indigo-50/70 dark:from-slate-800/60 dark:to-slate-850/60 border border-blue-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-blue-500/25 shrink-0">
                  {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'O'}
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900 dark:text-white">
                    {currentUser?.name || 'Store Owner'}
                  </h4>
                  <p className="text-xs text-blue-700 dark:text-blue-300 font-mono mt-0.5">
                    {currentUser?.email}
                  </p>
                  {currentUser?.phone && (
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                      Phone: {currentUser.phone}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Verified & Active</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 text-xs">
                <span className="text-gray-500 dark:text-slate-400 block mb-1">Access Protocol</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">Strict Single-User</span>
                <p className="text-[11px] text-gray-500 mt-1">Secondary staff logins disabled</p>
              </div>

              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 text-xs">
                <span className="text-gray-500 dark:text-slate-400 block mb-1">Session Security</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">JWT Signed & Rate Limited</span>
                <p className="text-[11px] text-gray-500 mt-1">Brute-force lockout enabled</p>
              </div>

              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 text-xs">
                <span className="text-gray-500 dark:text-slate-400 block mb-1">Permission Level</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">Full Administrative</span>
                <p className="text-[11px] text-gray-500 mt-1">Full control over inventory & billing</p>
              </div>
            </div>
          </div>

          {/* Registration Lock & Public Signup Control Card */}
          <div className="p-6 rounded-[28px] border border-gray-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Lock className="w-5 h-5 text-amber-500" />
                  <span>Portal Registration Lock</span>
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                  When switched ON, all new registrations are forbidden. No one else can create an account or take over ownership.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${
                  isRegistrationLocked
                    ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700/60'
                    : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/60'
                }`}>
                  {isRegistrationLocked ? '🔒 Registration Locked' : '🔓 Registration Open'}
                </span>
              </div>
            </div>

            <div className={`p-5 rounded-2xl border transition-all ${
              isRegistrationLocked
                ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60'
                : 'bg-slate-50 dark:bg-slate-800/40 border-gray-200 dark:border-slate-800'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    {isRegistrationLocked ? (
                      <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    ) : (
                      <Unlock className="w-4 h-4 text-gray-500 dark:text-slate-400" />
                    )}
                    <span>Lock New Registrations</span>
                  </p>
                  <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed max-w-xl">
                    {isRegistrationLocked
                      ? 'New account registrations are completely blocked. Anyone attempting to register will see a locked screen and be prevented from signing up.'
                      : 'New registrations are currently enabled. Switch ON this setting to freeze registrations and secure sole ownership.'}
                  </p>
                </div>

                {/* Switch Toggle Button */}
                <button
                  type="button"
                  disabled={isTogglingLock}
                  onClick={async () => {
                    setIsTogglingLock(true);
                    await toggleRegistrationLock(!isRegistrationLocked);
                    setIsTogglingLock(false);
                  }}
                  className={`relative inline-flex h-8 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
                    isRegistrationLocked ? 'bg-amber-500' : 'bg-gray-300 dark:bg-slate-700'
                  }`}
                  role="switch"
                  aria-checked={isRegistrationLocked}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out flex items-center justify-center text-[10px] ${
                      isRegistrationLocked ? 'translate-x-8 text-amber-600' : 'translate-x-0 text-gray-400'
                    }`}
                  >
                    {isTogglingLock ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-700" />
                    ) : isRegistrationLocked ? (
                      <Lock className="w-3.5 h-3.5" />
                    ) : (
                      <Unlock className="w-3.5 h-3.5" />
                    )}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Previous Owner Credentials & Access Revocation Card */}
          <div className="p-6 rounded-[28px] border border-gray-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <UserX className="w-5 h-5 text-red-500" />
                  <span>Previous Owner Credentials & Access Revocation</span>
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                  Permanent removal of old owner accounts. Once deleted, previous owners will be completely blocked from logging in.
                </p>
              </div>

              <button
                type="button"
                onClick={checkPreviousCredentials}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 self-start sm:self-auto transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Status</span>
              </button>
            </div>

            {previousCredentialsCount > 0 || (previousOwnerEmails && previousOwnerEmails.length > 0) ? (
              <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/60 space-y-3">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-extrabold text-red-900 dark:text-red-200">
                      {previousCredentialsCount} Previous Owner Credential{previousCredentialsCount > 1 ? 's' : ''} Found
                    </p>
                    <p className="text-xs text-red-700 dark:text-red-300">
                      These credentials belonged to previous store owners or legacy accounts. Purging them ensures only your active account ({currentUser?.email}) can access the portal.
                    </p>
                  </div>
                </div>

                {previousOwnerEmails && previousOwnerEmails.length > 0 && (
                  <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-red-200 dark:border-red-900 space-y-1.5">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                      Previous Registered Email(s):
                    </span>
                    <ul className="space-y-1">
                      {previousOwnerEmails.map(email => (
                        <li key={email} className="flex items-center justify-between text-xs font-mono font-medium text-slate-800 dark:text-slate-200">
                          <span>{email}</span>
                          <span className="text-[10px] bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 px-2 py-0.5 rounded font-sans font-bold">
                            Revocable
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowConfirmDeleteModal(true)}
                    disabled={isDeletingCredentials}
                    className="px-4 py-2.5 rounded-xl font-bold text-xs bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-500/20 active:scale-95 transition-all flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Permanently Delete Previous Credentials</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                    No Previous Owner Credentials Present
                  </p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                    The portal database has been completely cleaned. Only your authenticated credentials ({currentUser?.email}) exist in the system, and no previous owner can log in.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Confirmation Modal */}
          {showConfirmDeleteModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
              <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
                <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
                  <div className="p-2.5 rounded-2xl bg-red-100 dark:bg-red-950/60">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      Delete Previous Credentials?
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      Irreversible Security Action
                    </p>
                  </div>
                </div>

                <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed">
                  Are you sure you want to permanently delete all previous owner credentials from local memory and Supabase? Once deleted, the previous owner <strong className="text-slate-900 dark:text-white">will never be able to log in again</strong>.
                </p>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowConfirmDeleteModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setIsDeletingCredentials(true);
                      await deletePreviousCredentials();
                      setIsDeletingCredentials(false);
                      setShowConfirmDeleteModal(false);
                    }}
                    disabled={isDeletingCredentials}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-500/20 active:scale-95 transition-all flex items-center gap-1.5"
                  >
                    {isDeletingCredentials ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    <span>Confirm & Purge</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Registration Lock Dedicated Tab */}
      {activeTab === 'registration-lock' && (
        <div className="space-y-6 animate-in fade-in">
          
          {/* Main Registration Lock Switch Card */}
          <div className="p-6 sm:p-8 rounded-[28px] border border-gray-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2.5 rounded-2xl ${
                    isRegistrationLocked
                      ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400'
                      : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {isRegistrationLocked ? <Lock className="w-6 h-6" /> : <Unlock className="w-6 h-6" />}
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                      Portal Registration Lock
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      Master switch for new user & owner registrations
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border ${
                  isRegistrationLocked
                    ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700/60'
                    : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/60'
                }`}>
                  {isRegistrationLocked ? '🔒 Registration Locked' : '🔓 Registration Open'}
                </span>
              </div>
            </div>

            {/* Interactive Switch Banner */}
            <div className={`p-6 rounded-2xl border transition-all ${
              isRegistrationLocked
                ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60'
                : 'bg-slate-50 dark:bg-slate-800/40 border-gray-200 dark:border-slate-800'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="space-y-1.5 max-w-xl">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{isRegistrationLocked ? 'Disable All New Registrations' : 'Enable New Registrations'}</span>
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed">
                    {isRegistrationLocked ? (
                      <span className="text-amber-900 dark:text-amber-200 font-medium">
                        <strong>Security Active:</strong> New registration is currently blocked. No one can register new credentials or create accounts on this portal.
                      </span>
                    ) : (
                      <span>
                        <strong>Registration is currently Open:</strong> Anyone with the registration link can register owner credentials. Switch ON this setting once you have completed your own registration to prevent any further signups.
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-3 self-start sm:self-center shrink-0">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {isRegistrationLocked ? 'LOCKED' : 'UNLOCKED'}
                  </span>
                  <button
                    type="button"
                    disabled={isTogglingLock}
                    onClick={async () => {
                      setIsTogglingLock(true);
                      await toggleRegistrationLock(!isRegistrationLocked);
                      setIsTogglingLock(false);
                    }}
                    className={`relative inline-flex h-9 w-18 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
                      isRegistrationLocked ? 'bg-amber-500' : 'bg-gray-300 dark:bg-slate-700'
                    }`}
                    role="switch"
                    aria-checked={isRegistrationLocked}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-8 w-8 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out flex items-center justify-center text-xs ${
                        isRegistrationLocked ? 'translate-x-9 text-amber-600' : 'translate-x-0 text-gray-400'
                      }`}
                    >
                      {isTogglingLock ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-slate-700" />
                      ) : isRegistrationLocked ? (
                        <Lock className="w-4 h-4" />
                      ) : (
                        <Unlock className="w-4 h-4" />
                      )}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Feature Guarantees Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/60 border border-gray-200/80 dark:border-slate-800 space-y-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  <Shield className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Sole Owner Protection
                </h4>
                <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
                  Prevents unauthorized persons or staff from creating new logins and ensures your active store ownership remains intact.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/60 border border-gray-200/80 dark:border-slate-800 space-y-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Form & API Blocker
                </h4>
                <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
                  Blocks the registration web page with a security banner and rejects backend registration requests with HTTP 403 Forbidden.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/60 border border-gray-200/80 dark:border-slate-800 space-y-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                  <KeyRound className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Reversible by Owner
                </h4>
                <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
                  As the verified store owner, you can easily switch this toggle back OFF whenever you wish to register replacement credentials.
                </p>
              </div>
            </div>

            {/* Portal Security Summary */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-gray-200/80 dark:border-slate-800 space-y-3">
              <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider block">
                Live Security & Ownership Summary
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-gray-500 dark:text-slate-400 block text-[11px]">Active Store Owner:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{currentUser?.email || 'Authenticated Owner'}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-slate-400 block text-[11px]">Registration Status:</span>
                  <span className={`font-extrabold ${isRegistrationLocked ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {isRegistrationLocked ? '🔒 LOCKED (No signups allowed)' : '🔓 OPEN (Signups allowed)'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-slate-400 block text-[11px]">Access Scope:</span>
                  <span className="font-bold text-slate-900 dark:text-white">Strict Single-Owner Portal</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* 4. Supabase Cloud Database */}
      {activeTab === 'supabase' && (
        <div className="p-6 rounded-[28px] border border-gray-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-600" />
                <span>Supabase PostgreSQL Cloud Integration</span>
              </h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Persistent cloud storage for Berger Paints catalog, sales invoices, user sessions & stock logs
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTriggerManualSync}
                disabled={isManualSyncing}
                className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isManualSyncing ? 'animate-spin' : ''}`} />
                <span>{isManualSyncing ? 'Syncing...' : 'Sync Cloud Tables'}</span>
              </button>
              <button
                type="button"
                onClick={onOpenSupabaseModal}
                className="px-4 py-2 rounded-2xl text-xs font-bold bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors"
              >
                Setup Wizard
              </button>
            </div>
          </div>

          {/* Connection Status Banner */}
          <div className={`p-4 rounded-2xl border flex items-start sm:items-center gap-3 text-xs ${
            supabaseConnected
              ? 'bg-emerald-50 text-emerald-950 border-emerald-200 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-200'
              : 'bg-amber-50 text-amber-950 border-amber-200 dark:bg-amber-950/60 dark:border-amber-800 dark:text-amber-200'
          }`}>
            <CheckCircle2 className={`w-5 h-5 shrink-0 ${supabaseConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`} />
            <div className="flex-1">
              <p className="font-extrabold text-sm">
                {supabaseConnected ? 'Supabase Database Connected & Operational' : 'Supabase Running in Local Offline Mode'}
              </p>
              <p className="opacity-80 mt-0.5">
                {supabaseConnected
                  ? 'All products, inventory adjustments, and invoices are actively synchronizing with your Supabase cloud PostgreSQL tables.'
                  : 'To link your live Supabase project, execute the SQL schema below in your Supabase SQL Editor and enter your project URL and public Anon key below.'}
              </p>
            </div>
          </div>

          {/* Inline Credentials Form */}
          <div className="p-5 rounded-2xl bg-gray-50/80 dark:bg-slate-800/40 border border-gray-200/80 dark:border-slate-800 space-y-4">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white flex items-center justify-between">
              <span>Cloud API Credentials</span>
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noreferrer"
                className="text-emerald-600 dark:text-emerald-400 normal-case font-bold inline-flex items-center gap-1 hover:underline text-[11px]"
              >
                <span>Supabase Dashboard</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </h4>

            <form onSubmit={handleSaveSupabaseConfig} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 mb-1">
                    Supabase Project URL
                  </label>
                  <div className="relative">
                    <Globe className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="https://xyzcompany.supabase.co"
                      value={sbUrl}
                      onChange={(e) => setSbUrl(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 mb-1">
                    Supabase Anon Public Key
                  </label>
                  <div className="relative">
                    <Key className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      value={sbKey}
                      onChange={(e) => setSbKey(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {sbTestResult && (
                <div className={`p-3 rounded-xl border flex items-start gap-2 text-xs ${
                  sbTestResult.success
                    ? 'bg-emerald-50 text-emerald-950 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800'
                    : 'bg-amber-50 text-amber-950 border-amber-200 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800'
                }`}>
                  {sbTestResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="font-bold">{sbTestResult.message}</p>
                    {sbTestResult.tablesExist === false && (
                      <button
                        type="button"
                        onClick={handleCopySchema}
                        className="text-xs font-bold underline text-emerald-700 dark:text-emerald-300 mt-1 block"
                      >
                        Copy SQL script below and execute in Supabase SQL Editor
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div>
                  {(sbUrl || sbKey) && (
                    <button
                      type="button"
                      onClick={handleDisconnectSupabase}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Disconnect Cloud</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={isTestingSb}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTestingSb ? 'animate-spin' : ''}`} />
                    <span>{isTestingSb ? 'Testing Link...' : 'Save & Test Supabase'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* SQL Schema Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-300">
                Supabase Schema SQL Migration Script (Run in SQL Editor):
              </span>
              <button
                type="button"
                onClick={handleCopySchema}
                className="flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy SQL Script</span>
              </button>
            </div>

            <pre className="p-4 rounded-2xl bg-slate-950 text-slate-300 font-mono text-[11px] overflow-x-auto max-h-60 border border-slate-800 leading-relaxed select-all">
              {SUPABASE_SQL_SCHEMA}
            </pre>
          </div>
        </div>
      )}

      {/* 5. Data & Backup */}
      {activeTab === 'backup' && (
        <div className="p-6 rounded-[28px] border border-gray-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4 text-xs">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Inventory & Invoice Data Backup</h3>
            <p className="text-gray-500">Safely download or restore your store ledger</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-5 rounded-2xl border border-gray-200/80 dark:border-slate-800 space-y-2.5">
              <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">Download Full Backup (JSON)</h4>
              <p className="text-gray-500">Export all products, Berger color codes, invoices, and settings as a standalone file.</p>
              <button
                onClick={handleExportBackup}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Download Backup</span>
              </button>
            </div>

            <div className="p-5 rounded-2xl border border-gray-200/80 dark:border-slate-800 space-y-2.5">
              <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">Reset to Demo Defaults</h4>
              <p className="text-gray-500">Restore factory catalog with 18 Berger Paints & Hardware items and sample invoices.</p>
              <button
                onClick={() => {
                  if (window.confirm('Reset all items back to factory demo state?')) {
                    localStorage.clear();
                    window.location.reload();
                  }
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold bg-gray-100 hover:bg-red-50 text-red-600 border border-gray-200 dark:border-slate-700 dark:bg-slate-800 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reset to Default Seed</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
