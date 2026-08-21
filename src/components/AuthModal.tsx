import React from 'react';
import { X } from 'lucide-react';
import { AuthView } from './AuthView';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register' | 'verify';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="w-full max-w-2xl relative my-8">
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 z-20 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-lg hover:bg-slate-800 transition"
          aria-label="Close authentication modal"
        >
          <X className="w-4 h-4" />
        </button>

        <AuthView
          initialMode={initialMode}
          isModal={true}
          onSuccess={onClose}
          onClose={onClose}
        />
      </div>
    </div>
  );
};
