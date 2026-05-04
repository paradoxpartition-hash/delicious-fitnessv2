/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 */
import { createBrowserClient as _create } from '@supabase/ssr';

// Singleton — ensures only one client exists per browser session
let client: ReturnType<typeof _create> | null = null;

export function createBrowserClient() {
  if (client) return client;

  client = _create(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        // Must be Lax (not Strict) for OAuth redirects to work
        sameSite: 'Lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
      },
      auth: {
        // Let the middleware handle session refresh — don't auto-refresh in background
        // as it can interfere with server-side session reads
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    }
  );

  return client;
}
