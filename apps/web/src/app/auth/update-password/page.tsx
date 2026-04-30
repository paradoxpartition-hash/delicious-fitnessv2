/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBrowserClient } from '@/lib/supabase/browser';

export default function UpdatePasswordPage() {
  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState(false);
  const supabase = createBrowserClient();
  const router   = useRouter();

  // PRESERVED: Supabase listens for PASSWORD_RECOVERY event
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'PASSWORD_RECOVERY') {
        // User is now in password-recovery mode — form is ready
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setLoading(true); setError('');

    // PRESERVED: Supabase updateUser
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) { setError(err.message); setLoading(false); return; }

    setSuccess(true);
    setTimeout(() => router.push('/'), 2500);
  };

  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '70vh', padding: 24 }}>
      <div style={{ maxWidth: 400, width: '100%' }}>
        {success ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>✅</div>
            <h2 style={{ marginBottom: 12 }}>Password updated!</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>
              Your password has been changed successfully. Redirecting you home…
            </p>
            <Link href="/" className="btn btn-primary">Go home</Link>
          </div>
        ) : (
          <>
            <h1 style={{ fontSize: '1.9rem', marginBottom: 6 }}>New password</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: 28, fontSize: '0.92rem' }}>
              Choose a strong new password for your account.
            </p>

            <form onSubmit={handleUpdate}>
              {error && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--r)', padding: '10px 14px', color: '#dc2626', fontSize: '0.85rem', marginBottom: 16 }}>
                  {error}
                </div>
              )}
              <div className="field">
                <label className="field-label">New password</label>
                <input
                  type="password" className="input"
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required minLength={6}
                  autoComplete="new-password"
                />
              </div>
              <div className="field">
                <label className="field-label">Confirm new password</label>
                <input
                  type="password" className="input"
                  placeholder="Repeat password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
              <button
                type="submit"
                className={`btn btn-primary w-full${loading ? ' btn-loading' : ''}`}
                style={{ height: 44 }}
                disabled={loading}
              >
                {loading ? '' : 'Update password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
