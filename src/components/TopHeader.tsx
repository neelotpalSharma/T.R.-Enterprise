import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Search,
  Bell,
  Sun,
  Moon,
  Menu,
  Sparkles,
  Database,
  Plus,
  Receipt,
  UserCheck,
  LogOut,
  ChevronDown,
  Store
} from 'lucide-react';
import { ActiveTab } from '../types';

interface TopHeaderProps {
  onToggleMobileSidebar: () => void;
  onOpenAddProduct: () => void;
  onOpenAuthModal: () => void;
  onOpenSupabaseModal: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  onToggleMobileSidebar,
  onOpenAddProduct,
  onOpenAuthModal,
  onOpenSupabaseModal
}) => {
  const {
    activeTab,
    setActiveTab,
    theme,
    toggleTheme,
    user,
    logout,
    switchRoleDemo,
    isAdmin,
    supabaseConnected,
    isCheckingSupabase,
    lowStockCount,
    settings,
    products
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  // Tab Titles mapping
  const tabTitles: Record<ActiveTab, { title: string; subtitle: string }> = {
    landing: { title: 'Overview & Store Profile', subtitle: 'Executive introduction and Berger catalog showcase' },
    dashboard: { title: 'Analytics Dashboard', subtitle: 'Daily revenue, fast moving paints, and inventory trends' },
    inventory: { title: 'Inventory Management', subtitle: 'Berger paints, emulsions, primers & hardware tool stock' },
    billing: { title: 'POS Billing Counter', subtitle: 'Fast retail tax billing, multi-payment & instant stock deduction' },
    invoices: { title: 'Tax Invoices & Ledger', subtitle: 'GST invoice records, payment statuses and PDF downloads' },
    settings: { title: 'Business & Store Settings', subtitle: 'GST details, store profile, bank account & staff permissions' },
    auth: { title: 'Enterprise Security & Authentication', subtitle: 'JWT tokens, OTP email verification & access control' }
  };

  const currentInfo = tabTitles[activeTab] || { title: 'Dashboard', subtitle: 'Manage your store' };

  // Filtered search results
  const filteredProducts = searchQuery.trim()
    ? products.filter(
        p =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.shadeCode && p.shadeCode.toLowerCase().includes(searchQuery.toLowerCase()))
      ).slice(0, 5)
    : [];

  return (
    <header className="sticky top-0 z-20 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-gray-200/80 dark:border-slate-800 px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between transition-colors">
      
      {/* Left Area: Mobile Hamburger + Current View Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-2 -ml-2 rounded-xl text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 focus:outline-none"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:block">
          <h1 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
            {currentInfo.title}
          </h1>
          <p className="text-[11px] text-gray-500 dark:text-slate-400 truncate max-w-md hidden md:block">
            {currentInfo.subtitle}
          </p>
        </div>
      </div>

      {/* Center Search Input */}
      <div className="relative flex-1 max-w-xs sm:max-w-md mx-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search paint, SKU, shade code, tools..."
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              setShowSearchDropdown(true);
            }}
            onFocus={() => setShowSearchDropdown(true)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-2xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        {/* Live Search Quick Results Dropdown */}
        {showSearchDropdown && searchQuery.trim() && (
          <div
            className="absolute top-full left-0 right-0 mt-1.5 p-2 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xl z-50 animate-in fade-in"
            onMouseLeave={() => setShowSearchDropdown(false)}
          >
            <div className="px-2 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Quick Inventory Results ({filteredProducts.length})
            </div>
            {filteredProducts.length === 0 ? (
              <div className="p-3 text-center text-xs text-gray-500">
                No matching paint or hardware items found.
              </div>
            ) : (
              <div className="space-y-1">
                {filteredProducts.map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setActiveTab('inventory');
                      setShowSearchDropdown(false);
                      setSearchQuery('');
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-xl text-left hover:bg-blue-50 dark:hover:bg-slate-800 text-xs transition-colors"
                  >
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{p.name}</p>
                      <p className="text-[10px] text-gray-500">{p.sku} • {p.packSize}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-extrabold text-blue-600">₹{p.unitPrice}</p>
                      <span className={`text-[10px] ${p.quantity <= p.minStockAlert ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                        Stock: {p.quantity}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Controls Area: Actions + Cloud + Notifications + User */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        
        {/* Quick New Bill Button */}
        <button
          onClick={() => setActiveTab('billing')}
          className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm shadow-blue-500/20 active:scale-95 transition-all"
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>New Bill</span>
        </button>

        {/* Supabase Status Pill */}
        <button
          onClick={onOpenSupabaseModal}
          className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
            supabaseConnected
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-300'
              : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:border-amber-800 dark:text-amber-300'
          }`}
          title="Supabase PostgreSQL Cloud Status"
        >
          <Database className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">{supabaseConnected ? 'Supabase' : 'Local DB'}</span>
          <span className={`w-2 h-2 rounded-full ${supabaseConnected ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
        </button>

        {/* Low Stock Notification Trigger */}
        <button
          onClick={() => setActiveTab('inventory')}
          className="relative p-2 rounded-2xl text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          title={`${lowStockCount} items low in stock`}
        >
          <Bell className="w-4 h-4" />
          {lowStockCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900" />
          )}
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-2xl text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          title="Toggle Theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>

        {/* User Profile Pill & Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-2xl hover:bg-gray-100 dark:hover:bg-slate-800 border border-transparent hover:border-gray-200 dark:hover:border-slate-700 transition-all"
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-xs ${
              isAdmin ? 'bg-amber-600' : 'bg-blue-600'
            }`}>
              {user?.name.charAt(0) || 'U'}
            </div>
            <div className="hidden xl:block text-left">
              <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                {user?.name || 'Staff User'}
              </p>
              <p className="text-[10px] text-gray-400 font-semibold">
                {isAdmin ? 'Admin / Owner' : 'Staff Access'}
              </p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 hidden sm:block" />
          </button>

          {/* User Profile Menu Dropdown */}
          {showUserDropdown && (
            <div
              className="absolute right-0 mt-2 w-56 p-2 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xl z-50 animate-in fade-in"
              onMouseLeave={() => setShowUserDropdown(false)}
            >
              <div className="px-3 py-2 border-b border-gray-100 dark:border-slate-800">
                <p className="text-xs font-bold text-slate-900 dark:text-white">{user?.name}</p>
                <p className="text-[11px] text-gray-400">{user?.email}</p>
                <div className="mt-1">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                    isAdmin ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                  }`}>
                    {isAdmin ? '👑 Admin (Owner)' : '🧑‍💼 Counter Staff'}
                  </span>
                </div>
              </div>

              <div className="py-1 text-xs">
                <button
                  onClick={() => {
                    switchRoleDemo();
                    setShowUserDropdown(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <span>Switch Role (Demo)</span>
                  <span className="text-[10px] font-bold text-blue-600">{isAdmin ? 'To Staff' : 'To Admin'}</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('settings');
                    setShowUserDropdown(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <span>Store Settings</span>
                </button>

                <button
                  onClick={() => {
                    onOpenSupabaseModal();
                    setShowUserDropdown(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <span>Supabase Cloud Keys</span>
                </button>

                <div className="border-t border-gray-100 dark:border-slate-800 mt-1 pt-1">
                  <button
                    onClick={() => {
                      logout();
                      setShowUserDropdown(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors font-semibold"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out (Clear Session)</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

    </header>
  );
};
