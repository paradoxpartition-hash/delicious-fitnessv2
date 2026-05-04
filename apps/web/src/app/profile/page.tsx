/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 *
 * ROOT CAUSE FIXED:
 * - fetching initialised to `true` and only set to `false` inside an effect
 *   that returned early when user.id was not yet available (auth still loading).
 *   This left the spinner permanently visible.
 * Fix: fetching starts `false`. It only becomes `true` when we actually start
 *   a fetch, and always resolves to `false` in a finally block.
 * - createBrowserClient() was called at component top level, creating a new
 *   Supabase instance on every render and interfering with useAuth's listener.
 * Fix: Use the supabase instance returned by useAuth.
 */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth, ROLE_LABELS, ROLE_ICONS } from '@/hooks/use-auth';

interface Recipe {
  id:            string;
  title:         string;
  category:      string | null;
  cached_macros: { kcal: number; protein_g: number } | null;
  rating_avg:    number | null;
  fork_count:    number;
  view_count:    number;
  created_at:    string;
}

const CATEGORY_EMOJI: Record<string, string> = {
  meat: '🥩', fish: '🐟', fruit: '🍎', dairy: '🧀',
  vegan: '🥗', pasta: '🍝', salad: '🥙', drinks: '🥤',
};

export default function ProfilePage() {
  // Use supabase from useAuth — never create a separate client in the page
  const { user, profile, loading, supabase } = useAuth();

  // fetching starts false — only true while an actual request is in-flight
  const [recipes,    setRecipes]    = useState<Recipe[]>([]);
  const [fetching,   setFetching]   = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  useEffect(() => {
    // Guard: wait until auth is resolved AND user exists
    if (loading || !user?.id) return;

    let cancelled = false;
    setFetching(true);

    Promise.all([
      supabase
        .from('recipes')
        .select('id, title, category, cached_macros, rating_avg, fork_count, view_count, created_at')
        .eq('author_id', user.id)
        .eq('status', 'published')
        .order('created_at', { ascending: false }),
      supabase
        .from('saved_recipes')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id),
    ])
      .then(([{ data: recs }, { count }]) => {
        if (cancelled) return;
        setRecipes((recs ?? []) as Recipe[]);
        setSavedCount(count ?? 0);
      })
      .catch(() => {}) // never leave fetching=true on error
      .finally(() => {
        if (!cancelled) setFetching(false);
      });

    return () => { cancelled = true; };
  }, [loading, user?.id]); // only re-run when auth resolves or user changes

  // Show skeleton while auth is still resolving
  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
        <div className="skeleton" style={{ width: 160, height: 20 }} />
      </div>
    );
  }

  // Middleware handles the redirect for unauthenticated users,
  // but as a client-side safety net:
  if (!user || !profile) return null;

  const role       = profile.role ?? 'USER';
  const totalForks = recipes.reduce((s, r) => s + (r.fork_count ?? 0), 0);
  const ratedCount = recipes.filter(r => r.rating_avg != null).length;
  const avgRating  = ratedCount
    ? (recipes.reduce((s, r) => s + (r.rating_avg ?? 0), 0) / ratedCount).toFixed(1)
    : null;

  return (
    <>
      <section className="page-hero" style={{ paddingBlock: 56 }}>
        <div className="container">
          <div className="flex gap-24 items-center flex-wrap">

            {/* Avatar */}
            <div className="avatar" style={{ width: 80, height: 80, fontSize: '1.6rem', flexShrink: 0 }}>
              {profile.avatar_url
                ? <img src={profile.avatar_url} alt={profile.username} />
                : profile.username?.[0]?.toUpperCase()
              }
            </div>

            {/* Info */}
            <div style={{ flex: 1 }}>
              <div className="flex gap-10 items-center flex-wrap mb-6">
                <h1 style={{ color: 'white', fontSize: 'clamp(1.4rem,3vw,2rem)', margin: 0 }}>
                  {profile.username}
                </h1>
                <span style={{
                  padding: '3px 12px', borderRadius: 'var(--r-full)',
                  background: 'rgba(34,197,94,0.2)', color: 'var(--primary)',
                  fontSize: '0.76rem', fontWeight: 700,
                }}>
                  {ROLE_ICONS[role]} {ROLE_LABELS[role] ?? role}
                </span>
              </div>
              {profile.bio && (
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.92rem', marginBottom: 14, maxWidth: 480 }}>
                  {profile.bio}
                </p>
              )}
              {profile.fitness_goal && (
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
                  Goal: {profile.fitness_goal}
                  {profile.daily_kcal_target ? ` · ${profile.daily_kcal_target} kcal` : ''}
                  {profile.diet_type ? ` · ${profile.diet_type}` : ''}
                </p>
              )}
            </div>

            <Link href="/profile/settings" className="btn btn-outline btn-sm"
              style={{ borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)', flexShrink: 0 }}>
              ✏️ Edit profile
            </Link>
          </div>
        </div>
      </section>

      <section className="section-sm">
        <div className="container">

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: 12, marginBottom: 32 }}>
            {[
              { icon: '🍽️', label: 'Recipes',    value: recipes.length },
              { icon: '♥',  label: 'Saved',       value: savedCount },
              { icon: '🔀', label: 'Total forks', value: totalForks },
              { icon: '⭐', label: 'Avg rating',  value: avgRating ?? '—' },
            ].map(({ icon, label, value }) => (
              <div key={label} style={{
                background: 'white', border: '1px solid var(--border)',
                borderRadius: 'var(--r-lg)', padding: '18px 20px', textAlign: 'center',
              }}>
                <div style={{ fontSize: '1.3rem', marginBottom: 4 }}>{icon}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}>
                  {value}
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Quick links */}
          <div className="flex gap-12 mb-28 flex-wrap">
            <Link href="/saved-recipes"    className="btn btn-outline btn-sm">♥ Saved recipes</Link>
            <Link href="/dashboard"        className="btn btn-outline btn-sm">📊 Dashboard</Link>
            <Link href="/profile/settings" className="btn btn-outline btn-sm">⚙️ Settings</Link>
          </div>

          {/* Published recipes */}
          {fetching ? (
            <div className="recipe-grid">
              {[...Array(4)].map((_, i) => (
                <div key={i} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
                  <div className="skeleton" style={{ height: 196 }} />
                  <div style={{ padding: 18 }}>
                    <div className="skeleton mb-8" style={{ height: 14, width: '75%' }} />
                    <div className="skeleton" style={{ height: 11, width: '50%' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : recipes.length > 0 ? (
            <>
              <h3 style={{ fontSize: '1rem', marginBottom: 16 }}>Published recipes ({recipes.length})</h3>
              <div className="recipe-grid">
                {recipes.map(r => (
                  <Link key={r.id} href={`/recipes/${r.id}`} style={{ display: 'contents' }}>
                    <div className="recipe-card">
                      <div className="recipe-thumb">
                        <div className="recipe-thumb-emoji">{CATEGORY_EMOJI[r.category ?? ''] ?? '🍽️'}</div>
                        {r.category && (
                          <div className="recipe-thumb-badges">
                            <span className={`tag tag-${r.category}`}>{r.category.toUpperCase()}</span>
                          </div>
                        )}
                      </div>
                      <div className="recipe-body">
                        <h3 className="recipe-title">{r.title}</h3>
                        <div className="recipe-meta">
                          {r.cached_macros?.kcal != null && (
                            <div className="recipe-meta-item">🔥 <strong>{r.cached_macros.kcal}</strong> kcal</div>
                          )}
                          {r.fork_count > 0 && <div className="recipe-meta-item">🔀 {r.fork_count}</div>}
                          {r.rating_avg && <div className="recipe-meta-item">⭐ {r.rating_avg.toFixed(1)}</div>}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">🍽️</div>
              <h3 className="empty-title">No published recipes yet</h3>
              <p className="empty-desc">Create your first recipe to build your profile</p>
              <Link href="/recipes/new" className="btn btn-primary">Create recipe</Link>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
