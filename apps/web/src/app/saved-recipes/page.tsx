/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { createBrowserClient } from '@/lib/supabase/browser';

interface SavedRecipe {
  id:            string;
  title:         string;
  description:   string | null;
  category:      string | null;
  cached_macros: { kcal: number; protein_g: number; carbs_g: number; fat_g: number } | null;
  image_url:     string | null;
  diet_tags:     string[];
  rating_avg:    number | null;
  profiles:      { username: string } | null;
  inWeeklyPlan:  boolean;
}

const CATEGORY_EMOJI: Record<string, string> = {
  meat: '🥩', fish: '🐟', fruit: '🍎', dairy: '🧀',
  vegan: '🥗', pasta: '🍝', salad: '🥙', drinks: '🥤',
};

export default function SavedRecipesPage() {
  const router   = useRouter();
  const supabase = createBrowserClient();
  const { user, isLoggedIn, loading } = useAuth();

  const [recipes,   setRecipes]   = useState<SavedRecipe[]>([]);
  const [fetching,  setFetching]  = useState(true);
  const [filter,    setFilter]    = useState<'all' | 'in_plan' | 'not_in_plan'>('all');
  const [search,    setSearch]    = useState('');

  // Auth guard
  useEffect(() => {
    if (!loading && !isLoggedIn) router.push('/auth/signin?next=/saved-recipes');
  }, [loading, isLoggedIn]);

  useEffect(() => {
    if (!user?.id) return;
    loadSavedRecipes();
  }, [user?.id]);

  const loadSavedRecipes = async () => {
    setFetching(true);
    try {
      // Fetch saved recipes via relational join
      const { data: saved } = await supabase
        .from('saved_recipes')
        .select(`
          recipe_id,
          recipes (
            id, title, description, category,
            cached_macros, image_url, diet_tags,
            rating_avg, profiles(username)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Fetch current meal plan to check which recipes are in it
      const { data: mealPlan } = await supabase
        .from('meal_plans')
        .select('plan_data')
        .eq('user_id', user.id)
        .single();

      // Build set of recipe IDs in current weekly plan
      const planRecipeIds = new Set<string>();
      if (mealPlan?.plan_data) {
        (mealPlan.plan_data as any[]).forEach(day => {
          ['breakfast', 'lunch', 'dinner', 'snack'].forEach(slot => {
            const s = day[slot];
            if (s?.recipe_id) planRecipeIds.add(s.recipe_id);
          });
        });
      }

      const list: SavedRecipe[] = (saved ?? [])
        .map((s: any) => s.recipes)
        .filter(Boolean)
        .map((r: any) => ({
          ...r,
          inWeeklyPlan: planRecipeIds.has(r.id),
        }));

      setRecipes(list);

      // Sync LocalStorage
      try {
        localStorage.setItem('df_saved_recipes', JSON.stringify(list.map(r => r.id)));
      } catch (_) {}
    } catch (_) {}
    setFetching(false);
  };

  // Unsave a recipe
  const unsave = async (recipeId: string) => {
    setRecipes(prev => prev.filter(r => r.id !== recipeId));
    await supabase.rpc('toggle_save_recipe', { p_recipe_id: recipeId });
    try {
      const s = JSON.parse(localStorage.getItem('df_saved_recipes') || '[]');
      localStorage.setItem('df_saved_recipes', JSON.stringify(s.filter((id: string) => id !== recipeId)));
    } catch (_) {}
  };

  // Filtered + searched list
  const displayed = recipes.filter(r => {
    const matchesFilter =
      filter === 'all' ? true :
      filter === 'in_plan' ? r.inWeeklyPlan :
      !r.inWeeklyPlan;
    const matchesSearch = r.title.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (loading || fetching) {
    return (
      <section className="section-sm">
        <div className="container">
          <div className="recipe-grid">
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
                <div className="skeleton" style={{ height: 196 }} />
                <div style={{ padding: 18 }}>
                  <div className="skeleton mb-8" style={{ height: 14, width: '75%' }} />
                  <div className="skeleton" style={{ height: 11, width: '50%' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="page-hero" style={{ paddingBlock: 48 }}>
        <div className="container">
          <div className="flex-between flex-wrap gap-12">
            <div>
              <h1 style={{ marginBottom: 6 }}>Saved recipes</h1>
              <p>
                {recipes.length} saved · {recipes.filter(r => r.inWeeklyPlan).length} in your weekly plan
              </p>
            </div>
            <Link href="/dashboard" className="btn btn-outline"
              style={{ borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)' }}>
              ← Dashboard
            </Link>
          </div>
        </div>
      </section>

      <section className="section-sm">
        <div className="container">

          {/* Search + filters */}
          <div className="flex-between flex-wrap gap-12 mb-24">
            <div className="input-wrap" style={{ maxWidth: 320, flex: 1 }}>
              <span className="input-icon">🔍</span>
              <input type="text" className="input" placeholder="Search saved recipes…"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="flex gap-8">
              {[
                { key: 'all',        label: `All (${recipes.length})` },
                { key: 'in_plan',    label: `In plan (${recipes.filter(r => r.inWeeklyPlan).length})` },
                { key: 'not_in_plan',label: `Not in plan` },
              ].map(f => (
                <button key={f.key} className={`filter-chip${filter === f.key ? ' active' : ''}`}
                  onClick={() => setFilter(f.key as any)}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {displayed.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">♡</div>
              <h3 className="empty-title">
                {recipes.length === 0 ? 'No saved recipes yet' : 'No recipes match your filter'}
              </h3>
              <p className="empty-desc">
                {recipes.length === 0
                  ? 'Tap the heart icon on any recipe to save it here'
                  : 'Try changing your filter or search term'}
              </p>
              <Link href="/recipes" className="btn btn-primary">Browse recipes</Link>
            </div>
          ) : (
            <div className="recipe-grid">
              {displayed.map(r => (
                <div key={r.id} className="recipe-card" style={{ position: 'relative' }}>
                  {/* In weekly plan badge */}
                  {r.inWeeklyPlan && (
                    <div style={{
                      position: 'absolute', top: 12, left: 12, zIndex: 3,
                      background: 'var(--primary)', color: 'white',
                      borderRadius: 'var(--r-full)', padding: '3px 10px',
                      fontSize: '0.7rem', fontWeight: 700,
                    }}>
                      📅 In weekly plan
                    </div>
                  )}

                  {/* Unsave button */}
                  <button
                    className="recipe-thumb-fav saved"
                    onClick={e => { e.stopPropagation(); unsave(r.id); }}
                    title="Remove from saved"
                    style={{ zIndex: 4 }}
                  >
                    ♥
                  </button>

                  <div className="recipe-thumb">
                    {r.image_url
                      ? <img src={r.image_url} alt={r.title} loading="lazy" />
                      : <div className="recipe-thumb-emoji">{CATEGORY_EMOJI[r.category ?? ''] ?? '🍽️'}</div>
                    }
                    {r.category && (
                      <div className="recipe-thumb-badges" style={{ marginTop: r.inWeeklyPlan ? 36 : 0 }}>
                        <span className={`tag tag-${r.category}`}>{r.category.toUpperCase()}</span>
                      </div>
                    )}
                  </div>

                  <Link href={`/recipes/${r.id}`} style={{ display: 'contents' }}>
                    <div className="recipe-body">
                      <h3 className="recipe-title">{r.title}</h3>
                      {r.description && <p className="recipe-description">{r.description}</p>}

                      {/* Diet tags */}
                      {r.diet_tags?.length > 0 && (
                        <div className="flex flex-wrap gap-4 mb-8">
                          {r.diet_tags.map(tag => (
                            <span key={tag} className="badge badge-green">{tag}</span>
                          ))}
                        </div>
                      )}

                      {/* Macros */}
                      <div className="recipe-meta">
                        {r.cached_macros?.kcal != null && (
                          <div className="recipe-meta-item">🔥 <strong>{r.cached_macros.kcal}</strong> kcal</div>
                        )}
                        {r.cached_macros?.protein_g != null && (
                          <div className="recipe-meta-item">💪 <strong>{r.cached_macros.protein_g}g</strong> protein</div>
                        )}
                        {r.rating_avg != null && (
                          <div className="recipe-meta-item">⭐ {r.rating_avg.toFixed(1)}</div>
                        )}
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
