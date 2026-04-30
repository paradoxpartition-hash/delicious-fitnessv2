/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 */
import Link from 'next/link';

export default function AuthErrorPage() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '70vh', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: '3rem', marginBottom: 16 }}>⚠️</div>
        <h2 style={{ marginBottom: 12 }}>Authentication error</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.7 }}>
          Something went wrong during sign in. This can happen if the link expired or was already used.
        </p>
        <div className="flex justify-center gap-12">
          <Link href="/auth/signin" className="btn btn-primary">Try again</Link>
          <Link href="/" className="btn btn-outline">Go home</Link>
        </div>
      </div>
    </div>
  );
}
