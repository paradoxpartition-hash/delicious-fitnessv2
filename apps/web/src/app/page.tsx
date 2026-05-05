/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@/lib/supabase/browser';

interface CommunityPost {
  id:         string;
  content:    string;
  like_count: number;
  created_at: string;
  profiles:   { username: string; avatar_url: string | null } | null;
}

interface Recipe {
  id:            string;
  title:         string;
  category:      string | null;
  cached_macros: { kcal: number; protein_g: number } | null;
  image_url:     string | null;
  rating_avg:    number | null;
}

const FEATURES = [
  { icon: '🔀', title: 'Version-controlled recipes',   desc: 'Fork, edit, and track every change. Like GitHub — for food.' },
  { icon: '🌍', title: '5 languages',                   desc: 'Auto-translated to EN, NL, DE, FR, ES with one click.' },
  { icon: '🎯', title: 'Macro-accurate',                desc: 'Every recipe shows exact protein, carbs, fat, and kcal.' },
  { icon: '🤖', title: 'AI meal planner',               desc: 'Generate a full week of meals tailored to your fitness goal.' },
  { icon: '💰', title: 'Chef monetisation',             desc: 'Earn through affiliate ingredient links on every recipe.' },
  { icon: '🏆', title: 'Challenges',                    desc: '30-day protein challenge, veggie week, and more.' },
];

const CATEGORY_EMOJI: Record<string, string> = {
  meat: '🥩', fish: '🐟', fruit: '🍎', dairy: '🧀',
  vegan: '🥗', pasta: '🍝', salad: '🥙', drinks: '🥤',
};

export default function HomePage() {
  const supabase = createBrowserClient();

  // All loading states start FALSE
  const [posts,        setPosts]        = useState<CommunityPost[]>([]);
  const [recipes,      setRecipes]      = useState<Recipe[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [recipesLoading, setRecipesLoading] = useState(false);

  // Fetch community posts
  useEffect(() => {
    setPostsLoading(true);
    supabase
      .from('community_posts')
      .select('id, content, like_count, created_at, profiles(username, avatar_url)')
      .order('created_at', { ascending: false })
      .limit(4)
      .then(({ data, error }) => {
        if (!error) setPosts((data ?? []) as CommunityPost[]);
        setPostsLoading(false);
      })
      .catch(() => setPostsLoading(false));
  }, []);

  // Fetch top recipes
  useEffect(() => {
    setRecipesLoading(true);
    supabase
      .from('recipes')
      .select('id, title, category, cached_macros, image_url, rating_avg')
      .eq('status', 'published')
      .order('view_count', { ascending: false })
      .limit(6)
      .then(({ data, error }) => {
        if (!error) setRecipes((data ?? []) as Recipe[]);
        setRecipesLoading(false);
      })
      .catch(() => setRecipesLoading(false));
  }, []);

  const timeAgo = (d: string) => {
    const diff  = Date.now() - new Date(d).getTime();
    const hrs   = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (hrs  < 1)   return 'just now';
    if (hrs  < 24)  return `${hrs}h ago`;
    return `${days}d ago`;
  };

  return (
    <>
      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="hero-section">
        <div className="container">
          <div className="hero-content">
            <div className="eyebrow">The GitHub of recipes</div>
            <h1 className="hero-title">
              Structured recipes.<br />
              <span className="gradient-text">Built for results.</span>
            </h1>
            <p className="hero-sub">
              Macro-accurate, version-controlled, multilingual recipes.
              Fork any recipe, generate an AI meal plan, and join a community
              that actually tracks what they eat.
            </p>
            <div className="hero-actions">
              <Link href="/auth/signup" className="btn btn-primary btn-lg">
                Get started free
              </Link>
              <Link href="/recipes" className="btn btn-outline btn-lg">
                Browse recipes →
              </Link>
            </div>
            <div className="hero-trust">
              <span>🔒 No credit card required</span>
              <span>🌍 5 languages</span>
              <span>🍽️ Free forever plan</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────────── */}
      <section className="section" style={{ background: 'var(--bg)' }}>
        <div className="container">
          <div className="section-header">
            <div className="eyebrow">Why Delicious Fitness</div>
            <h2>Everything a serious cook needs</h2>
          </div>
          <div className="features-grid">
            {FEATURES.map(f => (
              <div key={f.title} className="feature-card">
                <div className="feature-icon">{f.icon}</div>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TOP RECIPES ──────────────────────────────────────────────────── */}
      <section className="section">
        <div className="container">
          <div className="section-header-row">
            <div>
              <div className="eyebrow">Trending now</div>
              <h2>Top recipes this week</h2>
            </div>
            <Link href="/recipes" className="btn btn-outline">See all →</Link>
          </div>

          {recipesLoading ? (
            <div className="recipe-grid">
              {[...Array(6)].map((_, i) => (
                <div key={i} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
                  <div className="skeleton" style={{ height: 196 }} />
                  <div style={{ padding: 18 }}>
                    <div className="skeleton mb-8" style={{ height: 14, width: '75%' }} />
                    <div className="skeleton" style={{ height: 11, width: '50%' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : recipes.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🍽️</div>
              <h3 className="empty-title">No recipes published yet</h3>
              <p className="empty-desc">Be the first chef to publish a recipe!</p>
              <Link href="/auth/signup" className="btn btn-primary">Get started</Link>
            </div>
          ) : (
            <div className="recipe-grid">
              {recipes.map(r => (
                <Link key={r.id} href={`/recipes/${r.id}`} style={{ display: 'contents' }}>
                  <div className="recipe-card">
                    <div className="recipe-thumb">
                      {r.image_url
                        ? <img src={r.image_url} alt={r.title} loading="lazy" />
                        : <div className="recipe-thumb-emoji">{CATEGORY_EMOJI[r.category ?? ''] ?? '🍽️'}</div>
                      }
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
                        {r.cached_macros?.protein_g != null && (
                          <div className="recipe-meta-item">💪 <strong>{r.cached_macros.protein_g}g</strong></div>
                        )}
                        {r.rating_avg != null && (
                          <div className="recipe-meta-item">⭐ {r.rating_avg.toFixed(1)}</div>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── ACTIVE COMMUNITY ─────────────────────────────────────────────── */}
      <section className="section" style={{ background: 'var(--bg)' }}>
        <div className="container">
          <div className="section-header-row">
            <div>
              <div className="eyebrow">Community</div>
              <h2>Active community</h2>
            </div>
            <Link href="/community" className="btn btn-outline">See all →</Link>
          </div>

          {postsLoading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: 16 }}>
              {[...Array(4)].map((_, i) => (
                <div key={i} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 20 }}>
                  <div className="flex gap-10 mb-12">
                    <div className="skeleton" style={{ width: 36, height: 36, borderRadius: '50%' }} />
                    <div style={{ flex: 1 }}>
                      <div className="skeleton mb-6" style={{ height: 11, width: '50%' }} />
                      <div className="skeleton" style={{ height: 9, width: '30%' }} />
                    </div>
                  </div>
                  <div className="skeleton mb-5" style={{ height: 12 }} />
                  <div className="skeleton" style={{ height: 12, width: '70%' }} />
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">💬</div>
              <h3 className="empty-title">Be the first to post</h3>
              <p className="empty-desc">Join the community and share your first meal or win.</p>
              <Link href="/auth/signup" className="btn btn-primary">Join now</Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: 16 }}>
              {posts.map(post => (
                <Link key={post.id} href={`/community/${post.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{
                    background: 'white', border: '1px solid var(--border)',
                    borderRadius: 'var(--r-lg)', padding: 20, height: '100%',
                    transition: 'box-shadow var(--duration) var(--ease)',
                  }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = 'none'}
                  >
                    <div className="flex gap-10 mb-12">
                      <div className="avatar avatar-sm flex-shrink-0">
                        {post.profiles?.avatar_url
                          ? <img src={post.profiles.avatar_url} alt="" />
                          : (post.profiles?.username?.[0]?.toUpperCase() ?? '?')
                        }
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                          {post.profiles?.username ?? 'Anonymous'}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {timeAgo(post.created_at)}
                        </div>
                      </div>
                    </div>
                    <p style={{ fontSize: '0.88rem', lineHeight: 1.6, color: 'var(--text)', marginBottom: 12, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {post.content}
                    </p>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-light)' }}>
                      🤍 {post.like_count} likes
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="section cta-section">
        <div className="container">
          <div className="cta-card">
            <div className="eyebrow" style={{ color: 'var(--primary)' }}>Ready to start?</div>
            <h2>Join 18,500+ fitness lovers</h2>
            <p>Create your free account and start tracking your nutrition properly.</p>
            <div className="flex gap-12 justify-center flex-wrap" style={{ marginTop: 28 }}>
              <Link href="/auth/signup" className="btn btn-primary btn-lg">
                Create free account
              </Link>
              <Link href="/pricing" className="btn btn-outline btn-lg">
                Become a chef →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
