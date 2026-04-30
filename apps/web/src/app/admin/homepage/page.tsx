/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const LS_KEY = 'df_homepage_sections';

const DEFAULT_SECTIONS = {
  hero:         { enabled: true,  label: 'Hero section',          desc: 'Main hero banner with headline, CTAs and community stats' },
  features:     { enabled: true,  label: 'Feature cards',          desc: 'Six feature highlight cards explaining the platform' },
  community:    { enabled: true,  label: 'Active community',       desc: 'Real-time feed of latest community posts from Supabase' },
  supermarkets: { enabled: true,  label: 'Supermarket slider',     desc: 'Animated partner logo strip — supermarkets' },
  supplements:  { enabled: true,  label: 'Supplement slider',      desc: 'Animated partner logo strip — supplements' },
  trust:        { enabled: true,  label: 'Trust section',          desc: 'Four value proposition trust tiles' },
  builtBy:      { enabled: true,  label: 'Built by / Owned by',    desc: 'SaaSolutions SL & Paradox FZCO attribution section' },
  cta:          { enabled: true,  label: 'CTA banner',             desc: 'Call-to-action section at the bottom of the homepage' },
};

type SectionKey = keyof typeof DEFAULT_SECTIONS;

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle-switch">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="toggle-slider" />
    </label>
  );
}

export default function AdminHomepagePage() {
  const [sections, setSections] = useState(
    Object.fromEntries(Object.entries(DEFAULT_SECTIONS).map(([k, v]) => [k, v.enabled])) as Record<SectionKey, boolean>
  );
  const [saved, setSaved]   = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LS_KEY);
      if (stored) setSections(prev => ({ ...prev, ...JSON.parse(stored) }));
    } catch (_) {}
  }, []);

  const toggle = (key: SectionKey) => setSections(prev => ({ ...prev, [key]: !prev[key] }));

  const save = () => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(sections));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (_) {}
  };

  const enableAll  = () => setSections(Object.fromEntries(Object.keys(DEFAULT_SECTIONS).map(k => [k, true])) as any);
  const disableAll = () => setSections(Object.fromEntries(Object.keys(DEFAULT_SECTIONS).map(k => [k, false])) as any);

  return (
    <div className="admin-wrap">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-logo">
          <Link href="/" className="logo" style={{ color: 'white' }}>
            <div className="logo-mark">🥗</div>
            <span style={{ color: 'white', fontFamily: 'var(--font-display)', fontWeight: 800 }}>Admin</span>
          </Link>
        </div>
        <nav className="admin-nav">
          <Link href="/admin" className="admin-nav-link"><span className="icon">🏠</span>Overview</Link>
          <Link href="/admin/homepage" className="admin-nav-link active"><span className="icon">🎛️</span>Homepage sections</Link>
          <Link href="/admin/partners" className="admin-nav-link"><span className="icon">🤝</span>Partners</Link>
          <Link href="/admin" className="admin-nav-link"><span className="icon">🍽️</span>Recipes</Link>
          <Link href="/admin" className="admin-nav-link"><span className="icon">👥</span>Users</Link>
          <Link href="/admin" className="admin-nav-link"><span className="icon">📊</span>Analytics</Link>
        </nav>
      </aside>

      <div className="admin-content">
        <div className="admin-header">
          <h1>Homepage Sections</h1>
          <p>Toggle which sections appear on the homepage. Changes are saved to LocalStorage and applied instantly.</p>
        </div>

        <div className="admin-card">
          <div className="flex-between mb-20">
            <div>
              <div className="admin-card-title">Section visibility</div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                {Object.values(sections).filter(Boolean).length} of {Object.keys(sections).length} sections enabled
              </p>
            </div>
            <div className="flex gap-8">
              <button className="btn btn-ghost btn-sm" onClick={enableAll}>Enable all</button>
              <button className="btn btn-ghost btn-sm" onClick={disableAll}>Disable all</button>
            </div>
          </div>

          {(Object.entries(DEFAULT_SECTIONS) as [SectionKey, typeof DEFAULT_SECTIONS[SectionKey]][]).map(([key, { label, desc }]) => (
            <div key={key} className="toggle-row">
              <div className="toggle-info">
                <div className="toggle-label">{label}</div>
                <div className="toggle-desc">{desc}</div>
              </div>
              <Toggle checked={sections[key]} onChange={() => toggle(key)} />
            </div>
          ))}

          <div className="flex gap-12 items-center" style={{ marginTop: 24 }}>
            <button className={`btn btn-primary${saved ? '' : ''}`} onClick={save}>
              {saved ? '✅ Saved!' : 'Save changes'}
            </button>
            <Link href="/" target="_blank" className="btn btn-outline btn-sm">
              Preview homepage ↗
            </Link>
          </div>
        </div>

        {/* IP note */}
        <div style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 'var(--r-lg)', padding: '14px 18px', marginTop: 8 }}>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            ⚠️ The <strong>IP attribution footer</strong> ("Developed by SaaSolutions SL | © 2026 Paradox FZCO") is hardcoded and cannot be toggled off. It is always visible on all pages.
          </p>
        </div>
      </div>
    </div>
  );
}
