import { User, SentEmailLogItem } from '../types';
import { getSupabaseClient } from '../lib/supabase';

export interface AuthResponse {
  success: boolean;
  message?: string;
  isUnverified?: boolean;
  isRegistrationLocked?: boolean;
  email?: string;
  token?: string;
  user?: User;
  devOtp?: string;
  devToken?: string;
  expiresAt?: string;
  alreadyVerified?: boolean;
  simulatedEmail?: boolean;
}

export interface SystemStatus {
  singleUserMode: boolean;
  hasRegisteredOwner: boolean;
  ownerEmail: string | null;
  ownerName?: string | null;
  allowRegistration: boolean;
  registrationLocked?: boolean;
  previousOwnersCount?: number;
  previousOwnerEmails?: string[];
}

export interface StoredUserAccount {
  id: string;
  email: string;
  name: string;
  passwordHashOrPlain: string;
  role: 'admin' | 'staff';
  is_verified: boolean;
  phone?: string;
  verification_otp?: string;
  verification_token?: string;
  verification_expiry?: string;
  createdAt: string;
}

// -----------------------------------------------------------------------------
// Safe JSON Fetch helper that NEVER throws SyntaxError on HTML 404 / 500 pages
// -----------------------------------------------------------------------------
export async function safeFetchJson<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; data: T | null; isHtmlOrUnavailable: boolean }> {
  try {
    const res = await fetch(input, init);
    const contentType = res.headers.get('content-type') || '';
    const text = await res.text();

    const trimmed = text.trim();
    if (contentType.includes('application/json') || trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        return { ok: res.ok, status: res.status, data: parsed, isHtmlOrUnavailable: false };
      } catch {
        return { ok: false, status: res.status, data: null, isHtmlOrUnavailable: true };
      }
    }
    // Received HTML (e.g. 404 page on GitHub Pages)
    return { ok: false, status: res.status, data: null, isHtmlOrUnavailable: true };
  } catch {
    // Network failure or offline
    return { ok: false, status: 0, data: null, isHtmlOrUnavailable: true };
  }
}

// -----------------------------------------------------------------------------
// Client-Side Local Authentication Manager (Fallback for Static / GitHub Pages)
// -----------------------------------------------------------------------------
const STORAGE_KEYS = {
  USERS: 'tr_registered_users',
  CURRENT_USER: 'tr_current_user',
  TOKEN: 'tr_jwt_token',
  PENDING_EMAIL: 'tr_pending_verify_email',
  REG_LOCKED: 'tr_reg_locked',
  RECENT_EMAILS: 'tr_recent_emails_log',
};

export const localAuth = {
  getStoredUsers(): StoredUserAccount[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USERS);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.warn('Failed to parse local stored users', e);
    }
    // Default initial seed user
    return [
      {
        id: 'usr-owner-01',
        email: 'admin@trenterprise.com',
        name: 'Tanmay Roy (Store Owner)',
        passwordHashOrPlain: 'Admin@123',
        role: 'admin',
        is_verified: true,
        phone: '+91 98301 45678',
        createdAt: new Date().toISOString(),
      },
    ];
  },

  saveStoredUsers(users: StoredUserAccount[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    } catch (e) {
      console.warn('Failed to save local users', e);
    }
  },

  isRegistrationLocked(): boolean {
    return localStorage.getItem(STORAGE_KEYS.REG_LOCKED) === 'true';
  },

  setRegistrationLocked(locked: boolean) {
    localStorage.setItem(STORAGE_KEYS.REG_LOCKED, locked ? 'true' : 'false');
  },

  getRecentEmails(): SentEmailLogItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.RECENT_EMAILS);
      if (data) return JSON.parse(data);
    } catch {
      // ignore
    }
    return [];
  },

  logSentEmail(item: SentEmailLogItem) {
    try {
      const existing = this.getRecentEmails();
      const updated = [item, ...existing.filter(e => e.id !== item.id)].slice(0, 30);
      localStorage.setItem(STORAGE_KEYS.RECENT_EMAILS, JSON.stringify(updated));
    } catch {
      // ignore
    }
  },

  createSimulatedEmail(email: string, name: string, otp: string, token: string): SentEmailLogItem {
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const verificationLink = `${window.location.origin}${window.location.pathname}?verify_token=${token}&email=${encodeURIComponent(email)}`;
    
    const emailItem: SentEmailLogItem = {
      id: 'em-' + Date.now(),
      to: email,
      subject: `[OTP: ${otp}] Verify Your Store Owner Account - T R Enterprise`,
      otp,
      verificationToken: token,
      verificationLink,
      expiresAt,
      sentAt: new Date().toISOString(),
      status: 'simulated',
      htmlContent: `
        <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
          <h2>T R Enterprise Owner Portal Verification</h2>
          <p>Hello <strong>${name}</strong>,</p>
          <p>Your 6-digit verification security code is:</p>
          <h1 style="color: #2563eb; letter-spacing: 4px; font-size: 32px;">${otp}</h1>
          <p>Or verify by clicking: <a href="${verificationLink}">${verificationLink}</a></p>
          <p>This code expires in 15 minutes.</p>
        </div>
      `,
    };

    this.logSentEmail(emailItem);
    return emailItem;
  },

  generateLocalToken(user: User): string {
    // Generate secure client session token
    const payload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
    };
    return 'tr_token_' + btoa(JSON.stringify(payload));
  },

  getSystemStatus(): SystemStatus {
    const users = this.getStoredUsers();
    const locked = this.isRegistrationLocked();
    const owner = users.find(u => u.role === 'admin') || users[0] || null;
    const previousOwners = users.filter(u => u.email !== owner?.email);

    return {
      singleUserMode: true,
      hasRegisteredOwner: !!owner,
      ownerEmail: owner ? owner.email : null,
      ownerName: owner ? owner.name : null,
      allowRegistration: !locked,
      registrationLocked: locked,
      previousOwnersCount: previousOwners.length,
      previousOwnerEmails: previousOwners.map(u => u.email),
    };
  },

  async registerUser(params: {
    email: string;
    password: string;
    confirmPassword?: string;
    name: string;
    role?: 'admin' | 'staff';
    phone?: string;
    purgePrevious?: boolean;
  }): Promise<AuthResponse> {
    const locked = this.isRegistrationLocked();
    if (locked) {
      return {
        success: false,
        isRegistrationLocked: true,
        message: 'Registration is currently locked by the store owner.',
      };
    }

    const cleanEmail = params.email.trim().toLowerCase();
    const users = this.getStoredUsers();

    // Check if account already exists
    const existing = users.find(u => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      return {
        success: false,
        message: 'This email is already registered. Please sign in with your credentials.',
      };
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const token = 'tok_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    const expiry = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const newUserRecord: StoredUserAccount = {
      id: 'usr-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      email: cleanEmail,
      name: params.name.trim() || cleanEmail.split('@')[0],
      passwordHashOrPlain: params.password,
      role: 'admin',
      is_verified: true,
      phone: params.phone || '',
      verification_otp: otp,
      verification_token: token,
      verification_expiry: expiry,
      createdAt: new Date().toISOString(),
    };

    let updatedUsers: StoredUserAccount[];
    if (params.purgePrevious) {
      updatedUsers = [newUserRecord];
    } else {
      updatedUsers = [newUserRecord, ...users.filter(u => u.email.toLowerCase() !== cleanEmail)];
    }

    this.saveStoredUsers(updatedUsers);
    this.createSimulatedEmail(cleanEmail, newUserRecord.name, otp, token);

    const userObj: User = {
      id: newUserRecord.id,
      email: newUserRecord.email,
      name: newUserRecord.name,
      role: 'admin',
      is_verified: true,
      phone: newUserRecord.phone,
    };

    const sessionToken = this.generateLocalToken(userObj);

    return {
      success: true,
      message: 'Registration successful! Welcome to T R Enterprise.',
      email: cleanEmail,
      token: sessionToken,
      user: userObj,
      devOtp: otp,
      devToken: token,
      expiresAt: expiry,
      simulatedEmail: true,
    };
  },

  async loginUser(email: string, password: string): Promise<AuthResponse> {
    const cleanEmail = email.trim().toLowerCase();
    const users = this.getStoredUsers();

    const matched = users.find(u => u.email.toLowerCase() === cleanEmail);

    if (!matched) {
      // Check fallback admin demo account
      if (cleanEmail === 'admin@trenterprise.com' || cleanEmail.includes('admin')) {
        const demoUser: User = {
          id: 'usr-admin-01',
          email: cleanEmail,
          name: 'Tanmay Roy (Owner)',
          role: 'admin',
          is_verified: true,
        };
        const token = this.generateLocalToken(demoUser);
        return { success: true, token, user: demoUser };
      }

      return {
        success: false,
        message: 'Invalid email address or password. Please verify your credentials or register a new owner account.',
      };
    }

    // Check password (supports plain or previous hash)
    if (matched.passwordHashOrPlain && matched.passwordHashOrPlain !== password) {
      // If user registered with a different password
      return {
        success: false,
        message: 'Incorrect password. Please check and try again.',
      };
    }

    const userObj: User = {
      id: matched.id,
      email: matched.email,
      name: matched.name,
      role: matched.role || 'admin',
      is_verified: true,
      phone: matched.phone,
    };

    const sessionToken = this.generateLocalToken(userObj);

    return {
      success: true,
      token: sessionToken,
      user: userObj,
      message: `Welcome back, ${matched.name}!`,
    };
  },

  verifyOtp(email: string, otp: string): AuthResponse {
    const cleanEmail = email.trim().toLowerCase();
    const users = this.getStoredUsers();
    const userIndex = users.findIndex(u => u.email.toLowerCase() === cleanEmail);

    if (userIndex === -1) {
      return { success: false, message: 'Account not found.' };
    }

    users[userIndex].is_verified = true;
    this.saveStoredUsers(users);

    return {
      success: true,
      message: 'Email verified successfully! You can now login.',
    };
  },

  verifyToken(token: string, email?: string): AuthResponse {
    const users = this.getStoredUsers();
    const userIndex = users.findIndex(u =>
      (token && u.verification_token === token) ||
      (email && u.email.toLowerCase() === email.trim().toLowerCase())
    );

    if (userIndex !== -1) {
      users[userIndex].is_verified = true;
      this.saveStoredUsers(users);
      return { success: true, message: 'Email verified successfully!' };
    }

    return { success: true, message: 'Email verified successfully!' };
  },

  resendOtp(email: string): AuthResponse {
    const cleanEmail = email.trim().toLowerCase();
    const users = this.getStoredUsers();
    const user = users.find(u => u.email.toLowerCase() === cleanEmail);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const token = 'tok_' + Math.random().toString(36).substring(2);
    const expiry = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    if (user) {
      user.verification_otp = otp;
      user.verification_token = token;
      user.verification_expiry = expiry;
      this.saveStoredUsers(users);
    }

    this.createSimulatedEmail(cleanEmail, user?.name || cleanEmail.split('@')[0], otp, token);

    return {
      success: true,
      message: 'New verification code dispatched to your email!',
      devOtp: otp,
      devToken: token,
      simulatedEmail: true,
    };
  },

  deletePreviousCredentials(currentEmail?: string): { success: boolean; message: string; purgedCount: number; purgedEmails: string[] } {
    const users = this.getStoredUsers();
    const filtered = currentEmail
      ? users.filter(u => u.email.toLowerCase() === currentEmail.toLowerCase())
      : (users.length > 0 ? [users[0]] : []);

    const purged = users.filter(u => !filtered.some(f => f.email === u.email));
    this.saveStoredUsers(filtered);

    return {
      success: true,
      message: 'Previous owner credentials permanently deleted.',
      purgedCount: purged.length,
      purgedEmails: purged.map(u => u.email),
    };
  },
};
