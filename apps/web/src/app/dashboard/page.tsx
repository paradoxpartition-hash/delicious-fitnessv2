/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { createBrowserClient } from '@/lib/supabase/browser';

export default function DashboardPage() {
  const router   = useRouter();
  const supabase = createBrowserClient();
  const { user, profile, isLoggedIn, isAdmin, isChef, loading, dashboardHref } = useAuth();

  const [savedCount,   setSavedCount]   = useState(0);
  const [recipeCount,  setRecipeCount]  = useState(0);
  const [recentSaved,  setRecentSaved]  = useState<any[]>([]);
  const [dismissBanner, setDismissBanner] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !isLoggedIn) router.push('/auth/signin?next=/dashboard');
  }, [loading, isLoggedIn]);

  // Redirect admins and chefs to their own dashboards
  useEffect(() => {
    if (!loading && profile) {
      if (isAdmin) { router.push('/admin'); return; }
      if (isChef)  { router.push('/chef/dashboard'); return; }
    }
  }, [loading, profile, isAdmin, isChef]);

  // Fetch dashboard data
  useEffect(() => {
    if (!user?.id) return;
    Promise.all([
      supabase.from('saved_recipes').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('recipes').select('id', { count: 'exact', head: true }).eq('author_id', user.id),
      supabase
        .from('saved_recipes')
        .select('recipes(id, title, category, cached_macros, image_url)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(4),
    ]).then(([saved, recipes, recent]) => {
      setSavedCount(saved.count ?? 0);
      setRecipeCount(recipes.count ?? 0);
      setRecentSaved((recent.data ?? []).map((s: any) => s.recipes).filter(Boolean));
    });
  }, [user?.id]);

  if (loading || !profile) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
        <div className="skeleton" style={{ width: 200, height: 20 }} />
      </div>
    );
  }

  const needsRegen = profile.meal_plan_status === 'needs_regeneration' && !dismissBanner;

  const CATEGORY_EMOJI: Record<string, string> = {
    meat: '🥩', fish: '🐟', fruit: '🍎', dairy: '🧀',
    vegan: '🥗', pasta: '🍝', salad: '🥙', drinks: '🥤',
  };

  return (
    <>
      <section className="page-hero" style={{ paddingBlock: 48 }}>
        <div className="container">
          <h1 style={{ marginBottom: 6 }}>
            Hey, {profile.username} 👋
          </h1>
          <p>Welcome back to your Delicious Fitness dashboard.</p>
        </div>
      </section>

      <section className="section-sm">
        <div className="container">

          {/* Meal plan regeneration banner */}
          {needsRegen && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(255,122,0,0.08), rgba(255,122,0,0.04))',
              border: '1.5px solid rgba(255,122,0,0.3)',
              borderRadius: 'var(--r-lg)', padding: '16px 20px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 16, flexWrap: 'wrap', marginBottom: 28,
            }}>
              <div className="flex gap-12 items-center">
                <span style={{ fontSize: '1.4rem' }}>🔄</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>
                    Your nutrition settings changed
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Regenerate your weekly plan to reflect your updated goals.
                  </div>
                </div>
              </div>
              <div className="flex gap-8">
                <Link href="/meal-plan" className="btn btn-accent btn-sm">
                  Regenerate plan →
                </Link>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setDismissBanner(true)}
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))', gap: 14, marginBottom: 28 }}>
            {[
              { icon: '♥', label: 'Saved recipes',  value: savedCount,  href: '/saved-recipes' },
              { icon: '🍽️', label: 'My recipes',    value: recipeCount, href: '/profile' },
              { icon: '🎯', label: 'Goal',           value: profile.fitness_goal ?? '—', href: '/profile/settings' },
              { icon: '🔥', label: 'Daily kcal',     value: profile.daily_kcal_target ? `${profile.daily_kcal_target}` : '—', href: '/profile/settings' },
            ].map(({ icon, label, value, href }) => (
              <Link key={label} href={href} style={{ textDecoration: 'none' }}>
                <div style={{
                  background: 'white', border: '1px solid var(--border)',
                  borderRadius: 'var(--r-lg)', padding: '18px 20px',
                  transition: 'box-shadow var(--duration) var(--ease), transform var(--duration) var(--ease)',
                  cursor: 'pointer',
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = ''; (e.currentTarget as HTMLElement).style.transform = ''; }}
                >
                  <div style={{ fontSize: '1.3rem', marginBottom: 6 }}>{icon}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}>{value}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>{label}</div>
                </div>
              </Link>
            ))}
          </div>

          {/* Quick actions */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: 14, marginBottom: 32 }}>
            {[
              { href: '/meal-plan',      icon: '🤖', label: 'AI Meal Planner',    desc: 'Generate your weekly plan' },
              { href: '/recipes',        icon: '🍽️', label: 'Browse recipes',     desc: 'Find your next meal' },
              { href: '/challenges',     icon: '🏆', label: 'Challenges',         desc: 'Join a 30-day challenge' },
              { href: '/profile/settings', icon: '⚙️', label: 'Settings',         desc: 'Update goals & preferences' },
            ].map(({ href, icon, label, desc }) => (
              <Link key={href} href={href} style={{
                display: 'flex', gap: 14, alignItems: 'center',
                background: 'white', border: '1px solid var(--border)',
                borderRadius: 'var(--r-lg)', padding: '16px 18px',
                textDecoration: 'none',
                transition: 'all var(--duration) var(--ease)',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = ''; (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.borderColor = ''; }}
              >
                <div style={{ width: 42, height: 42, background: 'var(--primary-50)', borderRadius: 'var(--r)', display: 'grid', placeItems: 'center', fontSize: '1.3rem', flexShrink: 0 }}>
                  {icon}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--dark)' }}>{label}</div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{desc}</div>
                </div>
              </Link>
            ))}
          </div>

          {/* Recently saved */}
          {recentSaved.length > 0 && (
            <div>
              <div className="flex-between mb-16">
                <h3 style={{ fontSize: '1rem' }}>Recently saved</h3>
                <Link href="/saved-recipes" style={{ fontSize: '0.85rem', color: 'var(--primary)' }}>See all →</Link>
              </div>
              <div className="recipe-grid">
                {recentSaved.map(r => (
                  <Link key={r.id} href={`/recipes/${r.id}`} style={{ display: 'contents' }}>
                    <div className="recipe-card">
                      <div className="recipe-thumb">
                        {r.image_url
                          ? <img src={r.image_url} alt={r.title} loading="lazy" />
                          : <div className="recipe-thumb-emoji">{CATEGORY_EMOJI[r.category ?? ''] ?? '🍽️'}</div>
                        }
                      </div>
                      <div className="recipe-body">
                        <h3 className="recipe-title">{r.title}</h3>
                        <div className="recipe-meta">
                          {r.cached_macros?.kcal && <div className="recipe-meta-item">🔥 <strong>{r.cached_macros.kcal}</strong> kcal</div>}
                          {r.cached_macros?.protein_g && <div className="recipe-meta-item">💪 <strong>{r.cached_macros.protein_g}g</strong></div>}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
