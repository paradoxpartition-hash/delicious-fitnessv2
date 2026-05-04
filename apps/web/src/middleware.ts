/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 *
 * ROOT CAUSE OF REDIRECT LOOP:
 *
 * The @supabase/ssr package stores the auth token split across multiple
 * cookie chunks: sb-<ref>-auth-token.0, sb-<ref>-auth-token.1, etc.
 * (This happens when the token exceeds the 4KB cookie size limit.)
 *
 * The previous middleware used the old cookie API:
 *   get(name) / set(name, value) / remove(name)
 *
 * This only reads/writes single cookies by name. When Supabase tries to
 * read its chunked session token, it calls get('sb-...-auth-token') which
 * returns undefined (the token is split across .0 and .1 keys), so it
 * sees no session and our middleware redirects to /auth/signin.
 *
 * THE FIX: Use the new getAll/setAll cookie API which reads ALL cookies
 * at once, allowing @supabase/ssr to find and reassemble chunked tokens.
 */
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/profile',
  '/saved-recipes',
  '/meal-plan',
  '/chef',
  '/admin',
  '/recipes/new',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // ── getAll: reads ALL cookies — handles chunked tokens correctly ──
        getAll() {
          return request.cookies.getAll();
        },
        // ── setAll: writes all cookies — must update BOTH request and response ──
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Do NOT run any code between createServerClient and getUser()
  // that could interfere with the cookie read.
  const { data: { user } } = await supabase.auth.getUser();

  const isProtected = PROTECTED_PREFIXES.some(p => pathname.startsWith(p));

  // Not authenticated → redirect to sign in
  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/signin';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // Authenticated on auth pages → redirect to intended destination
  if (
    user &&
    (pathname.startsWith('/auth/signin') || pathname.startsWith('/auth/signup'))
  ) {
    const next = request.nextUrl.searchParams.get('next') ?? '/dashboard';
    const url  = request.nextUrl.clone();
    url.pathname = next;
    url.search   = '';
    return NextResponse.redirect(url);
  }

  // IMPORTANT: Return supabaseResponse (not a new NextResponse) so that
  // any session refresh cookies set by Supabase are forwarded to the browser.
  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
