/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@/lib/supabase/browser';
import { detectLanguage, type LangCode } from '@/lib/i18n';

interface BlogPost {
  id:          string;
  title:       string;
  slug:        string;
  excerpt:     string | null;
  cover_url:   string | null;
  category:    string | null;
  read_time:   number | null;
  published_at: string;
  profiles:    { username: string; avatar_url: string | null } | null;
}

const CATEGORIES = ['all', 'nutrition', 'fitness', 'recipes', 'mindset', 'science'] as const;
type Category = typeof CATEGORIES[number];

const CAT_EMOJI: Record<string, string> = {
  nutrition: '🥦', fitness: '💪', recipes: '🍽️',
  mindset: '🧠', science: '🔬', all: '📰',
};

export default function BlogPage() {
  const [lang, setLang]       = useState<LangCode>('en');
  const [posts, setPosts]     = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<Category>('all');
  const [featured, setFeatured] = useState<BlogPost | null>(null);
  const supabase = createBrowserClient();

  useEffect(() => { setLang(detectLanguage()); }, []);
  useEffect(() => {
    const h = (e: Event) => setLang((e as CustomEvent).detail);
    window.addEventListener('df:langchange', h);
    return () => window.removeEventListener('df:langchange', h);
  }, []);

  // Scroll reveal
  useEffect(() => {
    const els = document.querySelectorAll('.reveal');
    const io = new IntersectionObserver(
      es => es.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.1 }
    );
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  });

  // Fetch posts (PRESERVED query)
  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt, cover_url, category, read_time, published_at, profiles(username, avatar_url)')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(24);

      if (category !== 'all') query = query.eq('category', category);

      const { data } = await query;
      const list = (data ?? []) as BlogPost[];
      setPosts(list);
      setFeatured(list[0] ?? null);
    } catch (_) {}
    setLoading(false);
  }, [category]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <h1>Blog</h1>
          <p>Nutrition science, training tips, and chef stories from the Delicious Fitness community.</p>
        </div>
      </section>

      <section className="section-sm">
        <div className="container">

          {/* Category filters */}
          <div className="filter-bar mb-32">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                className={`filter-chip${category === cat ? ' active' : ''}`}
                onClick={() => setCategory(cat)}
              >
                {CAT_EMOJI[cat]} {cat === 'all' ? 'All posts' : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>

          {loading ? (
            <>
              {/* Featured skeleton */}
              <div className="skeleton mb-32" style={{ height: 400, borderRadius: 'var(--r-xl)' }} />
              <div className="blog-grid">
                {[...Array(6)].map((_, i) => (
                  <div key={i} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
                    <div className="skeleton" style={{ height: 176 }} />
                    <div style={{ padding: 20 }}>
                      <div className="skeleton mb-8" style={{ height: 14, width: '80%' }} />
                      <div className="skeleton mb-6" style={{ height: 11 }} />
                      <div className="skeleton" style={{ height: 11, width: '70%' }} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : posts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📰</div>
              <h3 className="empty-title">No posts yet</h3>
              <p className="empty-desc">Check back soon</p>
            </div>
          ) : (
            <>
              {/* Featured post */}
              {featured && category === 'all' && (
                <Link href={`/blog/${featured.slug}`} style={{ display: 'block', marginBottom: 40 }}>
                  <div style={{
                    background: 'white', border: '1px solid var(--border)',
                    borderRadius: 'var(--r-xl)', overflow: 'hidden',
                    display: 'grid', gridTemplateColumns: '1fr 1fr',
                    transition: 'box-shadow var(--duration-md) var(--ease), transform var(--duration-md) var(--ease)',
                  }}
                    className="reveal"
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-lg)';
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.boxShadow = '';
                      (e.currentTarget as HTMLElement).style.transform = '';
                    }}
                  >
                    <div style={{
                      minHeight: 320,
                      background: featured.cover_url
                        ? `url(${featured.cover_url}) center/cover`
                        : 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(255,122,0,0.1))',
                      display: 'grid', placeItems: 'center', fontSize: '5rem',
                    }}>
                      {!featured.cover_url && (CAT_EMOJI[featured.category ?? ''] ?? '📰')}
                    </div>
                    <div style={{ padding: 36, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <div className="flex gap-8 mb-16">
                        <span className="badge badge-green">Featured</span>
                        {featured.category && <span className="badge badge-gray">{featured.category}</span>}
                      </div>
                      <h2 style={{ fontSize: '1.5rem', marginBottom: 12, lineHeight: 1.3 }}>{featured.title}</h2>
                      {featured.excerpt && (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: 1.7, marginBottom: 20 }}>
                          {featured.excerpt}
                        </p>
                      )}
                      <div className="flex gap-12 items-center" style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        {featured.profiles && (
                          <div className="flex gap-6 items-center">
                            <div className="avatar avatar-sm">{featured.profiles.username[0].toUpperCase()}</div>
                            {featured.profiles.username}
                          </div>
                        )}
                        <span>·</span>
                        <span>{formatDate(featured.published_at)}</span>
                        {featured.read_time && <><span>·</span><span>⏱️ {featured.read_time} min read</span></>}
                      </div>
                    </div>
                  </div>
                </Link>
              )}

              {/* Post grid */}
              <div className="blog-grid">
                {(category === 'all' ? posts.slice(1) : posts).map((post, i) => (
                  <Link key={post.id} href={`/blog/${post.slug}`} style={{ display: 'contents' }}>
                    <div className={`blog-card reveal reveal-delay-${(i % 3) + 1}`}>
                      <div className="blog-thumb">
                        {post.cover_url
                          ? <img src={post.cover_url} alt={post.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <span>{CAT_EMOJI[post.category ?? ''] ?? '📰'}</span>
                        }
                      </div>
                      <div className="blog-body">
                        <div className="flex gap-6 mb-10">
                          {post.category && <span className="badge badge-gray">{post.category}</span>}
                          {post.read_time && <span className="badge badge-gray">⏱️ {post.read_time} min</span>}
                        </div>
                        <h3 className="blog-title">{post.title}</h3>
                        {post.excerpt && <p className="blog-excerpt">{post.excerpt}</p>}
                        <div className="blog-foot">
                          {post.profiles && (
                            <div className="flex gap-6 items-center">
                              <div className="avatar avatar-sm">{post.profiles.username[0].toUpperCase()}</div>
                              <span>{post.profiles.username}</span>
                            </div>
                          )}
                          <span style={{ marginLeft: 'auto' }}>{formatDate(post.published_at)}</span>
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
    </>
  );
}
