/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/browser';
import { detectLanguage, getTranslations, type LangCode } from '@/lib/i18n';

// ── PRESERVED: existing Stripe price IDs and checkout logic ──────────────────
const FEATURES_LIST = [
  'Unlimited structured recipes',
  'Auto-translation to 5 languages',
  'Visibility boost in search',
  'Chef profile page',
  'Analytics dashboard',
  'Affiliate link tracking',
  'Recipe version history',
  'Priority moderation queue',
];

export default function PricingPage() {
  const [loading, setLoading]   = useState<'monthly' | 'annual' | null>(null);
  const [error, setError]       = useState('');
  const [lang, setLang]         = useState<LangCode>('en');
  const supabase = createBrowserClient();
  const router   = useRouter();

  useEffect(() => { setLang(detectLanguage()); }, []);
  useEffect(() => {
    const h = (e: Event) => setLang((e as CustomEvent).detail);
    window.addEventListener('df:langchange', h);
    return () => window.removeEventListener('df:langchange', h);
  }, []);

  // ── PRESERVED: Stripe checkout (callEdgeFunction) ─────────────────────────
  const handleSubscribe = async (plan: 'monthly' | 'annual') => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth/signup?next=/pricing'); return; }

    setLoading(plan); setError('');
    try {
      const { data, error: err } = await supabase.functions.invoke('create-checkout-session', {
        body: { plan, success_url: `${window.location.origin}/chef/welcome`, cancel_url: window.location.href },
      });
      if (err) throw err;
      if (data?.url) window.location.href = data.url;
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong');
      setLoading(null);
    }
  };

  const t = getTranslations(lang);

  return (
    <>
      {/* Page hero */}
      <section className="page-hero">
        <div className="container" style={{ textAlign: 'center' }}>
          <div className="eyebrow" style={{ justifyContent: 'center', color: 'var(--primary)', marginBottom: 16 }}>
            Chef subscription
          </div>
          <h1>Reach a global audience</h1>
          <p>Upload structured recipes, gain visibility across 5 languages,<br />track analytics, and earn through affiliate links.</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          {error && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--r)',
              padding: '12px 16px', color: '#dc2626', fontSize: '0.88rem',
              maxWidth: 600, margin: '0 auto 24px', textAlign: 'center',
            }}>{error}</div>
          )}

          <div className="pricing-grid">
            {/* Monthly */}
            <div className="pricing-card">
              <div className="eyebrow" style={{ marginBottom: 16 }}>Monthly</div>
              <div style={{ marginBottom: 8 }}>
                <span className="price-currency">€</span>
                <span className="price-amount">5</span>
                <span className="price-period">/month</span>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 24 }}>
                7-day free trial · Cancel anytime
              </p>

              <div className="pricing-features">
                {FEATURES_LIST.map(f => (
                  <div key={f} className="pricing-feature">
                    <span className="check">✓</span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>

              <button
                className={`btn btn-outline w-full${loading === 'monthly' ? ' btn-loading' : ''}`}
                style={{ height: 44 }}
                onClick={() => handleSubscribe('monthly')}
                disabled={!!loading}
              >
                {loading === 'monthly' ? '' : 'Start free trial'}
              </button>
            </div>

            {/* Annual */}
            <div className="pricing-card featured">
              <div className="pricing-badge">
                <span className="badge badge-green">Best value</span>
              </div>
              <div className="eyebrow" style={{ marginBottom: 16 }}>Annual</div>
              <div style={{ marginBottom: 8 }}>
                <span className="price-currency">€</span>
                <span className="price-amount">50</span>
                <span className="price-period">/year</span>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 24 }}>
                Save €10 vs monthly · 7-day free trial
              </p>

              <div className="pricing-features">
                {[...FEATURES_LIST, 'Priority support'].map(f => (
                  <div key={f} className="pricing-feature">
                    <span className="check" style={{ color: 'var(--primary)' }}>✓</span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>

              <button
                className={`btn btn-primary w-full${loading === 'annual' ? ' btn-loading' : ''}`}
                style={{ height: 44, boxShadow: 'var(--shadow-green)' }}
                onClick={() => handleSubscribe('annual')}
                disabled={!!loading}
              >
                {loading === 'annual' ? '' : 'Start free trial'}
              </button>
            </div>
          </div>

          {/* Payment methods */}
          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              iDEAL, Visa, Mastercard · Powered by Stripe · Cancel anytime
            </p>
          </div>

          {/* FAQ */}
          <div style={{ maxWidth: 680, margin: '56px auto 0' }}>
            <h3 style={{ textAlign: 'center', marginBottom: 32 }}>Frequently asked questions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { q: 'What happens after the trial?', a: 'After 7 days, your card is charged automatically. You can cancel any time before the trial ends.' },
                { q: 'Can I publish recipes for free?', a: 'Yes — free accounts can view all recipes. Chef features (publish, analytics, affiliates) require a subscription.' },
                { q: 'What payment methods are accepted?', a: 'iDEAL, Visa, Mastercard, and any Stripe-supported method depending on your region.' },
                { q: 'Can I cancel at any time?', a: 'Yes. Cancel through your billing portal and you keep access until the end of your billing period.' },
              ].map(({ q, a }) => (
                <div key={q} style={{
                  background: 'white', border: '1px solid var(--border)',
                  borderRadius: 'var(--r-lg)', padding: '20px 22px',
                }}>
                  <h4 style={{ fontSize: '0.97rem', marginBottom: 8 }}>{q}</h4>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.65 }}>{a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
