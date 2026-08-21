import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Read from env or localStorage if user configured dynamically in app settings
export const getSupabaseEnv = () => {
  const metaEnv = (import.meta as unknown as { env?: Record<string, string> }).env || {};
  const url =
    metaEnv.VITE_SUPABASE_URL ||
    localStorage.getItem('tr_supabase_url') ||
    localStorage.getItem('supabase_url') ||
    '';
  const anonKey =
    metaEnv.VITE_SUPABASE_ANON_KEY ||
    localStorage.getItem('tr_supabase_anon_key') ||
    localStorage.getItem('supabase_anon_key') ||
    '';
  return { url: url.trim(), anonKey: anonKey.trim() };
};

let supabaseInstance: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient | null => {
  const { url, anonKey } = getSupabaseEnv();
  if (!url || !anonKey) {
    return null;
  }
  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true
        }
      });
    } catch (err) {
      console.warn('Failed to initialize Supabase client:', err);
      return null;
    }
  }
  return supabaseInstance;
};

export const resetSupabaseClient = (url?: string, anonKey?: string) => {
  if (url && anonKey) {
    const cleanUrl = url.trim();
    const cleanKey = anonKey.trim();
    localStorage.setItem('tr_supabase_url', cleanUrl);
    localStorage.setItem('tr_supabase_anon_key', cleanKey);
    localStorage.setItem('supabase_url', cleanUrl);
    localStorage.setItem('supabase_anon_key', cleanKey);
    try {
      supabaseInstance = createClient(cleanUrl, cleanKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true
        }
      });
      return true;
    } catch (e) {
      console.error(e);
      supabaseInstance = null;
      return false;
    }
  } else {
    localStorage.removeItem('tr_supabase_url');
    localStorage.removeItem('tr_supabase_anon_key');
    localStorage.removeItem('supabase_url');
    localStorage.removeItem('supabase_anon_key');
    supabaseInstance = null;
    return true;
  }
};

export const testSupabaseConnection = async (): Promise<{ success: boolean; message: string; tablesExist?: boolean }> => {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'Supabase URL or Anon Key is missing. Please configure credentials.'
    };
  }

  try {
    const { error } = await client.from('products').select('count', { count: 'exact', head: true });
    if (error) {
      // If table doesn't exist yet, it's connected but schema needs to be run
      if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('relation "public.products" does not exist')) {
        return {
          success: true,
          tablesExist: false,
          message: 'Connected to Supabase project! (PostgreSQL tables not found yet - copy the SQL schema script below and run it in your Supabase SQL Editor).'
        };
      }
      return { success: false, message: `Supabase returned: ${error.message}` };
    }
    return {
      success: true,
      tablesExist: true,
      message: 'Successfully connected and verified Supabase PostgreSQL cloud tables!'
    };
  } catch (err: any) {
    return { success: false, message: err.message || 'Connection failed. Check network or CORS.' };
  }
};

// SQL Schema for Supabase PostgreSQL
export const SUPABASE_SQL_SCHEMA = `-- =========================================================
-- T R ENTERPRISE - INVENTORY & BILLING SUPABASE SCHEMA
-- Berger Paints & Hardware Retail Management
-- =========================================================

-- 1. Create Users Table (Synced with Supabase Auth or custom roles)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID UNIQUE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'staff')),
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Products Table (Berger Paints & Hardware items)
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY DEFAULT ('prod_' || substr(md5(random()::text), 1, 10)),
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  brand TEXT NOT NULL DEFAULT 'Berger',
  pack_size TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  min_stock_alert INTEGER NOT NULL DEFAULT 5,
  cost_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  finish TEXT,
  shade_code TEXT,
  location_rack TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Invoices Table
CREATE TABLE IF NOT EXISTS public.invoices (
  id TEXT PRIMARY KEY DEFAULT ('inv_' || substr(md5(random()::text), 1, 10)),
  invoice_number TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  customer_address TEXT,
  customer_gst TEXT,
  subtotal NUMERIC(12, 2) NOT NULL,
  discount_amount NUMERIC(10, 2) DEFAULT 0.00,
  tax_percent NUMERIC(5, 2) DEFAULT 18.00,
  tax_amount NUMERIC(10, 2) DEFAULT 0.00,
  total_amount NUMERIC(12, 2) NOT NULL,
  payment_mode TEXT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'Paid',
  notes TEXT,
  created_by TEXT,
  created_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Invoice Items Table
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id TEXT REFERENCES public.invoices(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES public.products(id) ON DELETE SET NULL,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  brand TEXT NOT NULL,
  pack_size TEXT NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL,
  quantity INTEGER NOT NULL,
  discount_percent NUMERIC(5, 2) DEFAULT 0.00,
  tax_percent NUMERIC(5, 2) DEFAULT 18.00,
  total NUMERIC(12, 2) NOT NULL
);

-- 5. Create Stock Adjustment Logs Table
CREATE TABLE IF NOT EXISTS public.stock_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT REFERENCES public.products(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  sku TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('in', 'out', 'sale', 'adjustment', 'damage')),
  quantity_change INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  reason TEXT NOT NULL,
  performed_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_adjustments ENABLE ROW LEVEL SECURITY;

-- 7. Create Public/Authenticated Access Policies (Read/Write)
CREATE POLICY "Allow public read access to products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert/update to products" ON public.products FOR ALL USING (true);

CREATE POLICY "Allow read access to invoices" ON public.invoices FOR SELECT USING (true);
CREATE POLICY "Allow insert access to invoices" ON public.invoices FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update access to invoices" ON public.invoices FOR UPDATE USING (true);

CREATE POLICY "Allow read access to invoice_items" ON public.invoice_items FOR SELECT USING (true);
CREATE POLICY "Allow insert access to invoice_items" ON public.invoice_items FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow read access to stock_adjustments" ON public.stock_adjustments FOR SELECT USING (true);
CREATE POLICY "Allow insert access to stock_adjustments" ON public.stock_adjustments FOR INSERT WITH CHECK (true);
`;
