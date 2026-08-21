import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  Lock,
  Mail,
  Shield,
  Key,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  RefreshCw,
  Eye,
  EyeOff,
  User,
  Phone,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  Database,
  Inbox,
  Copy,
  Check,
  Zap,
} from 'lucide-react';
import { Role, SentEmailLogItem } from '../types';
import { SUPABASE_SQL_SCHEMA } from '../lib/supabase';
import { safeFetchJson } from '../services/authClient';

export interface AuthViewProps {
  initialMode?: 'login' | 'register' | 'verify';
  onSuccess?: () => void;
  isModal?: boolean;
  onClose?: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({
  initialMode = 'login',
  onSuccess,
  isModal = false,
  onClose,
}) => {
  const {
    user,
    jwtToken,
    registerUser,
    verifyOtp,
    verifyToken,
    resendOtp,
    loginWithJwt,
    logout,
    switchRoleDemo,
    pendingVerificationEmail,
    setPendingVerificationEmail,
    recentEmails,
    fetchRecentEmails,
    showToast,
    usersList,
  } = useApp();

  // Mode: 'login' | 'register' | 'verify' | 'schema'
  const [mode, setMode] = useState<'login' | 'register' | 'verify' | 'schema'>(() => {
    if (pendingVerificationEmail && initialMode !== 'register') {
      return 'verify';
    }
    return initialMode;
  });

  // Registration Form State (Step 1)
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regRole, setRegRole] = useState<Role>('admin');
  const [regPhone, setRegPhone] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  // Verification Form State (Step 2)
  const [verifyEmailInput, setVerifyEmailInput] = useState(pendingVerificationEmail || '');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [tokenInput, setTokenInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifySuccessMsg, setVerifySuccessMsg] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [isResending, setIsResending] = useState(false);
  const [expirySecondsLeft, setExpirySecondsLeft] = useState<number>(15 * 60);

  // Login Form State (Step 3)
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isUnverifiedBlocked, setIsUnverifiedBlocked] = useState(false);
  const [blockedEmail, setBlockedEmail] = useState<string | null>(null);

  // Mailbox Preview & Schema Inspector
  const [showMailboxModal, setShowMailboxModal] = useState(false);
  const [schemaSql, setSchemaSql] = useState<string>(() => SUPABASE_SQL_SCHEMA || '');
  const [copiedToken, setCopiedToken] = useState(false);

  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Sync pending email
  useEffect(() => {
    if (pendingVerificationEmail) {
      setVerifyEmailInput(pendingVerificationEmail);
      fetchRecentEmails(pendingVerificationEmail);
    }
  }, [pendingVerificationEmail]);

  // Resend cooldown timer effect
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Expiry countdown timer effect for OTP
  useEffect(() => {
    if (mode === 'verify' && expirySecondsLeft > 0) {
      const timer = setTimeout(() => setExpirySecondsLeft(t => t - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [mode, expirySecondsLeft]);

  // Load database schema if requested
  useEffect(() => {
    if (mode === 'schema' && !schemaSql) {
      safeFetchJson<any>('/api/auth/schema')
        .then(res => {
          if (!res.isHtmlOrUnavailable && res.data && res.data.schema) {
            setSchemaSql(res.data.schema);
          } else {
            setSchemaSql(SUPABASE_SQL_SCHEMA);
          }
        })
        .catch(() => {
          setSchemaSql(SUPABASE_SQL_SCHEMA);
        });
    }
  }, [mode, schemaSql]);

  // Real-time password requirement validation
  const hasMinLength = regPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(regPassword);
  const hasNumber = /[0-9]/.test(regPassword);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(regPassword);
  const isPasswordMatch = regPassword && regPassword === regConfirmPassword;
  const isPasswordStrong = hasMinLength && hasUppercase && hasNumber && hasSpecialChar;

  // --------------------------------------------------------------------------
  // STEP 1: HANDLE REGISTRATION
  // --------------------------------------------------------------------------
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regEmail || !regPassword) {
      showToast('Please provide email and password', 'warning');
      return;
    }

    if (!isPasswordStrong) {
      showToast('Please meet all password strength requirements before proceeding.', 'error');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      showToast('Passwords do not match.', 'error');
      return;
    }

    setIsRegistering(true);
    try {
      const result = await registerUser({
        name: regName.trim() || regEmail.split('@')[0],
        email: regEmail.trim(),
        password: regPassword,
        confirmPassword: regConfirmPassword,
        role: regRole,
        phone: regPhone.trim(),
      });

      if (result.success) {
        setVerifyEmailInput(regEmail.trim().toLowerCase());
        setExpirySecondsLeft(15 * 60);
        setMode('verify');
        setResendCooldown(45);
        // Pre-fill digits if devOtp returned for test ease
        if (result.devOtp) {
          setOtpDigits(result.devOtp.split(''));
        }
      } else if (result.isUnverified) {
        // If unverified account already exists, redirect to verification
        setVerifyEmailInput(regEmail.trim().toLowerCase());
        setMode('verify');
      }
    } finally {
      setIsRegistering(false);
    }
  };

  // --------------------------------------------------------------------------
  // STEP 2: HANDLE OTP & TOKEN VERIFICATION
  // --------------------------------------------------------------------------
  const handleOtpChange = (index: number, val: string) => {
    const clean = val.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = clean;
    setOtpDigits(newDigits);

    // Auto focus next input
    if (clean && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length > 0) {
      const newDigits = ['', '', '', '', '', ''];
      for (let i = 0; i < pasted.length; i++) {
        newDigits[i] = pasted[i];
      }
      setOtpDigits(newDigits);
      const focusIndex = Math.min(pasted.length, 5);
      otpInputsRef.current[focusIndex]?.focus();
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otpDigits.join('');
    if (!verifyEmailInput || otpCode.length !== 6) {
      showToast('Please enter the full 6-digit verification code.', 'warning');
      return;
    }

    setIsVerifying(true);
    try {
      const result = await verifyOtp(verifyEmailInput.trim(), otpCode);
      if (result.success) {
        setVerifySuccessMsg('Email verified successfully! You can now login.');
        setLoginEmail(verifyEmailInput);
        setTimeout(() => {
          setMode('login');
          setVerifySuccessMsg(null);
        }, 1800);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyTokenDirect = async () => {
    if (!tokenInput.trim()) {
      showToast('Please paste a verification token link or token.', 'warning');
      return;
    }

    // Extract token if user pasted full URL
    let cleanToken = tokenInput.trim();
    if (cleanToken.includes('token=')) {
      const match = cleanToken.match(/token=([a-zA-Z0-9]+)/);
      if (match && match[1]) cleanToken = match[1];
    }

    setIsVerifying(true);
    try {
      const result = await verifyToken(cleanToken, verifyEmailInput);
      if (result.success) {
        setVerifySuccessMsg('Email verified successfully! You can now login.');
        if (result.email) setLoginEmail(result.email);
        setTimeout(() => {
          setMode('login');
          setVerifySuccessMsg(null);
        }, 1800);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    if (!verifyEmailInput) {
      showToast('Please provide your registered email address.', 'warning');
      return;
    }
    if (resendCooldown > 0) return;

    setIsResending(true);
    try {
      const result = await resendOtp(verifyEmailInput.trim());
      if (result.success) {
        setResendCooldown(60);
        setExpirySecondsLeft(15 * 60);
        if (result.devOtp) {
          setOtpDigits(result.devOtp.split(''));
        }
      }
    } finally {
      setIsResending(false);
    }
  };

  // --------------------------------------------------------------------------
  // STEP 3: HANDLE SECURE LOGIN
  // --------------------------------------------------------------------------
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsUnverifiedBlocked(false);

    if (!loginEmail || !loginPassword) {
      showToast('Please enter your email and password', 'warning');
      return;
    }

    setIsLoggingIn(true);
    try {
      const result = await loginWithJwt(loginEmail.trim(), loginPassword);

      if (result.success) {
        if (onSuccess) onSuccess();
        if (onClose) onClose();
      } else if (result.isUnverified) {
        // Blocked condition: is_verified = false
        setIsUnverifiedBlocked(true);
        setBlockedEmail(result.email || loginEmail.trim());
      } else {
        setLoginError(result.message || 'Invalid email or password.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const minutesRemaining = Math.floor(expirySecondsLeft / 60);
  const secondsRemaining = expirySecondsLeft % 60;

  return (
    <div className={`w-full ${isModal ? '' : 'max-w-4xl mx-auto py-6 px-4'}`}>
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl overflow-hidden">
        
        {/* Navigation & Header Ribbon */}
        <div className="bg-slate-900 text-white p-6 relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-48 h-48 rounded-full bg-blue-600/10 blur-2xl pointer-events-none" />
          <div className="absolute right-20 top-0 w-32 h-32 rounded-full bg-indigo-500/10 blur-xl pointer-events-none" />

          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    T R Enterprise Security
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    JWT &bull; BCRYPT &bull; OTP
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Berger Paints & Hardware Enterprise Authentication Engine
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => {
                  fetchRecentEmails();
                  setShowMailboxModal(true);
                }}
                className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              >
                <Inbox className="w-3.5 h-3.5 text-amber-400" />
                <span>Simulated Mailbox</span>
                {recentEmails.length > 0 && (
                  <span className="w-4 h-4 text-[10px] rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center ml-1">
                    {recentEmails.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setMode('schema')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition ${
                  mode === 'schema'
                    ? 'bg-blue-600 text-white border-blue-500'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
              >
                <Database className="w-3.5 h-3.5 inline mr-1" />
                DB Schema
              </button>
            </div>
          </div>

          {/* Stepper Tabs */}
          <div className="grid grid-cols-3 gap-2 mt-6 pt-4 border-t border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setMode('register')}
              className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl transition ${
                mode === 'register'
                  ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-900/30'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-slate-700/80 flex items-center justify-center text-[10px] font-bold">1</span>
              <span>1. Register</span>
            </button>

            <button
              onClick={() => setMode('verify')}
              className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl transition relative ${
                mode === 'verify'
                  ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-900/30'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-slate-700/80 flex items-center justify-center text-[10px] font-bold">2</span>
              <span>2. Verify Email</span>
              {pendingVerificationEmail && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              )}
            </button>

            <button
              onClick={() => setMode('login')}
              className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl transition ${
                mode === 'login'
                  ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-900/30'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-slate-700/80 flex items-center justify-center text-[10px] font-bold">3</span>
              <span>3. Sign In (JWT)</span>
            </button>
          </div>
        </div>

        {/* Current Active Session Card */}
        {user && (
          <div className="bg-blue-50/70 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900/50 p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center shadow-sm">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-900 dark:text-white">{user.name}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 uppercase">
                    {user.role}
                  </span>
                  {user.is_verified && (
                    <span className="flex items-center text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      <CheckCircle2 className="w-3 h-3 mr-0.5" /> Verified
                    </span>
                  )}
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-[11px]">{user.email}</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <div className="hidden sm:flex items-center text-[11px] text-slate-500 font-mono bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                <Key className="w-3 h-3 text-blue-600 mr-1" />
                JWT Active
              </div>
              <button
                type="button"
                onClick={logout}
                className="px-3 py-1 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 1: REGISTRATION COMPONENT                                            */}
        {/* ========================================================================= */}
        {mode === 'register' && (
          <div className="p-6 md:p-8 animate-in fade-in">
            <div className="max-w-xl mx-auto">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Step 1: Create Secure Account
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  All accounts are created with <code className="text-blue-600 font-mono">is_verified = false</code>. Email verification is mandatory before login.
                </p>
              </div>

              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Full Name *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={regName}
                        onChange={e => setRegName(e.target.value)}
                        placeholder="e.g. Ramesh Chandra"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Account Type
                    </label>
                    <div className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-sm text-slate-900 dark:text-white font-bold flex items-center gap-2">
                      <Shield className="w-4 h-4 text-amber-500" />
                      <span>Store Owner (Admin)</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Corporate Email Address (Unique) *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={e => setRegEmail(e.target.value)}
                      placeholder="e.g. ramesh@trenterprise.com"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Password *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        required
                        value={regPassword}
                        onChange={e => setRegPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                      >
                        {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Confirm Password *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        required
                        value={regConfirmPassword}
                        onChange={e => setRegConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Live Password Strength Requirements Checklist */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-300 block mb-2">
                    Password Security Requirements:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className={`flex items-center space-x-2 ${hasMinLength ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                      {hasMinLength ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                      <span>Min. 8 characters</span>
                    </div>

                    <div className={`flex items-center space-x-2 ${hasUppercase ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                      {hasUppercase ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                      <span>At least one uppercase (A-Z)</span>
                    </div>

                    <div className={`flex items-center space-x-2 ${hasNumber ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                      {hasNumber ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                      <span>At least one number (0-9)</span>
                    </div>

                    <div className={`flex items-center space-x-2 ${hasSpecialChar ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                      {hasSpecialChar ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                      <span>At least one symbol (!@#$...)</span>
                    </div>

                    <div className={`col-span-1 sm:col-span-2 flex items-center space-x-2 pt-1 border-t border-slate-200 dark:border-slate-700 ${isPasswordMatch ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                      {isPasswordMatch ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                      <span>Passwords match identical check</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Phone Number (Optional)
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="tel"
                      value={regPhone}
                      onChange={e => setRegPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isRegistering || !isPasswordStrong || !isPasswordMatch}
                  className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-blue-600/20 transition flex items-center justify-center space-x-2"
                >
                  {isRegistering ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Hashing password & creating account...</span>
                    </>
                  ) : (
                    <>
                      <span>Register & Proceed to Verification</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 text-center text-xs text-slate-500">
                Already registered and verified?{' '}
                <button
                  onClick={() => setMode('login')}
                  className="font-bold text-blue-600 hover:underline"
                >
                  Sign in directly
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: EMAIL VERIFICATION COMPONENT (OTP & TOKEN LINK)                   */}
        {/* ========================================================================= */}
        {mode === 'verify' && (
          <div className="p-6 md:p-8 animate-in fade-in">
            <div className="max-w-xl mx-auto">
              
              {verifySuccessMsg ? (
                <div className="p-8 rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center animate-in zoom-in-95">
                  <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/30">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-black text-emerald-900 dark:text-emerald-200 mb-2">
                    Email Verified Successfully!
                  </h3>
                  <p className="text-sm text-emerald-700 dark:text-emerald-300 mb-6 font-semibold">
                    “Email verified successfully. You can now login.”
                  </p>
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition inline-flex items-center space-x-2"
                  >
                    <span>Proceed to Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="text-center mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 mx-auto flex items-center justify-center mb-3">
                      <Mail className="w-6 h-6" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                      Step 2: Verify Your Email Address
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                      A 6-digit verification OTP and secure link were dispatched to your corporate inbox. Verification is valid for 15 minutes.
                    </p>
                  </div>

                  <div className="space-y-6">
                    {/* Target Email Input */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Registered Corporate Email
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                        <input
                          type="email"
                          required
                          value={verifyEmailInput}
                          onChange={e => setVerifyEmailInput(e.target.value)}
                          placeholder="e.g. user@trenterprise.com"
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Method 1: 6-Digit OTP Code Input */}
                    <form onSubmit={handleVerifyOtp} className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center">
                          <Zap className="w-3.5 h-3.5 text-blue-600 mr-1" />
                          Enter 6-Digit OTP
                        </span>
                        <div className="flex items-center space-x-1 text-xs font-mono text-amber-600 dark:text-amber-400">
                          <Clock className="w-3.5 h-3.5" />
                          <span>
                            {String(minutesRemaining).padStart(2, '0')}:{String(secondsRemaining).padStart(2, '0')}
                          </span>
                        </div>
                      </div>

                      {/* 6 Individual Digit Boxes */}
                      <div className="flex justify-between gap-2 max-w-sm mx-auto">
                        {otpDigits.map((digit, idx) => (
                          <input
                            key={idx}
                            ref={el => (otpInputsRef.current[idx] = el)}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={e => handleOtpChange(idx, e.target.value)}
                            onKeyDown={e => handleOtpKeyDown(idx, e)}
                            onPaste={handleOtpPaste}
                            className="w-12 h-14 text-center text-xl font-mono font-bold rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition shadow-sm"
                          />
                        ))}
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <button
                          type="button"
                          onClick={handleResendOtp}
                          disabled={isResending || resendCooldown > 0}
                          className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 disabled:opacity-50 flex items-center space-x-1"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
                          <span>
                            {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend Code'}
                          </span>
                        </button>

                        <button
                          type="submit"
                          disabled={isVerifying || otpDigits.join('').length !== 6}
                          className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition flex items-center space-x-1.5"
                        >
                          {isVerifying ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Verifying OTP...</span>
                            </>
                          ) : (
                            <>
                              <span>Verify & Activate</span>
                              <Check className="w-3.5 h-3.5" />
                            </>
                          )}
                        </button>
                      </div>
                    </form>

                    {/* Method 2: Secure Token Link Direct Entry */}
                    <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          Or Verify using Secure Token / Link:
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            fetchRecentEmails(verifyEmailInput);
                            setShowMailboxModal(true);
                          }}
                          className="text-[11px] font-bold text-amber-600 hover:underline flex items-center space-x-1"
                        >
                          <Inbox className="w-3 h-3" />
                          <span>Open In-App Mailbox</span>
                        </button>
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={tokenInput}
                          onChange={e => setTokenInput(e.target.value)}
                          placeholder="Paste 64-char token or full verification URL..."
                          className="flex-1 px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleVerifyTokenDirect}
                          disabled={isVerifying || !tokenInput.trim()}
                          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition disabled:opacity-50"
                        >
                          Verify Link
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: LOGIN COMPONENT (BLOCKS IF is_verified === false)                  */}
        {/* ========================================================================= */}
        {mode === 'login' && (
          <div className="p-6 md:p-8 animate-in fade-in">
            <div className="max-w-xl mx-auto">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Step 3: Secure Sign In
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Strict email verification policy enforced. Unverified accounts will be prevented from logging in.
                </p>
              </div>

              {/* CRITICAL WARNING: Block login if is_verified = false */}
              {isUnverifiedBlocked && (
                <div className="mb-6 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-800 animate-in shake">
                  <div className="flex items-start space-x-3">
                    <ShieldAlert className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                        Login Blocked: Verification Required
                      </h4>
                      <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5 font-semibold">
                        “Please verify your email before login.”
                      </p>
                      <div className="mt-3 flex items-center space-x-3">
                        <button
                          type="button"
                          onClick={() => {
                            if (blockedEmail) setVerifyEmailInput(blockedEmail);
                            setMode('verify');
                          }}
                          className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition inline-flex items-center space-x-1.5"
                        >
                          <span>Verify {blockedEmail || 'Now'}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (blockedEmail) resendOtp(blockedEmail);
                          }}
                          className="text-xs font-bold text-amber-800 dark:text-amber-300 hover:underline"
                        >
                          Resend Code
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {loginError && !isUnverifiedBlocked && (
                <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Corporate Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={e => setLoginEmail(e.target.value)}
                      placeholder="e.g. tanmay@trenterprise.com"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Password
                    </label>
                    <span className="text-[11px] text-slate-400">Bcrypt Protected</span>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      required
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-blue-600/20 transition flex items-center justify-center space-x-2"
                >
                  {isLoggingIn ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Validating credentials & JWT session...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Sign In with Email</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* DATABASE SCHEMA & SECURITY ARCHITECTURE VIEWER                            */}
        {/* ========================================================================= */}
        {mode === 'schema' && (
          <div className="p-6 md:p-8 animate-in fade-in">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <Database className="w-5 h-5 text-blue-600" />
                  <span>PostgreSQL & Supabase Security Architecture</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Dual-layer storage engine with bcrypt hash, 15-minute token TTL, and JWT HS256 validation.
                </p>
              </div>

              <button
                onClick={() => setMode('login')}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition"
              >
                Back to Login
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 text-slate-200 font-mono text-xs overflow-x-auto max-h-96 border border-slate-800">
              <pre>{schemaSql || `-- Loading PostgreSQL Schema...`}</pre>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SIMULATED INBOX / MAILBOX DRAWER FOR TESTING                              */}
      {/* ========================================================================= */}
      {showMailboxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Inbox className="w-5 h-5 text-amber-400" />
                <span className="font-bold text-sm">Dispatched Verification Emails ({recentEmails.length})</span>
              </div>
              <button
                onClick={() => setShowMailboxModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1 rounded-lg bg-slate-800"
              >
                Close
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 flex-1">
              {recentEmails.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  <Mail className="w-8 h-8 mx-auto mb-2 text-slate-400 opacity-50" />
                  No verification emails dispatched yet. Submit Step 1 registration to see live output.
                </div>
              ) : (
                recentEmails.map(mail => (
                  <div
                    key={mail.id}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-3"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white">To: {mail.to}</span>
                        <span className="text-slate-400 block text-[11px]">Sent: {new Date(mail.sentAt).toLocaleTimeString()}</span>
                      </div>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        {mail.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">6-DIGIT OTP CODE</span>
                        <span className="text-xl font-mono font-black text-blue-600">{mail.otp}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setVerifyEmailInput(mail.to);
                          setOtpDigits(mail.otp.split(''));
                          setShowMailboxModal(false);
                          setMode('verify');
                          showToast('OTP copied to verification form!', 'info');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition"
                      >
                        Auto-Fill OTP
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-slate-500 text-[11px] truncate max-w-xs font-mono">
                        Link: {mail.verificationLink}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          verifyToken(mail.verificationToken, mail.to).then(res => {
                            if (res.success) {
                              setShowMailboxModal(false);
                              setMode('login');
                            }
                          });
                        }}
                        className="text-xs font-bold text-blue-600 hover:underline flex items-center space-x-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Simulate 1-Click Verification</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
