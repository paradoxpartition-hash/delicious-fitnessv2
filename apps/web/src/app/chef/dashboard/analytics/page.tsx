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

interface ViewRow {
  date:   string;
  views:  number;
  recipe: string;
}

export default function ChefAnalyticsPage() {
  const [rows, setRows]     = useState<ViewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const supabase = createBrowserClient();
  const router   = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/auth/signin'); return; }

      const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
      const from = new Date(Date.now() - days * 86400000).toISOString();

      const { data: viewData } = await supabase
        .from('recipe_views')
        .select('viewed_at, recipes(title)')
        .eq('author_id', data.user.id)
        .gte('viewed_at', from)
        .order('viewed_at', { ascending: false })
        .limit(200);

      // Aggregate by date (PRESERVED aggregation logic)
      const agg: Record<string, { views: number; recipes: Set<string> }> = {};
      (viewData ?? []).forEach((v: any) => {
        const date = v.viewed_at.slice(0, 10);
        if (!agg[date]) agg[date] = { views: 0, recipes: new Set() };
        agg[date].views += 1;
        if (v.recipes?.title) agg[date].recipes.add(v.recipes.title);
      });

      setRows(
        Object.entries(agg)
          .sort(([a], [b]) => b.localeCompare(a))
          .slice(0, 30)
          .map(([date, { views, recipes }]) => ({
            date,
            views,
            recipe: [...recipes].slice(0, 2).join(', ') || '—',
          }))
      );
      setLoading(false);
    });
  }, [period]);

  const totalViews = rows.reduce((s, r) => s + r.views, 0);
  const maxViews   = Math.max(...rows.map(r => r.views), 1);

  return (
    <>
      <section className="page-hero" style={{ paddingBlock: 40 }}>
        <div className="container">
          <div className="flex-between flex-wrap gap-12">
            <div>
              <h1 style={{ marginBottom: 6 }}>Analytics</h1>
              <p>Track your recipe performance over time</p>
            </div>
            <Link href="/chef/dashboard" className="btn btn-outline" style={{ borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)' }}>
              ← Dashboard
            </Link>
          </div>
        </div>
      </section>

      <section className="section-sm">
        <div className="container">
          {/* Period selector */}
          <div className="flex gap-8 mb-28">
            {(['7d','30d','90d'] as const).map(p => (
              <button
                key={p}
                className={`filter-chip${period === p ? ' active' : ''}`}
                onClick={() => setPeriod(p)}
              >
                {p === '7d' ? 'Last 7 days' : p === '30d' ? 'Last 30 days' : 'Last 90 days'}
              </button>
            ))}
          </div>

          {/* Summary stat */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 16, marginBottom: 28 }}>
            {[
              { label: 'Total views',  value: totalViews.toLocaleString(), icon: '👁️' },
              { label: 'Days tracked', value: rows.length, icon: '📅' },
              { label: 'Avg per day',  value: rows.length ? Math.round(totalViews / rows.length) : 0, icon: '📊' },
            ].map(({ label, value, icon }) => (
              <div key={label} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '20px 22px' }}>
                <div style={{ fontSize: '1.3rem', marginBottom: 6 }}>{icon}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Bar chart (CSS-only) */}
          {!loading && rows.length > 0 && (
            <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '24px', marginBottom: 24 }}>
              <h3 style={{ fontSize: '0.97rem', marginBottom: 20 }}>Views over time</h3>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 120, overflowX: 'auto', paddingBottom: 8 }}>
                {rows.slice().reverse().map(r => (
                  <div key={r.date} title={`${r.date}: ${r.views} views`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: '0 0 auto', minWidth: 24 }}>
                    <div style={{
                      width: 20, borderRadius: '3px 3px 0 0',
                      background: 'var(--primary)',
                      height: `${Math.max(4, Math.round((r.views / maxViews) * 100))}px`,
                      transition: 'height 0.4s ease',
                      opacity: 0.85,
                    }} />
                    <span style={{ fontSize: '0.58rem', color: 'var(--text-light)', transform: 'rotate(-45deg)', transformOrigin: 'right top', whiteSpace: 'nowrap' }}>
                      {r.date.slice(5)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Table */}
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '0.97rem', margin: 0 }}>Daily breakdown</h3>
            </div>
            {loading ? (
              <div style={{ padding: 24 }}>
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="skeleton mb-8" style={{ height: 14 }} />
                ))}
              </div>
            ) : rows.length === 0 ? (
              <div className="empty-state" style={{ padding: '48px 24px' }}>
                <div className="empty-icon">📊</div>
                <h3 className="empty-title">No data yet</h3>
                <p className="empty-desc">Publish recipes to start tracking views</p>
              </div>
            ) : (
              <table className="data-table">
                <thead><tr><th>Date</th><th>Views</th><th>Top recipes</th></tr></thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.date}>
                      <td>{new Date(r.date).toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short' })}</td>
                      <td><strong>{r.views}</strong></td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.83rem' }}>{r.recipe}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
