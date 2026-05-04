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

interface AffiliateLink {
  id:           string;
  recipe_id:    string;
  recipe_title: string;
  partner_name: string;
  url:          string;
  click_count:  number;
  active:       boolean;
  created_at:   string;
}

interface Recipe {
  id:    string;
  title: string;
}

export default function ChefAffiliatesPage() {
  const [links, setLinks]     = useState<AffiliateLink[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving,   setSaving]  = useState(false);

  // Form state
  const [recipeId,     setRecipeId]     = useState('');
  const [partnerName,  setPartnerName]  = useState('');
  const [url,          setUrl]          = useState('');
  const [toast,        setToast]        = useState('');

  const supabase = createBrowserClient();
  const router   = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/auth/signin'); return; }

      const [{ data: linksData }, { data: recipesData }] = await Promise.all([
        // PRESERVED: fetch affiliate_links joined with recipe titles
        supabase
          .from('affiliate_links')
          .select('id, recipe_id, partner_name, url, click_count, active, created_at, recipes(title)')
          .eq('chef_id', data.user.id)
          .order('created_at', { ascending: false }),

        // Fetch chef's published recipes for the dropdown
        supabase
          .from('recipes')
          .select('id, title')
          .eq('author_id', data.user.id)
          .eq('status', 'published')
          .order('title'),
      ]);

      setLinks(
        (linksData ?? []).map((l: any) => ({
          ...l,
          recipe_title: l.recipes?.title ?? '—',
        })) as AffiliateLink[]
      );
      setRecipes((recipesData ?? []) as Recipe[]);
      setLoading(false);
    });
  }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  // Add affiliate link (PRESERVED Supabase insert)
  const handleAdd = async () => {
    if (!recipeId || !partnerName.trim() || !url.trim()) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('affiliate_links')
        .insert({ recipe_id: recipeId, partner_name: partnerName.trim(), url: url.trim(), chef_id: user!.id, active: true })
        .select('id, recipe_id, partner_name, url, click_count, active, created_at')
        .maybeSingle();
      if (error) throw error;

      const recipeTitle = recipes.find(r => r.id === recipeId)?.title ?? '—';
      setLinks(prev => [{ ...(data as any), recipe_title: recipeTitle }, ...prev]);
      setRecipeId(''); setPartnerName(''); setUrl('');
      setShowForm(false);
      showToast('Affiliate link added ✅');
    } catch (e: any) {
      showToast('Error: ' + e.message);
    }
    setSaving(false);
  };

  // Toggle active (PRESERVED)
  const toggleActive = async (id: string, current: boolean) => {
    setLinks(prev => prev.map(l => l.id === id ? { ...l, active: !current } : l));
    await supabase.from('affiliate_links').update({ active: !current }).eq('id', id);
  };

  // Delete (PRESERVED)
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this affiliate link?')) return;
    setLinks(prev => prev.filter(l => l.id !== id));
    await supabase.from('affiliate_links').delete().eq('id', id);
    showToast('Deleted');
  };

  const totalClicks = links.reduce((s, l) => s + (l.click_count ?? 0), 0);

  return (
    <>
      <section className="page-hero" style={{ paddingBlock: 40 }}>
        <div className="container">
          <div className="flex-between flex-wrap gap-12">
            <div>
              <h1 style={{ marginBottom: 6 }}>Affiliate Links</h1>
              <p>Earn commissions by linking ingredients to partner stores</p>
            </div>
            <div className="flex gap-8">
              <Link href="/chef/dashboard" className="btn btn-outline" style={{ borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)' }}>← Dashboard</Link>
              <button className="btn btn-primary" onClick={() => setShowForm(s => !s)}>
                {showForm ? 'Cancel' : '+ New link'}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="section-sm">
        <div className="container">

          {/* Toast */}
          {toast && (
            <div className="toast-root">
              <div className="toast success"><span className="toast-icon">✅</span>{toast}</div>
            </div>
          )}

          {/* Summary stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 16, marginBottom: 28 }}>
            {[
              { icon: '🔗', label: 'Total links',    value: links.length },
              { icon: '✅', label: 'Active',          value: links.filter(l => l.active).length },
              { icon: '👆', label: 'Total clicks',    value: totalClicks.toLocaleString() },
              { icon: '📊', label: 'Avg click/link',  value: links.length ? Math.round(totalClicks / links.length) : 0 },
            ].map(({ icon, label, value }) => (
              <div key={label} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '20px 22px' }}>
                <div style={{ fontSize: '1.3rem', marginBottom: 6 }}>{icon}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: '0.79rem', color: 'var(--text-muted)', marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Add form */}
          {showForm && (
            <div style={{ background: 'white', border: '1.5px solid var(--primary)', borderRadius: 'var(--r-lg)', padding: 24, marginBottom: 24 }}>
              <h3 style={{ fontSize: '1rem', marginBottom: 20 }}>Add affiliate link</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 14, alignItems: 'end' }}>
                <div className="field" style={{ margin: 0 }}>
                  <label className="field-label">Recipe</label>
                  <select className="select" value={recipeId} onChange={e => setRecipeId(e.target.value)}>
                    <option value="">Select recipe…</option>
                    {recipes.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
                  </select>
                </div>
                <div className="field" style={{ margin: 0 }}>
                  <label className="field-label">Partner name</label>
                  <input type="text" className="input" placeholder="e.g. Albert Heijn" value={partnerName} onChange={e => setPartnerName(e.target.value)} />
                </div>
                <div className="field" style={{ margin: 0 }}>
                  <label className="field-label">Affiliate URL</label>
                  <input type="url" className="input" placeholder="https://…" value={url} onChange={e => setUrl(e.target.value)} />
                </div>
                <button
                  className={`btn btn-primary${saving ? ' btn-loading' : ''}`}
                  onClick={handleAdd}
                  disabled={saving || !recipeId || !partnerName.trim() || !url.trim()}
                  style={{ height: 42 }}
                >
                  {saving ? '' : 'Add'}
                </button>
              </div>
            </div>
          )}

          {/* Links table */}
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '0.97rem', margin: 0 }}>
                All affiliate links ({links.length})
              </h3>
            </div>

            {loading ? (
              <div style={{ padding: 24 }}>
                {[...Array(4)].map((_, i) => <div key={i} className="skeleton mb-10" style={{ height: 14 }} />)}
              </div>
            ) : links.length === 0 ? (
              <div className="empty-state" style={{ padding: '48px 24px' }}>
                <div className="empty-icon">🔗</div>
                <h3 className="empty-title">No affiliate links yet</h3>
                <p className="empty-desc">Add links to earn commissions when readers buy ingredients</p>
                <button className="btn btn-primary" onClick={() => setShowForm(true)}>Add first link</button>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ minWidth: 680 }}>
                  <thead>
                    <tr>
                      <th>Recipe</th>
                      <th>Partner</th>
                      <th>Clicks</th>
                      <th>Active</th>
                      <th>Added</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {links.map(l => (
                      <tr key={l.id}>
                        <td style={{ fontWeight: 600, maxWidth: 200 }}>
                          <Link href={`/recipes/${l.recipe_id}`} style={{ color: 'var(--dark)' }}>
                            {l.recipe_title}
                          </Link>
                        </td>
                        <td>
                          <a href={l.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', fontSize: '0.88rem' }}>
                            {l.partner_name} ↗
                          </a>
                        </td>
                        <td>
                          <strong style={{ color: l.click_count > 0 ? 'var(--primary)' : 'var(--text-muted)' }}>
                            {(l.click_count ?? 0).toLocaleString()}
                          </strong>
                        </td>
                        <td>
                          <label className="toggle-switch">
                            <input type="checkbox" checked={l.active} onChange={() => toggleActive(l.id, l.active)} />
                            <span className="toggle-slider" />
                          </label>
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                          {new Date(l.created_at).toLocaleDateString()}
                        </td>
                        <td>
                          <button className="btn btn-ghost btn-sm" style={{ color: '#dc2626' }} onClick={() => handleDelete(l.id)}>🗑️</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Tips */}
          <div style={{ background: 'var(--primary-50)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 'var(--r-lg)', padding: '16px 20px', marginTop: 20 }}>
            <p style={{ fontSize: '0.84rem', color: 'var(--primary-dark)', lineHeight: 1.7 }}>
              💡 <strong>Tip:</strong> Affiliate links are shown on your recipe pages as "Shop ingredients" buttons.
              Links are tracked per-click. Make sure your affiliate program allows linking from recipe sites.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
