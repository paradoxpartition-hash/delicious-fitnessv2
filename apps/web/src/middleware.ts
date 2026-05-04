/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 *
 * Middleware — server-side route protection
 *
 * ROOT CAUSE FIXED:
 * /dashboard and /saved-recipes were not in PROTECTED_ROUTES so after
 * signOut the middleware let the request through. The page then called
 * useAuth which detected no session and redirected — but the redirect
 * happened client-side AFTER the page rendered, causing a flash and
 * in some cases an infinite loop if the redirect target also had auth checks.
 *
 * Fix: Add all protected routes here so the server redirects BEFORE
 * the page bundle is sent to the browser. No client-side auth check needed.
 */
import { createServerClient, type CookieOptions } from '@supabase/ssr';
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
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // getUser() verifies the JWT with Supabase — not just cookie presence.
  // This correctly returns null after signOut({ scope: 'global' }).
  const { data: { user } } = await supabase.auth.getUser();

  const isProtected = PROTECTED_PREFIXES.some(p => pathname.startsWith(p));

  // Unauthenticated → redirect to sign in
  if (isProtected && !user) {
    const url = new URL('/auth/signin', request.url);
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // Authenticated on auth pages → redirect to intended destination
  if (user && (
    pathname.startsWith('/auth/signin') ||
    pathname.startsWith('/auth/signup')
  )) {
    const next = request.nextUrl.searchParams.get('next') ?? '/dashboard';
    return NextResponse.redirect(new URL(next, request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
