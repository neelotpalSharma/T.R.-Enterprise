import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Product, Invoice, StoreSettings, User, Role, ActiveTab, StockAdjustmentLog } from '../types';
import { initialProducts, initialInvoices, initialStoreSettings } from '../data/seedData';
import { supabase, getSupabaseClient, testSupabaseConnection } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface ToastInfo {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface AppContextType {
  // User & Auth delegated to Supabase AuthContext
  user: User | null;
  isAdmin: boolean;
  logout: () => Promise<void>;

  // Navigation
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;

  // Inventory & Products
  products: Product[];
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<boolean>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<boolean>;
  deleteProduct: (id: string) => Promise<boolean>;
  adjustStock: (productId: string, quantityChange: number, reason: string, type: 'in' | 'out' | 'adjustment' | 'damage') => Promise<boolean>;
  stockLogs: StockAdjustmentLog[];
  lowStockCount: number;

  // Billing & Invoices
  invoices: Invoice[];
  createInvoice: (invoiceData: Omit<Invoice, 'id' | 'createdAt' | 'createdBy' | 'createdByName'>) => Promise<Invoice>;
  updateInvoicePaymentStatus: (invoiceId: string, status: 'Paid' | 'Pending' | 'Partial') => void;
  deleteInvoice: (invoiceId: string, restoreStock?: boolean) => Promise<boolean>;

  // Store Settings
  settings: StoreSettings;
  updateSettings: (newSettings: Partial<StoreSettings>) => void;

  // Theme
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;

  // Toast
  toast: ToastInfo | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;

  // Supabase Database Connection & Sync
  supabaseConnected: boolean;
  isCheckingSupabase: boolean;
  syncWithSupabase: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAdmin, signOut } = useAuth();

  // 1. Theme State
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

  // 2. Toast State
  const [toast, setToast] = useState<ToastInfo | null>(null);
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    const id = Date.now();
    setToast({ id, message, type });
    setTimeout(() => {
      setToast(current => (current?.id === id ? null : current));
    }, 4000);
  }, []);

  // 3. Navigation State
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // 4. Products & Inventory State
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('tr_products');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse local products:', e);
    }
    return initialProducts;
  });

  const [stockLogs, setStockLogs] = useState<StockAdjustmentLog[]>(() => {
    try {
      const saved = localStorage.getItem('tr_stock_logs');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse stock logs:', e);
    }
    return [];
  });

  // 5. Invoices State
  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    try {
      const saved = localStorage.getItem('tr_invoices');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse invoices:', e);
    }
    return initialInvoices;
  });

  // 6. Store Settings State
  const [settings, setSettings] = useState<StoreSettings>(() => {
    try {
      const saved = localStorage.getItem('tr_settings');
      if (saved) return { ...initialStoreSettings, ...JSON.parse(saved) };
    } catch (e) {
      console.warn('Failed to parse settings:', e);
    }
    return initialStoreSettings;
  });

  // 7. Supabase Database Connection & Sync
  const [supabaseConnected, setSupabaseConnected] = useState(false);
  const [isCheckingSupabase, setIsCheckingSupabase] = useState(false);

  // Sync state to local storage backup
  useEffect(() => {
    try {
      localStorage.setItem('tr_products', JSON.stringify(products));
    } catch (e) {
      console.warn('Failed to save products:', e);
    }
  }, [products]);

  useEffect(() => {
    try {
      localStorage.setItem('tr_invoices', JSON.stringify(invoices));
    } catch (e) {
      console.warn('Failed to save invoices:', e);
    }
  }, [invoices]);

  useEffect(() => {
    try {
      localStorage.setItem('tr_stock_logs', JSON.stringify(stockLogs));
    } catch (e) {
      console.warn('Failed to save stock logs:', e);
    }
  }, [stockLogs]);

  useEffect(() => {
    try {
      localStorage.setItem('tr_settings', JSON.stringify(settings));
    } catch (e) {
      console.warn('Failed to save settings:', e);
    }
  }, [settings]);

  // Sync products & invoices with Supabase PostgreSQL tables if configured
  const syncWithSupabase = useCallback(async () => {
    const client = getSupabaseClient();
    if (!client) {
      setSupabaseConnected(false);
      return;
    }

    setIsCheckingSupabase(true);
    try {
      const conn = await testSupabaseConnection();
      setSupabaseConnected(conn.success);

      if (conn.success && conn.tablesExist) {
        // Fetch remote products
        const { data: remoteProducts, error: prodErr } = await client
          .from('products')
          .select('*')
          .order('name', { ascending: true });

        if (!prodErr && remoteProducts && remoteProducts.length > 0) {
          const mapped: Product[] = remoteProducts.map((p: any) => ({
            id: p.id,
            sku: p.sku,
            name: p.name,
            category: p.category,
            brand: p.brand || 'Berger',
            packSize: p.pack_size,
            quantity: Number(p.quantity) || 0,
            minStockAlert: Number(p.min_stock_alert) || 5,
            costPrice: Number(p.cost_price) || 0,
            unitPrice: Number(p.unit_price) || 0,
            finish: p.finish,
            shadeCode: p.shade_code,
            locationRack: p.location_rack,
            description: p.description,
            createdAt: p.created_at || new Date().toISOString(),
            updatedAt: p.updated_at || new Date().toISOString(),
          }));
          setProducts(mapped);
        }

        // Fetch remote invoices
        const { data: remoteInvoices, error: invErr } = await client
          .from('invoices')
          .select('*, invoice_items(*)')
          .order('created_at', { ascending: false });

        if (!invErr && remoteInvoices && remoteInvoices.length > 0) {
          const mappedInvoices: Invoice[] = remoteInvoices.map((inv: any) => ({
            id: inv.id,
            invoiceNumber: inv.invoice_number,
            customerName: inv.customer_name,
            customerPhone: inv.customer_phone,
            customerEmail: inv.customer_email,
            customerAddress: inv.customer_address,
            customerGst: inv.customer_gst,
            subtotal: Number(inv.subtotal) || 0,
            discountAmount: Number(inv.discount_amount) || 0,
            taxAmount: Number(inv.tax_amount) || 0,
            taxPercent: Number(inv.tax_percent) || 18,
            totalAmount: Number(inv.total_amount) || 0,
            paymentMode: inv.payment_mode,
            paymentStatus: inv.payment_status,
            notes: inv.notes,
            createdBy: inv.created_by,
            createdByName: inv.created_by_name || 'Admin',
            createdAt: inv.created_at,
            items: (inv.invoice_items || []).map((item: any) => ({
              productId: item.product_id || item.id,
              sku: item.sku,
              name: item.name,
              category: item.category,
              brand: item.brand || 'Berger',
              packSize: item.pack_size,
              unitPrice: Number(item.unit_price) || 0,
              quantity: Number(item.quantity) || 1,
              discountPercent: Number(item.discount_percent) || 0,
              taxPercent: Number(item.tax_percent) || 18,
              total: Number(item.total) || 0,
            })),
          }));
          setInvoices(mappedInvoices);
        }
      }
    } catch (e) {
      console.warn('Supabase initial sync notice:', e);
      setSupabaseConnected(false);
    } finally {
      setIsCheckingSupabase(false);
    }
  }, []);

  useEffect(() => {
    syncWithSupabase();
  }, [syncWithSupabase]);

  // Product Actions
  const addProduct = async (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<boolean> => {
    const newId = 'prod_' + Math.random().toString(36).substring(2, 9);
    const now = new Date().toISOString();
    const newProduct: Product = {
      ...productData,
      id: newId,
      createdAt: now,
      updatedAt: now,
    };

    setProducts(prev => [newProduct, ...prev]);
    showToast(`Added product "${newProduct.name}" to inventory`, 'success');

    // Sync to Supabase if connected
    const client = getSupabaseClient();
    if (client && supabaseConnected) {
      try {
        await client.from('products').insert({
          id: newProduct.id,
          sku: newProduct.sku || 'SKU-' + Date.now(),
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
          description: newProduct.description,
        });
      } catch (err) {
        console.warn('Supabase product insert notice:', err);
      }
    }

    return true;
  };

  const updateProduct = async (id: string, updates: Partial<Product>): Promise<boolean> => {
    const now = new Date().toISOString();
    setProducts(prev =>
      prev.map(p => (p.id === id ? { ...p, ...updates, updatedAt: now } : p))
    );
    showToast('Product updated successfully', 'success');

    const client = getSupabaseClient();
    if (client && supabaseConnected) {
      try {
        const payload: any = { updated_at: now };
        if (updates.name !== undefined) payload.name = updates.name;
        if (updates.sku !== undefined) payload.sku = updates.sku;
        if (updates.category !== undefined) payload.category = updates.category;
        if (updates.brand !== undefined) payload.brand = updates.brand;
        if (updates.packSize !== undefined) payload.pack_size = updates.packSize;
        if (updates.quantity !== undefined) payload.quantity = updates.quantity;
        if (updates.minStockAlert !== undefined) payload.min_stock_alert = updates.minStockAlert;
        if (updates.costPrice !== undefined) payload.cost_price = updates.costPrice;
        if (updates.unitPrice !== undefined) payload.unit_price = updates.unitPrice;
        if (updates.finish !== undefined) payload.finish = updates.finish;
        if (updates.shadeCode !== undefined) payload.shade_code = updates.shadeCode;
        if (updates.locationRack !== undefined) payload.location_rack = updates.locationRack;
        if (updates.description !== undefined) payload.description = updates.description;

        await client.from('products').update(payload).eq('id', id);
      } catch (err) {
        console.warn('Supabase product update notice:', err);
      }
    }

    return true;
  };

  const deleteProduct = async (id: string): Promise<boolean> => {
    const target = products.find(p => p.id === id);
    setProducts(prev => prev.filter(p => p.id !== id));
    showToast(`Deleted "${target?.name || 'Product'}"`, 'info');

    const client = getSupabaseClient();
    if (client && supabaseConnected) {
      try {
        await client.from('products').delete().eq('id', id);
      } catch (err) {
        console.warn('Supabase product delete notice:', err);
      }
    }

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

    setProducts(prev =>
      prev.map(p => (p.id === productId ? { ...p, quantity: newQty, updatedAt: now } : p))
    );

    const logItem: StockAdjustmentLog = {
      id: 'log_' + Date.now(),
      productId,
      productName: target.name,
      sku: target.sku,
      type,
      quantityChange,
      newQuantity: newQty,
      reason,
      performedBy: user?.name || 'Store Staff',
      createdAt: now,
    };

    setStockLogs(prev => [logItem, ...prev]);
    showToast(`Stock updated: ${target.name} (${quantityChange > 0 ? '+' : ''}${quantityChange} units)`, 'success');

    const client = getSupabaseClient();
    if (client && supabaseConnected) {
      try {
        await client.from('products').update({ quantity: newQty, updated_at: now }).eq('id', productId);
        await client.from('stock_adjustments').insert({
          product_id: productId,
          product_name: target.name,
          sku: target.sku || '',
          type,
          quantity_change: quantityChange,
          new_quantity: newQty,
          reason,
          performed_by: user?.name || 'Store Staff',
        });
      } catch (err) {
        console.warn('Supabase stock adjustment notice:', err);
      }
    }

    return true;
  };

  // Invoice & POS Actions
  const createInvoice = async (
    invoiceData: Omit<Invoice, 'id' | 'createdAt' | 'createdBy' | 'createdByName'>
  ): Promise<Invoice> => {
    const invoiceId = 'inv_' + Date.now();
    const now = new Date().toISOString();

    const newInvoice: Invoice = {
      ...invoiceData,
      id: invoiceId,
      createdAt: now,
      createdBy: user?.id || 'usr_staff',
      createdByName: user?.name || 'Store Staff',
    };

    // Deduct stock for all billed items
    setProducts(prev =>
      prev.map(prod => {
        const itemInBill = invoiceData.items.find(item => item.productId === prod.id);
        if (itemInBill) {
          const newQty = Math.max(0, prod.quantity - itemInBill.quantity);
          return { ...prod, quantity: newQty, updatedAt: now };
        }
        return prod;
      })
    );

    setInvoices(prev => [newInvoice, ...prev]);
    showToast(`Invoice ${newInvoice.invoiceNumber} generated successfully!`, 'success');

    // Sync to Supabase PostgreSQL
    const client = getSupabaseClient();
    if (client && supabaseConnected) {
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
          tax_amount: newInvoice.taxAmount,
          tax_percent: newInvoice.taxPercent,
          total_amount: newInvoice.totalAmount,
          payment_mode: newInvoice.paymentMode,
          payment_status: newInvoice.paymentStatus,
          notes: newInvoice.notes,
          created_by: newInvoice.createdBy,
          created_by_name: newInvoice.createdByName,
        });

        // Insert items
        if (newInvoice.items.length > 0) {
          const itemsPayload = newInvoice.items.map(item => ({
            invoice_id: newInvoice.id,
            product_id: item.productId,
            sku: item.sku || '',
            name: item.name,
            category: item.category,
            brand: item.brand,
            pack_size: item.packSize,
            unit_price: item.unitPrice,
            quantity: item.quantity,
            discount_percent: item.discountPercent,
            tax_percent: item.taxPercent,
            total: item.total,
          }));
          await client.from('invoice_items').insert(itemsPayload);
        }

        // Deduct quantities in Supabase products
        for (const item of newInvoice.items) {
          const prod = products.find(p => p.id === item.productId);
          if (prod) {
            const updatedQty = Math.max(0, prod.quantity - item.quantity);
            await client.from('products').update({ quantity: updatedQty }).eq('id', item.productId);
          }
        }
      } catch (err) {
        console.warn('Supabase invoice sync notice:', err);
      }
    }

    return newInvoice;
  };

  const updateInvoicePaymentStatus = (invoiceId: string, status: 'Paid' | 'Pending' | 'Partial') => {
    setInvoices(prev =>
      prev.map(inv => (inv.id === invoiceId ? { ...inv, paymentStatus: status } : inv))
    );
    showToast(`Payment status updated to "${status}"`, 'info');

    const client = getSupabaseClient();
    if (client && supabaseConnected) {
      client.from('invoices').update({ payment_status: status }).eq('id', invoiceId).then();
    }
  };

  const deleteInvoice = async (invoiceId: string, restoreStock = false): Promise<boolean> => {
    const target = invoices.find(inv => inv.id === invoiceId);
    if (!target) return false;

    if (restoreStock) {
      setProducts(prev =>
        prev.map(prod => {
          const item = target.items.find(i => i.productId === prod.id);
          if (item) {
            return { ...prod, quantity: prod.quantity + item.quantity };
          }
          return prod;
        })
      );
    }

    setInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
    showToast(`Invoice ${target.invoiceNumber} deleted`, 'info');

    const client = getSupabaseClient();
    if (client && supabaseConnected) {
      client.from('invoices').delete().eq('id', invoiceId).then();
    }

    return true;
  };

  const updateSettings = (newSettings: Partial<StoreSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
    showToast('Store settings updated successfully', 'success');
  };

  const logout = async () => {
    await signOut();
    showToast('Signed out of Supabase session', 'info');
  };

  const lowStockCount = products.filter(p => p.quantity <= p.minStockAlert).length;

  const value: AppContextType = {
    user,
    isAdmin,
    logout,
    activeTab,
    setActiveTab,
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    adjustStock,
    stockLogs,
    lowStockCount,
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
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
