import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Paintbrush,
  Layers,
  FileSpreadsheet,
  ReceiptText,
  Palette,
  Settings,
  Sun,
  Moon,
  Database,
  AlertTriangle,
  UserCheck,
  LogOut,
  Sparkles,
  ChevronDown,
  Store,
  Menu,
  X
} from 'lucide-react';
import { ActiveTab } from '../types';

interface NavbarProps {
  onOpenAuthModal: () => void;
  onOpenSupabaseModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAuthModal, onOpenSupabaseModal }) => {
  const {
    activeTab,
    setActiveTab,
    theme,
    toggleTheme,
    user,
    logout,
    switchRoleDemo,
    lowStockCount,
    supabaseConnected,
    isCheckingSupabase,
    settings
  } = useApp();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <Layers className="w-4 h-4" /> },
    { id: 'inventory', label: 'Inventory', icon: <Paintbrush className="w-4 h-4" />, badge: lowStockCount > 0 ? lowStockCount : undefined },
    { id: 'billing', label: 'Billing & POS', icon: <ReceiptText className="w-4 h-4" /> },
    { id: 'invoices', label: 'Invoices', icon: <FileSpreadsheet className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> }
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 py-2">
          
          {/* Brand Identity */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('landing')}
              className="flex items-center gap-3 text-left group focus:outline-none"
              title="Go to Landing Page"
            >
              <div className="w-11 h-11 rounded-2xl bg-blue-700 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <Store className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-xl tracking-tight text-blue-950 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {settings.businessName}
                  </span>
                  <span className="hidden sm:inline-block px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 rounded-full border border-blue-100 dark:border-blue-900">
                    Berger Dealer
                  </span>
                </div>
                <p className="text-[11px] font-semibold text-gray-400 dark:text-slate-400 uppercase tracking-widest">
                  Berger Paints & Hardware
                </p>
              </div>
            </button>
          </div>

          {/* Desktop Bento Navigation Tabs */}
          <nav className="hidden lg:flex items-center bg-gray-50 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-gray-200/60 dark:border-slate-700/60 gap-1">
            <button
              onClick={() => setActiveTab('landing')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'landing'
                  ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Overview
            </button>

            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-tab-${item.id}`}
                  onClick={() => setActiveTab(item.id)}
                  className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                      : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/70 dark:hover:bg-slate-700/50'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                        isActive
                          ? 'bg-white text-blue-700'
                          : 'bg-red-600 text-white animate-pulse'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2.5">
            
            {/* Supabase Status Bento Pill */}
            <button
              onClick={onOpenSupabaseModal}
              title="Supabase Cloud Database Status & Configuration"
              className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-2xl text-xs font-semibold border transition-all ${
                supabaseConnected
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-300'
                  : 'border-gray-200 bg-white text-gray-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 hover:border-blue-300'
              }`}
            >
              <Database className={`w-3.5 h-3.5 ${isCheckingSupabase ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">{supabaseConnected ? 'Supabase Connected' : 'Supabase Sync'}</span>
              <span className={`w-2 h-2 rounded-full ${supabaseConnected ? 'bg-emerald-500' : 'bg-blue-500'}`} />
            </button>

            {/* Low Stock Warning Pill */}
            {lowStockCount > 0 && (
              <button
                onClick={() => setActiveTab('inventory')}
                title={`${lowStockCount} items low on stock`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-bold bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-900 hover:bg-red-100 transition-colors"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                <span>{lowStockCount} Low</span>
              </button>
            )}

            {/* Theme Toggle */}
            <button
              id="theme-toggle-btn"
              onClick={toggleTheme}
              className="p-2.5 rounded-2xl border border-gray-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            {/* User Account / Role Switcher Bento Widget */}
            {user ? (
              <div className="relative">
                <button
                  id="user-profile-btn"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2.5 p-1.5 pr-3 rounded-2xl bg-white dark:bg-slate-800 border border-gray-200/80 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all text-left shadow-sm"
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-extrabold text-white ${
                    user.role === 'admin' ? 'bg-blue-700' : 'bg-slate-700'
                  }`}>
                    {user?.name?.charAt(0) || 'U'}
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-xs font-bold text-gray-900 dark:text-slate-100 leading-tight truncate max-w-[100px]">
                      {user.name}
                    </p>
                    <span className="text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400">
                      {user.role}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                </button>

                {/* Dropdown Menu */}
                {showUserMenu && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setShowUserMenu(false)} />
                    <div className="absolute right-0 mt-2 w-64 rounded-3xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl p-4 z-30 animate-in fade-in zoom-in-95 space-y-3">
                      <div className="border-b border-gray-100 dark:border-slate-800 pb-3">
                        <p className="text-xs font-extrabold text-gray-900 dark:text-white truncate">{user.name}</p>
                        <p className="text-[11px] text-gray-400 truncate">{user.email}</p>
                        <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          <UserCheck className="w-3 h-3 text-amber-600" />
                          <span>Sole Store Owner</span>
                        </div>
                      </div>

                      <div className="border-t border-gray-100 dark:border-slate-800 pt-2 flex items-center justify-between text-xs">
                        <button
                          onClick={() => {
                            setShowUserMenu(false);
                            setActiveTab('settings');
                          }}
                          className="font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                        >
                          <Settings className="w-3.5 h-3.5" />
                          <span>Settings</span>
                        </button>
                        <button
                          onClick={() => {
                            logout();
                            setShowUserMenu(false);
                          }}
                          className="font-bold text-red-600 hover:underline flex items-center gap-1"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenAuthModal}
                className="px-4 py-2 rounded-2xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-all"
              >
                Sign In
              </button>
            )}

            {/* Mobile Menu Hamburger */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="lg:hidden p-2.5 rounded-2xl border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300"
            >
              {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

          </div>

        </div>

        {/* Mobile Dropdown Navigation */}
        {showMobileMenu && (
          <div className="lg:hidden border-t border-gray-200 dark:border-slate-800 py-3 space-y-1 animate-in slide-in-from-top-2">
            <button
              onClick={() => {
                setActiveTab('landing');
                setShowMobileMenu(false);
              }}
              className="w-full text-left px-4 py-2 rounded-xl text-xs font-bold text-gray-700 dark:text-slate-300 hover:bg-gray-100"
            >
              Store Overview
            </button>
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setShowMobileMenu(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-2 rounded-xl text-xs font-bold ${
                  activeTab === item.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-600 text-white">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

      </div>
    </header>
  );
};
