/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@/lib/supabase/browser';
import { detectLanguage, getTranslations, type LangCode } from '@/lib/i18n';

// ── Types (unchanged from original) ──────────────────────────────────────────
type Category = 'meat' | 'fish' | 'fruit' | 'dairy' | 'drinks' | 'vegan' | 'pasta' | 'salad';
type DietTag  = 'halal' | 'vegan' | 'kosher' | 'gluten-free';
type Goal     = 'bulk' | 'cut' | 'maintain';

interface Recipe {
  id:             string;
  title:          string;
  description:    string | null;
  category:       Category | null;
  cached_macros:  { kcal: number; protein_g: number; carbs_g: number; fat_g: number } | null;
  diet_tags:      DietTag[];
  goal:           Goal | null;
  fork_count:     number;
  rating_avg:     number | null;
  image_url:      string | null;
  profiles:       { username: string; avatar_url: string | null } | null;
}

const CATEGORIES: { value: Category | 'all'; label: string; emoji: string }[] = [
  { value: 'all',    label: 'All',    emoji: '🍽️' },
  { value: 'meat',   label: 'Meat',   emoji: '🥩' },
  { value: 'fish',   label: 'Fish',   emoji: '🐟' },
  { value: 'fruit',  label: 'Fruit',  emoji: '🍎' },
  { value: 'dairy',  label: 'Dairy',  emoji: '🥛' },
  { value: 'drinks', label: 'Drinks', emoji: '🥤' },
  { value: 'vegan',  label: 'Vegan',  emoji: '🥗' },
  { value: 'pasta',  label: 'Pasta',  emoji: '🍝' },
  { value: 'salad',  label: 'Salad',  emoji: '🥙' },
];

const DIET_TAGS: { value: DietTag; label: string }[] = [
  { value: 'halal',       label: 'Halal' },
  { value: 'vegan',       label: 'Vegan' },
  { value: 'kosher',      label: 'Kosher' },
  { value: 'gluten-free', label: 'Gluten-free' },
];

const GOALS: { value: Goal; label: string }[] = [
  { value: 'bulk',     label: 'Bulk' },
  { value: 'cut',      label: 'Cut' },
  { value: 'maintain', label: 'Maintain' },
];

const PAGE_SIZE = 20;

export default function RecipesPage() {
  const [lang, setLang]             = useState<LangCode>('en');
  const [recipes, setRecipes]       = useState<Recipe[]>([]);
  const [loading, setLoading]       = useState(true);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(0);
  const [saved, setSaved]           = useState<Set<string>>(new Set());

  // ── Filters (PRESERVED from original homepage logic) ──────────────────────
  const [category, setCategory]       = useState<Category | 'all'>('all');
  const [dietTags, setDietTags]       = useState<DietTag[]>([]);
  const [goal, setGoal]               = useState<Goal | null>(null);
  const [kcalMin, setKcalMin]         = useState(100);
  const [kcalMax, setKcalMax]         = useState(2500);
  const [searchQuery, setSearchQuery] = useState('');

  const supabase = createBrowserClient();

  // Language
  useEffect(() => { setLang(detectLanguage()); }, []);
  useEffect(() => {
    const h = (e: Event) => setLang((e as CustomEvent).detail);
    window.addEventListener('df:langchange', h);
    return () => window.removeEventListener('df:langchange', h);
  }, []);

  // Load saved recipes from LocalStorage (existing behaviour)
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem('df_saved_recipes') || '[]');
      setSaved(new Set(s));
    } catch (_) {}
  }, []);

  // ── Core fetch logic (PRESERVED — same PostgREST query as original) ────────
  const fetchRecipes = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('recipes')
        .select(
          'id, title, description, category, cached_macros, diet_tags, goal, fork_count, rating_avg, image_url, profiles(username, avatar_url)',
          { count: 'exact' }
        )
        .eq('status', 'published');

      if (category !== 'all') query = query.eq('category', category);
      if (goal) query = query.eq('goal', goal);
      if (dietTags.length > 0) query = query.overlaps('diet_tags', dietTags);
      if (kcalMin > 100) query = query.gte('cached_macros->>kcal', kcalMin);
      if (kcalMax < 2500) query = query.lte('cached_macros->>kcal', kcalMax);

      query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      query = query.order('created_at', { ascending: false });

      const { data, count, error } = await query;
      if (error) throw error;
      setRecipes(data ?? []);
      setTotal(count ?? 0);
    } catch (e) {
      console.error('Error fetching recipes:', e);
    } finally {
      setLoading(false);
    }
  }, [category, dietTags, goal, kcalMin, kcalMax, page, supabase]);

  useEffect(() => { fetchRecipes(); }, [fetchRecipes]);
  // Reset page on filter change
  useEffect(() => { setPage(0); }, [category, dietTags, goal, kcalMin, kcalMax]);

  // ── Toggle diet tag (PRESERVED) ───────────────────────────────────────────
  const toggleDietTag = (tag: DietTag) => {
    setDietTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  // ── Toggle save (PRESERVED — writes to LocalStorage + Supabase RPC) ───────
  const toggleSave = async (id: string) => {
    setSaved(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      try { localStorage.setItem('df_saved_recipes', JSON.stringify([...next])); } catch (_) {}
      return next;
    });
    try {
      await supabase.rpc('toggle_save_recipe', { p_recipe_id: id });
    } catch (_) {}
  };

  // ── Search redirect (PRESERVED — keyboard shortcut logic) ─────────────────
  const handleSearchKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  const t        = getTranslations(lang);
  const pageCount = Math.ceil(total / PAGE_SIZE);

  // ── Stars helper ──────────────────────────────────────────────────────────
  const renderStars = (avg: number | null) => {
    const rating = avg ?? 0;
    return (
      <span style={{ color: '#f59e0b', fontSize: '0.82rem' }}>
        {'★'.repeat(Math.round(rating))}{'☆'.repeat(5 - Math.round(rating))}
        <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>{rating > 0 ? rating.toFixed(1) : ''}</span>
      </span>
    );
  };

  return (
    <>
      {/* ── PAGE HERO ─────────────────────────────────────────────────────── */}
      <section className="page-hero">
        <div className="container">
          <h1>{t.recipes.pageTitle}</h1>
          <p>{t.recipes.pageSub}</p>
        </div>
      </section>

      {/* ── MAIN CONTENT ──────────────────────────────────────────────────── */}
      <section className="section-sm">
        <div className="container">

          {/* Search + Add button row */}
          <div className="flex-between flex-wrap gap-12 mb-24">
            <div className="input-wrap" style={{ maxWidth: 400, flex: 1 }}>
              <span className="input-icon">🔍</span>
              <input
                type="text"
                className="input"
                placeholder={t.recipes.searchPlaceholder}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKey}
              />
            </div>
            <div className="flex gap-8">
              <Link href="/search" className="btn btn-outline btn-sm">
                Advanced search
              </Link>
              <Link href="/recipes/new" className="btn btn-primary btn-sm">
                + {t.recipes.addRecipe}
              </Link>
            </div>
          </div>

          {/* ── Category filters ──────────────────────────────────────────── */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>
              Sort by category
            </div>
            <div className="filter-bar">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  className={`filter-chip${category === cat.value ? ' active' : ''}`}
                  onClick={() => setCategory(cat.value)}
                >
                  {cat.emoji} {cat.label.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* ── Diet tag filters ──────────────────────────────────────────── */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>
              Sort by tag
            </div>
            <div className="filter-bar">
              {DIET_TAGS.map(tag => (
                <button
                  key={tag.value}
                  className={`filter-chip${dietTags.includes(tag.value) ? ' active' : ''}`}
                  onClick={() => toggleDietTag(tag.value)}
                >
                  {tag.label.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* ── Goal filters ──────────────────────────────────────────────── */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>
              Goal
            </div>
            <div className="filter-bar">
              {GOALS.map(g => (
                <button
                  key={g.value}
                  className={`filter-chip${goal === g.value ? ' active' : ''}`}
                  onClick={() => setGoal(prev => prev === g.value ? null : g.value)}
                >
                  {g.label.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* ── Calorie range ─────────────────────────────────────────────── */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>
              Sort by calories
            </div>
            <div className="flex gap-16 items-center flex-wrap">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 200 }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {kcalMin} KCAL
                </span>
                <input
                  type="range" className="range-input"
                  min={100} max={2500} step={50}
                  value={kcalMin}
                  onChange={e => setKcalMin(Math.min(+e.target.value, kcalMax - 50))}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 200 }}>
                <input
                  type="range" className="range-input"
                  min={100} max={2500} step={50}
                  value={kcalMax}
                  onChange={e => setKcalMax(Math.max(+e.target.value, kcalMin + 50))}
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {kcalMax >= 2500 ? '2500+ KCAL' : `${kcalMax} KCAL`}
                </span>
              </div>
            </div>
          </div>

          {/* ── Result count ──────────────────────────────────────────────── */}
          {!loading && (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 20 }}>
              {total > 0
                ? `${total} recipe${total !== 1 ? 's' : ''} · page ${page + 1} of ${pageCount}`
                : t.recipes.noResults
              }
            </div>
          )}

          {/* ── Recipe grid ───────────────────────────────────────────────── */}
          {loading ? (
            <div className="recipe-grid">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="recipe-card">
                  <div className="skeleton" style={{ height: 196 }} />
                  <div className="card-body">
                    <div className="skeleton mb-8" style={{ height: 14, width: '80%' }} />
                    <div className="skeleton mb-8" style={{ height: 11 }} />
                    <div className="skeleton" style={{ height: 11, width: '60%' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : recipes.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🥗</div>
              <h3 className="empty-title">{t.recipes.noResults}</h3>
              <p className="empty-desc">{t.recipes.noResultsSub}</p>
              <button className="btn btn-primary" onClick={() => {
                setCategory('all'); setDietTags([]); setGoal(null);
                setKcalMin(100); setKcalMax(2500); setSearchQuery('');
              }}>
                Clear filters
              </button>
            </div>
          ) : (
            <div className="recipe-grid">
              {recipes.map(recipe => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  isSaved={saved.has(recipe.id)}
                  onSave={toggleSave}
                  renderStars={renderStars}
                  t={t.recipes}
                />
              ))}
            </div>
          )}

          {/* ── Pagination ────────────────────────────────────────────────── */}
          {pageCount > 1 && (
            <div className="pagination" style={{ marginTop: 40 }}>
              <button
                className={`page-btn${page === 0 ? ' disabled' : ''}`}
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                ←
              </button>
              {[...Array(Math.min(7, pageCount))].map((_, i) => {
                const pNum = page <= 3
                  ? i
                  : page >= pageCount - 4
                    ? pageCount - 7 + i
                    : page - 3 + i;
                if (pNum < 0 || pNum >= pageCount) return null;
                return (
                  <button
                    key={pNum}
                    className={`page-btn${page === pNum ? ' active' : ''}`}
                    onClick={() => setPage(pNum)}
                  >
                    {pNum + 1}
                  </button>
                );
              })}
              <button
                className={`page-btn${page === pageCount - 1 ? ' disabled' : ''}`}
                onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))}
                disabled={page === pageCount - 1}
              >
                →
              </button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

// ── Recipe Card component ─────────────────────────────────────────────────────
function RecipeCard({
  recipe, isSaved, onSave, renderStars, t,
}: {
  recipe: Recipe;
  isSaved: boolean;
  onSave: (id: string) => void;
  renderStars: (avg: number | null) => JSX.Element;
  t: any;
}) {
  const macros = recipe.cached_macros;

  return (
    <div className="recipe-card">
      {/* Thumbnail */}
      <div className="recipe-thumb">
        {recipe.image_url
          ? <img src={recipe.image_url} alt={recipe.title} loading="lazy" />
          : (
            <div className="recipe-thumb-emoji">
              {recipe.category === 'meat'   ? '🥩'
               : recipe.category === 'fish'  ? '🐟'
               : recipe.category === 'fruit' ? '🍎'
               : recipe.category === 'dairy' ? '🧀'
               : recipe.category === 'vegan' ? '🥗'
               : recipe.category === 'pasta' ? '🍝'
               : recipe.category === 'salad' ? '🥙'
               : '🍽️'}
            </div>
          )
        }

        {/* Badges */}
        <div className="recipe-thumb-badges">
          {recipe.category && (
            <span className={`tag tag-${recipe.category}`}>
              {recipe.category.toUpperCase()}
            </span>
          )}
          {recipe.goal && (
            <span className="badge badge-dark">{recipe.goal.toUpperCase()}</span>
          )}
        </div>

        {/* Save button */}
        <button
          className={`recipe-thumb-fav${isSaved ? ' saved' : ''}`}
          onClick={e => { e.stopPropagation(); onSave(recipe.id); }}
          title={isSaved ? 'Unsave' : 'Save recipe'}
        >
          {isSaved ? '♥' : '♡'}
        </button>
      </div>

      {/* Body */}
      <Link href={`/recipes/${recipe.id}`} style={{ display: 'contents' }}>
        <div className="recipe-body">
          <h3 className="recipe-title">{recipe.title}</h3>
          {recipe.description && (
            <p className="recipe-description">{recipe.description}</p>
          )}

          {/* Diet tags */}
          {recipe.diet_tags?.length > 0 && (
            <div className="flex flex-wrap gap-4 mb-8">
              {recipe.diet_tags.map(tag => (
                <span key={tag} className="badge badge-green">{tag}</span>
              ))}
            </div>
          )}

          <div className="recipe-meta">
            {macros?.kcal != null && (
              <div className="recipe-meta-item">
                🔥 <strong>{macros.kcal}</strong> {t.calories}
              </div>
            )}
            {macros?.protein_g != null && (
              <div className="recipe-meta-item">
                💪 <strong>{macros.protein_g}g</strong> {t.protein}
              </div>
            )}
            {recipe.fork_count > 0 && (
              <div className="recipe-meta-item">
                🔀 <strong>{recipe.fork_count}</strong>
              </div>
            )}
            {recipe.rating_avg != null && (
              <div className="recipe-meta-item">
                {renderStars(recipe.rating_avg)}
              </div>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
