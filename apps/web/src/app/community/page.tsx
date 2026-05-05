/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@/lib/supabase/browser';

interface Post {
  id:         string;
  content:    string;
  image_url:  string | null;
  like_count: number;
  created_at: string;
  profiles:   { id: string; username: string; avatar_url: string | null } | null;
  recipes:    { id: string; title: string } | null;
}

type Tab = 'feed' | 'popular';

export default function CommunityPage() {
  const supabase = createBrowserClient();

  // loading starts FALSE — only true during actual fetch
  const [posts,    setPosts]    = useState<Post[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [tab,      setTab]      = useState<Tab>('feed');
  const [newPost,  setNewPost]  = useState('');
  const [posting,  setPosting]  = useState(false);
  const [user,     setUser]     = useState<any>(null);

  // Get current user (non-blocking — page works for anon too)
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
  }, []);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('community_posts')
        .select('id, content, image_url, like_count, created_at, profiles(id, username, avatar_url), recipes(id, title)')
        .limit(20);

      if (tab === 'popular') {
        query = query.order('like_count', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;

      if (error) {
        console.error('[community] fetch error:', error.message);
        setPosts([]);
      } else {
        setPosts((data ?? []) as Post[]);
      }
    } catch (e) {
      console.error('[community] unexpected error:', e);
      setPosts([]);
    } finally {
      // ALWAYS resolve loading — no permanent spinner
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const submitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newPost.trim()) return;
    setPosting(true);
    const { data, error } = await supabase
      .from('community_posts')
      .insert({ content: newPost.trim() })
      .select('id, content, image_url, like_count, created_at, profiles(id, username, avatar_url), recipes(id, title)')
      .single();
    if (!error && data) {
      setPosts(prev => [data as Post, ...prev]);
      setNewPost('');
    }
    setPosting(false);
  };

  const toggleLike = async (post: Post) => {
    if (!user) return;
    const liked = false; // simplified — no per-user like state here
    setPosts(prev => prev.map(p =>
      p.id === post.id ? { ...p, like_count: p.like_count + 1 } : p
    ));
    await supabase.rpc('like_post', { p_post_id: post.id });
  };

  const timeAgo = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    const hrs  = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1)   return 'just now';
    if (mins < 60)  return `${mins}m ago`;
    if (hrs  < 24)  return `${hrs}h ago`;
    return `${days}d ago`;
  };

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <h1>Community</h1>
          <p>Share your meals, celebrate your wins, and connect with fellow fitness lovers.</p>
        </div>
      </section>

      <section className="section-sm">
        <div className="container" style={{ maxWidth: 800, marginInline: 'auto' }}>

          {/* Post composer */}
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 20, marginBottom: 24 }}>
            <form onSubmit={submitPost}>
              <div className="flex gap-12 items-start">
                <div className="avatar avatar-md flex-shrink-0">
                  {user ? user.email?.[0]?.toUpperCase() : '👤'}
                </div>
                <div style={{ flex: 1 }}>
                  <textarea
                    className="input"
                    placeholder={user ? "Share a meal, tip, or win with the community…" : "Sign in to post…"}
                    value={newPost}
                    onChange={e => setNewPost(e.target.value)}
                    disabled={!user}
                    rows={3}
                    style={{ resize: 'none' }}
                  />
                  <div className="flex-between" style={{ marginTop: 10 }}>
                    <div className="flex gap-8">
                      <button type="button" className="btn btn-ghost btn-sm">📷 Photo</button>
                      <button type="button" className="btn btn-ghost btn-sm">🍽️ Tag recipe</button>
                    </div>
                    <button
                      type="submit"
                      className={`btn btn-primary btn-sm${posting ? ' btn-loading' : ''}`}
                      disabled={!user || !newPost.trim() || posting}
                    >
                      {posting ? '' : 'Post'}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mb-24" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
            {([
              { key: 'feed',    label: '🏠 Feed' },
              { key: 'popular', label: '🔥 Popular' },
            ] as const).map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                padding: '10px 18px', fontWeight: 600, fontSize: '0.88rem',
                color: tab === t.key ? 'var(--primary)' : 'var(--text-muted)',
                borderBottom: `2px solid ${tab === t.key ? 'var(--primary)' : 'transparent'}`,
                marginBottom: -1, background: 'none', border: 'none',
                borderBottomStyle: 'solid', cursor: 'pointer',
              }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Loading skeletons */}
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[...Array(3)].map((_, i) => (
                <div key={i} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 20 }}>
                  <div className="flex gap-12 mb-12">
                    <div className="skeleton" style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div className="skeleton mb-8" style={{ height: 12, width: '40%' }} />
                      <div className="skeleton" style={{ height: 10, width: '25%' }} />
                    </div>
                  </div>
                  <div className="skeleton mb-6" style={{ height: 13 }} />
                  <div className="skeleton mb-6" style={{ height: 13, width: '85%' }} />
                  <div className="skeleton" style={{ height: 13, width: '60%' }} />
                </div>
              ))}
            </div>
          )}

          {/* Empty state — shown when NOT loading AND no posts */}
          {!loading && posts.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">💬</div>
              <h3 className="empty-title">No posts yet</h3>
              <p className="empty-desc">Be the first to share something with the community!</p>
              {!user && (
                <Link href="/auth/signup" className="btn btn-primary">
                  Join the community
                </Link>
              )}
            </div>
          )}

          {/* Posts feed */}
          {!loading && posts.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {posts.map(post => (
                <div key={post.id} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 20 }}>
                  {/* Post header */}
                  <div className="flex gap-12 mb-12">
                    <div className="avatar avatar-md flex-shrink-0">
                      {post.profiles?.avatar_url
                        ? <img src={post.profiles.avatar_url} alt="" />
                        : (post.profiles?.username?.[0]?.toUpperCase() ?? '?')
                      }
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                        {post.profiles?.username ?? 'Anonymous'}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                        {timeAgo(post.created_at)}
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <p style={{ fontSize: '0.92rem', lineHeight: 1.65, marginBottom: 12 }}>
                    {post.content}
                  </p>

                  {/* Image */}
                  {post.image_url && (
                    <img src={post.image_url} alt="" style={{ width: '100%', borderRadius: 'var(--r)', marginBottom: 12, maxHeight: 320, objectFit: 'cover' }} />
                  )}

                  {/* Tagged recipe */}
                  {post.recipes && (
                    <Link href={`/recipes/${post.recipes.id}`} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      background: 'var(--primary-50)', borderRadius: 'var(--r)',
                      padding: '8px 12px', marginBottom: 12,
                      fontSize: '0.84rem', fontWeight: 500, color: 'var(--primary-dark)',
                    }}>
                      🍽️ {post.recipes.title}
                    </Link>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 16, paddingTop: 12, borderTop: '1px solid var(--border-light)' }}>
                    <button
                      onClick={() => toggleLike(post)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.84rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: user ? 'pointer' : 'default' }}
                    >
                      🤍 {post.like_count > 0 ? post.like_count : ''} Like
                    </button>
                    <Link href={`/community/${post.id}`} style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                      💬 Comment
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
