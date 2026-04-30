/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 *
 * Edge Function: stripe-webhook
 * Handles all Stripe webhook events and syncs subscription state to Supabase.
 *
 * Register this URL in Stripe Dashboard → Webhooks:
 *   https://<project-ref>.supabase.co/functions/v1/stripe-webhook
 *
 * Required events:
 *   customer.subscription.created
 *   customer.subscription.updated
 *   customer.subscription.deleted
 *   invoice.payment_succeeded
 *   invoice.payment_failed
 */
import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { getSupabaseAdmin } from '../_shared/supabase.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-04-10',
  httpClient: Stripe.createFetchHttpClient(),
});

const WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

Deno.serve(async (req) => {
  // ── Verify Stripe signature ────────────────────────────────────────────────
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return new Response('Missing stripe-signature', { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = await stripe.webhooks.constructEventAsync(body, signature, WEBHOOK_SECRET);
  } catch (e: any) {
    console.error('[stripe-webhook] Signature verification failed:', e.message);
    return new Response(`Webhook Error: ${e.message}`, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  try {
    switch (event.type) {

      // ── Subscription created or updated ─────────────────────────────────
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.supabase_user_id;
        if (!userId) {
          console.warn('[stripe-webhook] No supabase_user_id in metadata', sub.id);
          break;
        }

        const plan = (sub.metadata?.plan as 'monthly' | 'annual') ?? 'monthly';

        // Upsert subscription record
        await supabase.from('subscriptions').upsert({
          user_id:               userId,
          stripe_subscription_id: sub.id,
          stripe_customer_id:    sub.customer as string,
          status:                sub.status,
          plan,
          current_period_start:  new Date(sub.current_period_start * 1000).toISOString(),
          current_period_end:    new Date(sub.current_period_end   * 1000).toISOString(),
          cancel_at_period_end:  sub.cancel_at_period_end,
          trial_end:             sub.trial_end
            ? new Date(sub.trial_end * 1000).toISOString()
            : null,
        }, { onConflict: 'stripe_subscription_id' });

        // Ensure chef_profile exists (create if this is a new subscription)
        if (sub.status === 'trialing' || sub.status === 'active') {
          await supabase.from('chef_profiles').upsert(
            { user_id: userId, stripe_customer_id: sub.customer as string },
            { onConflict: 'user_id', ignoreDuplicates: true }
          );
        }

        console.log(`[stripe-webhook] Subscription ${sub.status} for user ${userId}`);
        break;
      }

      // ── Subscription deleted (cancelled and expired) ─────────────────────
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await supabase
          .from('subscriptions')
          .update({ status: 'canceled', cancel_at_period_end: true })
          .eq('stripe_subscription_id', sub.id);

        // Downgrade role back to USER
        const userId = sub.metadata?.supabase_user_id;
        if (userId) {
          await supabase
            .from('profiles')
            .update({ role: 'USER' })
            .eq('id', userId);
        }

        console.log(`[stripe-webhook] Subscription deleted: ${sub.id}`);
        break;
      }

      // ── Payment succeeded ────────────────────────────────────────────────
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const subId   = invoice.subscription as string;
        if (!subId) break;

        // Refresh subscription status
        const sub = await stripe.subscriptions.retrieve(subId);
        await supabase
          .from('subscriptions')
          .update({
            status:               sub.status,
            current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
            current_period_end:   new Date(sub.current_period_end   * 1000).toISOString(),
          })
          .eq('stripe_subscription_id', subId);

        console.log(`[stripe-webhook] Payment succeeded: ${invoice.id}`);
        break;
      }

      // ── Payment failed ───────────────────────────────────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subId   = invoice.subscription as string;
        if (subId) {
          await supabase
            .from('subscriptions')
            .update({ status: 'past_due' })
            .eq('stripe_subscription_id', subId);
        }
        console.warn(`[stripe-webhook] Payment failed: ${invoice.id}`);
        break;
      }

      default:
        console.log(`[stripe-webhook] Unhandled event: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (e: any) {
    console.error('[stripe-webhook] Handler error:', e);
    return new Response(`Handler Error: ${e.message}`, { status: 500 });
  }
});
