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
import { detectLanguage, getTranslations, type LangCode } from '@/lib/i18n';

interface Recipe {
  id:               string;
  title:            string;
  description:      string | null;
  category:         string | null;
  goal:             string | null;
  diet_tags:        string[];
  cached_macros:    { kcal: number; protein_g: number; carbs_g: number; fat_g: number } | null;
  ingredients:      { name: string; amount: number; unit: string }[];
  steps:            { order: number; instruction: string }[];
  image_url:        string | null;
  fork_count:       number;
  rating_avg:       number | null;
  rating_count:     number;
  servings:         number;
  prep_time_min:    number | null;
  cook_time_min:    number | null;
  forked_from_id:   string | null;
  status:           string;
  created_at:       string;
  profiles:         { id: string; username: string; avatar_url: string | null } | null;
  translations:     Record<string, { title: string; description: string; steps: { order: number; instruction: string }[] }>;
}

interface Comment {
  id:         string;
  content:    string;
  created_at: string;
  profiles:   { username: string; avatar_url: string | null } | null;
}

export default function RecipeDetailPage() {
  const params     = useParams();
  const router     = useRouter();
  const id         = params.id as string;
  const supabase   = createBrowserClient();

  const [recipe, setRecipe]     = useState<Recipe | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saved, setSaved]       = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [lang, setLang]         = useState<LangCode>('en');

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

  // Fetch recipe + comments (PRESERVED from original)
  useEffect(() => {
    if (!id) return;
    setLoading(true);

    Promise.all([
      supabase
        .from('recipes')
        .select(`
          id, title, description, category, goal, diet_tags,
          cached_macros, ingredients, steps, image_url,
          fork_count, rating_avg, rating_count, servings,
          prep_time_min, cook_time_min, forked_from_id,
          status, created_at, translations,
          profiles(id, username, avatar_url)
        `)
        .eq('id', id)
        .single(),

      supabase
        .from('recipe_comments')
        .select('id, content, created_at, profiles(username, avatar_url)')
        .eq('recipe_id', id)
        .order('created_at', { ascending: false })
        .limit(20),
    ]).then(([{ data: r, error: rErr }, { data: c }]) => {
      if (rErr || !r) { router.push('/recipes'); return; }
      setRecipe(r as Recipe);
      setComments((c ?? []) as Comment[]);
      setLoading(false);
    });

    // Check saved state
    try {
      const s = JSON.parse(localStorage.getItem('df_saved_recipes') || '[]');
      setSaved(s.includes(id));
    } catch (_) {}
  }, [id]);

  // Toggle save (PRESERVED)
  const toggleSave = async () => {
    setSaved(prev => {
      const next = !prev;
      try {
        const s = JSON.parse(localStorage.getItem('df_saved_recipes') || '[]');
        const updated = next ? [...s, id] : s.filter((x: string) => x !== id);
        localStorage.setItem('df_saved_recipes', JSON.stringify(updated));
      } catch (_) {}
      return next;
    });
    try { await supabase.rpc('toggle_save_recipe', { p_recipe_id: id }); } catch (_) {}
  };

  // Fork recipe (PRESERVED)
  const handleFork = async () => {
    if (!currentUser) { router.push('/auth/signin?next=/recipes/' + id); return; }
    try {
      const { data, error } = await supabase.rpc('fork_recipe', { p_recipe_id: id });
      if (error) throw error;
      if (data) router.push(`/recipes/${data}/edit`);
    } catch (e: any) {
      alert(e.message ?? 'Fork failed');
    }
  };

  // Submit rating (PRESERVED)
  const submitRating = async (stars: number) => {
    if (!currentUser) { router.push('/auth/signin?next=/recipes/' + id); return; }
    setUserRating(stars);
    try {
      await supabase.rpc('upsert_recipe_rating', { p_recipe_id: id, p_rating: stars });
    } catch (_) {}
  };

  // Submit comment (PRESERVED)
  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) { router.push('/auth/signin?next=/recipes/' + id); return; }
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('recipe_comments')
        .insert({ recipe_id: id, content: commentText.trim() })
        .select('id, content, created_at, profiles(username, avatar_url)')
        .single();
      if (error) throw error;
      setComments(prev => [data as Comment, ...prev]);
      setCommentText('');
    } catch (_) {}
    setSubmitting(false);
  };

  const t = getTranslations(lang);

  // Use translation if available
  const displayTitle = recipe?.translations?.[lang]?.title ?? recipe?.title ?? '';
  const displayDesc  = recipe?.translations?.[lang]?.description ?? recipe?.description ?? '';
  const displaySteps = recipe?.translations?.[lang]?.steps ?? recipe?.steps ?? [];

  if (loading) {
    return (
      <section className="section">
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 48 }}>
            <div>
              <div className="skeleton mb-16" style={{ height: 400, borderRadius: 'var(--r-xl)' }} />
              <div className="skeleton mb-8" style={{ height: 32, width: '70%' }} />
              <div className="skeleton mb-8" style={{ height: 18 }} />
              <div className="skeleton" style={{ height: 18, width: '80%' }} />
            </div>
            <div>
              <div className="skeleton mb-12" style={{ height: 180, borderRadius: 'var(--r-lg)' }} />
              <div className="skeleton" style={{ height: 120, borderRadius: 'var(--r-lg)' }} />
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!recipe) return null;

  const totalTime = (recipe.prep_time_min ?? 0) + (recipe.cook_time_min ?? 0);
  const macros    = recipe.cached_macros;

  return (
    <>
      {/* Breadcrumb */}
      <div style={{ background: 'white', borderBottom: '1px solid var(--border)', padding: '12px 0' }}>
        <div className="container">
          <div className="flex gap-8 items-center" style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            <Link href="/" style={{ color: 'var(--text-muted)' }}>Home</Link>
            <span>›</span>
            <Link href="/recipes" style={{ color: 'var(--text-muted)' }}>Recipes</Link>
            <span>›</span>
            <span className="truncate" style={{ color: 'var(--text)', maxWidth: 280 }}>{displayTitle}</span>
          </div>
        </div>
      </div>

      <section className="section-sm">
        <div className="container">
          <div className="recipe-detail-layout">

            {/* ── LEFT: Main content ─────────────────────────────────────── */}
            <div>
              {/* Hero image */}
              <div className="recipe-detail-hero-img" style={{ marginBottom: 32 }}>
                {recipe.image_url
                  ? <img src={recipe.image_url} alt={displayTitle} />
                  : (
                    <span style={{ fontSize: '6rem' }}>
                      {recipe.category === 'meat'   ? '🥩'
                       : recipe.category === 'fish'  ? '🐟'
                       : recipe.category === 'fruit' ? '🍎'
                       : recipe.category === 'vegan' ? '🥗'
                       : recipe.category === 'pasta' ? '🍝'
                       : '🍽️'}
                    </span>
                  )
                }
              </div>

              {/* Title + actions */}
              <div className="flex-between flex-wrap gap-12 mb-16">
                <div>
                  {recipe.category && (
                    <span className={`tag tag-${recipe.category} mb-8`} style={{ display: 'inline-flex', marginBottom: 8 }}>
                      {recipe.category.toUpperCase()}
                    </span>
                  )}
                  <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', marginBottom: 8 }}>{displayTitle}</h1>
                  <div className="flex gap-12 items-center flex-wrap">
                    {recipe.profiles && (
                      <div className="flex gap-8 items-center">
                        <div className="avatar avatar-sm">
                          {recipe.profiles.avatar_url
                            ? <img src={recipe.profiles.avatar_url} alt="" />
                            : recipe.profiles.username[0].toUpperCase()
                          }
                        </div>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          by <strong>{recipe.profiles.username}</strong>
                        </span>
                      </div>
                    )}
                    {recipe.forked_from_id && (
                      <span className="badge badge-gray">🔀 Forked</span>
                    )}
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
                      {new Date(recipe.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex gap-8">
                  <button
                    className={`btn btn-outline btn-sm${saved ? '' : ''}`}
                    onClick={toggleSave}
                    style={saved ? { borderColor: 'var(--primary)', color: 'var(--primary)' } : {}}
                  >
                    {saved ? '♥ Saved' : '♡ Save'}
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={handleFork}>
                    🔀 Fork ({recipe.fork_count})
                  </button>
                  {currentUser?.id === recipe.profiles?.id && (
                    <Link href={`/recipes/${id}/edit`} className="btn btn-dark btn-sm">
                      ✏️ Edit
                    </Link>
                  )}
                </div>
              </div>

              {/* Description */}
              {displayDesc && (
                <p style={{ fontSize: '1rem', color: 'var(--text-muted)', lineHeight: 1.75, marginBottom: 28 }}>
                  {displayDesc}
                </p>
              )}

              {/* Diet tags */}
              {recipe.diet_tags?.length > 0 && (
                <div className="flex flex-wrap gap-6 mb-28">
                  {recipe.diet_tags.map(tag => (
                    <span key={tag} className="badge badge-green">{tag}</span>
                  ))}
                  {recipe.goal && <span className="badge badge-dark">{recipe.goal}</span>}
                </div>
              )}

              {/* Macro box */}
              {macros && (
                <div className="macro-box mb-32">
                  <div className="macro-item kcal">
                    <div className="macro-value">{macros.kcal}</div>
                    <div className="macro-label">kcal</div>
                  </div>
                  <div className="macro-item protein">
                    <div className="macro-value">{macros.protein_g}g</div>
                    <div className="macro-label">Protein</div>
                  </div>
                  <div className="macro-item carbs">
                    <div className="macro-value">{macros.carbs_g}g</div>
                    <div className="macro-label">Carbs</div>
                  </div>
                  <div className="macro-item fat">
                    <div className="macro-value">{macros.fat_g}g</div>
                    <div className="macro-label">Fat</div>
                  </div>
                </div>
              )}

              {/* Ingredients */}
              <div style={{ marginBottom: 40 }}>
                <h2 style={{ fontSize: '1.3rem', marginBottom: 16 }}>
                  Ingredients
                  {recipe.servings > 1 && (
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: 10 }}>
                      ({recipe.servings} servings)
                    </span>
                  )}
                </h2>
                <ul className="ingredients-list">
                  {recipe.ingredients?.map((ing, i) => (
                    <li key={i}>
                      <span className="ingredient-check">✓</span>
                      <span>
                        <strong>{ing.amount} {ing.unit}</strong> {ing.name}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Steps */}
              <div style={{ marginBottom: 40 }}>
                <h2 style={{ fontSize: '1.3rem', marginBottom: 16 }}>Instructions</h2>
                <ol className="steps-list">
                  {displaySteps
                    .sort((a, b) => a.order - b.order)
                    .map((step, i) => (
                      <li key={i}>
                        <div className="step-num" />
                        <span className="step-text">{step.instruction}</span>
                      </li>
                    ))
                  }
                </ol>
              </div>

              {/* Rating */}
              <div style={{
                background: 'white', border: '1px solid var(--border)',
                borderRadius: 'var(--r-lg)', padding: '24px', marginBottom: 32,
              }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: 6 }}>Rate this recipe</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16 }}>
                  {recipe.rating_avg
                    ? `${recipe.rating_avg.toFixed(1)} ★ from ${recipe.rating_count} ratings`
                    : 'No ratings yet'
                  }
                </p>
                <div className="star-rating" onMouseLeave={() => setHoverRating(0)}>
                  {[1,2,3,4,5].map(star => (
                    <span
                      key={star}
                      className={`star${(hoverRating || userRating) >= star ? ' filled' : ''}`}
                      onMouseEnter={() => setHoverRating(star)}
                      onClick={() => submitRating(star)}
                    >★</span>
                  ))}
                </div>
                {userRating > 0 && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--primary)', marginTop: 8 }}>
                    You rated this {userRating} star{userRating !== 1 ? 's' : ''}
                  </p>
                )}
              </div>

              {/* Comments */}
              <div>
                <h2 style={{ fontSize: '1.3rem', marginBottom: 20 }}>
                  Comments ({comments.length})
                </h2>

                {/* Comment form */}
                <form onSubmit={submitComment} style={{ marginBottom: 28 }}>
                  <div className="flex gap-12 items-start">
                    <div className="avatar avatar-md flex-shrink-0">
                      {currentUser ? currentUser.email?.[0].toUpperCase() : '?'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <textarea
                        className="input"
                        placeholder={currentUser ? 'Add a comment…' : 'Sign in to comment'}
                        value={commentText}
                        onChange={e => setCommentText(e.target.value)}
                        disabled={!currentUser}
                        rows={3}
                        style={{ resize: 'vertical', minHeight: 80 }}
                      />
                      {currentUser && (
                        <button
                          type="submit"
                          className={`btn btn-primary btn-sm${submitting ? ' btn-loading' : ''}`}
                          style={{ marginTop: 8 }}
                          disabled={submitting || !commentText.trim()}
                        >
                          {submitting ? '' : 'Post comment'}
                        </button>
                      )}
                    </div>
                  </div>
                </form>

                {/* Comment list */}
                {comments.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No comments yet. Be the first!</p>
                ) : (
                  comments.map(c => (
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
                            {new Date(c.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="comment-text">{c.content}</p>
                        <div className="comment-actions">
                          <button className="comment-action">👍 Like</button>
                          <button className="comment-action">↩ Reply</button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* ── RIGHT: Sidebar ─────────────────────────────────────────── */}
            <div style={{ position: 'sticky', top: 88 }}>
              {/* Quick stats card */}
              <div style={{
                background: 'white', border: '1px solid var(--border)',
                borderRadius: 'var(--r-lg)', padding: '20px', marginBottom: 16,
              }}>
                <h4 style={{ fontSize: '0.9rem', marginBottom: 14 }}>Recipe info</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { icon: '⏱️', label: 'Prep',      val: recipe.prep_time_min ? `${recipe.prep_time_min} min` : '—' },
                    { icon: '🔥', label: 'Cook',      val: recipe.cook_time_min ? `${recipe.cook_time_min} min` : '—' },
                    { icon: '⏰', label: 'Total',     val: totalTime ? `${totalTime} min` : '—' },
                    { icon: '🍽️', label: 'Servings',  val: recipe.servings ?? 1 },
                    { icon: '🔀', label: 'Forks',     val: recipe.fork_count },
                    { icon: '⭐', label: 'Rating',    val: recipe.rating_avg ? `${recipe.rating_avg.toFixed(1)} / 5` : 'No ratings' },
                  ].map(({ icon, label, val }) => (
                    <div key={label} className="flex-between" style={{ fontSize: '0.88rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>{icon} {label}</span>
                      <strong>{val}</strong>
                    </div>
                  ))}
                </div>
              </div>

              {/* Share card */}
              <div style={{
                background: 'white', border: '1px solid var(--border)',
                borderRadius: 'var(--r-lg)', padding: '20px', marginBottom: 16,
              }}>
                <h4 style={{ fontSize: '0.9rem', marginBottom: 14 }}>Share</h4>
                <div className="flex gap-8">
                  {['𝕏', 'in', 'WhatsApp'].map(s => (
                    <button key={s} className="btn btn-outline btn-sm" style={{ flex: 1, fontSize: '0.78rem' }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Author card */}
              {recipe.profiles && (
                <div style={{
                  background: 'white', border: '1px solid var(--border)',
                  borderRadius: 'var(--r-lg)', padding: '20px',
                }}>
                  <h4 style={{ fontSize: '0.9rem', marginBottom: 14 }}>Chef</h4>
                  <div className="flex gap-12 items-center mb-14">
                    <div className="avatar avatar-lg">
                      {recipe.profiles.avatar_url
                        ? <img src={recipe.profiles.avatar_url} alt="" />
                        : recipe.profiles.username[0].toUpperCase()
                      }
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{recipe.profiles.username}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Chef</div>
                    </div>
                  </div>
                  <button className="btn btn-outline w-full btn-sm">View profile</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
