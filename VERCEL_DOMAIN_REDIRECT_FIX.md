# Fix: enforce canonical production domain

## Canonical domain (must be used everywhere)
- https://delicious-fitnessv2-web.vercel.app

## Checklist
1) Vercel env var `NEXT_PUBLIC_APP_URL` must be:
   - https://delicious-fitnessv2-web.vercel.app
2) Vercel Domains must keep short URL canonical.
3) Supabase Auth Site URL + Redirect URLs must use short URL.
4) Avoid hardcoded absolute redirects in app code.
