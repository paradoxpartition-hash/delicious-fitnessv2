/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/browser';
import { detectLanguage, getTranslations, type LangCode } from '@/lib/i18n';

interface Post {
  id:          string;
  content:     string;
  image_url:   string | null;
  created_at:  string;
  like_count:  number;
  liked:       boolean;
  profiles:    { id: string; username: string; avatar_url: string | null } | null;
  recipe_id:   string | null;
  recipes:     { id: string; title: string } | null;
}

const TABS = ['feed', 'following', 'popular'] as const;
type Tab = typeof TABS[number];

export default function CommunityPage() {
  const [lang, setLang]           = useState<LangCode>('en');
  const [tab, setTab]             = useState<Tab>('feed');
  const [posts, setPosts]         = useState<Post[]>([]);
  const [loading, setLoading]     = useState(true);
  const [postText, setPostText]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const supabase = createBrowserClient();
  const router   = useRouter();

  // Language
  useEffect(() => { setLang(detectLanguage()); }, []);
  useEffect(() => {
    const h = (e: Event) => setLang((e as CustomEvent).detail);
    window.addEventListener('df:langchange', h);
    return () => window.removeEventListener('df:langchange', h);
  }, []);

  // Auth
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUser(data.user));
  }, []);

  // Fetch posts (PRESERVED logic from original)
  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('community_posts')
        .select(`
          id, content, image_url, created_at, like_count, liked,
          profiles(id, username, avatar_url),
          recipe_id,
          recipes(id, title)
        `)
        .order('created_at', { ascending: false })
        .limit(30);

      if (tab === 'popular') {
        query = supabase
          .from('community_posts')
          .select(`
            id, content, image_url, created_at, like_count, liked,
            profiles(id, username, avatar_url),
            recipe_id, recipes(id, title)
          `)
          .order('like_count', { ascending: false })
          .limit(30);
      }

      const { data } = await query;
      setPosts((data ?? []) as Post[]);
    } catch (_) {}
    setLoading(false);
  }, [tab]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  // Like / unlike (PRESERVED)
  const toggleLike = async (postId: string, liked: boolean) => {
    if (!currentUser) { router.push('/auth/signin'); return; }
    setPosts(prev => prev.map(p =>
      p.id === postId
        ? { ...p, liked: !liked, like_count: liked ? p.like_count - 1 : p.like_count + 1 }
        : p
    ));
    try {
      await supabase.rpc(liked ? 'unlike_post' : 'like_post', { p_post_id: postId });
    } catch (_) {}
  };

  // Create post (PRESERVED)
  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) { router.push('/auth/signin'); return; }
    if (!postText.trim()) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('community_posts')
        .insert({ content: postText.trim() })
        .select(`
          id, content, image_url, created_at, like_count, liked,
          profiles(id, username, avatar_url),
          recipe_id, recipes(id, title)
        `)
        .single();
      if (error) throw error;
      setPosts(prev => [data as Post, ...prev]);
      setPostText('');
    } catch (_) {}
    setSubmitting(false);
  };

  const t = getTranslations(lang);

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

          {/* Compose box */}
          <div style={{
            background: 'white', border: '1px solid var(--border)',
            borderRadius: 'var(--r-lg)', padding: '20px', marginBottom: 24,
          }}>
            <form onSubmit={handlePost}>
              <div className="flex gap-12 items-start">
                <div className="avatar avatar-md flex-shrink-0">
                  {currentUser ? currentUser.email?.[0].toUpperCase() : '👤'}
                </div>
                <div style={{ flex: 1 }}>
                  <textarea
                    className="input"
                    placeholder={currentUser ? "What are you cooking today? 🍽️" : "Sign in to post…"}
                    value={postText}
                    onChange={e => setPostText(e.target.value)}
                    disabled={!currentUser}
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
                      className={`btn btn-primary btn-sm${submitting ? ' btn-loading' : ''}`}
                      disabled={submitting || !postText.trim() || !currentUser}
                    >
                      {submitting ? '' : 'Post'}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mb-24" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
            {TABS.map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: '10px 18px',
                  fontWeight: 600, fontSize: '0.88rem',
                  color: tab === t ? 'var(--primary)' : 'var(--text-muted)',
                  borderBottom: tab === t ? '2px solid var(--primary)' : '2px solid transparent',
                  marginBottom: -1,
                  background: 'none', border: 'none',
                  borderBottomStyle: 'solid',
                  cursor: 'pointer',
                  transition: 'color var(--duration) var(--ease)',
                  textTransform: 'capitalize',
                }}
              >
                {t === 'feed' ? '🏠 Feed' : t === 'following' ? '👥 Following' : '🔥 Popular'}
              </button>
            ))}
          </div>

          {/* Posts */}
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[...Array(5)].map((_, i) => (
                <div key={i} style={{
                  background: 'white', border: '1px solid var(--border)',
                  borderRadius: 'var(--r-lg)', padding: 20,
                }}>
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
          ) : posts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">💬</div>
              <h3 className="empty-title">No posts yet</h3>
              <p className="empty-desc">Be the first to share something!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {posts.map(post => (
                <div key={post.id} className="post-card reveal">
                  <div className="post-head">
                    <div className="avatar avatar-md">
                      {post.profiles?.avatar_url
                        ? <img src={post.profiles.avatar_url} alt="" />
                        : (post.profiles?.username?.[0] ?? '?').toUpperCase()
                      }
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="post-author-name">{post.profiles?.username ?? 'Anonymous'}</div>
                      <div className="post-author-meta">
                        {new Date(post.created_at).toLocaleDateString('en', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </div>
                    </div>
                    {post.profiles?.id === currentUser?.id && (
                      <button className="btn btn-ghost btn-sm" style={{ fontSize: '1rem' }}>⋯</button>
                    )}
                  </div>

                  <p className="post-content">{post.content}</p>

                  {post.image_url && (
                    <div className="post-image" style={{ marginBottom: 12 }}>
                      <img src={post.image_url} alt="" style={{ width: '100%', borderRadius: 'var(--r)', maxHeight: 320, objectFit: 'cover' }} />
                    </div>
                  )}

                  {post.recipes && (
                    <Link href={`/recipes/${post.recipes.id}`} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      background: 'var(--primary-50)', borderRadius: 'var(--r)',
                      padding: '8px 12px', marginBottom: 12,
                      fontSize: '0.83rem', fontWeight: 500, color: 'var(--primary-dark)',
                    }}>
                      🍽️ {post.recipes.title}
                    </Link>
                  )}

                  <div className="post-actions">
                    <button
                      className={`post-action${post.liked ? ' liked' : ''}`}
                      onClick={() => toggleLike(post.id, post.liked)}
                    >
                      {post.liked ? '❤️' : '🤍'} {post.like_count > 0 ? post.like_count : ''} Like
                    </button>
                    <button className="post-action">💬 Comment</button>
                    <button className="post-action">↗ Share</button>
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
