import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  role: 'admin' | 'staff' | 'user';
  is_verified: boolean;
  verification_token?: string | null;
  verification_otp?: string | null;
  verification_expiry?: string | null; // ISO timestamp
  failed_login_attempts: number;
  locked_until?: string | null;
  avatar_url?: string;
  phone?: string;
  last_login_at?: string | null;
  created_at: string;
  updated_at: string;
}

// In-memory cache + persistent JSON file store (Single Owner Portal Architecture)
const inMemoryUsers: Map<string, UserRecord> = new Map();
const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const CONFIG_FILE = path.join(DATA_DIR, 'portal_config.json');

interface PortalConfig {
  registrationLocked: boolean;
  updatedAt: string;
}

let portalConfig: PortalConfig = {
  registrationLocked: false,
  updatedAt: new Date().toISOString(),
};

function saveConfigToDisk() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(portalConfig, null, 2), 'utf-8');
  } catch (err) {
    console.error('[DB] Failed to save config to disk:', err);
  }
}

function loadConfigFromDisk() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.registrationLocked === 'boolean') {
        portalConfig = {
          registrationLocked: parsed.registrationLocked,
          updatedAt: parsed.updatedAt || new Date().toISOString(),
        };
        console.log(`[DB] Loaded portal config from disk. Registration locked: ${portalConfig.registrationLocked}`);
      }
    }
  } catch (err) {
    console.error('[DB] Failed to load config from disk:', err);
  }
}

function saveUsersToDisk() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const userArray = Array.from(inMemoryUsers.values());
    fs.writeFileSync(USERS_FILE, JSON.stringify(userArray, null, 2), 'utf-8');
  } catch (err) {
    console.error('[DB] Failed to save users to disk:', err);
  }
}

function loadUsersFromDisk(): boolean {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const raw = fs.readFileSync(USERS_FILE, 'utf-8');
      const parsed: UserRecord[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemoryUsers.clear();
        parsed.forEach(u => {
          if (u.email) {
            inMemoryUsers.set(u.email.toLowerCase(), {
              ...u,
              role: 'admin',
              is_verified: true,
            });
          }
        });
        console.log(`[DB] Loaded ${inMemoryUsers.size} user credential(s) from persistent disk storage.`);
        return true;
      }
    }
  } catch (err) {
    console.error('[DB] Failed to load users from disk:', err);
  }
  return false;
}

// Initialize single owner user on startup
async function initializeDefaultUsers() {
  loadConfigFromDisk();
  const hasExisting = loadUsersFromDisk();
  if (hasExisting && inMemoryUsers.size > 0) {
    return;
  }

  // If no user exists yet, seed initial store owner so the portal is immediately ready or open for registration
  const adminHash = await bcrypt.hash('Admin@12345', 10);
  const now = new Date().toISOString();

  const defaultAdmin: UserRecord = {
    id: 'u-owner-01',
    email: 'admin@trenterprise.com',
    name: 'Tanmay Roy (Store Owner)',
    password_hash: adminHash,
    role: 'admin',
    is_verified: true,
    verification_token: null,
    verification_otp: null,
    verification_expiry: null,
    failed_login_attempts: 0,
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    phone: '+91 98301 23456',
    created_at: now,
    updated_at: now,
  };

  inMemoryUsers.clear();
  inMemoryUsers.set(defaultAdmin.email.toLowerCase(), defaultAdmin);
  saveUsersToDisk();
}

// Initialize default users on startup
initializeDefaultUsers();

// Supabase client instance (if configured in environment)
let supabaseClient: any = null;
function getSupabase() {
  if (supabaseClient) return supabaseClient;
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (url && key) {
    try {
      supabaseClient = createClient(url, key);
    } catch (e) {
      console.warn('Supabase initialization failed, relying on in-memory store:', e);
    }
  }
  return supabaseClient;
}

export const db = {
  async getUserByEmail(email: string): Promise<UserRecord | null> {
    const cleanEmail = email.trim().toLowerCase();
    
    // Check Supabase first if available
    const sb = getSupabase();
    if (sb) {
      try {
        const { data, error } = await sb
          .from('users')
          .select('*')
          .eq('email', cleanEmail)
          .single();
        if (data && !error) {
          // Sync to in-memory
          inMemoryUsers.set(cleanEmail, data);
          return data;
        }
      } catch (err) {
        // Fallback to in-memory
      }
    }

    return inMemoryUsers.get(cleanEmail) || null;
  },

  async getUserById(id: string): Promise<UserRecord | null> {
    // Search in-memory
    for (const user of inMemoryUsers.values()) {
      if (user.id === id) return user;
    }

    // Check Supabase if available
    const sb = getSupabase();
    if (sb) {
      try {
        const { data } = await sb.from('users').select('*').eq('id', id).single();
        if (data) return data;
      } catch (e) {}
    }

    return null;
  },

  async getUserByToken(token: string): Promise<UserRecord | null> {
    if (!token) return null;
    for (const user of inMemoryUsers.values()) {
      if (user.verification_token === token) return user;
    }
    const sb = getSupabase();
    if (sb) {
      try {
        const { data } = await sb.from('users').select('*').eq('verification_token', token).single();
        if (data) return data;
      } catch (e) {}
    }
    return null;
  },

  getOwner(): UserRecord | null {
    const all = Array.from(inMemoryUsers.values());
    if (all.length === 0) return null;
    // Return the latest active owner
    return all.sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())[0];
  },

  getPreviousOwners(currentEmail?: string): UserRecord[] {
    const all = Array.from(inMemoryUsers.values());
    if (!currentEmail) {
      const active = this.getOwner();
      if (!active) return [];
      return all.filter(u => u.email.toLowerCase() !== active.email.toLowerCase());
    }
    const cleanCurrent = currentEmail.trim().toLowerCase();
    return all.filter(u => u.email.toLowerCase() !== cleanCurrent);
  },

  hasOwner(): boolean {
    return inMemoryUsers.size > 0;
  },

  getUserCount(): number {
    return inMemoryUsers.size;
  },

  async createUser(userData: Omit<UserRecord, 'created_at' | 'updated_at'>, purgePrevious: boolean = false): Promise<UserRecord> {
    const now = new Date().toISOString();
    const cleanEmail = userData.email.trim().toLowerCase();

    if (purgePrevious) {
      inMemoryUsers.clear();
    }

    const newUser: UserRecord = {
      ...userData,
      email: cleanEmail,
      role: 'admin', // Always assign full Owner / Admin authority
      created_at: now,
      updated_at: now,
    };

    inMemoryUsers.set(cleanEmail, newUser);
    saveUsersToDisk();

    // Sync to Supabase
    const sb = getSupabase();
    if (sb) {
      try {
        if (purgePrevious) {
          // Delete other users
          await sb.from('users').delete().neq('email', cleanEmail);
        }
        await sb.from('users').upsert(newUser);
      } catch (err) {
        console.warn('Could not sync created user to Supabase:', err);
      }
    }

    return newUser;
  },

  async purgePreviousCredentials(currentEmail: string): Promise<{ purgedCount: number; purgedEmails: string[] }> {
    const cleanCurrent = currentEmail.trim().toLowerCase();
    const currentOwner = inMemoryUsers.get(cleanCurrent) || (await this.getUserByEmail(cleanCurrent));
    
    const purgedEmails: string[] = [];
    for (const [email] of inMemoryUsers.entries()) {
      if (email.toLowerCase() !== cleanCurrent) {
        purgedEmails.push(email);
        inMemoryUsers.delete(email);
      }
    }

    if (currentOwner) {
      inMemoryUsers.set(cleanCurrent, {
        ...currentOwner,
        role: 'admin',
        is_verified: true,
        updated_at: new Date().toISOString()
      });
    }
    saveUsersToDisk();

    // Supabase cleanup
    const sb = getSupabase();
    if (sb && purgedEmails.length > 0) {
      try {
        for (const email of purgedEmails) {
          await sb.from('users').delete().eq('email', email);
        }
      } catch (err) {
        console.warn('Could not delete old users from Supabase:', err);
      }
    }

    return { purgedCount: purgedEmails.length, purgedEmails };
  },

  async deleteUserByEmail(email: string): Promise<boolean> {
    const cleanEmail = email.trim().toLowerCase();
    const deleted = inMemoryUsers.delete(cleanEmail);
    if (deleted) {
      saveUsersToDisk();
      const sb = getSupabase();
      if (sb) {
        try {
          await sb.from('users').delete().eq('email', cleanEmail);
        } catch (err) {}
      }
    }
    return deleted;
  },

  async updateUser(email: string, updates: Partial<UserRecord>): Promise<UserRecord | null> {
    const cleanEmail = email.trim().toLowerCase();
    const existing = inMemoryUsers.get(cleanEmail) || (await this.getUserByEmail(cleanEmail));
    if (!existing) return null;

    const updated: UserRecord = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    inMemoryUsers.set(cleanEmail, updated);
    saveUsersToDisk();

    const sb = getSupabase();
    if (sb) {
      try {
        await sb.from('users').update(updates).eq('email', cleanEmail);
      } catch (err) {
        console.warn('Could not update user in Supabase:', err);
      }
    }

    return updated;
  },

  async getAllUsers(): Promise<UserRecord[]> {
    return Array.from(inMemoryUsers.values());
  },

  isRegistrationLocked(): boolean {
    return !!portalConfig.registrationLocked;
  },

  setRegistrationLocked(locked: boolean): boolean {
    portalConfig.registrationLocked = !!locked;
    portalConfig.updatedAt = new Date().toISOString();
    saveConfigToDisk();
    console.log(`[DB] Registration lock changed to: ${portalConfig.registrationLocked}`);
    return portalConfig.registrationLocked;
  },

  getPortalConfig(): PortalConfig {
    return { ...portalConfig };
  }
};
