/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/browser';
import { detectLanguage, getTranslations, type LangCode } from '@/lib/i18n';

export default function SignUpPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState(false);
  const [lang, setLang]         = useState<LangCode>('en');

  const router       = useRouter();
  const searchParams = useSearchParams();
  const next         = searchParams.get('next') ?? '/';
  const supabase     = createBrowserClient();

  useEffect(() => { setLang(detectLanguage()); }, []);
  useEffect(() => {
    const h = (e: Event) => setLang((e as CustomEvent).detail);
    window.addEventListener('df:langchange', h);
    return () => window.removeEventListener('df:langchange', h);
  }, []);

  const t = getTranslations(lang);

  // ── Sign up (PRESERVED logic) ─────────────────────────────────────────────
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true); setError('');

    const { error: err } = await supabase.auth.signUp({
      email, password,
      options: {
        data: { username },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${next}`,
      },
    });

    if (err) { setError(err.message); setLoading(false); return; }
    setSuccess(true);
    setLoading(false);
  };

  // ── Google OAuth (PRESERVED) ──────────────────────────────────────────────
  const handleGoogle = async () => {
    setLoading(true); setError('');
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${next}` },
    });
    if (err) { setError(err.message); setLoading(false); }
  };

  if (success) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '70vh', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 420 }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>✉️</div>
          <h2 style={{ marginBottom: 12 }}>Check your email</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.7 }}>
            We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.
          </p>
          <Link href="/auth/signin" className="btn btn-primary">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-layout">
      {/* Visual panel */}
      <div className="auth-panel-visual">
        <Link href="/" className="logo" style={{ color: 'white' }}>
          <div className="logo-mark">🥗</div>
          <span style={{ color: 'white', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.2rem' }}>
            Delicious<span style={{ color: 'var(--primary)' }}>Fitness</span>
          </span>
        </Link>

        <div>
          {/* Feature bullets */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {[
              { icon: '🎯', text: 'Macro-accurate recipes from a verified ingredient database' },
              { icon: '🌍', text: 'Auto-translated to 5 languages — EN, NL, DE, FR, ES' },
              { icon: '🤖', text: 'AI meal planner personalised to your fitness goal' },
              { icon: '🤝', text: 'Community ratings, forks, comments and version history' },
            ].map(f => (
              <div key={f.icon} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 'var(--r-sm)',
                  background: 'rgba(34,197,94,0.15)',
                  display: 'grid', placeItems: 'center', fontSize: '1.1rem', flexShrink: 0,
                }}>{f.icon}</div>
                <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.9rem', lineHeight: 1.55, paddingTop: 6 }}>{f.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem' }}>
          Developed by <span style={{ color: 'rgba(255,255,255,0.45)' }}>SaaSolutions SL</span> · © 2026 Paradox FZCO
        </div>
      </div>

      {/* Form panel */}
      <div className="auth-panel-form">
        <div className="auth-inner">
          <h1 className="auth-title">{t.auth.signUpTitle}</h1>
          <p className="auth-sub">{t.auth.signUpSub}</p>

          <button className="oauth-btn" onClick={handleGoogle} disabled={loading} style={{ width: '100%', marginBottom: 8 }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            {t.auth.googleBtn}
          </button>

          <div className="auth-divider"><span>{t.auth.orContinueWith}</span></div>

          <form onSubmit={handleSignUp}>
            {error && (
              <div style={{
                background: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: 'var(--r)', padding: '10px 14px',
                color: '#dc2626', fontSize: '0.85rem', marginBottom: 16,
              }}>{error}</div>
            )}

            <div className="field">
              <label className="field-label">Username</label>
              <input
                type="text" className="input"
                placeholder="your_username"
                value={username}
                onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s/g, '_'))}
                required autoComplete="username"
              />
            </div>

            <div className="field">
              <label className="field-label">{t.auth.emailLabel}</label>
              <input
                type="email" className="input"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required autoComplete="email"
              />
            </div>

            <div className="field">
              <label className="field-label">{t.auth.passwordLabel}</label>
              <input
                type="password" className="input"
                placeholder="Min. 6 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required autoComplete="new-password"
                minLength={6}
              />
              <span className="field-hint">At least 6 characters</span>
            </div>

            <button
              type="submit"
              className={`btn btn-primary w-full${loading ? ' btn-loading' : ''}`}
              style={{ height: 44 }}
              disabled={loading}
            >
              {loading ? '' : t.auth.signUpBtn}
            </button>

            <p style={{ fontSize: '0.75rem', color: 'var(--text-light)', textAlign: 'center', marginTop: 14 }}>
              By signing up you agree to our{' '}
              <Link href="/terms" style={{ color: 'var(--primary)' }}>Terms</Link>
              {' '}and{' '}
              <Link href="/privacy" style={{ color: 'var(--primary)' }}>Privacy Policy</Link>.
            </p>
          </form>

          <div className="auth-switch">
            {t.auth.hasAccount}{' '}
            <Link href={`/auth/signin${next !== '/' ? `?next=${next}` : ''}`}>
              {t.auth.signInLink}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
