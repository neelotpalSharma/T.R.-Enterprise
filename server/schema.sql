-- ==============================================================================
-- SUPABASE / POSTGRESQL SCHEMA FOR SECURE AUTHENTICATION SYSTEM
-- ==============================================================================

-- 1. Enable UUID Extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create Users Table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'staff' CHECK (role IN ('admin', 'staff', 'manager', 'user')),
  is_verified BOOLEAN DEFAULT FALSE,
  verification_token VARCHAR(255),
  verification_otp VARCHAR(10),
  verification_expiry TIMESTAMPTZ,
  failed_login_attempts INT DEFAULT 0,
  locked_until TIMESTAMPTZ,
  avatar_url TEXT,
  phone VARCHAR(50),
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. High-Performance Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON public.users(verification_token);
CREATE INDEX IF NOT EXISTS idx_users_verification_otp ON public.users(verification_otp);
CREATE INDEX IF NOT EXISTS idx_users_is_verified ON public.users(is_verified);

-- 4. Automatic updated_at Trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 5. Row-Level Security (RLS) Policies for Supabase
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own profile
CREATE POLICY "Users can read own profile"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id OR is_verified = TRUE);

-- Allow new user registration
CREATE POLICY "Public registration insert"
  ON public.users
  FOR INSERT
  WITH CHECK (TRUE);

-- Allow user update for verification and own profile
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id OR is_verified = FALSE);

-- ==============================================================================
-- 6. Sample Initial Seed (Passwords are bcrypt hashed with 10 rounds: "Admin@12345")
-- ==============================================================================
INSERT INTO public.users (email, name, password_hash, role, is_verified, created_at)
VALUES 
  ('admin@trenterprise.com', 'Tanmay Roy (Store Owner)', '$2a$10$7vI4zWf54l/i2bX0sF7w6OH6pB0G.8n7G29L8d3pM.w4P3v6rU3Oq', 'admin', TRUE, NOW()),
  ('staff@trenterprise.com', 'Rahul Sharma (Sales Counter)', '$2a$10$7vI4zWf54l/i2bX0sF7w6OH6pB0G.8n7G29L8d3pM.w4P3v6rU3Oq', 'staff', TRUE, NOW())
ON CONFLICT (email) DO NOTHING;
