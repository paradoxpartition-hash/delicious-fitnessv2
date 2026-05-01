/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 */
'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{
      display: 'grid', placeItems: 'center',
      minHeight: '70vh', padding: 24, textAlign: 'center',
    }}>
      <div style={{ maxWidth: 480 }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(5rem, 14vw, 9rem)',
          fontWeight: 800, lineHeight: 1,
          color: 'var(--border)',
          marginBottom: 8,
          userSelect: 'none',
        }}>
          404
        </div>

        <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>🍽️</div>
        <h1 style={{ fontSize: '1.6rem', marginBottom: 10 }}>Page not found</h1>
        <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 32 }}>
          Looks like this recipe got burned. The page you are looking for does not exist
          or may have been moved.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/" className="btn btn-primary btn-lg">
            Back to home
          </Link>
          <Link href="/recipes" className="btn btn-outline btn-lg">
            Browse recipes
          </Link>
        </div>

        <div style={{
          marginTop: 48, paddingTop: 32,
          borderTop: '1px solid var(--border)',
          display: 'flex', justifyContent: 'center',
          gap: 24, flexWrap: 'wrap',
        }}>
          <Link href="/search" style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            Search
          </Link>
          <Link href="/community" style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            Community
          </Link>
          <Link href="/blog" style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            Blog
          </Link>
          <Link href="/pricing" style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            Become a chef
          </Link>
        </div>
      </div>
    </div>
  );
}
