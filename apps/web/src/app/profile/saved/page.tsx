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

interface SavedRecipe {
  id:           string;
  title:        string;
  category:     string | null;
  cached_macros: { kcal: number; protein_g: number } | null;
  image_url:    string | null;
}

const CATEGORY_EMOJI: Record<string, string> = {
  meat: '🥩', fish: '🐟', fruit: '🍎', dairy: '🧀',
  vegan: '🥗', pasta: '🍝', salad: '🥙', drinks: '🥤',
};

export default function SavedRecipesPage() {
  const [recipes, setRecipes] = useState<SavedRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createBrowserClient();
  const router   = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/auth/signin?next=/profile/saved'); return; }

      // PRESERVED: Fetch saved recipes via Supabase join
      const { data: saved } = await supabase
        .from('saved_recipes')
        .select('recipes(id, title, category, cached_macros, image_url)')
        .eq('user_id', data.user.id)
        .order('created_at', { ascending: false });

      const list = (saved ?? [])
        .map((s: any) => s.recipes)
        .filter(Boolean) as SavedRecipe[];

      // Sync with LocalStorage (PRESERVED)
      try {
        localStorage.setItem('df_saved_recipes', JSON.stringify(list.map(r => r.id)));
      } catch (_) {}

      setRecipes(list);
      setLoading(false);
    });
  }, []);

  const unsave = async (id: string) => {
    setRecipes(prev => prev.filter(r => r.id !== id));
    try {
      await supabase.rpc('toggle_save_recipe', { p_recipe_id: id });
      const s = JSON.parse(localStorage.getItem('df_saved_recipes') || '[]');
      localStorage.setItem('df_saved_recipes', JSON.stringify(s.filter((x: string) => x !== id)));
    } catch (_) {}
  };

  return (
    <>
      <section className="page-hero" style={{ paddingBlock: 48 }}>
        <div className="container">
          <h1>Saved recipes</h1>
          <p>Your personal recipe collection</p>
        </div>
      </section>

      <section className="section-sm">
        <div className="container">
          {loading ? (
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
          ) : recipes.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">♡</div>
              <h3 className="empty-title">No saved recipes yet</h3>
              <p className="empty-desc">Tap the heart icon on any recipe to save it here</p>
              <Link href="/recipes" className="btn btn-primary">Browse recipes</Link>
            </div>
          ) : (
            <>
              <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: '0.88rem' }}>
                {recipes.length} saved recipe{recipes.length !== 1 ? 's' : ''}
              </p>
              <div className="recipe-grid">
                {recipes.map(r => (
                  <div key={r.id} className="recipe-card">
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
                      <button
                        className="recipe-thumb-fav saved"
                        onClick={e => { e.stopPropagation(); unsave(r.id); }}
                        title="Unsave"
                      >♥</button>
                    </div>
                    <Link href={`/recipes/${r.id}`} style={{ display: 'contents' }}>
                      <div className="recipe-body">
                        <h3 className="recipe-title">{r.title}</h3>
                        <div className="recipe-meta">
                          {r.cached_macros?.kcal != null && (
                            <div className="recipe-meta-item">🔥 <strong>{r.cached_macros.kcal}</strong> kcal</div>
                          )}
                          {r.cached_macros?.protein_g != null && (
                            <div className="recipe-meta-item">💪 <strong>{r.cached_macros.protein_g}g</strong> protein</div>
                          )}
                        </div>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}
