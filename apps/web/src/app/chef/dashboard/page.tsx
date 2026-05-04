/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/browser';
import { detectLanguage, type LangCode } from '@/lib/i18n';

interface ChefStats {
  recipe_count:    number;
  total_views:     number;
  total_forks:     number;
  total_saves:     number;
  avg_rating:      number | null;
  affiliate_clicks: number;
  monthly_views:   number;
}

interface ChefRecipe {
  id:          string;
  title:       string;
  status:      'draft' | 'published' | 'archived';
  fork_count:  number;
  rating_avg:  number | null;
  view_count:  number;
  created_at:  string;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  published: { bg: 'rgba(34,197,94,0.12)', text: 'var(--primary-dark)' },
  draft:     { bg: 'rgba(107,114,128,0.12)', text: 'var(--text-muted)' },
  archived:  { bg: 'rgba(239,68,68,0.1)', text: '#dc2626' },
};

export default function ChefDashboardPage() {
  const [lang, setLang]         = useState<LangCode>('en');
  const [stats, setStats]       = useState<ChefStats | null>(null);
  const [recipes, setRecipes]   = useState<ChefRecipe[]>([]);
  const [loading, setLoading]   = useState(true);
  const [hasChefProfile, setHasChefProfile] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const supabase = createBrowserClient();
  const router   = useRouter();

  useEffect(() => { setLang(detectLanguage()); }, []);
  useEffect(() => {
    const h = (e: Event) => setLang((e as CustomEvent).detail);
    window.addEventListener('df:langchange', h);
    return () => window.removeEventListener('df:langchange', h);
  }, []);

  // Auth check + fetch data (PRESERVED)
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/auth/signin?next=/chef/dashboard'); return; }
      setCurrentUser(data.user);

      // Check chef profile (PRESERVED)
      const { data: chef } = await supabase
        .from('chef_profiles')
        .select('id, stats')
        .eq('user_id', data.user.id)
        .maybeSingle();

      if (!chef) {
        router.push('/pricing');
        return;
      }
      setHasChefProfile(true);
      setStats(chef.stats ?? null);

      // Fetch chef's recipes (PRESERVED)
      const { data: recs } = await supabase
        .from('recipes')
        .select('id, title, status, fork_count, rating_avg, view_count, created_at')
        .eq('author_id', data.user.id)
        .order('created_at', { ascending: false });

      setRecipes((recs ?? []) as ChefRecipe[]);
      setLoading(false);
    });
  }, []);

  // Delete recipe (PRESERVED)
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this recipe? This cannot be undone.')) return;
    const { error } = await supabase.from('recipes').delete().eq('id', id);
    if (!error) setRecipes(prev => prev.filter(r => r.id !== id));
  };

  // Toggle publish status (PRESERVED)
  const toggleStatus = async (id: string, current: string) => {
    const next = current === 'published' ? 'draft' : 'published';
    const { error } = await supabase.from('recipes').update({ status: next }).eq('id', id);
    if (!error) setRecipes(prev => prev.map(r => r.id === id ? { ...r, status: next as any } : r));
  };

  if (loading) {
    return (
      <section className="section">
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 32 }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 100, borderRadius: 'var(--r-lg)' }} />
            ))}
          </div>
          <div className="skeleton" style={{ height: 300, borderRadius: 'var(--r-lg)' }} />
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="page-hero" style={{ paddingBlock: 48 }}>
        <div className="container">
          <div className="flex-between flex-wrap gap-16">
            <div>
              <h1 style={{ marginBottom: 6 }}>Chef Dashboard</h1>
              <p>{currentUser?.email}</p>
            </div>
            <Link href="/recipes/new" className="btn btn-primary btn-lg">
              + New recipe
            </Link>
          </div>
        </div>
      </section>

      <section className="section-sm">
        <div className="container">

          {/* Analytics cards */}
          {stats && (
            <div className="analytics-grid mb-32">
              {[
                { label: 'Recipes',        value: stats.recipe_count,    icon: '🍽️', delta: null },
                { label: 'Total views',    value: stats.total_views.toLocaleString(),   icon: '👁️', delta: `+${stats.monthly_views} this month` },
                { label: 'Forks',          value: stats.total_forks,     icon: '🔀', delta: null },
                { label: 'Saves',          value: stats.total_saves,     icon: '♥', delta: null },
                { label: 'Avg rating',     value: stats.avg_rating ? stats.avg_rating.toFixed(1) + ' ★' : '—', icon: '⭐', delta: null },
                { label: 'Affiliate clicks', value: stats.affiliate_clicks.toLocaleString(), icon: '🔗', delta: null },
              ].map(({ label, value, icon, delta }) => (
                <div key={label} className="analytics-card">
                  <div style={{ fontSize: '1.3rem', marginBottom: 6 }}>{icon}</div>
                  <div className="analytics-number">{value}</div>
                  <div className="analytics-label">{label}</div>
                  {delta && <div className="analytics-delta up">↑ {delta}</div>}
                </div>
              ))}
            </div>
          )}

          {/* Recipe management table */}
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: '1rem', margin: 0 }}>My recipes ({recipes.length})</h3>
              <div className="flex gap-8">
                <select className="select" style={{ width: 'auto', fontSize: '0.85rem', padding: '7px 32px 7px 12px' }}>
                  <option>All statuses</option>
                  <option>Published</option>
                  <option>Draft</option>
                </select>
              </div>
            </div>

            {recipes.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🍽️</div>
                <h3 className="empty-title">No recipes yet</h3>
                <p className="empty-desc">Create your first recipe to start building your audience</p>
                <Link href="/recipes/new" className="btn btn-primary">Create first recipe</Link>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ minWidth: 640 }}>
                  <thead>
                    <tr>
                      <th>Recipe</th>
                      <th>Status</th>
                      <th>Views</th>
                      <th>Forks</th>
                      <th>Rating</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recipes.map(r => {
                      const sc = STATUS_COLORS[r.status] ?? STATUS_COLORS.draft;
                      return (
                        <tr key={r.id}>
                          <td>
                            <Link href={`/recipes/${r.id}`} style={{ fontWeight: 600, color: 'var(--dark)' }}>
                              {r.title}
                            </Link>
                          </td>
                          <td>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center',
                              padding: '3px 10px', borderRadius: 'var(--r-full)',
                              fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase',
                              background: sc.bg, color: sc.text,
                            }}>
                              {r.status}
                            </span>
                          </td>
                          <td>{(r.view_count ?? 0).toLocaleString()}</td>
                          <td>{r.fork_count}</td>
                          <td>{r.rating_avg ? `${r.rating_avg.toFixed(1)} ★` : '—'}</td>
                          <td style={{ color: 'var(--text-muted)', fontSize: '0.83rem' }}>
                            {new Date(r.created_at).toLocaleDateString()}
                          </td>
                          <td>
                            <div className="flex gap-4">
                              <Link href={`/recipes/${r.id}/edit`} className="btn btn-ghost btn-sm">
                                ✏️
                              </Link>
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => toggleStatus(r.id, r.status)}
                                title={r.status === 'published' ? 'Unpublish' : 'Publish'}
                              >
                                {r.status === 'published' ? '📤' : '📥'}
                              </button>
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => handleDelete(r.id)}
                                style={{ color: '#dc2626' }}
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Quick links */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))', gap: 16, marginTop: 24 }}>
            {[
              { href: '/chef/dashboard/analytics', icon: '📊', label: 'Detailed analytics', desc: 'Views, saves, affiliate CTR' },
              { href: '/chef/dashboard/affiliates', icon: '🔗', label: 'Affiliate links', desc: 'Manage your partner links' },
              { href: '/chef/dashboard/billing', icon: '💳', label: 'Billing', desc: 'Manage subscription' },
            ].map(l => (
              <Link key={l.href} href={l.href} style={{
                display: 'flex', gap: 14, alignItems: 'center',
                background: 'white', border: '1px solid var(--border)',
                borderRadius: 'var(--r-lg)', padding: '18px 20px',
                transition: 'all var(--duration) var(--ease)',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = ''; (e.currentTarget as HTMLElement).style.transform = ''; }}
              >
                <div style={{ fontSize: '1.4rem', width: 40, height: 40, background: 'var(--primary-50)', borderRadius: 'var(--r-sm)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  {l.icon}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', marginBottom: 2 }}>{l.label}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{l.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
