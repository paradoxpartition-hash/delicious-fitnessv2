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

export default function SignInPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
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

  // ── Sign in with email (PRESERVED logic) ──────────────────────────────────
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) { setError(err.message); setLoading(false); return; }
    router.push(next);
  };

  // ── Google OAuth (PRESERVED logic) ────────────────────────────────────────
  const handleGoogle = async () => {
    setLoading(true); setError('');
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${next}` },
    });
    if (err) { setError(err.message); setLoading(false); }
  };

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
          <blockquote style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.15rem', lineHeight: 1.7, fontStyle: 'italic', marginBottom: 20 }}>
            "The most structured, macro-accurate recipe platform I've ever used. It changed how I eat."
          </blockquote>
          <div className="flex gap-12 items-center">
            <div className="avatar avatar-md" style={{ background: 'rgba(255,255,255,0.15)' }}>MK</div>
            <div>
              <div style={{ color: 'white', fontWeight: 600, fontSize: '0.9rem' }}>Marco K.</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>Fitness chef · 340 recipes</div>
            </div>
          </div>
        </div>

        <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem' }}>
          Developed by {' '}
          <span style={{ color: 'rgba(255,255,255,0.45)' }}>SaaSolutions SL</span>
          {' '} · © 2026 Paradox FZCO
        </div>
      </div>

      {/* Form panel */}
      <div className="auth-panel-form">
        <div className="auth-inner">
          <h1 className="auth-title">{t.auth.signInTitle}</h1>
          <p className="auth-sub">{t.auth.signInSub}</p>

          {/* Google OAuth */}
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

          {/* Email form */}
          <form onSubmit={handleSignIn}>
            {error && (
              <div style={{
                background: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: 'var(--r)', padding: '10px 14px',
                color: '#dc2626', fontSize: '0.85rem', marginBottom: 16,
              }}>
                {error}
              </div>
            )}

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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label className="field-label" style={{ margin: 0 }}>{t.auth.passwordLabel}</label>
                <Link href="/auth/forgot" style={{ fontSize: '0.78rem', color: 'var(--primary)' }}>
                  {t.auth.forgotPassword}
                </Link>
              </div>
              <input
                type="password" className="input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className={`btn btn-primary w-full${loading ? ' btn-loading' : ''}`}
              style={{ height: 44 }}
              disabled={loading}
            >
              {loading ? '' : t.auth.signInBtn}
            </button>
          </form>

          <div className="auth-switch">
            {t.auth.noAccount}{' '}
            <Link href={`/auth/signup${next !== '/' ? `?next=${next}` : ''}`}>
              {t.auth.signUpLink}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
