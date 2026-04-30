/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 */
'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[DF Error]', error);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{
          display: 'grid', placeItems: 'center',
          minHeight: '100vh', padding: 24, textAlign: 'center',
          fontFamily: 'system-ui, sans-serif',
        }}>
          <div style={{ maxWidth: 420 }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>⚠️</div>
            <h1 style={{ fontSize: '1.6rem', marginBottom: 10, fontWeight: 700 }}>
              Something went wrong
            </h1>
            <p style={{ color: '#6B7280', lineHeight: 1.7, marginBottom: 28 }}>
              An unexpected error occurred. Our team has been notified.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
              <button
                onClick={reset}
                style={{
                  padding: '10px 22px', borderRadius: '9999px',
                  background: '#22C55E', color: 'white',
                  border: 'none', fontWeight: 600, cursor: 'pointer',
                  fontSize: '0.9rem',
                }}
              >
                Try again
              </button>
              <a
                href="/"
                style={{
                  padding: '10px 22px', borderRadius: '9999px',
                  border: '1.5px solid #E5E7EB', color: '#1F2937',
                  fontWeight: 600, fontSize: '0.9rem', textDecoration: 'none',
                }}
              >
                Go home
              </a>
            </div>

            {/* IP footer — always visible */}
            <p style={{ marginTop: 48, fontSize: '0.72rem', color: '#D1D5DB' }}>
              Developed by SaaSolutions SL | © 2026 Paradox FZCO. All rights reserved.
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}
