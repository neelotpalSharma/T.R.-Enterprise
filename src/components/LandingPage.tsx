import React from 'react';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard,
  Package,
  Receipt,
  FileText,
  Settings as SettingsIcon,
  LogOut,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Store,
  Palette,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  Database,
  Moon,
  Sun,
  User,
  ExternalLink,
  ChevronRight,
  Zap,
  ShoppingBag
} from 'lucide-react';
import { ActiveTab } from '../types';

interface LandingPageProps {
  onOpenAuth?: () => void;
  onOpenSupabaseModal?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenSupabaseModal }) => {
  const {
    user,
    logout,
    setActiveTab,
    products,
    invoices,
    lowStockCount,
    settings,
    isAdmin,
    supabaseConnected,
    theme,
    toggleTheme,
    showToast
  } = useApp();

  const handleNavigate = (tab: ActiveTab) => {
    setActiveTab(tab);
  };

  const handleLogout = () => {
    logout();
  };

  // Compute summary stats for landing cards
  const totalProducts = products.length;
  const totalInvoices = invoices.length;
  const todayRevenue = invoices
    .filter(inv => {
      const invDate = new Date(inv.createdAt).toDateString();
      const today = new Date().toDateString();
      return invDate === today;
    })
    .reduce((sum, inv) => sum + inv.totalAmount, 0);

  // 5 Main Navigation Sections requested by user + Shade Guide bonus
  const navCards = [
    {
      id: 'dashboard' as ActiveTab,
      title: 'Go to Dashboard',
      subtitle: 'Main Analytics & Metrics',
      description: 'Comprehensive business overview, daily sales graph, inventory turnover, and quick store metrics.',
      icon: <LayoutDashboard className="w-7 h-7 text-blue-600 dark:text-blue-400" />,
      accentBg: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/50',
      badge: 'Live Reports',
      actionLabel: 'Open Dashboard',
    },
    {
      id: 'inventory' as ActiveTab,
      title: 'Inventory',
      subtitle: 'Stock & Berger Paint Catalog',
      description: 'Manage 20L/10L/4L/1L emulsions, enamels, finishes, hardware tools, rack locations, and reorder levels.',
      icon: <Package className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />,
      accentBg: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/50',
      badge: `${totalProducts} Products`,
      actionLabel: 'Manage Stock',
      alert: lowStockCount > 0 ? `${lowStockCount} Low Stock` : undefined,
    },
    {
      id: 'billing' as ActiveTab,
      title: 'Billing & POS',
      subtitle: 'Speed Counter & GST Checkout',
      description: 'Create itemized tax invoices with auto-tax breakdown, instant barcode search, discount manager, and stock deduction.',
      icon: <Receipt className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />,
      accentBg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50',
      badge: 'Fast Checkout',
      actionLabel: 'Start New Bill',
    },
    {
      id: 'invoices' as ActiveTab,
      title: 'Invoices',
      subtitle: 'Tax Invoice History & PDF',
      description: 'View computerized tax invoices, filter by customer, track payment modes (Cash/UPI/Khata), and download print-ready PDFs.',
      icon: <FileText className="w-7 h-7 text-purple-600 dark:text-purple-400" />,
      accentBg: 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-900/50',
      badge: `${totalInvoices} Invoices`,
      actionLabel: 'View Invoices',
    },
    {
      id: 'settings' as ActiveTab,
      title: 'Settings',
      subtitle: 'Store Profile & Supabase DB',
      description: 'Configure store GSTIN, bank details, user & team permissions, theme preferences, and Supabase cloud database sync.',
      icon: <SettingsIcon className="w-7 h-7 text-amber-600 dark:text-amber-400" />,
      accentBg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/50',
      badge: supabaseConnected ? 'DB Synced' : 'Config',
      actionLabel: 'Store Settings',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FB] dark:bg-[#0B0F17] text-slate-900 dark:text-slate-100 selection:bg-blue-600 selection:text-white pb-16">
      
      {/* Top Banner Navigation Bar (Dedicated Header with Brand, Quick Actions, and Logout) */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-gray-200/80 dark:border-slate-800 px-4 sm:px-8 py-3.5 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Brand Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                  {settings.businessName || 'T R ENTERPRISE'}
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  <Sparkles className="w-2.5 h-2.5 text-blue-600 dark:text-blue-400" />
                  <span>Berger Dealer</span>
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-slate-400 truncate hidden xs:block">
                {settings.tagline || 'Your Trusted Partner in Paints & Hardware'}
              </p>
            </div>
          </div>

          {/* Top-Right Controls (Supabase, Theme, User Badge, and LOGOUT Button) */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Supabase Status Indicator */}
            {onOpenSupabaseModal && (
              <button
                onClick={onOpenSupabaseModal}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/80 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                title="Supabase PostgreSQL Database"
              >
                <Database className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span className={`w-2 h-2 rounded-full ${supabaseConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <span>{supabaseConnected ? 'Supabase Connected' : 'Cloud DB'}</span>
              </button>
            )}

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 shadow-2xs transition-colors"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            {/* User Profile Pill */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-100/80 dark:bg-slate-800/80 border border-gray-200/80 dark:border-slate-700">
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs font-black ${
                isAdmin ? 'bg-amber-600' : 'bg-blue-600'
              }`}>
                {user?.name?.charAt(0) || 'U'}
              </div>
              <span className="text-xs font-bold text-slate-900 dark:text-white max-w-[110px] truncate">
                {user?.name || 'User'}
              </span>
            </div>

            {/* REQUIRED: Logout Button in Top-Right Corner */}
            <button
              id="landing-logout-btn"
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/60 hover:bg-red-100 dark:hover:bg-red-900/40 active:scale-95 transition-all shadow-2xs"
              title="Sign Out of Portal"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>

          </div>

        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 space-y-10">
        
        {/* 1. Welcome Message with User Name (Requirement 3) */}
        <div className="relative overflow-hidden rounded-[32px] bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 p-6 sm:p-10 shadow-sm">
          
          {/* Subtle Ambient Background Gradients */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2.5 max-w-2xl">
              
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-100 dark:border-blue-900">
                <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Retail Counter Session Active</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
                Welcome back,{' '}
                <span className="text-blue-600 dark:text-blue-400">
                  {user?.name || 'Tanmay Roy'}
                </span>
                !
              </h1>

              <p className="text-sm sm:text-base text-gray-600 dark:text-slate-300 font-medium leading-relaxed">
                Your point-of-sale portal is synced and ready. Select any section below to manage inventory, bill customers, generate GST invoices, or configure store settings.
              </p>

              {/* Quick status pills */}
              <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gray-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Role: {isAdmin ? 'Owner / Admin' : 'Counter Staff'}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gray-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                  <Package className="w-3.5 h-3.5 text-blue-500" />
                  <span>{totalProducts} Total Products</span>
                </span>
                {lowStockCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-900">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    <span>{lowStockCount} Low Stock Alert</span>
                  </span>
                )}
              </div>
            </div>

            {/* Quick Hero Action Button to Start New Bill */}
            <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
              <button
                onClick={() => handleNavigate('billing')}
                className="flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm shadow-xl shadow-blue-500/25 active:scale-95 transition-all group"
              >
                <Receipt className="w-5 h-5 text-white" />
                <span>Open Billing POS</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => handleNavigate('dashboard')}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold text-xs transition-colors"
              >
                <LayoutDashboard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>View Full Dashboard</span>
              </button>
            </div>

          </div>
        </div>

        {/* 2. Clean UI Navigation Cards Grid (Requirement 3: Go to Dashboard, Inventory, Billing & POS, Invoices, Settings) */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Portal Workspaces & Modules
              </h2>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Click any section below to jump straight to the workspace with active sidebar highlighting.
              </p>
            </div>
            <span className="text-xs font-bold text-gray-400 hidden sm:block">
              6 Workspaces Available
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {navCards.map((card) => (
              <div
                key={card.id}
                onClick={() => handleNavigate(card.id)}
                className="group relative flex flex-col justify-between p-6 rounded-[28px] bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-blue-500/40 dark:hover:border-blue-500/40 transition-all duration-200 cursor-pointer overflow-hidden"
              >
                {/* Top Accent Icon & Badge */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${card.accentBg} group-hover:scale-105 transition-transform duration-200 shadow-2xs`}>
                      {card.icon}
                    </div>
                    
                    <div className="flex items-center gap-1.5">
                      {card.alert && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 animate-pulse">
                          {card.alert}
                        </span>
                      )}
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 border border-gray-200/60 dark:border-slate-700">
                        {card.badge}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-2">
                    {card.subtitle}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
                    {card.description}
                  </p>
                </div>

                {/* Bottom Card Action Footer */}
                <div className="mt-6 pt-4 border-t border-gray-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  <span>{card.actionLabel}</span>
                  <div className="w-8 h-8 rounded-xl bg-gray-50 dark:bg-slate-800 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-all">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>

              </div>
            ))}
          </div>
        </div>

        {/* 3. Quick Store Operational Snapshot */}
        <div className="p-6 rounded-[28px] bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1.5">
              <span className="text-[11px] font-black uppercase tracking-wider text-blue-300">
                Live Store Snapshot
              </span>
              <h3 className="text-xl sm:text-2xl font-black">
                {settings.businessName} &bull; {settings.city}, {settings.state}
              </h3>
              <p className="text-xs text-blue-200/80 max-w-xl">
                GSTIN: <span className="font-mono font-bold text-white">{settings.gstin}</span> &bull; Authorized Dealer for Berger Paints India & Quality Hardware.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-center min-w-[110px]">
                <p className="text-[10px] text-blue-200 uppercase font-bold">Today's Sales</p>
                <p className="text-lg font-black font-mono mt-0.5">
                  ₹{todayRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-center min-w-[100px]">
                <p className="text-[10px] text-blue-200 uppercase font-bold">Catalog Items</p>
                <p className="text-lg font-black font-mono mt-0.5">{totalProducts}</p>
              </div>

              <button
                onClick={() => handleNavigate('billing')}
                className="px-4 py-3 rounded-2xl bg-white text-slate-900 font-extrabold text-xs shadow-md hover:bg-blue-50 transition-colors flex items-center gap-1.5"
              >
                <Receipt className="w-4 h-4 text-blue-600" />
                <span>Create Bill</span>
              </button>
            </div>
          </div>
        </div>

      </main>

    </div>
  );
};
