/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 *
 * useAuth — single source of truth for auth state + role-based routing.
 *
 * Root cause of previous issues:
 * - supabase client was recreated on every render causing infinite refetch loops
 * - role checks were scattered across components causing hydration mismatches
 * - signOut only called supabase.auth.signOut() but didn't clear local state
 *   or redirect, so the UI appeared unchanged
 */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createBrowserClient } from '@/lib/supabase/browser';

export type UserRole =
  | 'USER' | 'CHEF' | 'MODERATOR' | 'ADMIN'      // legacy uppercase (migration 001)
  | 'member' | 'chef' | 'dietitian' | 'admin' | 'moderator'; // new lowercase

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
  signOut:        () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// ─── Role predicate helpers — used only here, never in JSX ───────────────────
const isAdminRole  = (r?: UserRole) => r === 'ADMIN'     || r === 'admin';
const isModRole    = (r?: UserRole) => r === 'MODERATOR' || r === 'moderator';
const isChefRole   = (r?: UserRole) => r === 'CHEF'      || r === 'chef';
const isDietRole   = (r?: UserRole) => r === 'dietitian';

export function getDashboardHref(role?: UserRole): string {
  if (isAdminRole(role) || isModRole(role)) return '/admin';
  if (isChefRole(role))                     return '/chef/dashboard';
  if (isDietRole(role))                     return '/dietitian/dashboard';
  return '/dashboard';
}

export const ROLE_LABELS: Record<string, string> = {
  USER: 'Member', member: 'Member',
  CHEF: 'Chef',   chef:   'Chef',
  dietitian: 'Dietitian',
  MODERATOR: 'Moderator', moderator: 'Moderator',
  ADMIN: 'Administrator', admin: 'Administrator',
};

export const ROLE_ICONS: Record<string, string> = {
  USER: '👤', member: '👤',
  CHEF: '👨‍🍳', chef: '👨‍🍳',
  dietitian: '🥗',
  MODERATOR: '🛡️', moderator: '🛡️',
  ADMIN: '⚙️', admin: '⚙️',
};

// ─── The hook ─────────────────────────────────────────────────────────────────
export function useAuth(): AuthState {
  const [user,    setUser]    = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Stable supabase client — created once, never recreated on render
  const supabase = useRef(createBrowserClient()).current;

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, bio, role, fitness_goal, daily_kcal_target, diet_type, meal_plan_status, created_at, updated_at')
      .eq('id', userId)
      .single();
    if (data) setProfile(data as UserProfile);
  }, []); // stable — no deps that change

  const refreshProfile = useCallback(async () => {
    const { data: { user: u } } = await supabase.auth.getUser();
    if (u) await fetchProfile(u.id);
  }, [fetchProfile]);

  useEffect(() => {
    // Initial session check
    supabase.auth.getUser().then(async ({ data }) => {
      const u = data.user ?? null;
      setUser(u);
      if (u) await fetchProfile(u.id);
      setLoading(false);
    });

    // Auth state listener — fires on sign in / sign out
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const u = session?.user ?? null;
        setUser(u);
        if (u) await fetchProfile(u.id);
        else   { setProfile(null); setLoading(false); }
      }
    );

    return () => subscription.unsubscribe();
  }, []); // runs once on mount

  // ── Sign out — fully clears state, storage, and redirects ────────────────
  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (_) {
      // Ignore errors — we still want to clear local state
    }
    // Clear local state
    setUser(null);
    setProfile(null);
    // Clear relevant localStorage keys
    const keysToRemove = [
      'df_saved_recipes',
      'df_read_notifications',
      'df_homepage_sections',
      'df_user_prefs',
    ];
    keysToRemove.forEach(key => {
      try { localStorage.removeItem(key); } catch (_) {}
    });
    // Hard redirect — clears any in-memory React state too
    window.location.replace('/');
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
    signOut,
    refreshProfile,
  };
}
