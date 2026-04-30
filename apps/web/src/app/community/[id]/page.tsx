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

interface Post {
  id:         string;
  content:    string;
  image_url:  string | null;
  created_at: string;
  like_count: number;
  liked:      boolean;
  profiles:   { id: string; username: string; avatar_url: string | null } | null;
  recipe_id:  string | null;
  recipes:    { id: string; title: string } | null;
}

interface PostComment {
  id:         string;
  content:    string;
  created_at: string;
  profiles:   { username: string; avatar_url: string | null } | null;
}

export default function PostDetailPage() {
  const params   = useParams();
  const router   = useRouter();
  const postId   = params.id as string;
  const supabase = createBrowserClient();

  const [post,        setPost]        = useState<Post | null>(null);
  const [comments,    setComments]    = useState<PostComment[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting,  setSubmitting]  = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUser(data.user));
  }, []);

  useEffect(() => {
    if (!postId) return;

    Promise.all([
      supabase
        .from('community_posts')
        .select('id, content, image_url, created_at, like_count, liked, profiles(id, username, avatar_url), recipe_id, recipes(id, title)')
        .eq('id', postId)
        .single(),

      supabase
        .from('post_comments')
        .select('id, content, created_at, profiles(username, avatar_url)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true })
        .limit(50),
    ]).then(([{ data: p, error }, { data: c }]) => {
      if (error || !p) { router.push('/community'); return; }
      setPost(p as Post);
      setComments((c ?? []) as PostComment[]);
      setLoading(false);
    });
  }, [postId]);

  const toggleLike = async () => {
    if (!currentUser || !post) { router.push('/auth/signin'); return; }
    const liked = post.liked;
    setPost(prev => prev ? { ...prev, liked: !liked, like_count: liked ? prev.like_count - 1 : prev.like_count + 1 } : prev);
    await supabase.rpc(liked ? 'unlike_post' : 'like_post', { p_post_id: post.id });
  };

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) { router.push('/auth/signin'); return; }
    if (!commentText.trim()) return;
    setSubmitting(true);

    const { data, error } = await supabase
      .from('post_comments')
      .insert({ post_id: postId, content: commentText.trim() })
      .select('id, content, created_at, profiles(username, avatar_url)')
      .single();

    if (!error && data) {
      setComments(prev => [...prev, data as PostComment]);
      setCommentText('');
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <section className="section-sm">
        <div className="container" style={{ maxWidth: 640, marginInline: 'auto' }}>
          <div className="skeleton mb-16" style={{ height: 200, borderRadius: 'var(--r-lg)' }} />
          <div className="skeleton mb-8" style={{ height: 14 }} />
          <div className="skeleton" style={{ height: 14, width: '70%' }} />
        </div>
      </section>
    );
  }

  if (!post) return null;

  return (
    <section className="section-sm">
      <div className="container" style={{ maxWidth: 640, marginInline: 'auto' }}>

        {/* Back */}
        <Link href="/community" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 24 }}>
          ← Back to community
        </Link>

        {/* Post */}
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r-xl)', padding: '24px', marginBottom: 24 }}>
          <div className="post-head">
            <div className="avatar avatar-md">
              {post.profiles?.avatar_url
                ? <img src={post.profiles.avatar_url} alt="" />
                : (post.profiles?.username?.[0] ?? '?').toUpperCase()
              }
            </div>
            <div>
              <div className="post-author-name">{post.profiles?.username ?? 'Anonymous'}</div>
              <div className="post-author-meta">
                {new Date(post.created_at).toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            </div>
          </div>

          <p style={{ fontSize: '1rem', lineHeight: 1.7, margin: '16px 0' }}>{post.content}</p>

          {post.image_url && (
            <img src={post.image_url} alt="" style={{ width: '100%', borderRadius: 'var(--r-lg)', marginBottom: 16, maxHeight: 400, objectFit: 'cover' }} />
          )}

          {post.recipes && (
            <Link href={`/recipes/${post.recipes.id}`} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'var(--primary-50)', borderRadius: 'var(--r)',
              padding: '10px 14px', marginBottom: 16,
              fontSize: '0.88rem', fontWeight: 500, color: 'var(--primary-dark)',
            }}>
              🍽️ {post.recipes.title}
            </Link>
          )}

          <div className="post-actions" style={{ paddingTop: 16, borderTop: '1px solid var(--border-light)' }}>
            <button
              className={`post-action${post.liked ? ' liked' : ''}`}
              onClick={toggleLike}
            >
              {post.liked ? '❤️' : '🤍'} {post.like_count > 0 ? post.like_count : ''} Like
            </button>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
              💬 {comments.length} comment{comments.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Comments */}
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r-xl)', padding: '24px' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: 20 }}>Comments ({comments.length})</h3>

          {/* Comment form */}
          <form onSubmit={submitComment} style={{ marginBottom: 24 }}>
            <div className="flex gap-12 items-start">
              <div className="avatar avatar-md flex-shrink-0">
                {currentUser ? currentUser.email?.[0].toUpperCase() : '?'}
              </div>
              <div style={{ flex: 1 }}>
                <textarea
                  className="input"
                  placeholder={currentUser ? 'Write a comment…' : 'Sign in to comment'}
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  disabled={!currentUser}
                  rows={2}
                  style={{ resize: 'none' }}
                />
                {currentUser && (
                  <button
                    type="submit"
                    className={`btn btn-primary btn-sm${submitting ? ' btn-loading' : ''}`}
                    style={{ marginTop: 8 }}
                    disabled={submitting || !commentText.trim()}
                  >
                    {submitting ? '' : 'Post'}
                  </button>
                )}
              </div>
            </div>
          </form>

          {/* Comment list */}
          {comments.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', textAlign: 'center', padding: '16px 0' }}>
              No comments yet. Start the conversation!
            </p>
          ) : (
            <div>
              {comments.map(c => (
                <div key={c.id} className="comment">
                  <div className="avatar avatar-sm flex-shrink-0">
                    {c.profiles?.avatar_url
                      ? <img src={c.profiles.avatar_url} alt="" />
                      : (c.profiles?.username?.[0] ?? '?').toUpperCase()
                    }
                  </div>
                  <div className="comment-body">
                    <div className="comment-header">
                      <span className="comment-author">{c.profiles?.username ?? 'Anonymous'}</span>
                      <span className="comment-time">
                        {new Date(c.created_at).toLocaleDateString('en', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                    <p className="comment-text">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
