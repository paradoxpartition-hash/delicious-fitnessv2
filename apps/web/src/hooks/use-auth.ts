/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 *
 * useAuth — fixed auth lifecycle hook
 *
 * ROOT CAUSES FIXED:
 *
 * 1. Race condition between getUser() and onAuthStateChange()
 *    Previous: Both ran in parallel. onAuthStateChange fired INITIAL_SESSION
 *    before getUser() resolved, so loading toggled multiple times.
 *    Fix: Remove getUser() entirely. Use ONLY onAuthStateChange with
 *    INITIAL_SESSION event to set the initial auth state. This fires exactly
 *    once on mount with the current session, then again on sign in/out.
 *
 * 2. fetchProfile called inside onAuthStateChange without guarding against
 *    the case where it fails (e.g. RLS blocks read before profile exists).
 *    If fetchProfile throws or returns null, setLoading(false) was never
 *    reached. Fix: always call setLoading(false) in a finally block.
 *
 * 3. autoRefreshToken re-hydrating session after signOut.
 *    Previous: window.location.replace('/') fired before Supabase's internal
 *    token refresh completed, so the session came back.
 *    Fix: Disable autoRefreshToken on the browser client, call signOut with
 *    scope:'global' to invalidate server-side, clear all Supabase localStorage
 *    keys explicitly, then redirect.
 *
 * 4. createBrowserClient() called at page component top level created a new
 *    Supabase instance each render, triggering duplicate auth events.
 *    Fix: Pages must NOT create their own supabase client. They use the one
 *    from useAuth via the returned `supabase` reference.
 */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createBrowserClient } from '@/lib/supabase/browser';

// ─── Types ────────────────────────────────────────────────────────────────────
export type UserRole =
  | 'USER' | 'CHEF' | 'MODERATOR' | 'ADMIN'
  | 'member' | 'chef' | 'dietitian' | 'admin' | 'moderator';

export interface UserProfile {
  id:                string;
  username:          string;
  avatar_url:        string | null;
  bio:               string | null;
  role:              UserRole;
  fitness_goal:      'bulk' | 'cut' | 'maintain' | 'recomposition' | null;
  daily_kcal_target: number | null;
  diet_type:         string | null;
  meal_plan_status:  'ok' | 'needs_regeneration' | null;
  created_at:        string;
  updated_at:        string;
}

export interface AuthState {
  user:           any | null;
  profile:        UserProfile | null;
  loading:        boolean;
  isLoggedIn:     boolean;
  isAdmin:        boolean;
  isChef:         boolean;
  isDietitian:    boolean;
  isMember:       boolean;
  dashboardHref:  string;
  supabase:       ReturnType<typeof createBrowserClient>;
  signOut:        () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// ─── Role helpers ─────────────────────────────────────────────────────────────
const isAdminRole = (r?: UserRole) => r === 'ADMIN'     || r === 'admin';
const isModRole   = (r?: UserRole) => r === 'MODERATOR' || r === 'moderator';
const isChefRole  = (r?: UserRole) => r === 'CHEF'      || r === 'chef';
const isDietRole  = (r?: UserRole) => r === 'dietitian';

export function getDashboardHref(role?: UserRole): string {
  if (isAdminRole(role) || isModRole(role)) return '/admin';
  if (isChefRole(role))                     return '/chef/dashboard';
  if (isDietRole(role))                     return '/dietitian/dashboard';
  return '/dashboard';
}

export const ROLE_LABELS: Record<string, string> = {
  USER: 'Member',  member:    'Member',
  CHEF: 'Chef',    chef:      'Chef',
  dietitian: 'Dietitian',
  MODERATOR: 'Moderator',  moderator: 'Moderator',
  ADMIN: 'Administrator',  admin:     'Administrator',
};

export const ROLE_ICONS: Record<string, string> = {
  USER: '👤',  member:    '👤',
  CHEF: '👨‍🍳', chef:      '👨‍🍳',
  dietitian: '🥗',
  MODERATOR: '🛡️', moderator: '🛡️',
  ADMIN: '⚙️',     admin:     '⚙️',
};

// ─── Supabase localStorage key prefix — used to clear session on signout ──────
const SB_STORAGE_PREFIX = 'sb-';

// ─── The hook ─────────────────────────────────────────────────────────────────
export function useAuth(): AuthState {
  const [user,    setUser]    = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // ONE stable Supabase client instance — never recreated.
  // Exposed so pages can use it without creating their own.
  const supabase = useRef(createBrowserClient()).current;

  // ── fetchProfile: always resolves, never hangs ────────────────────────────
  const fetchProfile = useCallback(async (userId: string): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, bio, role, fitness_goal, daily_kcal_target, diet_type, meal_plan_status, created_at, updated_at')
        .eq('id', userId)
        .single();
      // Only update state if data actually came back
      if (data && !error) setProfile(data as UserProfile);
    } catch (_) {
      // Profile fetch failed (e.g. RLS) — don't hang, just continue
    }
  }, []); // stable — supabase ref never changes

  const refreshProfile = useCallback(async (): Promise<void> => {
    if (!user?.id) return;
    await fetchProfile(user.id);
  }, [user?.id, fetchProfile]);

  // ── Auth state — driven entirely by onAuthStateChange ────────────────────
  // INITIAL_SESSION fires synchronously on mount with the current session.
  // SIGNED_IN fires on login. SIGNED_OUT fires on logout.
  // This is the ONLY place we set user/loading — no separate getUser() call.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const u = session?.user ?? null;
        setUser(u);

        if (u) {
          await fetchProfile(u.id);
        } else {
          setProfile(null);
        }

        // loading resolves after the FIRST event (INITIAL_SESSION)
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []); // empty deps — runs exactly once on mount

  // ── signOut: kills session properly including autoRefresh ─────────────────
  const signOut = useCallback(async (): Promise<void> => {
    // 1. Clear React state immediately so UI updates instantly
    setUser(null);
    setProfile(null);
    setLoading(false);

    // 2. Sign out globally — invalidates refresh token server-side
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch (_) {
      // Continue even if server call fails
    }

    // 3. Explicitly clear ALL Supabase keys from localStorage
    //    This prevents autoRefreshToken from re-establishing the session
    try {
      const keys = Object.keys(localStorage).filter(k =>
        k.startsWith(SB_STORAGE_PREFIX) ||
        k.startsWith('df_')
      );
      keys.forEach(k => localStorage.removeItem(k));
    } catch (_) {}

    // 4. Redirect — session is fully dead before this point
    window.location.href = '/';
  }, []);

  const role = profile?.role;

  return {
    user,
    profile,
    loading,
    isLoggedIn:   !!user,
    isAdmin:      isAdminRole(role) || isModRole(role),
    isChef:       isChefRole(role),
    isDietitian:  isDietRole(role),
    isMember:     !role || (!isAdminRole(role) && !isModRole(role) && !isChefRole(role) && !isDietRole(role)),
    dashboardHref: getDashboardHref(role),
    supabase,  // ← exposed so pages don't create their own client
    signOut,
    refreshProfile,
  };
}
