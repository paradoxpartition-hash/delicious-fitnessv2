/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/browser';

interface Subscription {
  status:          string;
  plan:            'monthly' | 'annual';
  current_period_end: string;
  cancel_at_period_end: boolean;
}

export default function ChefBillingPage() {
  const [sub, setSub]       = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const supabase = createBrowserClient();
  const router   = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/auth/signin'); return; }

      // PRESERVED: fetch subscription from Supabase
      const { data: subData } = await supabase
        .from('subscriptions')
        .select('status, plan, current_period_end, cancel_at_period_end')
        .eq('user_id', data.user.id)
        .single();

      setSub(subData as Subscription ?? null);
      setLoading(false);
    });
  }, []);

  // Open Stripe billing portal (PRESERVED edge function call)
  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-portal-session', {
        body: { return_url: window.location.href },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (e: any) {
      alert(e.message ?? 'Failed to open billing portal');
    }
    setPortalLoading(false);
  };

  const STATUS_COLOR: Record<string, string> = {
    active:   'var(--primary)',
    trialing: 'var(--accent)',
    canceled: '#dc2626',
    past_due:  '#dc2626',
  };

  if (loading) {
    return <div style={{ display: 'grid', placeItems: 'center', minHeight: '40vh' }}><div className="skeleton" style={{ width: 160, height: 20 }} /></div>;
  }

  return (
    <>
      <section className="page-hero" style={{ paddingBlock: 40 }}>
        <div className="container">
          <div className="flex-between flex-wrap gap-12">
            <div>
              <h1 style={{ marginBottom: 6 }}>Billing</h1>
              <p>Manage your chef subscription</p>
            </div>
            <Link href="/chef/dashboard" className="btn btn-outline" style={{ borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)' }}>
              ← Dashboard
            </Link>
          </div>
        </div>
      </section>

      <section className="section-sm">
        <div className="container" style={{ maxWidth: 600, marginInline: 'auto' }}>
          {sub ? (
            <>
              {/* Subscription card */}
              <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 28, marginBottom: 20 }}>
                <div className="flex-between mb-20">
                  <h3 style={{ fontSize: '1.05rem' }}>Current subscription</h3>
                  <span style={{
                    padding: '4px 12px', borderRadius: 'var(--r-full)',
                    background: `${STATUS_COLOR[sub.status] ?? 'var(--text-muted)'}15`,
                    color: STATUS_COLOR[sub.status] ?? 'var(--text-muted)',
                    fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase',
                  }}>
                    {sub.status}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[
                    { label: 'Plan', value: sub.plan === 'annual' ? '€50 / year' : '€5 / month' },
                    { label: 'Next billing', value: sub.cancel_at_period_end ? 'Cancels on ' + new Date(sub.current_period_end).toLocaleDateString() : new Date(sub.current_period_end).toLocaleDateString() },
                    { label: 'Auto-renew', value: sub.cancel_at_period_end ? '❌ Off (cancels at period end)' : '✅ On' },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex-between" style={{ fontSize: '0.9rem', paddingBottom: 10, borderBottom: '1px solid var(--border-light)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                      <span style={{ fontWeight: 600 }}>{value}</span>
                    </div>
                  ))}
                </div>

                <button
                  className={`btn btn-primary w-full${portalLoading ? ' btn-loading' : ''}`}
                  style={{ marginTop: 22, height: 44 }}
                  onClick={openPortal}
                  disabled={portalLoading}
                >
                  {portalLoading ? '' : '💳 Manage subscription'}
                </button>
                <p style={{ fontSize: '0.76rem', color: 'var(--text-light)', textAlign: 'center', marginTop: 10 }}>
                  Managed securely by Stripe. Update payment method, download invoices, or cancel.
                </p>
              </div>

              {/* What's included */}
              <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 24 }}>
                <h4 style={{ fontSize: '0.97rem', marginBottom: 16 }}>Your plan includes</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    'Unlimited structured recipes',
                    'Auto-translation to 5 languages',
                    'Analytics dashboard',
                    'Affiliate link tracking',
                    'Recipe version history',
                    'Priority in search results',
                  ].map(f => (
                    <div key={f} className="flex gap-10 items-center" style={{ fontSize: '0.88rem' }}>
                      <span style={{ color: 'var(--primary)', fontWeight: 700 }}>✓</span>
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">💳</div>
              <h3 className="empty-title">No active subscription</h3>
              <p className="empty-desc">Subscribe to unlock chef features — publish, earn, and grow your audience.</p>
              <Link href="/pricing" className="btn btn-primary btn-lg">View plans</Link>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
