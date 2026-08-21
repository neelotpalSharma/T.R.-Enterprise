import express, { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { db, UserRecord } from './db';
import { sendVerificationEmail, getRecentEmails } from './email';

export const authRouter = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'tr-enterprise-jwt-super-secret-key-2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const VERIFICATION_EXPIRY_MINUTES = 15;

// ==============================================================================
// 0. SYSTEM STATUS ENDPOINT (Single-User Portal Verification)
// ==============================================================================
authRouter.get('/system-status', (req: Request, res: Response): void => {
  const owner = db.getOwner();
  const previousOwners = db.getPreviousOwners();
  const registrationLocked = db.isRegistrationLocked();
  res.json({
    success: true,
    singleUserMode: true,
    hasRegisteredOwner: !!owner,
    ownerEmail: owner ? owner.email : null,
    ownerName: owner ? owner.name : null,
    previousOwnersCount: previousOwners.length,
    previousOwnerEmails: previousOwners.map(u => u.email),
    registrationLocked,
    allowRegistration: !registrationLocked,
  });
});

// In-memory rate limiting map for login attempts: key is IP or Email -> { count: number, resetAt: number }
interface RateLimitEntry {
  count: number;
  firstAttemptAt: number;
  lockedUntil?: number;
}
const loginRateLimitMap = new Map<string, RateLimitEntry>();
const resendRateLimitMap = new Map<string, number>(); // email -> lastSentTimestamp

// Helper: Password strength validator (min 6 chars as per user requirements)
export function validateStrongPassword(password: string): { valid: boolean; reason?: string } {
  if (!password || typeof password !== 'string') {
    return { valid: false, reason: 'Password is required' };
  }
  if (password.length < 6) {
    return { valid: false, reason: 'Password must be at least 6 characters long' };
  }
  return { valid: true };
}

// Helper: Email format validator
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Helper: Generate clean App Base URL for verification link
function getBaseUrl(req: Request): string {
  const envAppUrl = process.env.APP_URL;
  if (envAppUrl && !envAppUrl.includes('MY_APP_URL')) {
    return envAppUrl;
  }
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
  return `${protocol}://${host}`;
}

// ==============================================================================
// 1. REGISTRATION ENDPOINT (Step 1 - Register as Sole Store Owner)
// ==============================================================================
authRouter.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, confirmPassword, name, phone, purgePrevious } = req.body;

    // Check if registration is locked by the store owner
    if (db.isRegistrationLocked()) {
      res.status(403).json({
        success: false,
        isRegistrationLocked: true,
        message: 'Registration is currently locked by the store owner. No new registrations are permitted.',
      });
      return;
    }

    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email and password are required.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    if (!isValidEmail(cleanEmail)) {
      res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
      return;
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      res.status(400).json({ success: false, message: 'Passwords do not match.' });
      return;
    }

    // Validate strong password requirement
    const passCheck = validateStrongPassword(password);
    if (!passCheck.valid) {
      res.status(400).json({ success: false, message: passCheck.reason });
      return;
    }

    // Check if THIS exact email is already registered and active
    const existingUser = await db.getUserByEmail(cleanEmail);
    if (existingUser) {
      // If user exists, allow password update or notify to sign in
      res.status(409).json({
        success: false,
        message: 'This email is already registered as the store owner. Please sign in with your credentials.',
      });
      return;
    }

    // Hash password with bcrypt (10 salt rounds)
    const password_hash = await bcrypt.hash(password, 10);

    // Generate 6-digit OTP and secure crypto verification token
    const verification_otp = Math.floor(100000 + Math.random() * 900000).toString();
    const verification_token = crypto.randomBytes(32).toString('hex');
    const verification_expiry = new Date(Date.now() + VERIFICATION_EXPIRY_MINUTES * 60 * 1000).toISOString();

    const userName = name?.trim() || cleanEmail.split('@')[0];

    // Store user with is_verified = true and admin role (Single Owner)
    // If purgePrevious is true, immediately clear all old credentials
    const shouldPurge = purgePrevious === true || purgePrevious === 'true';
    const newUser = await db.createUser({
      id: 'usr-' + crypto.randomUUID().substring(0, 13),
      email: cleanEmail,
      name: userName,
      password_hash,
      role: 'admin',
      is_verified: true,
      verification_token,
      verification_otp,
      verification_expiry,
      failed_login_attempts: 0,
      phone: phone || '',
    }, shouldPurge);

    // Send Email Verification (OTP + Secure Token Link)
    const baseUrl = getBaseUrl(req);
    const emailResult = await sendVerificationEmail({
      email: cleanEmail,
      name: userName,
      otp: verification_otp,
      verificationToken: verification_token,
      baseUrl,
      expiresInMinutes: VERIFICATION_EXPIRY_MINUTES,
    });

    // Generate signed JWT Token for session management
    const token = jwt.sign(
      {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        is_verified: true,
      },
      JWT_SECRET,
      { expiresIn: (JWT_EXPIRES_IN || '7d') as any }
    );

    res.status(201).json({
      success: true,
      message: 'Registration successful! You can now log in with your credentials.',
      email: cleanEmail,
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        is_verified: true,
        phone: newUser.phone,
      },
      expiresAt: verification_expiry,
      expiresInMinutes: VERIFICATION_EXPIRY_MINUTES,
      is_verified: true,
      devOtp: verification_otp,
      devToken: verification_token,
      simulatedEmail: emailResult.simulated,
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: error.message || 'Internal server error during registration.' });
  }
});

// ==============================================================================
// 2. EMAIL VERIFICATION ENDPOINT (Step 2 - via 6-digit OTP or Link Token)
// ==============================================================================
authRouter.post('/verify-otp', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      res.status(400).json({ success: false, message: 'Email and 6-digit OTP code are required.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.toString().trim();

    const user = await db.getUserByEmail(cleanEmail);
    if (!user) {
      res.status(404).json({ success: false, message: 'Account not found. Please register first.' });
      return;
    }

    if (user.is_verified) {
      res.status(200).json({
        success: true,
        alreadyVerified: true,
        message: 'Email is already verified. You can now login.',
      });
      return;
    }

    // Check OTP match
    if (user.verification_otp !== cleanOtp) {
      res.status(400).json({ success: false, message: 'Invalid verification code. Please check and try again.' });
      return;
    }

    // Check expiration
    if (user.verification_expiry && new Date(user.verification_expiry) < new Date()) {
      res.status(410).json({
        success: false,
        expired: true,
        message: 'Verification code has expired (exceeded 15 minutes). Please click "Resend Code".',
      });
      return;
    }

    // Update database: is_verified = true, clear token & otp
    await db.updateUser(cleanEmail, {
      is_verified: true,
      verification_token: null,
      verification_otp: null,
      verification_expiry: null,
    });

    res.status(200).json({
      success: true,
      is_verified: true,
      message: 'Email verified successfully. You can now login.',
    });
  } catch (error: any) {
    console.error('OTP verification error:', error);
    res.status(500).json({ success: false, message: 'Failed to verify OTP.' });
  }
});

// Verification via Secure Token Link (GET or POST)
authRouter.get('/verify-token', async (req: Request, res: Response): Promise<void> => {
  try {
    const token = (req.query.token as string) || (req.query.verify_token as string);
    const email = req.query.email as string;

    if (!token) {
      res.status(400).json({ success: false, message: 'Verification token is required.' });
      return;
    }

    let user: UserRecord | null = null;
    if (email) {
      user = await db.getUserByEmail(email.trim().toLowerCase());
    }
    if (!user) {
      user = await db.getUserByToken(token);
    }

    if (!user) {
      res.status(404).json({ success: false, message: 'Invalid or expired verification link.' });
      return;
    }

    if (user.is_verified) {
      res.status(200).json({
        success: true,
        alreadyVerified: true,
        message: 'Email is already verified. You can now login.',
      });
      return;
    }

    if (user.verification_token !== token) {
      res.status(400).json({ success: false, message: 'Invalid verification token.' });
      return;
    }

    // Expiry check
    if (user.verification_expiry && new Date(user.verification_expiry) < new Date()) {
      res.status(410).json({
        success: false,
        expired: true,
        message: 'Verification link has expired (15 minutes limit). Please request a new verification email.',
      });
      return;
    }

    // Set is_verified = true
    await db.updateUser(user.email, {
      is_verified: true,
      verification_token: null,
      verification_otp: null,
      verification_expiry: null,
    });

    res.status(200).json({
      success: true,
      is_verified: true,
      email: user.email,
      message: 'Email verified successfully. You can now login.',
    });
  } catch (error: any) {
    console.error('Token verification error:', error);
    res.status(500).json({ success: false, message: 'Failed to verify token.' });
  }
});

// ==============================================================================
// 3. RESEND VERIFICATION EMAIL / OTP
// ==============================================================================
authRouter.post('/resend-verification', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ success: false, message: 'Email address is required.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await db.getUserByEmail(cleanEmail);

    if (!user) {
      res.status(404).json({ success: false, message: 'No registered user found with this email.' });
      return;
    }

    if (user.is_verified) {
      res.status(200).json({
        success: true,
        alreadyVerified: true,
        message: 'Your email is already verified! You can log in directly.',
      });
      return;
    }

    // Rate limiting check on resend (cooldown 45 seconds)
    const now = Date.now();
    const lastSent = resendRateLimitMap.get(cleanEmail);
    if (lastSent && now - lastSent < 45 * 1000) {
      const waitSec = Math.ceil((45 * 1000 - (now - lastSent)) / 1000);
      res.status(429).json({
        success: false,
        message: `Please wait ${waitSec} seconds before requesting another code.`,
        retryAfter: waitSec,
      });
      return;
    }

    resendRateLimitMap.set(cleanEmail, now);

    // Generate fresh OTP & Token
    const verification_otp = Math.floor(100000 + Math.random() * 900000).toString();
    const verification_token = crypto.randomBytes(32).toString('hex');
    const verification_expiry = new Date(now + VERIFICATION_EXPIRY_MINUTES * 60 * 1000).toISOString();

    await db.updateUser(cleanEmail, {
      verification_otp,
      verification_token,
      verification_expiry,
    });

    const baseUrl = getBaseUrl(req);
    await sendVerificationEmail({
      email: cleanEmail,
      name: user.name,
      otp: verification_otp,
      verificationToken: verification_token,
      baseUrl,
      expiresInMinutes: VERIFICATION_EXPIRY_MINUTES,
    });

    res.status(200).json({
      success: true,
      message: 'New verification code has been sent to your email.',
      email: cleanEmail,
      expiresAt: verification_expiry,
      devOtp: verification_otp,
    });
  } catch (error: any) {
    console.error('Resend verification error:', error);
    res.status(500).json({ success: false, message: 'Failed to resend verification email.' });
  }
});

// ==============================================================================
// 3B. FORGOT PASSWORD ENDPOINT
// ==============================================================================
authRouter.post('/forgot-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ success: false, message: 'Email address is required.' });
      return;
    }
    const cleanEmail = email.trim().toLowerCase();
    const user = await db.getUserByEmail(cleanEmail);
    if (!user) {
      res.status(200).json({
        success: true,
        message: 'If an account is associated with this email, a password reset link has been dispatched.',
      });
      return;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpiry = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    await db.updateUser(cleanEmail, {
      verification_token: resetToken,
      verification_expiry: resetExpiry,
    });

    res.status(200).json({
      success: true,
      message: 'Password reset link sent to your email (valid for 30 minutes).',
      email: cleanEmail,
      devResetToken: resetToken,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to send password reset.' });
  }
});

// ==============================================================================
// 4. LOGIN ENDPOINT (Step 3 - Blocks if is_verified = false)
// ==============================================================================
authRouter.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email and password are required.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const clientIp = req.ip || req.socket.remoteAddress || cleanEmail;
    const rateLimitKey = `${clientIp}_${cleanEmail}`;

    // Rate Limiting Check (Max 5 failed attempts per 15 mins)
    const rateEntry = loginRateLimitMap.get(rateLimitKey);
    const now = Date.now();
    if (rateEntry && rateEntry.lockedUntil && rateEntry.lockedUntil > now) {
      const waitMin = Math.ceil((rateEntry.lockedUntil - now) / (60 * 1000));
      res.status(429).json({
        success: false,
        locked: true,
        message: `Too many failed login attempts. Your account is temporarily locked for security. Please try again in ${waitMin} minute(s).`,
      });
      return;
    }

    const user = await db.getUserByEmail(cleanEmail);
    if (!user) {
      // Record failed attempt
      trackFailedLogin(rateLimitKey);
      res.status(401).json({ success: false, message: 'Invalid email or password.' });
      return;
    }

    // Compare bcrypt password hash
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      trackFailedLogin(rateLimitKey);
      const attemptsLeft = 5 - (loginRateLimitMap.get(rateLimitKey)?.count || 1);
      res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
        attemptsLeft: Math.max(0, attemptsLeft),
      });
      return;
    }

    // Auto-verify user upon valid credentials check
    if (!user.is_verified) {
      await db.updateUser(cleanEmail, {
        is_verified: true,
        verification_otp: null,
        verification_token: null,
        verification_expiry: null,
      });
      user.is_verified = true;
    }

    // Reset rate limit counter on success
    loginRateLimitMap.delete(rateLimitKey);

    // Update last login
    await db.updateUser(cleanEmail, {
      last_login_at: new Date().toISOString(),
      failed_login_attempts: 0,
    });

    // Generate signed JWT Token for session management
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        is_verified: user.is_verified,
      },
      JWT_SECRET,
      { expiresIn: (JWT_EXPIRES_IN || '7d') as any }
    );

    res.status(200).json({
      success: true,
      message: 'Login successful!',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        is_verified: user.is_verified,
        avatarUrl: user.avatar_url,
        phone: user.phone,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Internal server error during login.' });
  }
});

function trackFailedLogin(key: string) {
  const now = Date.now();
  const entry = loginRateLimitMap.get(key) || { count: 0, firstAttemptAt: now };
  
  // Reset if older than 15 mins
  if (now - entry.firstAttemptAt > 15 * 60 * 1000) {
    entry.count = 1;
    entry.firstAttemptAt = now;
    entry.lockedUntil = undefined;
  } else {
    entry.count += 1;
  }

  if (entry.count >= 5) {
    entry.lockedUntil = now + 15 * 60 * 1000; // 15-minute lock
  }

  loginRateLimitMap.set(key, entry);
}

// ==============================================================================
// 5. JWT AUTHENTICATION MIDDLEWARE & ME ENDPOINT
// ==============================================================================
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Authentication required. Missing Bearer token.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    (req as any).user = decoded;
    next();
  } catch (err: any) {
    res.status(401).json({ success: false, message: 'Invalid or expired session token. Please log in again.' });
  }
}

// Get Current User Profile (JWT Protected)
authRouter.get('/me', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const tokenUser = (req as any).user;
    const user = await db.getUserByEmail(tokenUser.email);
    if (!user) {
      res.status(404).json({ success: false, message: 'User record not found.' });
      return;
    }

    const previousOwners = db.getPreviousOwners(user.email);

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        is_verified: user.is_verified,
        avatarUrl: user.avatar_url,
        phone: user.phone,
        createdAt: user.created_at,
        lastLoginAt: user.last_login_at,
      },
      previousOwnersCount: previousOwners.length,
      previousOwners: previousOwners.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        createdAt: u.created_at,
        lastLoginAt: u.last_login_at,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve profile.' });
  }
});

// ==============================================================================
// 6. PREVIOUS CREDENTIALS & PERMANENT REVOCATION (Owner Exclusive)
// ==============================================================================
authRouter.get('/previous-credentials', requireAuth, (req: Request, res: Response): void => {
  try {
    const tokenUser = (req as any).user;
    const previous = db.getPreviousOwners(tokenUser.email);
    res.json({
      success: true,
      currentOwner: tokenUser.email,
      previousOwnersCount: previous.length,
      previousOwners: previous.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        createdAt: u.created_at,
        lastLoginAt: u.last_login_at,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve previous credentials.' });
  }
});

authRouter.post('/delete-previous-credentials', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const tokenUser = (req as any).user;
    const { purgedCount, purgedEmails } = await db.purgePreviousCredentials(tokenUser.email);

    // Clear rate-limit cache and lockouts for deleted emails
    purgedEmails.forEach(em => {
      loginRateLimitMap.delete(em.toLowerCase());
    });

    console.log(`[AUTH] Owner (${tokenUser.email}) permanently deleted ${purgedCount} previous credential(s): ${purgedEmails.join(', ')}`);

    res.json({
      success: true,
      message: `Successfully purged ${purgedCount} previous owner credential(s). The previous owner cannot log in again.`,
      purgedCount,
      purgedEmails,
      currentOwner: tokenUser.email,
    });
  } catch (err: any) {
    console.error('Delete previous credentials error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete previous credentials.' });
  }
});

authRouter.post('/toggle-registration-lock', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { locked } = req.body;
    const tokenUser = (req as any).user;
    const isLocked = db.setRegistrationLocked(locked);

    console.log(`[AUTH] Owner (${tokenUser?.email}) set registration lock to: ${isLocked}`);

    res.json({
      success: true,
      registrationLocked: isLocked,
      message: isLocked
        ? 'Registration is now LOCKED. No new registrations can be performed.'
        : 'Registration is now UNLOCKED. New registration is enabled.',
    });
  } catch (err: any) {
    console.error('Toggle registration lock error:', err);
    res.status(500).json({ success: false, message: 'Failed to toggle registration lock.' });
  }
});

// ==============================================================================
// 7. HELPER ENDPOINTS: RECENT SENT EMAILS & SUPABASE SCHEMA
// ==============================================================================
authRouter.get('/recent-emails', (req: Request, res: Response) => {
  const email = req.query.email as string;
  const emails = getRecentEmails(email);
  res.json({ success: true, count: emails.length, emails });
});

authRouter.get('/schema', (req: Request, res: Response) => {
  try {
    const schemaPath = path.join(process.cwd(), 'server', 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const sql = fs.readFileSync(schemaPath, 'utf8');
      res.json({ success: true, schema: sql });
    } else {
      res.json({ success: true, schema: '-- Schema file not found' });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});
