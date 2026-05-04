/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@/lib/supabase/browser';

// ── System constants ──────────────────────────────────────────────────────────
const SYSTEM_OWNER        = "Paradox FZCO";
const SYSTEM_DEVELOPER    = "SaaSolutions SL";
const __BUILD_SIGNATURE__ = "DF-PARADOX-SaaS-2026";

const LS_SECTIONS  = 'df_homepage_sections';
const LS_SUPERMARKETS = 'df_supermarket_partners';
const LS_SUPPLEMENTS  = 'df_supplement_partners';

const DEFAULT_SECTIONS = {
  hero:         true,
  features:     true,
  community:    true,
  supermarkets: true,
  supplements:  true,
  trust:        true,
  builtBy:      true,
  cta:          true,
};

const DEFAULT_SUPERMARKETS = [
  { id: '1', icon: '🛒', name: 'Albert Heijn', active: true },
  { id: '2', icon: '🛒', name: 'Jumbo',        active: true },
  { id: '3', icon: '🛒', name: 'Lidl',         active: true },
  { id: '4', icon: '🛒', name: 'Aldi',         active: true },
  { id: '5', icon: '🛒', name: 'Plus',         active: true },
  { id: '6', icon: '🛒', name: 'Dirk',         active: true },
];

const DEFAULT_SUPPLEMENTS = [
  { id: '1', icon: '💊', name: 'Myprotein',         active: true },
  { id: '2', icon: '💊', name: 'Body & Fit',        active: true },
  { id: '3', icon: '💊', name: 'XXL Nutrition',     active: true },
  { id: '4', icon: '💊', name: 'Bulk',              active: true },
  { id: '5', icon: '💊', name: 'Optimum Nutrition', active: true },
  { id: '6', icon: '💊', name: 'Scitec',            active: true },
];

type Partner = { id: string; icon: string; name: string; active: boolean };

const NAV_LINKS = [
  { href: '/admin',             icon: '🏠', label: 'Overview' },
  { href: '/admin/homepage',    icon: '🎛️', label: 'Homepage sections' },
  { href: '/admin/partners',    icon: '🤝', label: 'Partner sliders' },
  { href: '/admin/recipes',     icon: '🍽️', label: 'Recipes' },
  { href: '/admin/users',       icon: '👥', label: 'Users' },
  { href: '/admin/chefs',       icon: '👨‍🍳', label: 'Chefs' },
  { href: '/admin/moderation',  icon: '🛡️', label: 'Moderation' },
  { href: '/admin/analytics',   icon: '📊', label: 'Analytics' },
  { href: '/admin/settings',    icon: '⚙️', label: 'Settings' },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle-switch">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="toggle-slider" />
    </label>
  );
}

function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <div className="toast-root">
      <div className={`toast ${type}`}>
        <span className="toast-icon">{type === 'success' ? '✅' : '❌'}</span>
        {message}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [activeTab, setActiveTab]         = useState<'overview' | 'homepage' | 'partners' | 'content'>('homepage');
  const [sections, setSections]           = useState(DEFAULT_SECTIONS);
  const [supermarkets, setSupermarkets]   = useState<Partner[]>(DEFAULT_SUPERMARKETS);
  const [supplements, setSupplements]     = useState<Partner[]>(DEFAULT_SUPPLEMENTS);
  const [newSuperName, setNewSuperName]   = useState('');
  const [newSuppName, setNewSuppName]     = useState('');
  const [toast, setToast]                 = useState<{ msg: string; type: 'success'|'error' } | null>(null);
  const [stats, setStats]                 = useState({ recipes: 0, users: 0, chefs: 0, comments: 0 });
  const [isAdmin, setIsAdmin]             = useState(false);
  const [checking, setChecking]           = useState(true);

  const supabase = createBrowserClient();

  // Auth check
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .maybeSingle()
          .then(({ data: p }) => {
            setIsAdmin(p?.role === 'ADMIN' || p?.role === 'MODERATOR');
            setChecking(false);
          });
      } else {
        setChecking(false);
      }
    });
  }, []);

  // Load from LocalStorage
  useEffect(() => {
    try {
      const s = localStorage.getItem(LS_SECTIONS);
      if (s) setSections({ ...DEFAULT_SECTIONS, ...JSON.parse(s) });
      const sm = localStorage.getItem(LS_SUPERMARKETS);
      if (sm) setSupermarkets(JSON.parse(sm));
      const sp = localStorage.getItem(LS_SUPPLEMENTS);
      if (sp) setSupplements(JSON.parse(sp));
    } catch (_) {}
  }, []);

  // Fetch stats
  useEffect(() => {
    Promise.all([
      supabase.from('recipes').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('chef_profiles').select('id', { count: 'exact', head: true }),
      supabase.from('recipe_comments').select('id', { count: 'exact', head: true }),
    ]).then(([r, u, c, co]) => {
      setStats({
        recipes:  r.count ?? 0,
        users:    u.count ?? 0,
        chefs:    c.count ?? 0,
        comments: co.count ?? 0,
      });
    });
  }, []);

  const showToast = (msg: string, type: 'success'|'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Save homepage sections
  const saveHomepageSections = () => {
    try {
      localStorage.setItem(LS_SECTIONS, JSON.stringify(sections));
      showToast('Homepage sections saved');
    } catch (_) { showToast('Failed to save', 'error'); }
  };

  // Toggle a section
  const toggleSection = (key: keyof typeof DEFAULT_SECTIONS) => {
    setSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Partner helpers
  const savePartners = (type: 'super' | 'supp', list: Partner[]) => {
    const key = type === 'super' ? LS_SUPERMARKETS : LS_SUPPLEMENTS;
    try {
      localStorage.setItem(key, JSON.stringify(list));
      showToast('Partners saved');
    } catch (_) { showToast('Failed to save', 'error'); }
  };

  const addPartner = (type: 'super' | 'supp') => {
    const name = type === 'super' ? newSuperName.trim() : newSuppName.trim();
    if (!name) return;
    const partner: Partner = { id: Date.now().toString(), icon: type === 'super' ? '🛒' : '💊', name, active: true };
    if (type === 'super') {
      const next = [...supermarkets, partner];
      setSupermarkets(next); savePartners('super', next);
      setNewSuperName('');
    } else {
      const next = [...supplements, partner];
      setSupplements(next); savePartners('supp', next);
      setNewSuppName('');
    }
  };

  const removePartner = (type: 'super' | 'supp', id: string) => {
    if (type === 'super') {
      const next = supermarkets.filter(p => p.id !== id);
      setSupermarkets(next); savePartners('super', next);
    } else {
      const next = supplements.filter(p => p.id !== id);
      setSupplements(next); savePartners('supp', next);
    }
  };

  const togglePartner = (type: 'super' | 'supp', id: string) => {
    if (type === 'super') {
      const next = supermarkets.map(p => p.id === id ? { ...p, active: !p.active } : p);
      setSupermarkets(next); savePartners('super', next);
    } else {
      const next = supplements.map(p => p.id === id ? { ...p, active: !p.active } : p);
      setSupplements(next); savePartners('supp', next);
    }
  };

  if (checking) {
    return <div style={{ display: 'grid', placeItems: 'center', height: '100vh' }}>
      <div className="skeleton" style={{ width: 120, height: 20 }} />
    </div>;
  }

  if (!isAdmin) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh', textAlign: 'center' }}>
        <div>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>🔒</div>
          <h2>Access denied</h2>
          <p style={{ color: 'var(--text-muted)', margin: '12px 0 24px' }}>You need admin permissions to view this page.</p>
          <Link href="/" className="btn btn-primary">← Back to home</Link>
        </div>
      </div>
    );
  }

  const SECTION_ROWS: { key: keyof typeof DEFAULT_SECTIONS; label: string; desc: string }[] = [
    { key: 'hero',         label: 'Hero section',           desc: 'Main hero banner with title, CTA and stats' },
    { key: 'features',     label: 'Feature cards',          desc: '6 feature highlight cards' },
    { key: 'community',    label: 'Active community',       desc: 'Real-time community posts feed' },
    { key: 'supermarkets', label: 'Supermarket slider',     desc: 'Scrolling partner logo strip — supermarkets' },
    { key: 'supplements',  label: 'Supplement slider',      desc: 'Scrolling partner logo strip — supplements' },
    { key: 'trust',        label: 'Trust section',          desc: '4 trust/value proposition tiles' },
    { key: 'builtBy',      label: 'Built by / Owned by',    desc: 'Attribution section — SaaSolutions / Paradox FZCO' },
    { key: 'cta',          label: 'CTA section',            desc: 'Call-to-action banner at bottom of homepage' },
  ];

  return (
    <div className="admin-wrap">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-logo">
          <Link href="/" className="logo" style={{ color: 'white' }}>
            <div className="logo-mark">🥗</div>
            <span style={{ color: 'white', fontFamily: 'var(--font-display)', fontWeight: 800 }}>
              Admin
            </span>
          </Link>
        </div>

        <nav className="admin-nav">
          <div className="admin-nav-section">General</div>
          {NAV_LINKS.slice(0, 2).map(l => (
            <div
              key={l.href}
              className={`admin-nav-link${activeTab === l.label.toLowerCase().split(' ')[0] ? ' active' : ''}`}
              onClick={() => setActiveTab(l.label.toLowerCase().replace(' ', '') as any)}
            >
              <span className="icon">{l.icon}</span>{l.label}
            </div>
          ))}
          <div className="admin-nav-section">Content</div>
          {NAV_LINKS.slice(2).map(l => (
            <div key={l.href} className="admin-nav-link">
              <span className="icon">{l.icon}</span>{l.label}
            </div>
          ))}

          <div style={{ padding: '20px 12px', marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.22)', lineHeight: 1.5 }}>
              <div>{SYSTEM_DEVELOPER}</div>
              <div>© 2026 {SYSTEM_OWNER}</div>
              <div style={{ marginTop: 4, opacity: 0.6 }}>{__BUILD_SIGNATURE__}</div>
            </div>
          </div>
        </nav>
      </aside>

      {/* Content */}
      <div className="admin-content">
        <div className="admin-header">
          <h1>Admin Panel</h1>
          <p>Manage homepage, partners, and platform content</p>
        </div>

        {/* ── STATS OVERVIEW ──────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 16, marginBottom: 32 }}>
          {[
            { label: 'Total recipes', value: stats.recipes, icon: '🍽️' },
            { label: 'Users',         value: stats.users,   icon: '👥' },
            { label: 'Chefs',         value: stats.chefs,   icon: '👨‍🍳' },
            { label: 'Comments',      value: stats.comments, icon: '💬' },
          ].map(s => (
            <div key={s.label} className="admin-card" style={{ textAlign: 'center', padding: 20 }}>
              <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>{s.icon}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}>
                {s.value.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── HOMEPAGE SECTIONS ───────────────────────────────────────────── */}
        <div className="admin-card">
          <div className="admin-card-title">🎛️ Homepage Sections</div>
          <p className="admin-card-sub">Toggle which sections are visible on the homepage. Changes save to LocalStorage.</p>

          {SECTION_ROWS.map(({ key, label, desc }) => (
            <div key={key} className="toggle-row">
              <div className="toggle-info">
                <div className="toggle-label">{label}</div>
                <div className="toggle-desc">{desc}</div>
              </div>
              <Toggle checked={sections[key]} onChange={() => toggleSection(key)} />
            </div>
          ))}

          <div style={{ marginTop: 20 }}>
            <button className="btn btn-primary" onClick={saveHomepageSections}>
              Save homepage settings
            </button>
          </div>
        </div>

        {/* ── SUPERMARKET PARTNERS ────────────────────────────────────────── */}
        <div className="admin-card">
          <div className="admin-card-title">🛒 Supermarket Partners</div>
          <p className="admin-card-sub">Manage the supermarket slider on the homepage.</p>

          <table className="data-table" style={{ marginBottom: 16 }}>
            <thead>
              <tr>
                <th>Partner</th>
                <th>Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {supermarkets.map(p => (
                <tr key={p.id}>
                  <td>{p.icon} {p.name}</td>
                  <td>
                    <Toggle checked={p.active} onChange={() => togglePartner('super', p.id)} />
                  </td>
                  <td>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ color: '#dc2626' }}
                      onClick={() => removePartner('super', p.id)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex gap-8">
            <input
              type="text" className="input" placeholder="Partner name…"
              value={newSuperName}
              onChange={e => setNewSuperName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addPartner('super')}
              style={{ maxWidth: 240 }}
            />
            <button className="btn btn-primary btn-sm" onClick={() => addPartner('super')}>
              + Add
            </button>
          </div>
        </div>

        {/* ── SUPPLEMENT PARTNERS ─────────────────────────────────────────── */}
        <div className="admin-card">
          <div className="admin-card-title">💊 Supplement Partners</div>
          <p className="admin-card-sub">Manage the supplement slider on the homepage.</p>

          <table className="data-table" style={{ marginBottom: 16 }}>
            <thead>
              <tr>
                <th>Partner</th>
                <th>Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {supplements.map(p => (
                <tr key={p.id}>
                  <td>{p.icon} {p.name}</td>
                  <td>
                    <Toggle checked={p.active} onChange={() => togglePartner('supp', p.id)} />
                  </td>
                  <td>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ color: '#dc2626' }}
                      onClick={() => removePartner('supp', p.id)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex gap-8">
            <input
              type="text" className="input" placeholder="Partner name…"
              value={newSuppName}
              onChange={e => setNewSuppName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addPartner('supp')}
              style={{ maxWidth: 240 }}
            />
            <button className="btn btn-primary btn-sm" onClick={() => addPartner('supp')}>
              + Add
            </button>
          </div>
        </div>

        {/* ── IP ATTRIBUTION (always visible, non-removable) ──────────────── */}
        <div className="admin-card" style={{ borderLeft: '3px solid var(--primary)' }}>
          <div className="admin-card-title">🔐 Intellectual Property</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, fontSize: '0.88rem' }}>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Developer</div>
              <div style={{ color: 'var(--text-muted)' }}>{SYSTEM_DEVELOPER}</div>
            </div>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>IP Owner</div>
              <div style={{ color: 'var(--primary)', fontWeight: 700 }}>{SYSTEM_OWNER}</div>
            </div>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Build Signature</div>
              <div style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>{__BUILD_SIGNATURE__}</div>
            </div>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Year</div>
              <div style={{ color: 'var(--text-muted)' }}>2026</div>
            </div>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-light)', marginTop: 16 }}>
            ⚠️ The IP attribution footer is mandatory and cannot be removed via the admin panel.
          </p>
        </div>
      </div>

      {toast && <Toast message={toast.msg} type={toast.type} />}
    </div>
  );
}
