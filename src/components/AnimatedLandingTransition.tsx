import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Store, ShieldCheck, Sparkles, CheckCircle2, ArrowRight, Layers, Receipt } from 'lucide-react';
import { User, StoreSettings } from '../types';

interface AnimatedLandingTransitionProps {
  user: User | null;
  settings: StoreSettings;
  onComplete: () => void;
}

export const AnimatedLandingTransition: React.FC<AnimatedLandingTransitionProps> = ({
  user,
  settings,
  onComplete
}) => {
  const [progress, setProgress] = useState(0);
  const [statusIndex, setStatusIndex] = useState(0);

  const statusMessages = [
    { text: 'Securing encrypted store session...', icon: ShieldCheck },
    { text: 'Syncing Berger paint catalog & stock levels...', icon: Layers },
    { text: 'Preparing Point of Sale & Billing counter...', icon: Receipt },
    { text: 'Workspace ready! Launching dashboard...', icon: CheckCircle2 }
  ];

  useEffect(() => {
    // Total animation runtime ~2.2 seconds
    const totalDuration = 2200;
    const intervalTime = 30;
    const step = 100 / (totalDuration / intervalTime);

    const timer = setInterval(() => {
      setProgress(prev => {
        const next = prev + step;
        if (next >= 100) {
          clearInterval(timer);
          setTimeout(() => {
            onComplete();
          }, 350);
          return 100;
        }

        // Update status index based on progress
        if (next < 30) setStatusIndex(0);
        else if (next < 65) setStatusIndex(1);
        else if (next < 90) setStatusIndex(2);
        else setStatusIndex(3);

        return next;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [onComplete]);

  const CurrentStatusIcon = statusMessages[statusIndex]?.icon || Sparkles;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#0A0E1A] text-white select-none">
      
      {/* Animated Fluid Mesh Gradient Background */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.35, 0.55, 0.35],
          rotate: [0, 45, 0]
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
        className="absolute -top-32 -left-32 w-[550px] h-[550px] rounded-full bg-gradient-to-br from-blue-600/40 via-indigo-600/30 to-transparent blur-3xl pointer-events-none"
      />

      <motion.div
        animate={{
          scale: [1.1, 0.95, 1.1],
          opacity: [0.3, 0.5, 0.3],
          rotate: [0, -45, 0]
        }}
        transition={{
          duration: 9,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 0.5
        }}
        className="absolute -bottom-32 -right-32 w-[600px] h-[600px] rounded-full bg-gradient-to-tl from-emerald-600/30 via-blue-700/30 to-purple-600/20 blur-3xl pointer-events-none"
      />

      {/* Grid line pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Main Centered Content Container */}
      <div className="relative z-10 w-full max-w-md px-6 text-center">
        
        {/* Animated Brand Logo Icon with Pulse Ring */}
        <div className="relative inline-block mb-6">
          <motion.div
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              type: 'spring',
              stiffness: 260,
              damping: 20,
              duration: 0.8
            }}
            className="relative w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-2xl shadow-blue-500/40 ring-1 ring-white/20"
          >
            <Store className="w-10 h-10 text-white" />
            
            {/* Glowing orbital ring */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
              className="absolute -inset-2 rounded-[28px] border border-blue-400/40 border-dashed pointer-events-none"
            />
          </motion.div>

          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-0 rounded-3xl bg-blue-500/30 blur-md pointer-events-none"
          />
        </div>

        {/* Business Name and Tagline */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="space-y-1 mb-6"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-widest bg-blue-500/15 text-blue-300 border border-blue-400/30 shadow-xs mb-1">
            <Sparkles className="w-3 h-3 text-blue-400" />
            <span>Authorized Berger Dealer</span>
          </div>

          <h2 className="text-xl font-black tracking-tight text-white/90 uppercase">
            {settings.businessName || 'T R ENTERPRISE'}
          </h2>
          <p className="text-xs text-slate-400 font-medium">
            Paints & Hardware Enterprise Management
          </p>
        </motion.div>

        {/* Personalized Welcome Typography */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="bg-white/[0.04] border border-white/10 rounded-3xl p-5 mb-6 backdrop-blur-xl shadow-2xl"
        >
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-1">
            Welcome back,{' '}
            <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-300 bg-clip-text text-transparent">
              {user?.name || 'Authorized User'}
            </span>
          </h1>

          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{user?.role === 'admin' ? 'Owner / Admin Session' : 'Counter Staff Session'}</span>
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {user?.email}
            </span>
          </div>
        </motion.div>

        {/* Loading Spinner, Dynamic Status & Progress Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45, duration: 0.4 }}
          className="space-y-3"
        >
          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium px-1">
              <span className="flex items-center gap-1.5 text-blue-300 font-semibold">
                <CurrentStatusIcon className="w-3.5 h-3.5 animate-pulse" />
                <span>{statusMessages[statusIndex]?.text}</span>
              </span>
              <span className="font-mono text-xs text-slate-300 font-bold">
                {Math.min(100, Math.round(progress))}%
              </span>
            </div>

            <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden p-0.5 border border-white/10">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 via-sky-400 to-emerald-400 shadow-lg shadow-blue-500/50"
                style={{ width: `${progress}%` }}
                transition={{ ease: 'linear' }}
              />
            </div>
          </div>

          {/* Quick Skip Button */}
          <div className="pt-2">
            <button
              onClick={onComplete}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-xl hover:bg-white/5 transition-all font-medium"
            >
              <span>Skip directly to dashboard</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </motion.div>

      </div>

    </div>
  );
};
