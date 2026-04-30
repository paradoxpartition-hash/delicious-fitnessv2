/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 */
'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@/lib/supabase/browser';

interface Notification {
  id:         string;
  type:       'fork' | 'comment' | 'like' | 'rating' | 'follow';
  message:    string;
  actor:      string;
  recipe_id:  string | null;
  read:       boolean;
  created_at: string;
}

export default function NotificationBell() {
  const [open,          setOpen]          = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread,        setUnread]        = useState(0);
  const [loading,       setLoading]       = useState(true);
  const ref    = useRef<HTMLDivElement>(null);
  const supabase = createBrowserClient();

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Build notifications from DB activity (forks of user's recipes, comments, ratings)
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { setLoading(false); return; }

      const userId = data.user.id;

      // Fetch recent forks of the user's recipes
      const { data: forks } = await supabase
        .from('recipes')
        .select('id, title, forked_from_id, created_at, profiles(username)')
        .not('forked_from_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10);

      // Fetch recent comments on user's recipes
      const { data: comments } = await supabase
        .from('recipe_comments')
        .select('id, content, created_at, recipe_id, profiles(username), recipes!inner(author_id, title)')
        .eq('recipes.author_id', userId)
        .neq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      const notifList: Notification[] = [];

      // Add fork notifications
      for (const fork of forks ?? []) {
        notifList.push({
          id:         `fork-${fork.id}`,
          type:       'fork',
          message:    `forked your recipe`,
          actor:      (fork.profiles as any)?.username ?? 'Someone',
          recipe_id:  fork.forked_from_id,
          read:       false,
          created_at: fork.created_at,
        });
      }

      // Add comment notifications
      for (const comment of comments ?? []) {
        notifList.push({
          id:         `comment-${comment.id}`,
          type:       'comment',
          message:    `commented on your recipe`,
          actor:      (comment.profiles as any)?.username ?? 'Someone',
          recipe_id:  comment.recipe_id,
          read:       false,
          created_at: comment.created_at,
        });
      }

      // Sort by date
      notifList.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      // Load read state from localStorage
      const readIds = new Set<string>(
        JSON.parse(localStorage.getItem('df_read_notifications') ?? '[]')
      );

      const withRead = notifList.slice(0, 20).map(n => ({
        ...n,
        read: readIds.has(n.id),
      }));

      setNotifications(withRead);
      setUnread(withRead.filter(n => !n.read).length);
      setLoading(false);
    });
  }, []);

  const markAllRead = () => {
    const allIds = notifications.map(n => n.id);
    localStorage.setItem('df_read_notifications', JSON.stringify(allIds));
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnread(0);
  };

  const markRead = (id: string) => {
    const stored = JSON.parse(localStorage.getItem('df_read_notifications') ?? '[]');
    localStorage.setItem('df_read_notifications', JSON.stringify([...stored, id]));
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnread(prev => Math.max(0, prev - 1));
  };

  const TYPE_ICON: Record<string, string> = {
    fork:    '🔀',
    comment: '💬',
    like:    '❤️',
    rating:  '⭐',
    follow:  '👤',
  };

  const timeAgo = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins < 1)   return 'just now';
    if (mins < 60)  return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => { setOpen(o => !o); if (!open && unread > 0) markAllRead(); }}
        className="btn btn-ghost btn-icon-round"
        style={{ position: 'relative', fontSize: '1.1rem' }}
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ''}`}
      >
        🔔
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: 4, right: 4,
            width: 16, height: 16,
            background: 'var(--accent)', color: 'white',
            borderRadius: '50%', fontSize: '0.6rem', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1.5px solid white',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          width: 340, maxHeight: 440,
          background: 'white', border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-xl)',
          overflow: 'hidden', zIndex: 500,
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Header */}
          <div style={{
            padding: '14px 18px', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>Notifications</span>
            {notifications.some(n => !n.read) && (
              <button
                onClick={markAllRead}
                style={{ fontSize: '0.78rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading ? (
              <div style={{ padding: '20px 18px' }}>
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex gap-10 mb-12">
                    <div className="skeleton" style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div className="skeleton mb-6" style={{ height: 11 }} />
                      <div className="skeleton" style={{ height: 9, width: '50%' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: '32px 18px', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: 8, opacity: 0.3 }}>🔔</div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No notifications yet</p>
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  style={{
                    display: 'flex', gap: 12, alignItems: 'flex-start',
                    padding: '12px 18px',
                    background: n.read ? 'transparent' : 'rgba(34,197,94,0.04)',
                    borderBottom: '1px solid var(--border-light)',
                    cursor: 'pointer',
                    transition: 'background var(--duration) var(--ease)',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = n.read ? 'transparent' : 'rgba(34,197,94,0.04)'}
                >
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%',
                    background: 'var(--primary-50)', display: 'grid',
                    placeItems: 'center', fontSize: '0.95rem', flexShrink: 0,
                  }}>
                    {TYPE_ICON[n.type]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.85rem', lineHeight: 1.4, margin: 0 }}>
                      <strong>{n.actor}</strong> {n.message}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: 3 }}>
                      {timeAgo(n.created_at)}
                    </p>
                  </div>
                  {!n.read && (
                    <div style={{ width: 7, height: 7, background: 'var(--primary)', borderRadius: '50%', marginTop: 4, flexShrink: 0 }} />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: '10px 18px', borderTop: '1px solid var(--border)' }}>
            <Link
              href="/profile"
              style={{ fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 600 }}
              onClick={() => setOpen(false)}
            >
              View profile →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
