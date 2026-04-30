/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 *
 * Edge Function: create-portal-session
 * Opens the Stripe customer portal for subscription management.
 */
import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { ok, err, handleOptions } from '../_shared/cors.ts';
import { getSupabaseUser, getSupabaseAdmin } from '../_shared/supabase.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-04-10',
  httpClient: Stripe.createFetchHttpClient(),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions();

  try {
    // ── Auth ────────────────────────────────────────────────────────────────
    const supabaseUser = getSupabaseUser(req.headers.get('Authorization'));
    const { data: { user }, error: authErr } = await supabaseUser.auth.getUser();
    if (authErr || !user) return err('Unauthorized', 401);

    const { return_url } = await req.json();
    if (!return_url) return err('Missing return_url');

    // ── Get Stripe customer ID ───────────────────────────────────────────────
    const supabaseAdmin = getSupabaseAdmin();
    const { data: chef } = await supabaseAdmin
      .from('chef_profiles')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    if (!chef?.stripe_customer_id) return err('No billing account found', 404);

    // ── Create portal session ────────────────────────────────────────────────
    const session = await stripe.billingPortal.sessions.create({
      customer:   chef.stripe_customer_id,
      return_url,
    });

    return ok({ url: session.url });
  } catch (e: any) {
    console.error('[create-portal-session]', e);
    return err(e.message ?? 'Internal error', 500);
  }
});
