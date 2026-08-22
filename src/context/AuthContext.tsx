import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Session, User as SupabaseUser, AuthError } from '@supabase/supabase-js';
import { User, Role } from '../types';
import { supabase, getSupabaseClient } from '../lib/supabase';

interface SignUpResponse {
  error: AuthError | Error | null;
  user?: User | null;
  needsEmailConfirmation?: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | Error | null }>;
  signUp: (email: string, password: string, fullName: string, role?: Role) => Promise<SignUpResponse>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Map Supabase User instance to our strongly typed App User
export function mapSupabaseUser(sbUser: SupabaseUser | null): User | null {
  if (!sbUser) return null;
  const metadata = sbUser.user_metadata || {};
  const role: Role = metadata.role === 'staff' ? 'staff' : 'admin';
  const name =
    metadata.full_name ||
    metadata.name ||
    (sbUser.email ? sbUser.email.split('@')[0] : 'Store User');

  return {
    id: sbUser.id,
    email: sbUser.email || '',
    name,
    role,
    phone: metadata.phone || sbUser.phone || '',
    avatarUrl: metadata.avatar_url || '',
    joinedDate: sbUser.created_at
      ? new Date(sbUser.created_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : undefined,
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Synchronize authentication state from Supabase
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.warn('Supabase getSession notice:', error.message);
        }

        if (isMounted) {
          if (data?.session) {
            setSession(data.session);
            setUser(mapSupabaseUser(data.session.user));
          } else {
            setSession(null);
            setUser(null);
          }
          setLoading(false);
        }
      } catch (err) {
        console.warn('Error during Supabase auth initialization:', err);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen to Supabase auth state changes (SIGN_IN, SIGN_OUT, TOKEN_REFRESHED, USER_UPDATED)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        if (isMounted) {
          setSession(currentSession);
          setUser(currentSession?.user ? mapSupabaseUser(currentSession.user) : null);
          setLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        return { error };
      }

      if (data?.session) {
        setSession(data.session);
        setUser(mapSupabaseUser(data.session.user));
      }

      return { error: null };
    } catch (err: any) {
      return { error: err instanceof Error ? err : new Error(err?.message || 'Login failed') };
    }
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, fullName: string, role: Role = 'admin'): Promise<SignUpResponse> => {
      try {
        const cleanEmail = email.trim().toLowerCase();
        const cleanName = fullName.trim();

        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              full_name: cleanName,
              name: cleanName,
              role: role,
            },
          },
        });

        if (error) {
          return { error, user: null };
        }

        const appUser = data?.user ? mapSupabaseUser(data.user) : null;

        // If session returned immediately (auto-confirm enabled in Supabase)
        if (data?.session) {
          setSession(data.session);
          setUser(appUser);
          return { error: null, user: appUser, needsEmailConfirmation: false };
        }

        // Needs email confirmation if no session returned yet
        const needsConfirmation = !data?.session && Boolean(data?.user && !data.user.confirmed_at);
        return { error: null, user: appUser, needsEmailConfirmation: needsConfirmation };
      } catch (err: any) {
        return {
          error: err instanceof Error ? err : new Error(err?.message || 'Registration failed'),
          user: null,
        };
      }
    },
    []
  );

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Sign out notice:', err);
    } finally {
      setSession(null);
      setUser(null);
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: window.location.origin,
      });
      return { error };
    } catch (err: any) {
      return { error: err instanceof Error ? err : new Error(err?.message || 'Password reset request failed') };
    }
  }, []);

  const value: AuthContextType = {
    user,
    session,
    loading,
    isAuthenticated: Boolean(user && session),
    isAdmin: user?.role === 'admin',
    signIn,
    signUp,
    signOut,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
