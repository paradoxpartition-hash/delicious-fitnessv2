/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/browser';
import { detectLanguage, type LangCode } from '@/lib/i18n';

interface SearchResult {
  id:            string;
  title:         string;
  description:   string | null;
  category:      string | null;
  cached_macros: { kcal: number; protein_g: number } | null;
  diet_tags:     string[];
  image_url:     string | null;
  profiles:      { username: string } | null;
}

export default function SearchPage() {
  const searchParams  = useSearchParams();
  const router        = useRouter();
  const inputRef      = useRef<HTMLInputElement>(null);
  const supabase      = createBrowserClient();

  const [lang, setLang]         = useState<LangCode>('en');
  const [query, setQuery]       = useState(searchParams.get('q') ?? '');
  const [results, setResults]   = useState<SearchResult[]>([]);
  const [loading, setLoading]   = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => { setLang(detectLanguage()); }, []);
  useEffect(() => {
    const h = (e: Event) => setLang((e as CustomEvent).detail);
    window.addEventListener('df:langchange', h);
    return () => window.removeEventListener('df:langchange', h);
  }, []);

  // Keyboard shortcut: "/" to focus search (PRESERVED)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Search using Supabase full-text search (PRESERVED)
  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setSearched(false); return; }
    setLoading(true); setSearched(true);

    try {
      // Use pg full-text search (PRESERVED from original)
      const { data } = await supabase
        .from('recipes')
        .select('id, title, description, category, cached_macros, diet_tags, image_url, profiles(username)')
        .eq('status', 'published')
        .textSearch('fts', q.trim().split(' ').join(' & '), { type: 'websearch' })
        .limit(20);

      setResults((data ?? []) as SearchResult[]);
    } catch (_) {
      // Fallback: ILIKE search (PRESERVED fallback from original)
      try {
        const { data } = await supabase
          .from('recipes')
          .select('id, title, description, category, cached_macros, diet_tags, image_url, profiles(username)')
          .eq('status', 'published')
          .ilike('title', `%${q.trim()}%`)
          .limit(20);
        setResults((data ?? []) as SearchResult[]);
      } catch (_) {}
    }
    setLoading(false);
  }, []);

  // Auto-search from URL param
  useEffect(() => {
    const q = searchParams.get('q');
    if (q) { setQuery(q); search(q); }
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    search(query);
  };

  const CATEGORY_EMOJI: Record<string, string> = {
    meat: '🥩', fish: '🐟', fruit: '🍎', dairy: '🧀',
    vegan: '🥗', pasta: '🍝', salad: '🥙', drinks: '🥤',
  };

  return (
    <>
      {/* Search hero */}
      <div className="search-hero">
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{ color: 'white', textAlign: 'center', marginBottom: 24, fontSize: 'clamp(1.8rem, 4vw, 2.8rem)' }}>
            Search recipes
          </h1>
          <form onSubmit={handleSubmit}>
            <div className="search-bar-lg">
              <span style={{
                paddingLeft: 20, color: 'var(--text-light)',
                fontSize: '1.2rem', flexShrink: 0,
              }}>🔍</span>
              <input
                ref={inputRef}
                type="text"
                className="input"
                placeholder='Search recipes… Press "/" to focus'
                value={query}
                onChange={e => setQuery(e.target.value)}
                autoFocus
              />
              <button type="submit" className="btn btn-primary" style={{ borderRadius: '0 var(--r-full) var(--r-full) 0', height: 54, paddingInline: 28 }}>
                Search
              </button>
            </div>
          </form>

          {/* Quick suggestions */}
          {!searched && (
            <div className="flex justify-center gap-8 flex-wrap" style={{ marginTop: 20 }}>
              {['chicken', 'vegan pasta', 'high protein', 'bulk meal', '500 kcal'].map(s => (
                <button
                  key={s}
                  onClick={() => { setQuery(s); router.push(`/search?q=${encodeURIComponent(s)}`); search(s); }}
                  style={{
                    padding: '6px 14px', borderRadius: 'var(--r-full)',
                    background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                    color: 'rgba(255,255,255,0.75)', fontSize: '0.82rem', fontWeight: 500,
                    cursor: 'pointer', transition: 'all var(--duration) var(--ease)',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(34,197,94,0.2)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary)';
                    (e.currentTarget as HTMLElement).style.color = 'var(--primary)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.2)';
                    (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.75)';
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <section className="section-sm">
        <div className="container">

          {/* Results header */}
          {searched && !loading && (
            <div style={{ marginBottom: 20, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              {results.length > 0
                ? <><strong style={{ color: 'var(--text)' }}>{results.length}</strong> results for "<strong style={{ color: 'var(--dark)' }}>{query}</strong>"</>
                : <>No results for "<strong>{query}</strong>"</>
              }
            </div>
          )}

          {/* Loading skeletons */}
          {loading && (
            <div className="recipe-grid">
              {[...Array(8)].map((_, i) => (
                <div key={i} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
                  <div className="skeleton" style={{ height: 196 }} />
                  <div style={{ padding: 18 }}>
                    <div className="skeleton mb-8" style={{ height: 14, width: '75%' }} />
                    <div className="skeleton mb-8" style={{ height: 11 }} />
                    <div className="skeleton" style={{ height: 11, width: '55%' }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Results */}
          {!loading && searched && results.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">🔍</div>
              <h3 className="empty-title">No recipes found</h3>
              <p className="empty-desc">Try different keywords, or browse all recipes</p>
              <Link href="/recipes" className="btn btn-primary">Browse all recipes</Link>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="recipe-grid">
              {results.map(r => (
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
                      {r.description && <p className="recipe-description">{r.description}</p>}
                      {r.diet_tags?.length > 0 && (
                        <div className="flex flex-wrap gap-4 mb-8">
                          {r.diet_tags.map(tag => <span key={tag} className="badge badge-green">{tag}</span>)}
                        </div>
                      )}
                      <div className="recipe-meta">
                        {r.cached_macros?.kcal != null && (
                          <div className="recipe-meta-item">🔥 <strong>{r.cached_macros.kcal}</strong> kcal</div>
                        )}
                        {r.cached_macros?.protein_g != null && (
                          <div className="recipe-meta-item">💪 <strong>{r.cached_macros.protein_g}g</strong> protein</div>
                        )}
                        {r.profiles?.username && (
                          <div className="recipe-meta-item">👤 {r.profiles.username}</div>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Not yet searched state */}
          {!searched && !loading && (
            <div className="empty-state">
              <div className="empty-icon">🥗</div>
              <h3 className="empty-title">What are you looking for?</h3>
              <p className="empty-desc">Search by ingredient, dish name, diet type, or macro target</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
