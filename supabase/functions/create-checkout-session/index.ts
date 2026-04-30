/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 *
 * Edge Function: create-checkout-session
 * Creates a Stripe Checkout session for chef subscription.
 */
import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { corsHeaders, ok, err, handleOptions } from '../_shared/cors.ts';
import { getSupabaseUser, getSupabaseAdmin } from '../_shared/supabase.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-04-10',
  httpClient: Stripe.createFetchHttpClient(),
});

const PRICE_IDS: Record<string, string> = {
  monthly: Deno.env.get('STRIPE_PRICE_ID_MONTHLY')!,
  annual:  Deno.env.get('STRIPE_PRICE_ID_ANNUAL')!,
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions();

  try {
    // ── Auth ────────────────────────────────────────────────────────────────
    const supabaseUser = getSupabaseUser(req.headers.get('Authorization'));
    const { data: { user }, error: authErr } = await supabaseUser.auth.getUser();
    if (authErr || !user) return err('Unauthorized', 401);

    // ── Body ────────────────────────────────────────────────────────────────
    const { plan, success_url, cancel_url } = await req.json();
    if (!plan || !PRICE_IDS[plan]) return err('Invalid plan');
    if (!success_url || !cancel_url)  return err('Missing redirect URLs');

    const supabaseAdmin = getSupabaseAdmin();

    // ── Get or create Stripe customer ────────────────────────────────────────
    let stripeCustomerId: string | null = null;

    const { data: chefProfile } = await supabaseAdmin
      .from('chef_profiles')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    if (chefProfile?.stripe_customer_id) {
      stripeCustomerId = chefProfile.stripe_customer_id;
    } else {
      // Create a Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      stripeCustomerId = customer.id;

      // Upsert chef_profile with Stripe customer ID
      await supabaseAdmin
        .from('chef_profiles')
        .upsert({
          user_id:            user.id,
          stripe_customer_id: stripeCustomerId,
        })
        .eq('user_id', user.id);
    }

    // ── Create Checkout Session ──────────────────────────────────────────────
    const session = await stripe.checkout.sessions.create({
      customer:             stripeCustomerId,
      mode:                 'subscription',
      payment_method_types: ['card', 'ideal'],
      line_items: [{
        price:    PRICE_IDS[plan],
        quantity: 1,
      }],
      subscription_data: {
        trial_period_days: 7,
        metadata: {
          supabase_user_id: user.id,
          plan,
        },
      },
      success_url,
      cancel_url,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      customer_update: {
        address: 'auto',
        name:    'auto',
      },
    });

    return ok({ url: session.url, session_id: session.id });
  } catch (e: any) {
    console.error('[create-checkout-session]', e);
    return err(e.message ?? 'Internal error', 500);
  }
});
