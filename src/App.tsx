import React, { useState } from 'react';
import { useApp } from './context/AppContext';
import { useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { Toast } from './components/Toast';
import { LandingPage } from './components/LandingPage';
import { Dashboard } from './components/Dashboard';
import { InventoryView } from './components/InventoryView';
import { BillingPOS } from './components/BillingPOS';
import { InvoicesList } from './components/InvoicesList';
import { SettingsView } from './components/SettingsView';
import { AddEditProductModal } from './components/AddEditProductModal';
import { QuickStockModal } from './components/QuickStockModal';
import { AuthModal } from './components/AuthModal';
import { LoginPage } from './components/LoginPage';
import { RegisterPage } from './components/RegisterPage';
import { AnimatedLandingTransition } from './components/AnimatedLandingTransition';
import { SupabaseConfigModal } from './components/SupabaseConfigModal';
import { Product } from './types';
import {
  LayoutGrid,
  LayoutDashboard,
  Package,
  Receipt,
  Settings as SettingsIcon,
  Sun,
  Moon,
  Store,
  LogIn,
  UserPlus,
  RefreshCw
} from 'lucide-react';

export const App: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    settings,
    theme,
    toggleTheme,
    lowStockCount,
  } = useApp();

  const { user, loading: authLoading } = useAuth();

  // Authentication mode for unauthenticated state ('login' | 'register')
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Animated Landing Transition state triggered right after login
  const [showAnimatedLanding, setShowAnimatedLanding] = useState(false);

  // Sidebar states (sticky, collapsible, and mobile drawer)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Modals state
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [stockAdjustProductId, setStockAdjustProductId] = useState<string | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isSupabaseOpen, setIsSupabaseOpen] = useState(false);

  const handleOpenAddProduct = () => {
    setProductToEdit(null);
    setIsAddProductOpen(true);
  };

  const handleOpenEditProduct = (product: Product) => {
    setProductToEdit(product);
    setIsAddProductOpen(true);
  };

  const handleOpenStockAdjust = (productId: string) => {
    setStockAdjustProductId(productId);
  };

  // 1. Loading State: Checking Supabase session
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] dark:bg-[#0B0F17] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 p-8 rounded-3xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin" />
          </div>
          <div className="text-center">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Connecting to Supabase Session
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Restoring authentication state...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated State: Render Pure Supabase Login / Register views
  if (!user) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] dark:bg-[#0B0F17] text-[#1A1A1A] dark:text-slate-100 flex flex-col font-sans transition-colors duration-200 antialiased selection:bg-blue-600 selection:text-white">
        <Toast />

        {/* Auth Navigation Header */}
        <header className="px-4 sm:px-8 py-4 flex items-center justify-between border-b border-gray-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-sm text-slate-900 dark:text-white tracking-tight">
                {settings.businessName || 'T R ENTERPRISE'}
              </span>
              <p className="text-[10px] text-gray-500 dark:text-slate-400">
                Paints & Hardware Portal &bull; Supabase Auth
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Switcher Tabs */}
            <div className="flex p-1 rounded-xl bg-gray-100 dark:bg-slate-800 border border-gray-200/80 dark:border-slate-700 text-xs font-bold">
              <button
                onClick={() => setAuthMode('login')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  authMode === 'login'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-gray-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
              <button
                onClick={() => setAuthMode('register')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  authMode === 'register'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-gray-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Register</span>
              </button>
            </div>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 shadow-2xs transition-colors"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>
          </div>
        </header>

        {/* Auth Body */}
        <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
          {authMode === 'login' ? (
            <LoginPage
              onSwitchToRegister={() => setAuthMode('register')}
              onLoginSuccess={() => {
                setShowAnimatedLanding(true);
              }}
            />
          ) : (
            <RegisterPage
              onSwitchToLogin={() => setAuthMode('login')}
              onRegisteredSuccess={() => {
                setAuthMode('login');
              }}
            />
          )}
        </main>

        {/* Auth Footer */}
        <footer className="py-4 text-center text-xs text-gray-400 dark:text-slate-500 border-t border-gray-200/60 dark:border-slate-800/60">
          &copy; {new Date().getFullYear()} {settings.businessName} &bull; Authorized Dealer: Berger Paints & Hardware Store
        </footer>
      </div>
    );
  }

  // 3. Animated Landing Transition Screen after login
  if (showAnimatedLanding) {
    return (
      <AnimatedLandingTransition
        user={user}
        settings={settings}
        onComplete={() => {
          setShowAnimatedLanding(false);
          setActiveTab('dashboard');
        }}
      />
    );
  }

  // 4. Authenticated State: Full Portal Application
  return (
    <div className="min-h-screen bg-[#F8F9FB] dark:bg-[#0B0F17] text-[#1A1A1A] dark:text-slate-100 flex font-sans transition-colors duration-200 antialiased selection:bg-blue-600 selection:text-white">
      
      {/* Toast Notification Container */}
      <Toast />

      {/* Modern Dashboard Layout: Left Vertical Sidebar (Collapsible & Responsive) */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onOpenAuthModal={() => setIsAuthOpen(true)}
        onOpenSupabaseModal={() => setIsSupabaseOpen(true)}
      />

      {/* Right Main Application Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden">
        
        {/* Top Header Bar (Search, Breadcrumbs, Quick Actions, Supabase, Profile) */}
        <TopHeader
          onToggleMobileSidebar={() => setMobileSidebarOpen(true)}
          onOpenAddProduct={handleOpenAddProduct}
          onOpenAuthModal={() => setIsAuthOpen(true)}
          onOpenSupabaseModal={() => setIsSupabaseOpen(true)}
        />

        {/* Main View Router */}
        <main className="flex-1 pb-20 lg:pb-8">
          {activeTab === 'landing' && (
            <LandingPage
              onOpenAuth={() => setIsAuthOpen(true)}
              onOpenSupabaseModal={() => setIsSupabaseOpen(true)}
            />
          )}

          {activeTab === 'dashboard' && (
            <Dashboard
              onOpenAddProduct={handleOpenAddProduct}
              onOpenStockAdjust={handleOpenStockAdjust}
            />
          )}

          {activeTab === 'inventory' && (
            <InventoryView
              onOpenAddProduct={handleOpenAddProduct}
              onOpenEditProduct={handleOpenEditProduct}
              onOpenStockAdjust={handleOpenStockAdjust}
            />
          )}

          {activeTab === 'billing' && <BillingPOS />}

          {activeTab === 'invoices' && <InvoicesList />}

          {activeTab === 'settings' && (
            <SettingsView onOpenSupabaseModal={() => setIsSupabaseOpen(true)} />
          )}
        </main>

        {/* Bottom Footer inside main container */}
        <footer className="border-t border-gray-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 py-5 px-6 text-center text-xs text-gray-500 dark:text-slate-400">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <p>
              &copy; {new Date().getFullYear()} <strong className="text-slate-900 dark:text-slate-200">{settings.businessName}</strong> &bull; Authorized Dealer: Berger Paints & Hardware Store
            </p>
            <div className="flex items-center gap-4 text-[11px]">
              <span>GSTIN: <strong className="font-mono text-gray-700 dark:text-slate-300">{settings.gstin}</strong></span>
              <span>&bull;</span>
              <button
                onClick={() => setIsSupabaseOpen(true)}
                className="text-blue-600 dark:text-blue-400 hover:underline font-bold"
              >
                Supabase Database
              </button>
            </div>
          </div>
        </footer>

      </div>

      {/* Floating Bottom Navigation for Quick Mobile Access */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-gray-200 dark:border-slate-800 px-3 py-2 flex items-center justify-around shadow-lg">
        <button
          onClick={() => setActiveTab('landing')}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
            activeTab === 'landing' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-slate-400'
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          <span>Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
            activeTab === 'dashboard' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-slate-400'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Dashboard</span>
        </button>

        {/* Central Prominent POS Bill Button */}
        <button
          onClick={() => setActiveTab('billing')}
          className="relative -top-3.5 w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 active:scale-95 transition-transform"
          title="New POS Bill"
        >
          <Receipt className="w-5 h-5" />
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`relative flex flex-col items-center gap-0.5 text-[10px] font-bold ${
            activeTab === 'inventory' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-slate-400'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Inventory</span>
          {lowStockCount > 0 && (
            <span className="absolute -top-1 -right-1.5 min-w-[17px] h-[17px] px-1 rounded-full text-[9px] font-black bg-red-600 text-white flex items-center justify-center ring-1 ring-white dark:ring-slate-900 shadow-xs animate-pulse">
              {lowStockCount > 99 ? '99+' : lowStockCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
            activeTab === 'settings' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-slate-400'
          }`}
        >
          <SettingsIcon className="w-4 h-4" />
          <span>Settings</span>
        </button>
      </div>

      {/* Global Application Modals */}
      <AddEditProductModal
        isOpen={isAddProductOpen}
        onClose={() => {
          setIsAddProductOpen(false);
          setProductToEdit(null);
        }}
        productToEdit={productToEdit}
      />

      <QuickStockModal
        isOpen={stockAdjustProductId !== null}
        onClose={() => setStockAdjustProductId(null)}
        productId={stockAdjustProductId || ''}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
      />

      <SupabaseConfigModal
        isOpen={isSupabaseOpen}
        onClose={() => setIsSupabaseOpen(false)}
      />

    </div>
  );
};

export default App;
