/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 *
 * useAuth — centralized auth + role hook
 * Single source of truth for auth state and role-based routing.
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { createBrowserClient } from '@/lib/supabase/browser';

// ─── Role type covers both old uppercase + new lowercase values ───────────────
// DB enum has: USER, CHEF, MODERATOR, ADMIN (from migration 001)
//              member, dietitian              (added in migration 008)
export type UserRole =
  | 'USER' | 'CHEF' | 'MODERATOR' | 'ADMIN'   // legacy uppercase
  | 'member' | 'chef' | 'dietitian' | 'admin' | 'moderator'; // new lowercase

export interface UserProfile {
  id:                 string;
  username:           string;
  avatar_url:         string | null;
  bio:                string | null;
  role:               UserRole;
  fitness_goal:       'bulk' | 'cut' | 'maintain' | 'recomposition' | null;
  daily_kcal_target:  number | null;
  diet_type:          string | null;
  meal_plan_status:   'ok' | 'needs_regeneration' | null;
  created_at:         string;
  updated_at:         string;
}

export interface AuthState {
  user:           any | null;
  profile:        UserProfile | null;
  loading:        boolean;
  isLoggedIn:     boolean;
  isMember:       boolean;
  isChef:         boolean;
  isDietitian:    boolean;
  isAdmin:        boolean;
  isModerator:    boolean;
  dashboardHref:  string;
  signOut:        () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// ─── Role helpers — centralised, no inline checks in components ───────────────
function isAdminRole(role: UserRole)     { return role === 'ADMIN'     || role === 'admin'; }
function isModRole(role: UserRole)       { return role === 'MODERATOR' || role === 'moderator'; }
function isChefRole(role: UserRole)      { return role === 'CHEF'      || role === 'chef'; }
function isDietitianRole(role: UserRole) { return role === 'dietitian'; }
function isMemberRole(role: UserRole)    { return role === 'USER' || role === 'member'; }

export function getDashboardHref(role?: UserRole): string {
  if (!role) return '/dashboard';
  if (isAdminRole(role) || isModRole(role)) return '/admin';
  if (isChefRole(role))                     return '/chef/dashboard';
  if (isDietitianRole(role))                return '/dietitian/dashboard';
  return '/dashboard';
}

// ─── Display labels ───────────────────────────────────────────────────────────
export const ROLE_LABELS: Record<string, string> = {
  USER:        'Member',
  member:      'Member',
  CHEF:        'Chef',
  chef:        'Chef',
  dietitian:   'Dietitian',
  MODERATOR:   'Moderator',
  moderator:   'Moderator',
  ADMIN:       'Administrator',
  admin:       'Administrator',
};

export const ROLE_ICONS: Record<string, string> = {
  USER:        '👤',
  member:      '👤',
  CHEF:        '👨‍🍳',
  chef:        '👨‍🍳',
  dietitian:   '🥗',
  MODERATOR:   '🛡️',
  moderator:   '🛡️',
  ADMIN:       '⚙️',
  admin:       '⚙️',
};

// ─── useAuth hook ─────────────────────────────────────────────────────────────
export function useAuth(): AuthState {
  const [user,    setUser]    = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createBrowserClient();

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, bio, role, fitness_goal, daily_kcal_target, diet_type, meal_plan_status, created_at, updated_at')
      .eq('id', userId)
      .single();
    if (data) setProfile(data as UserProfile);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user?.id) await fetchProfile(user.id);
  }, [user?.id, fetchProfile]);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user ?? null);
      if (data.user) await fetchProfile(data.user.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_e, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) await fetchProfile(u.id);
      else   setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    try {
      localStorage.removeItem('df_saved_recipes');
      localStorage.removeItem('df_read_notifications');
    } catch (_) {}
    window.location.href = '/';
  }, []);

  const role = profile?.role;

  return {
    user,
    profile,
    loading,
    isLoggedIn:   !!user,
    isMember:     !role || isMemberRole(role),
    isChef:       !!role && isChefRole(role),
    isDietitian:  !!role && isDietitianRole(role),
    isAdmin:      !!role && (isAdminRole(role) || isModRole(role)),
    isModerator:  !!role && isModRole(role),
    dashboardHref: getDashboardHref(role),
    signOut,
    refreshProfile,
  };
}

// ─── Exported for settings page role display ──────────────────────────────────
export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English',    flag: '🇬🇧' },
  { code: 'nl', label: 'Nederlands', flag: '🇳🇱' },
  { code: 'de', label: 'Deutsch',    flag: '🇩🇪' },
  { code: 'fr', label: 'Français',   flag: '🇫🇷' },
  { code: 'es', label: 'Español',    flag: '🇪🇸' },
] as const;
