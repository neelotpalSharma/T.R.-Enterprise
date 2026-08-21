import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, Invoice, StoreSettings, User, Role, ActiveTab, StockAdjustmentLog, SentEmailLogItem } from '../types';
import { initialProducts, initialInvoices, initialStoreSettings, initialUsers } from '../data/seedData';
import { getSupabaseClient, testSupabaseConnection } from '../lib/supabase';
import { safeFetchJson, localAuth } from '../services/authClient';

interface ToastInfo {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface RegisterParams {
  email: string;
  password: string;
  confirmPassword?: string;
  name: string;
  role?: 'admin' | 'staff';
  phone?: string;
  purgePrevious?: boolean;
}

interface AuthResponse {
  success: boolean;
  message?: string;
  isUnverified?: boolean;
  isRegistrationLocked?: boolean;
  email?: string;
  token?: string;
  user?: User;
  devOtp?: string;
  expiresAt?: string;
  alreadyVerified?: boolean;
}

interface SystemStatus {
  singleUserMode: boolean;
  hasRegisteredOwner: boolean;
  ownerEmail: string | null;
  ownerName?: string | null;
  allowRegistration: boolean;
  registrationLocked?: boolean;
  previousOwnersCount?: number;
  previousOwnerEmails?: string[];
}

interface AppContextType {
  user: User | null;
  jwtToken: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  systemStatus: SystemStatus | null;
  isRegistrationLocked: boolean;
  toggleRegistrationLock: (locked: boolean) => Promise<{ success: boolean; message: string; registrationLocked: boolean }>;
  checkSystemStatus: () => Promise<SystemStatus | null>;
  previousCredentialsCount: number;
  previousOwnerEmails: string[];
  deletePreviousCredentials: () => Promise<{ success: boolean; message: string; purgedCount: number; purgedEmails: string[] }>;
  checkPreviousCredentials: () => Promise<void>;
  pendingVerificationEmail: string | null;
  setPendingVerificationEmail: (email: string | null) => void;
  loginWithJwt: (email: string, password: string) => Promise<AuthResponse>;
  registerUser: (params: RegisterParams) => Promise<AuthResponse>;
  verifyOtp: (email: string, otp: string) => Promise<AuthResponse>;
  verifyToken: (token: string, email?: string) => Promise<AuthResponse>;
  resendOtp: (email: string) => Promise<AuthResponse>;
  login: (email: string, password?: string, demoRole?: Role) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  switchRoleDemo: (role?: Role) => void;
  recentEmails: SentEmailLogItem[];
  fetchRecentEmails: (emailFilter?: string) => Promise<SentEmailLogItem[]>;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  products: Product[];
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<boolean>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<boolean>;
  deleteProduct: (id: string) => Promise<boolean>;
  adjustStock: (productId: string, quantityChange: number, reason: string, type: 'in' | 'out' | 'adjustment' | 'damage') => Promise<boolean>;
  stockLogs: StockAdjustmentLog[];
  invoices: Invoice[];
  createInvoice: (invoiceData: Omit<Invoice, 'id' | 'createdAt' | 'createdBy' | 'createdByName'>) => Promise<Invoice>;
  updateInvoicePaymentStatus: (invoiceId: string, status: 'Paid' | 'Pending' | 'Partial') => void;
  deleteInvoice: (invoiceId: string, restoreStock?: boolean) => Promise<boolean>;
  settings: StoreSettings;
  updateSettings: (newSettings: Partial<StoreSettings>) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  toast: ToastInfo | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  supabaseConnected: boolean;
  isCheckingSupabase: boolean;
  syncWithSupabase: () => Promise<void>;
  lowStockCount: number;
  usersList: User[];
  addUser: (user: Omit<User, 'id' | 'joinedDate'>) => void;
  deleteUser: (userId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('tr_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  useEffect(() => {
    try {
      localStorage.setItem('tr_theme', theme);
      const root = document.documentElement;
      if (theme === 'dark') {
        root.classList.add('dark');
        root.classList.remove('light');
        root.setAttribute('data-theme', 'dark');
        root.style.colorScheme = 'dark';
      } else {
        root.classList.remove('dark');
        root.classList.add('light');
        root.setAttribute('data-theme', 'light');
        root.style.colorScheme = 'light';
      }
    } catch (e) {
      console.warn('Theme update error:', e);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      showToast(`Switched to ${next === 'dark' ? 'Dark' : 'Light'} Mode`, 'info');
      return next;
    });
  };

  // Toast state
  const [toast, setToast] = useState<ToastInfo | null>(null);
  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    const id = Date.now();
    setToast({ id, message, type });
    setTimeout(() => {
      setToast(current => (current?.id === id ? null : current));
    }, 4000);
  };

  // User & JWT Authentication state
  const [usersList, setUsersList] = useState<User[]>(() => {
    const saved = localStorage.getItem('tr_users');
    return saved ? JSON.parse(saved) : initialUsers;
  });

  const [jwtToken, setJwtToken] = useState<string | null>(() => {
    return localStorage.getItem('tr_jwt_token') || null;
  });

  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('tr_current_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && typeof parsed.role === 'string') {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse cached user:', e);
    }
    return null;
  });

  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(() => {
    return localStorage.getItem('tr_pending_verify_email') || null;
  });

  const [recentEmails, setRecentEmails] = useState<SentEmailLogItem[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [previousCredentialsCount, setPreviousCredentialsCount] = useState<number>(0);
  const [previousOwnerEmails, setPreviousOwnerEmails] = useState<string[]>([]);

  const checkSystemStatus = async (): Promise<SystemStatus | null> => {
    try {
      const res = await safeFetchJson<any>('/api/auth/system-status');
      if (!res.isHtmlOrUnavailable && res.data && res.data.success) {
        const data = res.data;
        setSystemStatus(data);
        if (typeof data.previousOwnersCount === 'number') {
          setPreviousCredentialsCount(data.previousOwnersCount);
        }
        if (Array.isArray(data.previousOwnerEmails)) {
          setPreviousOwnerEmails(data.previousOwnerEmails);
        }
        return data;
      }
    } catch (e) {
      console.warn('System status fetch warning:', e);
    }
    // Fallback for GitHub Pages static host / offline
    const localStatus = localAuth.getSystemStatus();
    setSystemStatus(localStatus);
    setPreviousCredentialsCount(localStatus.previousOwnersCount || 0);
    setPreviousOwnerEmails(localStatus.previousOwnerEmails || []);
    return localStatus;
  };

  const checkPreviousCredentials = async () => {
    if (!jwtToken) return;
    try {
      const res = await safeFetchJson<any>('/api/auth/previous-credentials', {
        headers: { Authorization: `Bearer ${jwtToken}` }
      });
      if (!res.isHtmlOrUnavailable && res.data && res.data.success) {
        setPreviousCredentialsCount(res.data.previousOwnersCount || 0);
        setPreviousOwnerEmails(res.data.previousOwners ? res.data.previousOwners.map((u: any) => u.email) : []);
        return;
      }
    } catch (e) {
      console.warn('Check previous credentials warning:', e);
    }
    // Fallback: check local storage
    const status = localAuth.getSystemStatus();
    setPreviousCredentialsCount(status.previousOwnersCount || 0);
    setPreviousOwnerEmails(status.previousOwnerEmails || []);
  };

  const deletePreviousCredentials = async (): Promise<{ success: boolean; message: string; purgedCount: number; purgedEmails: string[] }> => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (jwtToken) {
        headers['Authorization'] = `Bearer ${jwtToken}`;
      }

      const res = await safeFetchJson<any>('/api/auth/delete-previous-credentials', {
        method: 'POST',
        headers,
      });

      if (!res.isHtmlOrUnavailable && res.data) {
        const data = res.data;
        if (!res.ok || !data.success) {
          showToast(data.message || 'Failed to delete previous credentials', 'error');
          return { success: false, message: data.message || 'Failed', purgedCount: 0, purgedEmails: [] };
        }

        setPreviousCredentialsCount(0);
        setPreviousOwnerEmails([]);
        if (user) {
          setUsersList([user]);
        }
        await checkSystemStatus();

        showToast('Previous credentials permanently deleted. Previous owner cannot login again.', 'success');
        return {
          success: true,
          message: data.message,
          purgedCount: data.purgedCount || 0,
          purgedEmails: data.purgedEmails || []
        };
      }
    } catch (err: any) {
      console.warn('Backend delete credentials warning:', err);
    }

    // Static GitHub Pages / Offline fallback
    const localResult = localAuth.deletePreviousCredentials(user?.email);
    setPreviousCredentialsCount(0);
    setPreviousOwnerEmails([]);
    if (user) {
      setUsersList([user]);
    }
    await checkSystemStatus();
    showToast('Previous credentials permanently deleted. Previous owner cannot login again.', 'success');
    return localResult;
  };

  const toggleRegistrationLock = async (locked: boolean): Promise<{ success: boolean; message: string; registrationLocked: boolean }> => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (jwtToken) {
        headers['Authorization'] = `Bearer ${jwtToken}`;
      }

      const res = await safeFetchJson<any>('/api/auth/toggle-registration-lock', {
        method: 'POST',
        headers,
        body: JSON.stringify({ locked }),
      });

      if (!res.isHtmlOrUnavailable && res.data) {
        const data = res.data;
        if (!res.ok || !data.success) {
          showToast(data.message || 'Failed to update registration lock', 'error');
          return { success: false, message: data.message || 'Failed', registrationLocked: !locked };
        }

        await checkSystemStatus();
        showToast(data.message || (locked ? 'Registration locked' : 'Registration unlocked'), 'success');
        return {
          success: true,
          message: data.message,
          registrationLocked: data.registrationLocked,
        };
      }
    } catch (err: any) {
      console.warn('Registration lock backend notice:', err);
    }

    // Static fallback
    localAuth.setRegistrationLocked(locked);
    await checkSystemStatus();
    showToast(locked ? 'Registration locked by Owner' : 'Registration unlocked by Owner', 'success');
    return {
      success: true,
      message: locked ? 'Registration locked' : 'Registration unlocked',
      registrationLocked: locked,
    };
  };

  const isRegistrationLocked = !!systemStatus?.registrationLocked;

  useEffect(() => {
    checkSystemStatus();
  }, []);

  useEffect(() => {
    if (jwtToken && user) {
      checkPreviousCredentials();
    }
  }, [jwtToken, user]);

  useEffect(() => {
    if (user && typeof user === 'object' && typeof user.role === 'string') {
      try {
        localStorage.setItem('tr_current_user', JSON.stringify({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          is_verified: user.is_verified,
        }));
      } catch (err) {
        console.error('Failed to serialize user to localStorage:', err);
      }
    } else if (!user) {
      localStorage.removeItem('tr_current_user');
    }
  }, [user]);

  useEffect(() => {
    if (jwtToken) {
      localStorage.setItem('tr_jwt_token', jwtToken);
    } else {
      localStorage.removeItem('tr_jwt_token');
    }
  }, [jwtToken]);

  useEffect(() => {
    if (pendingVerificationEmail) {
      localStorage.setItem('tr_pending_verify_email', pendingVerificationEmail);
    } else {
      localStorage.removeItem('tr_pending_verify_email');
    }
  }, [pendingVerificationEmail]);

  // Fetch recent simulated/delivered emails
  const fetchRecentEmails = async (emailFilter?: string): Promise<SentEmailLogItem[]> => {
    try {
      const url = emailFilter
        ? `/api/auth/recent-emails?email=${encodeURIComponent(emailFilter)}`
        : '/api/auth/recent-emails';
      const res = await safeFetchJson<any>(url);
      if (!res.isHtmlOrUnavailable && res.data && res.data.success && Array.isArray(res.data.emails)) {
        setRecentEmails(res.data.emails);
        return res.data.emails;
      }
    } catch (e) {
      console.warn('Failed to fetch recent emails from API:', e);
    }
    // Fallback: local simulated emails log
    const localLogs = localAuth.getRecentEmails();
    const filtered = emailFilter
      ? localLogs.filter(e => e.to.toLowerCase() === emailFilter.trim().toLowerCase())
      : localLogs;
    setRecentEmails(filtered);
    return filtered;
  };

  // URL query parameter verification listener (?verify_token=... or ?token=...)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('verify_token') || urlParams.get('token');
    const email = urlParams.get('email');

    if (token) {
      (async () => {
        try {
          const res = await safeFetchJson<any>(`/api/auth/verify-token?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email || '')}`);
          if (!res.isHtmlOrUnavailable && res.data && res.data.success) {
            showToast('Email verified successfully! You can now login.', 'success');
            setPendingVerificationEmail(null);
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
            return;
          }
        } catch {
          // ignore
        }
        // Fallback local verify
        localAuth.verifyToken(token, email || undefined);
        showToast('Email verified successfully! You can now login.', 'success');
        setPendingVerificationEmail(null);
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      })();
    }
  }, []);

  // Fetch verified profile on mount if JWT token exists
  useEffect(() => {
    if (jwtToken) {
      safeFetchJson<any>('/api/auth/me', {
        headers: { Authorization: `Bearer ${jwtToken}` },
      })
        .then(res => {
          if (!res.isHtmlOrUnavailable && res.data && res.data.success && res.data.user) {
            setUser(prev => ({
              ...(prev || {}),
              ...res.data.user,
              token: jwtToken,
            }));
          }
        })
        .catch(() => {});
    }
  }, [jwtToken]);

  // Supabase Auth state change listener
  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setJwtToken(null);
          setUser(null);
          localStorage.removeItem('tr_jwt_token');
          localStorage.removeItem('tr_current_user');
        } else if (event === 'SIGNED_IN' && session?.user) {
          const userMeta = session.user.user_metadata || {};
          const sbEmail = session.user.email || '';
          const supaUser: User = {
            id: session.user.id,
            email: sbEmail,
            name: userMeta.full_name || userMeta.name || sbEmail.split('@')[0] || 'User',
            role: (userMeta.role === 'admin' ? 'admin' : 'staff'),
            is_verified: true,
            phone: userMeta.phone,
          };
          setUser(prev => prev || supaUser);
        }
      });

      return () => {
        authListener?.subscription?.unsubscribe();
      };
    } catch (err) {
      console.warn('Supabase auth listener setup warning:', err);
    }
  }, []);

  // Tab navigation
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // Store Settings
  const [settings, setSettings] = useState<StoreSettings>(() => {
    const saved = localStorage.getItem('tr_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure new store profile defaults are applied smoothly
        const merged: StoreSettings = {
          ...initialStoreSettings,
          ...parsed,
          businessName: parsed.businessName === 'T R Enterprise' || !parsed.businessName ? 'T. R. Enterprise' : parsed.businessName,
          gstin: parsed.gstin === '19AAACT8821K1ZM' || !parsed.gstin ? '18ANOPT3702B1Z1' : parsed.gstin,
          phone: parsed.phone === '+91 98301 45678 / +91 33 2456 7890' || !parsed.phone ? '7002006152' : parsed.phone,
          email: (parsed.email === 'trenterprise.paints@gmail.com' || parsed.email === 'neelotpal9004@gmail.com' || !parsed.email) ? 'prachir.thakuria.pt@gmail.com' : parsed.email,
          address: (parsed.address === 'Shop No. 14, Grand Trunk Road, Near City Hardware Market' || !parsed.address) ? 'Kahikuchi, Ganakpara, SOS Road' : parsed.address,
          city: (parsed.city === 'Kolkata' || !parsed.city) ? 'Kamrup (M)' : parsed.city,
          state: (parsed.state === 'West Bengal' || !parsed.state) ? 'Assam' : parsed.state,
          pincode: (parsed.pincode === '700001' || !parsed.pincode) ? '781017' : parsed.pincode,
          bankName: (parsed.bankName === 'State Bank of India' || !parsed.bankName) ? 'UCO Bank' : parsed.bankName,
          accountName: (parsed.accountName === 'T. R. Enterprise' || !parsed.accountName) ? 'T R ENTERPRISE' : parsed.accountName,
          accountNumber: (parsed.accountNumber === '39485029184' || !parsed.accountNumber) ? '10390210001868' : parsed.accountNumber,
          ifscCode: (parsed.ifscCode === 'SBIN0004521' || !parsed.ifscCode) ? 'UCBA0001039' : parsed.ifscCode,
          upiId: (parsed.upiId === 'trenterprise@sbi' || !parsed.upiId) ? '10390210001868@ucobank' : parsed.upiId,
        };
        localStorage.setItem('tr_settings', JSON.stringify(merged));
        return merged;
      } catch {
        return initialStoreSettings;
      }
    }
    return initialStoreSettings;
  });

  const updateSettings = (newSettings: Partial<StoreSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('tr_settings', JSON.stringify(updated));
      return updated;
    });
    showToast('Store settings updated successfully', 'success');
  };

  // Products state
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('tr_products');
    return saved ? JSON.parse(saved) : initialProducts;
  });

  useEffect(() => {
    localStorage.setItem('tr_products', JSON.stringify(products));
  }, [products]);

  // Stock Adjustment Logs
  const [stockLogs, setStockLogs] = useState<StockAdjustmentLog[]>(() => {
    const saved = localStorage.getItem('tr_stock_logs');
    return saved ? JSON.parse(saved) : [
      {
        id: 'log-01',
        productId: 'prod-01',
        productName: 'Berger WeatherCoat Long Life 10',
        sku: 'BP-WCL-20L',
        type: 'in',
        quantityChange: 10,
        newQuantity: 18,
        reason: 'Shipment received from Berger Depot Howrah',
        performedBy: 'Tanmay Roy (Owner)',
        createdAt: '2026-08-15T14:30:00Z'
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('tr_stock_logs', JSON.stringify(stockLogs));
  }, [stockLogs]);

  // Invoices state
  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    const saved = localStorage.getItem('tr_invoices');
    return saved ? JSON.parse(saved) : initialInvoices;
  });

  useEffect(() => {
    localStorage.setItem('tr_invoices', JSON.stringify(invoices));
  }, [invoices]);

  // Supabase Connection Check
  const [supabaseConnected, setSupabaseConnected] = useState(false);
  const [isCheckingSupabase, setIsCheckingSupabase] = useState(false);

  const checkSupabaseStatus = async () => {
    setIsCheckingSupabase(true);
    try {
      const res = await testSupabaseConnection();
      setSupabaseConnected(res.success);
    } catch {
      setSupabaseConnected(false);
    } finally {
      setIsCheckingSupabase(false);
    }
  };

  useEffect(() => {
    checkSupabaseStatus();
  }, []);

  const syncWithSupabase = async () => {
    const client = getSupabaseClient();
    if (!client) {
      showToast('Supabase is not configured yet. Configure in Settings.', 'warning');
      return;
    }

    try {
      setIsCheckingSupabase(true);
      // Fetch latest products from Supabase
      const { data: dbProducts, error: prodErr } = await client.from('products').select('*');
      if (prodErr) throw prodErr;

      if (dbProducts && dbProducts.length > 0) {
        // Map database fields to Product type
        const mappedProducts: Product[] = dbProducts.map((p: any) => ({
          id: p.id,
          sku: p.sku,
          name: p.name,
          category: p.category,
          brand: p.brand,
          packSize: p.pack_size,
          quantity: p.quantity,
          minStockAlert: p.min_stock_alert,
          costPrice: Number(p.cost_price),
          unitPrice: Number(p.unit_price),
          finish: p.finish,
          shadeCode: p.shade_code,
          locationRack: p.location_rack,
          description: p.description,
          createdAt: p.created_at,
          updatedAt: p.updated_at
        }));
        setProducts(mappedProducts);
        showToast(`Synced ${mappedProducts.length} products from Supabase database!`, 'success');
      } else {
        // Seed initial products to Supabase if empty
        const recordsToInsert = products.map(p => ({
          id: p.id,
          sku: p.sku,
          name: p.name,
          category: p.category,
          brand: p.brand,
          pack_size: p.packSize,
          quantity: p.quantity,
          min_stock_alert: p.minStockAlert,
          cost_price: p.costPrice,
          unit_price: p.unitPrice,
          finish: p.finish,
          shade_code: p.shadeCode,
          location_rack: p.locationRack,
          description: p.description
        }));

        await client.from('products').upsert(recordsToInsert);
        showToast('Pushed current inventory to Supabase cloud table!', 'success');
      }
      setSupabaseConnected(true);
    } catch (err: any) {
      console.error('Supabase sync error:', err);
      showToast(`Supabase Sync Notice: ${err.message || 'Check database connection'}`, 'warning');
    } finally {
      setIsCheckingSupabase(false);
    }
  };

  // ==============================================================================
  // SECURE AUTHENTICATION METHODS (Step 1, Step 2, Step 3)
  // ==============================================================================

  // Step 1: User Registration
  const registerUser = async (params: RegisterParams): Promise<AuthResponse> => {
    try {
      // 1. Attempt Supabase Auth registration if configured
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          await supabase.auth.signUp({
            email: params.email.trim().toLowerCase(),
            password: params.password,
            options: {
              data: {
                full_name: params.name.trim(),
                name: params.name.trim(),
                role: 'admin',
                phone: params.phone || '',
              }
            }
          });
        } catch (supaErr) {
          console.warn('Supabase auth background signup notice:', supaErr);
        }
      }

      // 2. Attempt Express Backend API
      const res = await safeFetchJson<any>('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!res.isHtmlOrUnavailable && res.data) {
        const data = res.data;
        if (!res.ok) {
          showToast(data.message || 'Registration failed', 'error');
          return { success: false, ...data };
        }

        if (data.token && data.user) {
          setJwtToken(data.token);
          const registeredUser: User = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            role: data.user.role,
            is_verified: true,
            phone: data.user.phone,
            token: data.token,
          };
          setUser(registeredUser);

          setUsersList(prev => {
            const exists = prev.some(u => u.email.toLowerCase() === registeredUser.email.toLowerCase());
            return exists ? prev.map(u => u.email.toLowerCase() === registeredUser.email.toLowerCase() ? registeredUser : u) : [registeredUser, ...prev];
          });
        }

        setPendingVerificationEmail(params.email.trim().toLowerCase());
        showToast('Registration successful! Welcome to T R Enterprise.', 'success');
        fetchRecentEmails(params.email);
        return { success: true, ...data };
      }
    } catch (err: any) {
      console.warn('Backend registration failed, switching to static local auth:', err);
    }

    // 3. Fallback for Static Host (GitHub Pages) or Offline Mode
    const localResult = await localAuth.registerUser(params);
    if (!localResult.success) {
      showToast(localResult.message || 'Registration failed', 'error');
      return localResult;
    }

    if (localResult.token && localResult.user) {
      setJwtToken(localResult.token);
      setUser(localResult.user);
      setUsersList(prev => {
        const exists = prev.some(u => u.email.toLowerCase() === localResult.user!.email.toLowerCase());
        return exists ? prev.map(u => u.email.toLowerCase() === localResult.user!.email.toLowerCase() ? localResult.user! : u) : [localResult.user!, ...prev];
      });
    }

    setPendingVerificationEmail(params.email.trim().toLowerCase());
    showToast('Registration successful! Welcome to T R Enterprise.', 'success');
    fetchRecentEmails(params.email);
    return localResult;
  };

  // Step 2: Email Verification via 6-Digit OTP
  const verifyOtp = async (email: string, otp: string): Promise<AuthResponse> => {
    try {
      const res = await safeFetchJson<any>('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });

      if (!res.isHtmlOrUnavailable && res.data) {
        const data = res.data;
        if (!res.ok) {
          showToast(data.message || 'OTP verification failed', 'error');
          return { success: false, ...data };
        }

        showToast(data.message || 'Email verified successfully. You can now login.', 'success');
        setPendingVerificationEmail(null);
        return { success: true, ...data };
      }
    } catch (err: any) {
      console.warn('API verify OTP notice:', err);
    }

    // Static fallback
    const localResult = localAuth.verifyOtp(email, otp);
    if (localResult.success) {
      showToast(localResult.message || 'Email verified successfully.', 'success');
      setPendingVerificationEmail(null);
    } else {
      showToast(localResult.message || 'Verification failed', 'error');
    }
    return localResult;
  };

  // Step 2: Email Verification via Secure Token Link
  const verifyToken = async (token: string, email?: string): Promise<AuthResponse> => {
    try {
      const res = await safeFetchJson<any>(`/api/auth/verify-token?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email || '')}`);
      if (!res.isHtmlOrUnavailable && res.data) {
        const data = res.data;
        if (!res.ok) {
          showToast(data.message || 'Token verification failed', 'error');
          return { success: false, ...data };
        }

        showToast(data.message || 'Email verified successfully. You can now login.', 'success');
        setPendingVerificationEmail(null);
        return { success: true, ...data };
      }
    } catch (err: any) {
      console.warn('API verify token notice:', err);
    }

    // Static fallback
    const localResult = localAuth.verifyToken(token, email);
    showToast(localResult.message || 'Email verified successfully.', 'success');
    setPendingVerificationEmail(null);
    return localResult;
  };

  // Resend OTP / Link
  const resendOtp = async (email: string): Promise<AuthResponse> => {
    try {
      const res = await safeFetchJson<any>('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.isHtmlOrUnavailable && res.data) {
        const data = res.data;
        if (!res.ok) {
          showToast(data.message || 'Failed to resend verification code', 'error');
          return { success: false, ...data };
        }

        showToast('New verification code sent to your email!', 'info');
        fetchRecentEmails(email);
        return { success: true, ...data };
      }
    } catch (err: any) {
      console.warn('API resend notice:', err);
    }

    // Static fallback
    const localResult = localAuth.resendOtp(email);
    showToast('New verification code sent to your email!', 'info');
    fetchRecentEmails(email);
    return localResult;
  };

  // Step 3: Login with Email & Password
  const loginWithJwt = async (email: string, password: string): Promise<AuthResponse> => {
    const cleanEmail = email.trim().toLowerCase();

    try {
      // 1. Attempt Supabase Auth login in background if configured
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password: password,
          });
        } catch (supaErr) {
          console.warn('Supabase auth signin notice:', supaErr);
        }
      }

      // 2. Attempt Express Backend API
      const res = await safeFetchJson<any>('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password }),
      });

      if (!res.isHtmlOrUnavailable && res.data) {
        const data = res.data;

        if (res.status === 403 && data.isUnverified) {
          setPendingVerificationEmail(data.email || cleanEmail);
          showToast(data.message || 'Please verify your email before login.', 'warning');
          return { success: false, isUnverified: true, email: data.email || cleanEmail, message: data.message };
        }

        if (!res.ok) {
          showToast(data.message || 'Invalid credentials', 'error');
          return { success: false, ...data };
        }

        if (data.token && data.user) {
          setJwtToken(data.token);
          const loggedUser: User = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            role: data.user.role,
            is_verified: true,
            avatarUrl: data.user.avatarUrl,
            phone: data.user.phone,
            token: data.token,
          };
          setUser(loggedUser);

          setUsersList(prev => {
            const exists = prev.some(u => u.email.toLowerCase() === loggedUser.email.toLowerCase());
            return exists ? prev.map(u => u.email.toLowerCase() === loggedUser.email.toLowerCase() ? loggedUser : u) : [loggedUser, ...prev];
          });

          showToast(`Welcome back, ${loggedUser.name}!`, 'success');
          return { success: true, ...data };
        }
      }
    } catch (err: any) {
      console.warn('API login failed, switching to static local auth:', err);
    }

    // 3. Fallback for Static Host (GitHub Pages) or Offline Mode
    const localResult = await localAuth.loginUser(cleanEmail, password);
    if (!localResult.success) {
      showToast(localResult.message || 'Invalid email address or password.', 'error');
      return localResult;
    }

    if (localResult.token && localResult.user) {
      setJwtToken(localResult.token);
      setUser(localResult.user);
      setUsersList(prev => {
        const exists = prev.some(u => u.email.toLowerCase() === localResult.user!.email.toLowerCase());
        return exists ? prev.map(u => u.email.toLowerCase() === localResult.user!.email.toLowerCase() ? localResult.user! : u) : [localResult.user!, ...prev];
      });
      showToast(`Welcome back, ${localResult.user.name}!`, 'success');
    }

    return localResult;
  };

  // Backward-compatible login method
  const login = async (email: string, password?: string, demoRole?: Role): Promise<{ success: boolean; error?: string }> => {
    if (demoRole) {
      const found = usersList.find(u => u.role === demoRole) || initialUsers.find(u => u.role === demoRole) || initialUsers[0];
      setUser(found);
      showToast(`Logged in as ${found.name} (${demoRole.toUpperCase()})`, 'success');
      return { success: true };
    }

    if (password) {
      const res = await loginWithJwt(email, password);
      return { success: res.success, error: res.message };
    }

    const matched = usersList.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (matched) {
      setUser(matched);
      showToast(`Welcome back, ${matched.name}!`, 'success');
      return { success: true };
    }

    return { success: false, error: 'User not found' };
  };

  const logout = async () => {
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch (e) {
      console.warn('Supabase signOut error:', e);
    }
    setJwtToken(null);
    setUser(null);
    localStorage.removeItem('tr_jwt_token');
    localStorage.removeItem('tr_current_user');
    setActiveTab('dashboard');
    showToast('Logged out successfully. Please sign in to continue.', 'info');
  };

  const switchRoleDemo = (role?: Role) => {
    let targetRole: Role;
    if (typeof role === 'string' && (role === 'admin' || role === 'staff')) {
      targetRole = role;
    } else {
      targetRole = user?.role === 'admin' ? 'staff' : 'admin';
    }

    const target: User = usersList.find(u => u.role === targetRole) || {
      id: `demo-${targetRole}`,
      name: targetRole === 'admin' ? 'Tanmay Roy (Admin)' : 'Priya Sharma (Staff)',
      email: `${targetRole}@trenterprise.com`,
      role: targetRole,
      is_verified: true,
    };
    setUser(target);
    showToast(`Switched active profile to ${target.name} (${targetRole.toUpperCase()})`, 'info');
  };

  const addUser = (userData: Omit<User, 'id' | 'joinedDate'>) => {
    const newUser: User = {
      ...userData,
      id: 'user-' + Date.now(),
      joinedDate: new Date().toISOString().split('T')[0]
    };
    setUsersList(prev => {
      const updated = [...prev, newUser];
      localStorage.setItem('tr_users', JSON.stringify(updated));
      return updated;
    });
    showToast(`Staff member ${newUser.name} added successfully!`, 'success');
  };

  const deleteUser = (userId: string) => {
    setUsersList(prev => {
      const updated = prev.filter(u => u.id !== userId);
      localStorage.setItem('tr_users', JSON.stringify(updated));
      return updated;
    });
    showToast('User removed from team', 'info');
  };

  // Product Operations
  const addProduct = async (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<boolean> => {
    const now = new Date().toISOString();
    const newProduct: Product = {
      ...productData,
      id: 'prod-' + Date.now(),
      createdAt: now,
      updatedAt: now
    };

    setProducts(prev => [newProduct, ...prev]);

    // Record Stock In Log
    if (newProduct.quantity > 0) {
      const log: StockAdjustmentLog = {
        id: 'log-' + Date.now(),
        productId: newProduct.id,
        productName: newProduct.name,
        sku: newProduct.sku,
        type: 'in',
        quantityChange: newProduct.quantity,
        newQuantity: newProduct.quantity,
        reason: 'Initial Product Creation & Stock Inward',
        performedBy: user?.name || 'Authorized User',
        createdAt: now
      };
      setStockLogs(prev => [log, ...prev]);
    }

    // If Supabase is connected, asynchronously persist
    const client = getSupabaseClient();
    if (client) {
      client.from('products').insert({
        id: newProduct.id,
        sku: newProduct.sku,
        name: newProduct.name,
        category: newProduct.category,
        brand: newProduct.brand,
        pack_size: newProduct.packSize,
        quantity: newProduct.quantity,
        min_stock_alert: newProduct.minStockAlert,
        cost_price: newProduct.costPrice,
        unit_price: newProduct.unitPrice,
        finish: newProduct.finish,
        shade_code: newProduct.shadeCode,
        location_rack: newProduct.locationRack,
        description: newProduct.description
      }).then(({ error }) => {
        if (error) console.warn('Supabase product insert background notice:', error.message);
      });
    }

    showToast(`Product "${newProduct.name}" added to inventory!`, 'success');
    return true;
  };

  const updateProduct = async (id: string, updates: Partial<Product>): Promise<boolean> => {
    const now = new Date().toISOString();
    setProducts(prev => prev.map(p => (p.id === id ? { ...p, ...updates, updatedAt: now } : p)));

    const client = getSupabaseClient();
    if (client) {
      const dbUpdates: any = { updated_at: now };
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.sku !== undefined) dbUpdates.sku = updates.sku;
      if (updates.category !== undefined) dbUpdates.category = updates.category;
      if (updates.brand !== undefined) dbUpdates.brand = updates.brand;
      if (updates.packSize !== undefined) dbUpdates.pack_size = updates.packSize;
      if (updates.quantity !== undefined) dbUpdates.quantity = updates.quantity;
      if (updates.minStockAlert !== undefined) dbUpdates.min_stock_alert = updates.minStockAlert;
      if (updates.unitPrice !== undefined) dbUpdates.unit_price = updates.unitPrice;
      if (updates.costPrice !== undefined) dbUpdates.cost_price = updates.costPrice;
      if (updates.finish !== undefined) dbUpdates.finish = updates.finish;
      if (updates.shadeCode !== undefined) dbUpdates.shade_code = updates.shadeCode;
      if (updates.locationRack !== undefined) dbUpdates.location_rack = updates.locationRack;
      if (updates.description !== undefined) dbUpdates.description = updates.description;

      client.from('products').update(dbUpdates).eq('id', id).then(({ error }) => {
        if (error) console.warn('Supabase product update notice:', error.message);
      });
    }

    showToast('Product details updated successfully', 'success');
    return true;
  };

  const deleteProduct = async (id: string): Promise<boolean> => {
    const item = products.find(p => p.id === id);
    setProducts(prev => prev.filter(p => p.id !== id));

    const client = getSupabaseClient();
    if (client) {
      client.from('products').delete().eq('id', id).then(({ error }) => {
        if (error) console.warn('Supabase product delete notice:', error.message);
      });
    }

    showToast(`Removed "${item?.name || 'Product'}" from inventory`, 'info');
    return true;
  };

  const adjustStock = async (
    productId: string,
    quantityChange: number,
    reason: string,
    type: 'in' | 'out' | 'adjustment' | 'damage'
  ): Promise<boolean> => {
    const target = products.find(p => p.id === productId);
    if (!target) return false;

    const newQty = Math.max(0, target.quantity + quantityChange);
    const now = new Date().toISOString();

    setProducts(prev => prev.map(p => (p.id === productId ? { ...p, quantity: newQty, updatedAt: now } : p)));

    const log: StockAdjustmentLog = {
      id: 'log-' + Date.now(),
      productId,
      productName: target.name,
      sku: target.sku,
      type,
      quantityChange,
      newQuantity: newQty,
      reason,
      performedBy: user?.name || 'Staff User',
      createdAt: now
    };
    setStockLogs(prev => [log, ...prev]);

    const client = getSupabaseClient();
    if (client) {
      client.from('products').update({ quantity: newQty, updated_at: now }).eq('id', productId).then(() => {});
      client.from('stock_adjustments').insert({
        product_id: productId,
        product_name: target.name,
        sku: target.sku,
        type,
        quantity_change: quantityChange,
        new_quantity: newQty,
        reason,
        performed_by: user?.name || 'Staff'
      }).then(() => {});
    }

    showToast(`Stock updated for ${target.name} (New count: ${newQty})`, 'success');
    return true;
  };

  // Invoice & POS Operations
  const createInvoice = async (invoiceData: Omit<Invoice, 'id' | 'createdAt' | 'createdBy' | 'createdByName'>): Promise<Invoice> => {
    const now = new Date().toISOString();
    const newInvoice: Invoice = {
      ...invoiceData,
      id: 'inv-' + Date.now(),
      createdBy: user?.id || 'demo-user',
      createdByName: user?.name || 'Counter Staff',
      createdAt: now
    };

    // 1. Add to invoices list
    setInvoices(prev => [newInvoice, ...prev]);

    // 2. Automatically deduct stock from products
    const productDeltas: Record<string, number> = {};
    newInvoice.items.forEach(item => {
      productDeltas[item.productId] = (productDeltas[item.productId] || 0) + item.quantity;
    });

    setProducts(prev =>
      prev.map(prod => {
        if (productDeltas[prod.id]) {
          const newQty = Math.max(0, prod.quantity - productDeltas[prod.id]);
          return { ...prod, quantity: newQty, updatedAt: now };
        }
        return prod;
      })
    );

    // 3. Log stock reduction
    const newLogs: StockAdjustmentLog[] = newInvoice.items.map(item => {
      const prod = products.find(p => p.id === item.productId);
      const remaining = Math.max(0, (prod?.quantity || 0) - item.quantity);
      return {
        id: 'log-' + Math.random().toString(36).substr(2, 9),
        productId: item.productId,
        productName: item.name,
        sku: item.sku,
        type: 'sale',
        quantityChange: -item.quantity,
        newQuantity: remaining,
        reason: `Billed in Invoice #${newInvoice.invoiceNumber} to ${newInvoice.customerName}`,
        performedBy: user?.name || 'Counter Staff',
        createdAt: now
      };
    });
    setStockLogs(prev => [...newLogs, ...prev]);

    // 4. Background persist to Supabase if connected
    const client = getSupabaseClient();
    if (client) {
      (async () => {
        try {
          await client.from('invoices').insert({
            id: newInvoice.id,
            invoice_number: newInvoice.invoiceNumber,
            customer_name: newInvoice.customerName,
            customer_phone: newInvoice.customerPhone,
            customer_email: newInvoice.customerEmail,
            customer_address: newInvoice.customerAddress,
            customer_gst: newInvoice.customerGst,
            subtotal: newInvoice.subtotal,
            discount_amount: newInvoice.discountAmount,
            tax_percent: newInvoice.taxPercent,
            tax_amount: newInvoice.taxAmount,
            total_amount: newInvoice.totalAmount,
            payment_mode: newInvoice.paymentMode,
            payment_status: newInvoice.paymentStatus,
            notes: newInvoice.notes,
            created_by: newInvoice.createdBy,
            created_by_name: newInvoice.createdByName
          });

          const itemRows = newInvoice.items.map(it => ({
            invoice_id: newInvoice.id,
            product_id: it.productId,
            sku: it.sku,
            name: it.name,
            category: it.category,
            brand: it.brand,
            pack_size: it.packSize,
            unit_price: it.unitPrice,
            quantity: it.quantity,
            discount_percent: it.discountPercent,
            tax_percent: it.taxPercent,
            total: it.total
          }));
          await client.from('invoice_items').insert(itemRows);
        } catch (err: any) {
          console.warn('Supabase invoice sync notice:', err?.message);
        }
      })();
    }

    showToast(`Invoice #${newInvoice.invoiceNumber} created & stock auto-deducted!`, 'success');
    return newInvoice;
  };

  const updateInvoicePaymentStatus = (invoiceId: string, status: 'Paid' | 'Pending' | 'Partial') => {
    setInvoices(prev => prev.map(inv => (inv.id === invoiceId ? { ...inv, paymentStatus: status } : inv)));
    const client = getSupabaseClient();
    if (client) {
      client.from('invoices').update({ payment_status: status }).eq('id', invoiceId).then(() => {});
    }
    showToast(`Invoice status updated to ${status}`, 'success');
  };

  const deleteInvoice = async (invoiceId: string, restoreStock: boolean = true): Promise<boolean> => {
    const inv = invoices.find(i => i.id === invoiceId);
    if (!inv) return false;

    const now = new Date().toISOString();

    // 1. If restoreStock is true, return the billed quantities to inventory products
    if (restoreStock && inv.items && inv.items.length > 0) {
      const productRestores: Record<string, number> = {};
      inv.items.forEach(item => {
        productRestores[item.productId] = (productRestores[item.productId] || 0) + item.quantity;
      });

      setProducts(prev =>
        prev.map(prod => {
          if (productRestores[prod.id]) {
            const newQty = prod.quantity + productRestores[prod.id];
            return { ...prod, quantity: newQty, updatedAt: now };
          }
          return prod;
        })
      );

      // Create stock adjustment inward logs for audit history
      const restoreLogs: StockAdjustmentLog[] = inv.items.map(item => {
        const prod = products.find(p => p.id === item.productId);
        const currentQ = prod ? prod.quantity : 0;
        const newQty = currentQ + item.quantity;
        return {
          id: 'log-' + Math.random().toString(36).substring(2, 9),
          productId: item.productId,
          productName: item.name,
          sku: item.sku,
          type: 'in',
          quantityChange: item.quantity,
          newQuantity: newQty,
          reason: `Invoice #${inv.invoiceNumber} deleted/voided - Stock replenished (+${item.quantity})`,
          performedBy: user?.name || 'Authorized User',
          createdAt: now
        };
      });
      setStockLogs(prev => [...restoreLogs, ...prev]);

      // Sync restored stock to Supabase
      const client = getSupabaseClient();
      if (client) {
        Object.entries(productRestores).forEach(([pId, addQty]) => {
          const pObj = products.find(p => p.id === pId);
          if (pObj) {
            client.from('products').update({ quantity: pObj.quantity + addQty, updated_at: now }).eq('id', pId).then(() => {});
          }
        });
      }
    }

    // 2. Remove invoice from state and localStorage
    setInvoices(prev => {
      const remaining = prev.filter(i => i.id !== invoiceId);
      localStorage.setItem('tr_invoices', JSON.stringify(remaining));
      return remaining;
    });

    // 3. Delete from Supabase
    const client = getSupabaseClient();
    if (client) {
      client.from('invoice_items').delete().eq('invoice_id', invoiceId).then(() => {});
      client.from('invoices').delete().eq('id', invoiceId).then(() => {});
    }

    showToast(
      restoreStock
        ? `Invoice #${inv.invoiceNumber} deleted & inventory restored!`
        : `Invoice #${inv.invoiceNumber} permanently removed!`,
      'info'
    );
    return true;
  };

  const lowStockCount = products.filter(p => p.quantity <= p.minStockAlert).length;

  return (
    <AppContext.Provider
      value={{
        user,
        jwtToken,
        isAuthenticated: !!user,
        isAdmin: true, // Single-user portal: authenticated user has full Owner authority
        systemStatus,
        checkSystemStatus,
        isRegistrationLocked,
        toggleRegistrationLock,
        previousCredentialsCount,
        previousOwnerEmails,
        deletePreviousCredentials,
        checkPreviousCredentials,
        pendingVerificationEmail,
        setPendingVerificationEmail,
        loginWithJwt,
        registerUser,
        verifyOtp,
        verifyToken,
        resendOtp,
        login,
        logout,
        switchRoleDemo,
        recentEmails,
        fetchRecentEmails,
        activeTab,
        setActiveTab,
        products,
        addProduct,
        updateProduct,
        deleteProduct,
        adjustStock,
        stockLogs,
        invoices,
        createInvoice,
        updateInvoicePaymentStatus,
        deleteInvoice,
        settings,
        updateSettings,
        theme,
        setTheme,
        toggleTheme,
        toast,
        showToast,
        supabaseConnected,
        isCheckingSupabase,
        syncWithSupabase,
        lowStockCount,
        usersList,
        addUser,
        deleteUser
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
