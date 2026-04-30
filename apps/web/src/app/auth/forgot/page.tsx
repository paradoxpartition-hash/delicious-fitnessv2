/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@/lib/supabase/browser';

export default function ForgotPasswordPage() {
  const [email, setEmail]   = useState('');
  const [sent, setSent]     = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const supabase = createBrowserClient();

  // PRESERVED: Supabase password reset email
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    });
    if (err) { setError(err.message); setLoading(false); return; }
    setSent(true);
    setLoading(false);
  };

  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '70vh', padding: 24 }}>
      <div style={{ maxWidth: 400, width: '100%' }}>
        <Link href="/auth/signin" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 28 }}>
          ← Back to sign in
        </Link>

        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>✉️</div>
            <h2 style={{ marginBottom: 12 }}>Check your email</h2>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}>
              We sent a password reset link to <strong>{email}</strong>.
              It expires in 1 hour.
            </p>
          </div>
        ) : (
          <>
            <h1 style={{ fontSize: '1.9rem', marginBottom: 6 }}>Reset password</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: 28, fontSize: '0.92rem' }}>
              Enter your email and we'll send you a reset link.
            </p>

            <form onSubmit={handleReset}>
              {error && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--r)', padding: '10px 14px', color: '#dc2626', fontSize: '0.85rem', marginBottom: 16 }}>
                  {error}
                </div>
              )}
              <div className="field">
                <label className="field-label">Email address</label>
                <input
                  type="email" className="input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required autoComplete="email"
                />
              </div>
              <button
                type="submit"
                className={`btn btn-primary w-full${loading ? ' btn-loading' : ''}`}
                style={{ height: 44 }}
                disabled={loading}
              >
                {loading ? '' : 'Send reset link'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
