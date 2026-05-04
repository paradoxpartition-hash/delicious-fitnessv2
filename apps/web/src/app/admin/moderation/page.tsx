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

interface FlaggedItem {
  id:         string;
  type:       'recipe' | 'comment' | 'post';
  title:      string;
  content:    string;
  author:     string;
  created_at: string;
  reason:     string | null;
}

export default function AdminModerationPage() {
  const [items,   setItems]   = useState<FlaggedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState<'pending' | 'approved' | 'removed'>('pending');
  const [toast,   setToast]   = useState('');
  const supabase = createBrowserClient();
  const router   = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/auth/signin'); return; }
      const { data: p } = await supabase.from('profiles').select('role').eq('id', data.user.id).maybeSingle();
      if (!['ADMIN','MODERATOR'].includes(p?.role ?? '')) { router.push('/'); return; }
      fetchItems();
    });
  }, [tab]);

  const fetchItems = async () => {
    setLoading(true);

    // Build a unified moderation queue from recipes + comments + posts
    const [
      { data: recipes },
      { data: comments },
      { data: posts },
    ] = await Promise.all([
      supabase
        .from('recipes')
        .select('id, title, created_at, profiles(username)')
        .eq('status', tab === 'pending' ? 'draft' : tab === 'approved' ? 'published' : 'archived')
        .order('created_at', { ascending: false })
        .limit(20),

      supabase
        .from('recipe_comments')
        .select('id, content, created_at, profiles(username)')
        .order('created_at', { ascending: false })
        .limit(20),

      supabase
        .from('community_posts')
        .select('id, content, created_at, profiles(username)')
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    const queue: FlaggedItem[] = [
      ...(recipes ?? []).map((r: any) => ({
        id:         r.id,
        type:       'recipe' as const,
        title:      r.title,
        content:    r.title,
        author:     r.profiles?.username ?? 'Unknown',
        created_at: r.created_at,
        reason:     null,
      })),
      ...(tab === 'pending' ? (comments ?? []).map((c: any) => ({
        id:         c.id,
        type:       'comment' as const,
        title:      'Comment',
        content:    c.content,
        author:     c.profiles?.username ?? 'Unknown',
        created_at: c.created_at,
        reason:     null,
      })) : []),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setItems(queue);
    setLoading(false);
  };

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const approveRecipe = async (id: string) => {
    await supabase.from('recipes').update({ status: 'published' }).eq('id', id);
    setItems(prev => prev.filter(i => i.id !== id));
    showToast('Recipe approved ✅');
  };

  const removeItem = async (item: FlaggedItem) => {
    if (!confirm(`Remove this ${item.type}?`)) return;
    if (item.type === 'recipe') {
      await supabase.from('recipes').update({ status: 'archived' }).eq('id', item.id);
    } else if (item.type === 'comment') {
      await supabase.from('recipe_comments').delete().eq('id', item.id);
    } else {
      await supabase.from('community_posts').delete().eq('id', item.id);
    }
    setItems(prev => prev.filter(i => i.id !== item.id));
    showToast(`${item.type} removed`);
  };

  const TYPE_BADGE: Record<string, string> = {
    recipe:  'badge-green',
    comment: 'badge-gray',
    post:    'badge-orange',
  };

  return (
    <div className="admin-wrap">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-logo">
          <Link href="/" className="logo" style={{ color: 'white' }}>
            <div className="logo-mark">🥗</div>
            <span style={{ color: 'white', fontFamily: 'var(--font-display)', fontWeight: 800 }}>Admin</span>
          </Link>
        </div>
        <nav className="admin-nav">
          <Link href="/admin"             className="admin-nav-link"><span className="icon">🏠</span>Overview</Link>
          <Link href="/admin/homepage"    className="admin-nav-link"><span className="icon">🎛️</span>Homepage</Link>
          <Link href="/admin/partners"    className="admin-nav-link"><span className="icon">🤝</span>Partners</Link>
          <Link href="/admin/moderation"  className="admin-nav-link active"><span className="icon">🛡️</span>Moderation</Link>
          <Link href="/admin"             className="admin-nav-link"><span className="icon">📊</span>Analytics</Link>
        </nav>
      </aside>

      <div className="admin-content">
        <div className="admin-header">
          <h1>Moderation</h1>
          <p>Review content, manage flagged items, and maintain platform quality.</p>
        </div>

        {toast && (
          <div className="toast-root">
            <div className="toast success"><span className="toast-icon">✅</span>{toast}</div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 mb-24" style={{ borderBottom: '1px solid var(--border)' }}>
          {(['pending','approved','removed'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '10px 18px', fontWeight: 600, fontSize: '0.88rem',
              color: tab === t ? 'var(--primary)' : 'var(--text-muted)',
              borderBottom: tab === t ? '2px solid var(--primary)' : '2px solid transparent',
              marginBottom: -1, background: 'none', border: 'none',
              borderBottomStyle: 'solid', cursor: 'pointer',
              textTransform: 'capitalize',
            }}>
              {t === 'pending' ? '⏳ Pending review' : t === 'approved' ? '✅ Approved' : '🗑️ Removed'}
            </button>
          ))}
        </div>

        {/* Queue */}
        <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 24 }}>
              {[...Array(4)].map((_, i) => <div key={i} className="skeleton mb-10" style={{ height: 56, borderRadius: 'var(--r)' }} />)}
            </div>
          ) : items.length === 0 ? (
            <div className="empty-state" style={{ padding: '48px 24px' }}>
              <div className="empty-icon">🛡️</div>
              <h3 className="empty-title">Nothing to review</h3>
              <p className="empty-desc">The {tab} queue is empty</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Content</th>
                  <th>Author</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id}>
                    <td>
                      <span className={`badge ${TYPE_BADGE[item.type]}`}>{item.type}</span>
                    </td>
                    <td style={{ maxWidth: 320 }}>
                      <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 2 }}>{item.title}</p>
                      {item.type !== 'recipe' && (
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 280 }}>
                          {item.content}
                        </p>
                      )}
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>@{item.author}</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="flex gap-6">
                        {item.type === 'recipe' && (
                          <Link href={`/recipes/${item.id}`} target="_blank" className="btn btn-ghost btn-sm">👁️</Link>
                        )}
                        {tab === 'pending' && item.type === 'recipe' && (
                          <button className="btn btn-primary btn-sm" onClick={() => approveRecipe(item.id)}>
                            Approve
                          </button>
                        )}
                        {tab !== 'removed' && (
                          <button className="btn btn-ghost btn-sm" style={{ color: '#dc2626' }} onClick={() => removeItem(item)}>
                            Remove
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
