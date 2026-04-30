/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 */
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@/lib/supabase/browser';

export default function ChefWelcomePage() {
  const [username, setUsername] = useState('');
  const supabase = createBrowserClient();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', data.user.id)
          .single();
        if (profile) setUsername(profile.username);
      }
    });
  }, []);

  return (
    <div style={{ minHeight: '90vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 520 }}>
        <div style={{ fontSize: '4rem', marginBottom: 20 }}>🎉</div>
        <h1 style={{ marginBottom: 12 }}>
          Welcome{username ? `, ${username}` : ''}!<br />
          You're now a Chef.
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: 1.7, marginBottom: 32 }}>
          Your subscription is active. You can now publish structured recipes,
          track analytics, and earn through affiliate links.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 340, margin: '0 auto 32px' }}>
          {[
            { icon: '📝', text: 'Create your first structured recipe' },
            { icon: '🌍', text: 'Auto-translated to 5 languages' },
            { icon: '📊', text: 'Track views, forks, and ratings' },
            { icon: '🔗', text: 'Add affiliate links to your ingredients' },
          ].map(({ icon, text }) => (
            <div key={text} className="flex gap-12 items-center" style={{
              padding: '12px 16px', background: 'white',
              border: '1px solid var(--border)', borderRadius: 'var(--r)',
              fontSize: '0.9rem', textAlign: 'left',
            }}>
              <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{icon}</span>
              <span>{text}</span>
            </div>
          ))}
        </div>

        <div className="flex justify-center gap-12 flex-wrap">
          <Link href="/recipes/new" className="btn btn-primary btn-lg">
            Create first recipe →
          </Link>
          <Link href="/chef/dashboard" className="btn btn-outline btn-lg">
            Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
