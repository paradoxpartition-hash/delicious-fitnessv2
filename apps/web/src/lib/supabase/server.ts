/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 */
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createServerSideClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string)                              { return cookieStore.get(name)?.value; },
        set(name: string, value: string, opts: CookieOptions) { try { cookieStore.set({ name, value, ...opts }); } catch (_) {} },
        remove(name: string, opts: CookieOptions)     { try { cookieStore.set({ name, value: '', ...opts }); } catch (_) {} },
      },
    }
  );
}

export function createServiceRoleClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get(name: string)                              { return cookieStore.get(name)?.value; },
        set(name: string, value: string, opts: CookieOptions) { try { cookieStore.set({ name, value, ...opts }); } catch (_) {} },
        remove(name: string, opts: CookieOptions)     { try { cookieStore.set({ name, value: '', ...opts }); } catch (_) {} },
      },
    }
  );
}
