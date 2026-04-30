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

interface Profile {
  id:           string;
  username:     string;
  avatar_url:   string | null;
  bio:          string | null;
  role:         string;
  created_at:   string;
}

export default function ProfilePage() {
  const [profile, setProfile]   = useState<Profile | null>(null);
  const [recipes, setRecipes]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [bio, setBio]           = useState('');
  const [saving, setSaving]     = useState(false);
  const supabase = createBrowserClient();
  const router   = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/auth/signin?next=/profile'); return; }

      const [{ data: prof }, { data: recs }] = await Promise.all([
        supabase.from('profiles').select('id, username, avatar_url, bio, role, created_at').eq('id', data.user.id).single(),
        supabase.from('recipes').select('id, title, category, cached_macros, rating_avg, fork_count, created_at').eq('author_id', data.user.id).eq('status', 'published').order('created_at', { ascending: false }).limit(12),
      ]);

      if (prof) { setProfile(prof as Profile); setBio(prof.bio ?? ''); }
      setRecipes(recs ?? []);
      setLoading(false);
    });
  }, []);

  // Update bio (PRESERVED)
  const saveBio = async () => {
    if (!profile) return;
    setSaving(true);
    await supabase.from('profiles').update({ bio }).eq('id', profile.id);
    setProfile(prev => prev ? { ...prev, bio } : prev);
    setEditMode(false);
    setSaving(false);
  };

  if (loading) {
    return (
      <section className="section">
        <div className="container" style={{ maxWidth: 800, marginInline: 'auto' }}>
          <div className="flex gap-20 items-center mb-32">
            <div className="skeleton" style={{ width: 80, height: 80, borderRadius: '50%' }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton mb-8" style={{ height: 20, width: '40%' }} />
              <div className="skeleton" style={{ height: 14, width: '60%' }} />
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!profile) return null;

  return (
    <section className="section-sm">
      <div className="container" style={{ maxWidth: 860, marginInline: 'auto' }}>

        {/* Profile header */}
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r-xl)', padding: 32, marginBottom: 24 }}>
          <div className="flex gap-20 items-start flex-wrap">
            <div className="avatar avatar-xl" style={{ flexShrink: 0 }}>
              {profile.avatar_url
                ? <img src={profile.avatar_url} alt="" />
                : profile.username[0].toUpperCase()
              }
            </div>
            <div style={{ flex: 1 }}>
              <div className="flex-between flex-wrap gap-12 mb-8">
                <div>
                  <h1 style={{ fontSize: '1.6rem', marginBottom: 4 }}>{profile.username}</h1>
                  <div className="flex gap-8 items-center">
                    <span className={`badge ${profile.role === 'CHEF' ? 'badge-green' : 'badge-gray'}`}>
                      {profile.role === 'CHEF' ? '👨‍🍳 Chef' : '👤 Member'}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-light)' }}>
                      Member since {new Date(profile.created_at).toLocaleDateString('en', { month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                </div>
                <div className="flex gap-8">
                  <button className="btn btn-outline btn-sm" onClick={() => setEditMode(e => !e)}>
                    ✏️ Edit profile
                  </button>
                  <Link href="/profile/saved" className="btn btn-ghost btn-sm">♥ Saved</Link>
                </div>
              </div>

              {editMode ? (
                <div>
                  <textarea
                    className="input" rows={3}
                    placeholder="Write a short bio…"
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    style={{ marginBottom: 8 }}
                  />
                  <div className="flex gap-8">
                    <button className={`btn btn-primary btn-sm${saving ? ' btn-loading' : ''}`} onClick={saveBio} disabled={saving}>
                      {saving ? '' : 'Save'}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditMode(false)}>Cancel</button>
                  </div>
                </div>
              ) : (
                profile.bio
                  ? <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: 1.7 }}>{profile.bio}</p>
                  : <p style={{ color: 'var(--text-light)', fontSize: '0.88rem', fontStyle: 'italic' }}>No bio yet — click Edit to add one</p>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="flex gap-32 flex-wrap" style={{ borderTop: '1px solid var(--border-light)', paddingTop: 20, marginTop: 20 }}>
            {[
              { label: 'Recipes', value: recipes.length },
              { label: 'Total forks', value: recipes.reduce((s, r) => s + (r.fork_count ?? 0), 0) },
              { label: 'Avg rating', value: recipes.filter(r => r.rating_avg).length ? (recipes.reduce((s, r) => s + (r.rating_avg ?? 0), 0) / recipes.filter(r => r.rating_avg).length).toFixed(1) + ' ★' : '—' },
            ].map(({ label, value }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 3 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Recipes */}
        {recipes.length > 0 && (
          <>
            <h2 style={{ fontSize: '1.2rem', marginBottom: 16 }}>Published recipes</h2>
            <div className="recipe-grid">
              {recipes.map(r => (
                <Link key={r.id} href={`/recipes/${r.id}`} style={{ display: 'contents' }}>
                  <div className="recipe-card">
                    <div className="recipe-thumb">
                      <div className="recipe-thumb-emoji">
                        {r.category === 'meat' ? '🥩' : r.category === 'fish' ? '🐟' : r.category === 'vegan' ? '🥗' : r.category === 'pasta' ? '🍝' : '🍽️'}
                      </div>
                      {r.category && (
                        <div className="recipe-thumb-badges">
                          <span className={`tag tag-${r.category}`}>{r.category.toUpperCase()}</span>
                        </div>
                      )}
                    </div>
                    <div className="recipe-body">
                      <h3 className="recipe-title">{r.title}</h3>
                      <div className="recipe-meta">
                        {r.cached_macros?.kcal != null && <div className="recipe-meta-item">🔥 <strong>{r.cached_macros.kcal}</strong> kcal</div>}
                        <div className="recipe-meta-item">🔀 {r.fork_count ?? 0}</div>
                        {r.rating_avg && <div className="recipe-meta-item">⭐ {r.rating_avg.toFixed(1)}</div>}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
