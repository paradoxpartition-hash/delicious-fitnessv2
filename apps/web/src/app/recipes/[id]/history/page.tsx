/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/browser';

interface ForkNode {
  id:             string;
  title:          string;
  author:         string;
  avatar_url:     string | null;
  created_at:     string;
  fork_count:     number;
  rating_avg:     number | null;
  forked_from_id: string | null;
  status:         string;
  depth:          number;
}

export default function RecipeHistoryPage() {
  const params   = useParams();
  const id       = params.id as string;
  const supabase = createBrowserClient();

  const [root,    setRoot]    = useState<ForkNode | null>(null);
  const [forks,   setForks]   = useState<ForkNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    // Fetch the root recipe + its direct forks recursively (up to 3 levels)
    const fetchForkTree = async () => {
      setLoading(true);

      // Get the original recipe
      const { data: rootData } = await supabase
        .from('recipes')
        .select('id, title, created_at, fork_count, rating_avg, forked_from_id, status, profiles(username, avatar_url)')
        .eq('id', id)
        .single();

      if (!rootData) { setLoading(false); return; }

      setRoot({
        id:             rootData.id,
        title:          rootData.title,
        author:         (rootData.profiles as any)?.username ?? 'Unknown',
        avatar_url:     (rootData.profiles as any)?.avatar_url ?? null,
        created_at:     rootData.created_at,
        fork_count:     rootData.fork_count,
        rating_avg:     rootData.rating_avg,
        forked_from_id: rootData.forked_from_id,
        status:         rootData.status,
        depth:          0,
      });

      // Fetch all forks recursively (level 1 + level 2)
      const allForks: ForkNode[] = [];
      const fetchForks = async (parentId: string, depth: number) => {
        if (depth > 3) return;
        const { data: forksData } = await supabase
          .from('recipes')
          .select('id, title, created_at, fork_count, rating_avg, forked_from_id, status, profiles(username, avatar_url)')
          .eq('forked_from_id', parentId)
          .eq('status', 'published')
          .order('created_at', { ascending: true });

        for (const fork of forksData ?? []) {
          allForks.push({
            id:             fork.id,
            title:          fork.title,
            author:         (fork.profiles as any)?.username ?? 'Unknown',
            avatar_url:     (fork.profiles as any)?.avatar_url ?? null,
            created_at:     fork.created_at,
            fork_count:     fork.fork_count,
            rating_avg:     fork.rating_avg,
            forked_from_id: fork.forked_from_id,
            status:         fork.status,
            depth,
          });
          await fetchForks(fork.id, depth + 1);
        }
      };

      await fetchForks(id, 1);
      setForks(allForks);
      setLoading(false);
    };

    fetchForkTree();
  }, [id]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' });

  if (loading) {
    return (
      <section className="section-sm">
        <div className="container" style={{ maxWidth: 760, marginInline: 'auto' }}>
          <div className="skeleton mb-16" style={{ height: 24, width: '50%' }} />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton mb-10" style={{ height: 72, borderRadius: 'var(--r-lg)' }} />
          ))}
        </div>
      </section>
    );
  }

  const renderNode = (node: ForkNode) => (
    <div
      key={node.id}
      style={{
        display: 'flex',
        gap: 16,
        marginLeft: node.depth * 32,
        position: 'relative',
      }}
    >
      {/* Tree line */}
      {node.depth > 0 && (
        <div style={{
          position: 'absolute',
          left: -20,
          top: 0,
          bottom: 0,
          width: 1,
          background: 'var(--border)',
        }} />
      )}
      {node.depth > 0 && (
        <div style={{
          position: 'absolute',
          left: -20,
          top: 32,
          width: 20,
          height: 1,
          background: 'var(--border)',
        }} />
      )}

      <div style={{
        flex: 1,
        background: 'white',
        border: `1px solid ${node.id === id ? 'var(--primary)' : 'var(--border)'}`,
        borderRadius: 'var(--r-lg)',
        padding: '16px 20px',
        marginBottom: 10,
        transition: 'box-shadow var(--duration) var(--ease)',
      }}>
        <div className="flex-between flex-wrap gap-12">
          <div className="flex gap-12 items-center">
            <div className="avatar avatar-sm">
              {node.avatar_url
                ? <img src={node.avatar_url} alt="" />
                : node.author[0].toUpperCase()
              }
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Link href={`/recipes/${node.id}`} style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--dark)' }}>
                  {node.title}
                </Link>
                {node.id === id && (
                  <span className="badge badge-green">Original</span>
                )}
                {node.depth > 0 && (
                  <span className="badge badge-gray">Fork</span>
                )}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                by @{node.author} · {formatDate(node.created_at)}
              </div>
            </div>
          </div>

          <div className="flex gap-16 items-center">
            {node.rating_avg != null && (
              <span style={{ fontSize: '0.82rem', color: '#f59e0b' }}>
                ★ {node.rating_avg.toFixed(1)}
              </span>
            )}
            {node.fork_count > 0 && (
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                🔀 {node.fork_count}
              </span>
            )}
            <Link href={`/recipes/${node.id}`} className="btn btn-outline btn-sm">
              View →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );

  // Build ordered list: root first, then forks sorted by depth then date
  const sortedForks = [...forks].sort((a, b) => {
    if (a.depth !== b.depth) return a.depth - b.depth;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  return (
    <>
      <section className="page-hero" style={{ paddingBlock: 48 }}>
        <div className="container">
          <div className="flex-between flex-wrap gap-12">
            <div>
              <h1 style={{ marginBottom: 6 }}>Version history</h1>
              <p>Fork tree for: {root?.title ?? '…'}</p>
            </div>
            <Link href={`/recipes/${id}`} className="btn btn-outline" style={{ borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)' }}>
              ← Back to recipe
            </Link>
          </div>
        </div>
      </section>

      <section className="section-sm">
        <div className="container" style={{ maxWidth: 800, marginInline: 'auto' }}>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 32 }}>
            {[
              { label: 'Total forks', value: forks.length, icon: '🔀' },
              { label: 'Fork depth',  value: forks.length ? Math.max(...forks.map(f => f.depth)) : 0, icon: '📊' },
              { label: 'Contributors', value: new Set([root?.author, ...forks.map(f => f.author)]).size, icon: '👥' },
            ].map(({ label, value, icon }) => (
              <div key={label} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '16px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.3rem', marginBottom: 4 }}>{icon}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 3 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Fork tree */}
          <div style={{ position: 'relative', paddingLeft: 4 }}>
            {root && renderNode(root)}
            {sortedForks.map(node => renderNode(node))}
          </div>

          {forks.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '0.9rem' }}>No forks yet. Be the first to fork this recipe!</p>
              <Link href={`/recipes/${id}`} className="btn btn-primary" style={{ marginTop: 16 }}>
                🔀 Fork this recipe
              </Link>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
