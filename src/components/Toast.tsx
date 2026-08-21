import React from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle2, AlertTriangle, Info, XCircle } from 'lucide-react';

export const Toast: React.FC = () => {
  const { toast } = useApp();
  if (!toast) return null;

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
    error: <XCircle className="w-5 h-5 text-rose-500 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />,
    info: <Info className="w-5 h-5 text-blue-500 shrink-0" />
  };

  const bgStyles = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/80 dark:border-emerald-800 dark:text-emerald-100',
    error: 'border-rose-200 bg-rose-50 text-rose-950 dark:bg-rose-950/80 dark:border-rose-800 dark:text-rose-100',
    warning: 'border-amber-200 bg-amber-50 text-amber-950 dark:bg-amber-950/80 dark:border-amber-800 dark:text-amber-100',
    info: 'border-blue-200 bg-blue-50 text-blue-950 dark:bg-blue-950/80 dark:border-blue-800 dark:text-blue-100'
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200">
      <div
        id="app-toast"
        className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl backdrop-blur-md max-w-md ${bgStyles[toast.type]}`}
      >
        {icons[toast.type]}
        <p className="text-sm font-medium leading-snug">{toast.message}</p>
      </div>
    </div>
  );
};
