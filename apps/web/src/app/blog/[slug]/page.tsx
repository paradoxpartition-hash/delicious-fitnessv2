/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/browser';

interface BlogPost {
  id:           string;
  title:        string;
  slug:         string;
  excerpt:      string | null;
  content:      string | null;
  cover_url:    string | null;
  category:     string | null;
  read_time:    number | null;
  published_at: string;
  profiles:     { username: string; avatar_url: string | null } | null;
}

export default function BlogPostPage() {
  const params   = useParams();
  const router   = useRouter();
  const slug     = params.slug as string;
  const supabase = createBrowserClient();

  const [post, setPost]     = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [related, setRelated] = useState<BlogPost[]>([]);

  useEffect(() => {
    if (!slug) return;
    supabase
      .from('blog_posts')
      .select('id, title, slug, excerpt, content, cover_url, category, read_time, published_at, profiles(username, avatar_url)')
      .eq('slug', slug)
      .eq('status', 'published')
      .single()
      .then(({ data, error }) => {
        if (error || !data) { router.push('/blog'); return; }
        setPost(data as BlogPost);
        setLoading(false);
        // Fetch related
        supabase
          .from('blog_posts')
          .select('id, title, slug, excerpt, cover_url, category, read_time, published_at, profiles(username, avatar_url)')
          .eq('status', 'published')
          .eq('category', data.category ?? '')
          .neq('id', data.id)
          .limit(3)
          .then(({ data: rel }) => setRelated((rel ?? []) as BlogPost[]));
      });
  }, [slug]);

  if (loading) {
    return (
      <section className="section">
        <div className="container" style={{ maxWidth: 760, marginInline: 'auto' }}>
          <div className="skeleton mb-16" style={{ height: 320, borderRadius: 'var(--r-xl)' }} />
          <div className="skeleton mb-12" style={{ height: 32, width: '80%' }} />
          <div className="skeleton mb-8" style={{ height: 16 }} />
          <div className="skeleton mb-8" style={{ height: 16, width: '90%' }} />
          <div className="skeleton" style={{ height: 16, width: '70%' }} />
        </div>
      </section>
    );
  }

  if (!post) return null;

  return (
    <>
      {/* Hero */}
      <div style={{
        height: 360, position: 'relative', overflow: 'hidden',
        background: post.cover_url ? `url(${post.cover_url}) center/cover` : 'linear-gradient(135deg, var(--dark), #162616)',
      }}>
        {!post.cover_url && (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: '6rem', opacity: 0.15 }}>
            📰
          </div>
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.2) 60%, transparent)' }} />
        <div className="container" style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'flex-end', paddingBottom: 36 }}>
          <div style={{ maxWidth: 760 }}>
            {post.category && <span className="badge badge-green" style={{ marginBottom: 12, display: 'inline-flex' }}>{post.category}</span>}
            <h1 style={{ color: 'white', fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', marginBottom: 12 }}>{post.title}</h1>
            <div className="flex gap-16 items-center flex-wrap" style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.85rem' }}>
              {post.profiles && (
                <div className="flex gap-8 items-center">
                  <div className="avatar avatar-sm" style={{ background: 'rgba(255,255,255,0.2)' }}>
                    {post.profiles.username[0].toUpperCase()}
                  </div>
                  {post.profiles.username}
                </div>
              )}
              <span>{new Date(post.published_at).toLocaleDateString('en', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              {post.read_time && <span>⏱️ {post.read_time} min read</span>}
            </div>
          </div>
        </div>
      </div>

      <section className="section-sm">
        <div className="container" style={{ maxWidth: 760, marginInline: 'auto' }}>
          {/* Breadcrumb */}
          <div className="flex gap-8 items-center mb-32" style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            <Link href="/" style={{ color: 'var(--text-muted)' }}>Home</Link>
            <span>›</span>
            <Link href="/blog" style={{ color: 'var(--text-muted)' }}>Blog</Link>
            <span>›</span>
            <span className="truncate" style={{ color: 'var(--text)' }}>{post.title}</span>
          </div>

          {/* Excerpt */}
          {post.excerpt && (
            <p style={{
              fontSize: '1.15rem', color: 'var(--text-muted)', lineHeight: 1.75,
              borderLeft: '3px solid var(--primary)', paddingLeft: 20, marginBottom: 32,
              fontStyle: 'italic',
            }}>
              {post.excerpt}
            </p>
          )}

          {/* Content */}
          {post.content ? (
            <div
              style={{ fontSize: '1rem', lineHeight: 1.8, color: 'var(--text)' }}
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          ) : (
            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Content coming soon…</p>
          )}

          {/* Share */}
          <div style={{ borderTop: '1px solid var(--border)', marginTop: 48, paddingTop: 32 }}>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: 12 }}>Share this article</p>
            <div className="flex gap-8">
              {['𝕏 Twitter', 'in LinkedIn', 'WhatsApp'].map(s => (
                <button key={s} className="btn btn-outline btn-sm">{s}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Related posts */}
        {related.length > 0 && (
          <div className="container" style={{ marginTop: 64 }}>
            <h2 style={{ fontSize: '1.4rem', marginBottom: 28 }}>Related articles</h2>
            <div className="blog-grid">
              {related.map(r => (
                <Link key={r.id} href={`/blog/${r.slug}`} style={{ display: 'contents' }}>
                  <div className="blog-card">
                    <div className="blog-thumb">
                      {r.cover_url
                        ? <img src={r.cover_url} alt={r.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span>📰</span>
                      }
                    </div>
                    <div className="blog-body">
                      {r.category && <span className="badge badge-gray mb-8" style={{ display: 'inline-flex' }}>{r.category}</span>}
                      <h3 className="blog-title">{r.title}</h3>
                      {r.excerpt && <p className="blog-excerpt">{r.excerpt}</p>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>
    </>
  );
}
