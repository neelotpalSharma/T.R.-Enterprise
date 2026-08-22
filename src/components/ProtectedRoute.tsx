import React from 'react';
import { useAuth } from '../context/AuthContext';
import { RefreshCw, ShieldAlert } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireAdmin?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  fallback = null,
  requireAdmin = false,
}) => {
  const { user, loading, isAuthenticated, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FB] dark:bg-[#0B0F17] transition-colors">
        <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-md">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
          <div className="text-center">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Connecting to Supabase Session
            </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
              Verifying active authentication state...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <>{fallback}</>;
  }

  if (requireAdmin && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FB] dark:bg-[#0B0F17] p-4">
        <div className="max-w-md w-full p-6 rounded-3xl bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/50 shadow-xl text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Admin Access Required
          </h2>
          <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
            Your Supabase account does not have administrator privileges to view this section. Please contact your store administrator.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
