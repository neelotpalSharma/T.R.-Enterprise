import React from 'react';
import { useApp } from '../context/AppContext';
import {
  LayoutGrid,
  LayoutDashboard,
  Package,
  Receipt,
  FileText,
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight,
  Store,
  Sparkles,
  Database,
  UserCheck,
  LogOut,
  Moon,
  Sun,
  Shield,
  X
} from 'lucide-react';
import { ActiveTab } from '../types';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenAuthModal: () => void;
  onOpenSupabaseModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  onOpenAuthModal,
  onOpenSupabaseModal
}) => {
  const {
    activeTab,
    setActiveTab,
    user,
    logout,
    isAdmin,
    supabaseConnected,
    lowStockCount,
    settings,
    theme,
    toggleTheme
  } = useApp();

  // Explicit menu items with dynamic low stock alert counts
  const menuItems = [
    {
      id: 'landing' as ActiveTab,
      label: 'Overview',
      icon: <LayoutGrid className="w-5 h-5 shrink-0" />,
      badge: undefined
    },
    {
      id: 'dashboard' as ActiveTab,
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-5 h-5 shrink-0" />,
      badge: undefined
    },
    {
      id: 'inventory' as ActiveTab,
      label: 'Inventory',
      icon: <Package className="w-5 h-5 shrink-0" />,
      badge: lowStockCount > 0 ? String(lowStockCount) : undefined,
      isAlert: lowStockCount > 0
    },
    {
      id: 'billing' as ActiveTab,
      label: 'Billing & POS',
      icon: <Receipt className="w-5 h-5 shrink-0" />,
      badge: undefined
    },
    {
      id: 'invoices' as ActiveTab,
      label: 'Invoices',
      icon: <FileText className="w-5 h-5 shrink-0" />,
      badge: undefined
    },
    {
      id: 'settings' as ActiveTab,
      label: 'Settings',
      icon: <SettingsIcon className="w-5 h-5 shrink-0" />,
      badge: undefined
    }
  ];

  const handleNavClick = (tabId: ActiveTab) => {
    setActiveTab(tabId);
    onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-gray-200/80 dark:border-slate-800 transition-all duration-300 select-none">
      
      {/* 1. Header / Brand Logo Section */}
      <div className={`flex items-center justify-between px-4 h-16 border-b border-gray-100 dark:border-slate-800 shrink-0 ${collapsed ? 'justify-center px-2' : ''}`}>
        <button
          onClick={() => handleNavClick('landing')}
          className="flex items-center gap-3 text-left group overflow-hidden focus:outline-none"
          title="T R Enterprise"
        >
          <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25 shrink-0 group-hover:scale-105 transition-transform">
            <Store className="w-5 h-5 text-white" />
          </div>
          
          {!collapsed && (
            <div className="min-w-0 transition-opacity duration-200">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white truncate">
                  {settings.businessName}
                </span>
              </div>
              <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider truncate">
                Berger Paints & Hardware
              </p>
            </div>
          )}
        </button>

        {/* Mobile close button / Desktop collapse toggle */}
        <div className="flex items-center">
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 focus:outline-none"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
          
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1.5 rounded-xl text-gray-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 2. Navigation Menu Items */}
      <div className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto overflow-x-hidden scrollbar-none">
        
        {/* Navigation group label */}
        {!collapsed && (
          <div className="px-3 pb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-slate-400">
              Main Menu
            </span>
          </div>
        )}

        {menuItems.map((item) => {
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              id={`sidebar-item-${item.id}`}
              onClick={() => handleNavClick(item.id)}
              title={collapsed ? item.label : undefined}
              className={`group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-semibold transition-all duration-200 ${
                isActive
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 font-bold shadow-xs'
                  : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-100'
              } ${collapsed ? 'justify-center px-0' : ''}`}
            >
              {/* Left active state indicator vertical bar */}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.25 h-6 bg-blue-600 rounded-r-full shadow-sm" />
              )}

              {/* Icon Container with subtle background styling */}
              <div className={`p-1.5 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                  : 'text-gray-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white group-hover:bg-gray-100 dark:group-hover:bg-slate-700/60'
              }`}>
                {item.icon}
              </div>

              {/* Menu Label */}
              {!collapsed && (
                <span className="flex-1 text-left truncate transition-opacity duration-200">
                  {item.label}
                </span>
              )}

              {/* Badge Pill (Inventory has alert red pill with actual alert count) */}
              {!collapsed && item.badge && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shadow-xs tracking-tight ${
                  item.isAlert
                    ? 'bg-red-600 text-white animate-pulse'
                    : 'bg-blue-600 text-white'
                }`}>
                  {item.badge}
                </span>
              )}

              {/* Collapsed view tooltips badge - shows number instead of just a dot */}
              {collapsed && item.badge && (
                <span className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[9px] font-black flex items-center justify-center ring-2 ring-white dark:ring-slate-900 shadow-xs ${
                  item.isAlert
                    ? 'bg-red-600 text-white animate-pulse'
                    : 'bg-blue-600 text-white'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 3. Cloud Status & Fast Billing Card */}
      {!collapsed && (
        <div className="p-3 mx-3 mb-2 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-gray-500 dark:text-slate-400 font-medium">Supabase Cloud:</span>
            <button
              onClick={onOpenSupabaseModal}
              className={`flex items-center gap-1 font-bold ${
                supabaseConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${supabaseConnected ? 'bg-emerald-500' : 'bg-amber-500 animate-ping'}`} />
              <span>{supabaseConnected ? 'Synced' : 'Connect'}</span>
            </button>
          </div>

          <button
            onClick={() => handleNavClick('billing')}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm shadow-blue-500/20 active:scale-95 transition-all"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>New POS Bill</span>
          </button>
        </div>
      )}

      {/* 4. User Profile & Role Info (Footer) */}
      <div className="p-3 border-t border-gray-100 dark:border-slate-800 shrink-0">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} gap-2`}>
          
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative">
              <div className={`w-9 h-9 rounded-2xl flex items-center justify-center text-white font-black text-xs shadow-xs ${
                isAdmin ? 'bg-amber-600' : 'bg-blue-600'
              }`}>
                {user?.name?.charAt(0) || 'U'}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
            </div>

            {!collapsed && (
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {user?.name || 'Store Staff'}
                </p>
                <div className="flex items-center gap-1">
                  <span className={`text-[10px] font-extrabold uppercase tracking-wider ${
                    isAdmin ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'
                  }`}>
                    {isAdmin ? '👑 Owner' : '🧑‍💼 Staff'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {!collapsed && (
            <div className="flex items-center gap-1">
              <button
                onClick={toggleTheme}
                className="p-1.5 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
              </button>

              <button
                onClick={logout}
                className="p-1.5 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                title="Sign Out (Destroy Session)"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}

        </div>
      </div>

    </div>
  );

  return (
    <>
      {/* Desktop Sticky Vertical Sidebar */}
      <aside
        className={`hidden lg:block sticky top-0 h-screen shrink-0 z-30 transition-all duration-300 ease-in-out ${
          collapsed ? 'w-[76px]' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Navigation Backdrop & Sheet */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
            onClick={onCloseMobile}
          />
          
          {/* Slide-in sidebar panel */}
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-300">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
