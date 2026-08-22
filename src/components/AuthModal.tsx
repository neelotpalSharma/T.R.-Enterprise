import React from 'react';
import { AuthView } from './AuthView';
import { X } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-xl bg-slate-800/80 text-white hover:bg-slate-700 transition"
          aria-label="Close dialog"
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
