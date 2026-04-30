/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 */
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/browser';

type Category = 'meat'|'fish'|'fruit'|'dairy'|'drinks'|'vegan'|'pasta'|'salad';
type DietTag  = 'halal'|'vegan'|'kosher'|'gluten-free';
type Goal     = 'bulk'|'cut'|'maintain';

interface Ingredient { name: string; amount: number; unit: string; }
interface Step       { order: number; instruction: string; }

const CATEGORIES: Category[] = ['meat','fish','fruit','dairy','drinks','vegan','pasta','salad'];
const DIET_TAGS:  DietTag[]  = ['halal','vegan','kosher','gluten-free'];
const GOALS:      Goal[]     = ['bulk','cut','maintain'];
const UNITS = ['g','ml','tbsp','tsp','cup','oz','lb','piece','slice','clove','handful'];

export default function EditRecipePage() {
  const params   = useParams();
  const router   = useRouter();
  const id       = params.id as string;
  const supabase = createBrowserClient();

  const [loading, setLoading]       = useState(true);
  const [saving,  setSaving]        = useState(false);
  const [error,   setError]         = useState('');
  const [title,   setTitle]         = useState('');
  const [description, setDesc]      = useState('');
  const [category, setCategory]     = useState<Category | ''>('');
  const [goal,     setGoal]         = useState<Goal | ''>('');
  const [dietTags, setDietTags]     = useState<DietTag[]>([]);
  const [servings, setServings]     = useState(2);
  const [prepTime, setPrepTime]     = useState<number | ''>('');
  const [cookTime, setCookTime]     = useState<number | ''>('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([{ name: '', amount: 0, unit: 'g' }]);
  const [steps,    setSteps]        = useState<Step[]>([{ order: 1, instruction: '' }]);
  const [kcal,     setKcal]         = useState<number | ''>('');
  const [protein,  setProtein]      = useState<number | ''>('');
  const [carbs,    setCarbs]        = useState<number | ''>('');
  const [fat,      setFat]          = useState<number | ''>('');
  const [imageUrl, setImageUrl]     = useState<string | null>(null);

  // Load recipe (PRESERVED)
  useEffect(() => {
    if (!id) return;
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/auth/signin'); return; }

      const { data: recipe, error: err } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', id)
        .eq('author_id', user.id)  // ownership check
        .single();

      if (err || !recipe) { router.push('/chef/dashboard'); return; }

      setTitle(recipe.title ?? '');
      setDesc(recipe.description ?? '');
      setCategory(recipe.category ?? '');
      setGoal(recipe.goal ?? '');
      setDietTags(recipe.diet_tags ?? []);
      setServings(recipe.servings ?? 2);
      setPrepTime(recipe.prep_time_min ?? '');
      setCookTime(recipe.cook_time_min ?? '');
      setIngredients(recipe.ingredients?.length ? recipe.ingredients : [{ name: '', amount: 0, unit: 'g' }]);
      setSteps(recipe.steps?.length ? recipe.steps.sort((a: Step, b: Step) => a.order - b.order) : [{ order: 1, instruction: '' }]);
      setKcal(recipe.cached_macros?.kcal ?? '');
      setProtein(recipe.cached_macros?.protein_g ?? '');
      setCarbs(recipe.cached_macros?.carbs_g ?? '');
      setFat(recipe.cached_macros?.fat_g ?? '');
      setImageUrl(recipe.image_url ?? null);
      setLoading(false);
    });
  }, [id]);

  const addIngredient    = () => setIngredients(p => [...p, { name: '', amount: 0, unit: 'g' }]);
  const removeIngredient = (i: number) => setIngredients(p => p.filter((_, idx) => idx !== i));
  const updateIngredient = (i: number, field: keyof Ingredient, val: string | number) =>
    setIngredients(p => p.map((ing, idx) => idx === i ? { ...ing, [field]: val } : ing));
  const addStep    = () => setSteps(p => [...p, { order: p.length + 1, instruction: '' }]);
  const removeStep = (i: number) => setSteps(p => p.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, order: idx + 1 })));
  const updateStep = (i: number, val: string) => setSteps(p => p.map((s, idx) => idx === i ? { ...s, instruction: val } : s));
  const toggleTag  = (tag: DietTag) => setDietTags(p => p.includes(tag) ? p.filter(t => t !== tag) : [...p, tag]);

  // Update recipe (PRESERVED)
  const handleUpdate = async (status: 'draft' | 'published') => {
    if (!title.trim()) { setError('Title is required'); return; }
    setSaving(true); setError('');
    try {
      const cached_macros = (kcal || protein || carbs || fat) ? {
        kcal: Number(kcal) || 0, protein_g: Number(protein) || 0,
        carbs_g: Number(carbs) || 0, fat_g: Number(fat) || 0,
      } : null;

      const { error: updateErr } = await supabase
        .from('recipes')
        .update({
          title: title.trim(), description: description.trim() || null,
          category: category || null, goal: goal || null, diet_tags: dietTags,
          servings, prep_time_min: prepTime || null, cook_time_min: cookTime || null,
          ingredients: ingredients.filter(i => i.name.trim()),
          steps: steps.filter(s => s.instruction.trim()),
          cached_macros, status, updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateErr) throw updateErr;

      // Re-trigger translation for updated content (PRESERVED)
      supabase.functions.invoke('translate-recipe', { body: { recipe_id: id } }).catch(() => {});

      router.push(`/recipes/${id}`);
    } catch (e: any) {
      setError(e.message ?? 'Update failed');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
        <div className="skeleton" style={{ width: 200, height: 20 }} />
      </div>
    );
  }

  return (
    <>
      <section className="page-hero" style={{ paddingBlock: 48 }}>
        <div className="container">
          <div className="flex-between flex-wrap gap-16">
            <div>
              <h1 style={{ marginBottom: 6 }}>Edit recipe</h1>
              <p style={{ color: 'rgba(255,255,255,0.6)' }}>Editing: {title}</p>
            </div>
            <div className="flex gap-8">
              <button className="btn btn-outline" onClick={() => router.back()} style={{ borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)' }}>Cancel</button>
              <button className="btn btn-outline" onClick={() => handleUpdate('draft')} disabled={saving} style={{ borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)' }}>Save draft</button>
              <button className={`btn btn-primary${saving ? ' btn-loading' : ''}`} onClick={() => handleUpdate('published')} disabled={saving}>
                {saving ? '' : 'Update & publish'}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="section-sm">
        <div className="container" style={{ maxWidth: 860, marginInline: 'auto' }}>
          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--r)', padding: '12px 16px', color: '#dc2626', fontSize: '0.88rem', marginBottom: 24 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, alignItems: 'start' }}>
            <div>
              {/* Basic info */}
              <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 24, marginBottom: 20 }}>
                <h3 style={{ fontSize: '1rem', marginBottom: 18 }}>Basic information</h3>
                <div className="field">
                  <label className="field-label">Recipe title *</label>
                  <input type="text" className="input" value={title} onChange={e => setTitle(e.target.value)} />
                </div>
                <div className="field">
                  <label className="field-label">Description</label>
                  <textarea className="input" value={description} onChange={e => setDesc(e.target.value)} rows={3} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="field" style={{ margin: 0 }}>
                    <label className="field-label">Category</label>
                    <select className="select" value={category} onChange={e => setCategory(e.target.value as Category)}>
                      <option value="">Select…</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                    </select>
                  </div>
                  <div className="field" style={{ margin: 0 }}>
                    <label className="field-label">Goal</label>
                    <select className="select" value={goal} onChange={e => setGoal(e.target.value as Goal)}>
                      <option value="">Select…</option>
                      {GOALS.map(g => <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>)}
                    </select>
                  </div>
                  <div className="field" style={{ margin: 0 }}>
                    <label className="field-label">Prep time (min)</label>
                    <input type="number" className="input" value={prepTime} onChange={e => setPrepTime(e.target.value ? +e.target.value : '')} min={0} />
                  </div>
                  <div className="field" style={{ margin: 0 }}>
                    <label className="field-label">Cook time (min)</label>
                    <input type="number" className="input" value={cookTime} onChange={e => setCookTime(e.target.value ? +e.target.value : '')} min={0} />
                  </div>
                  <div className="field" style={{ margin: 0 }}>
                    <label className="field-label">Servings</label>
                    <input type="number" className="input" value={servings} onChange={e => setServings(+e.target.value)} min={1} />
                  </div>
                </div>
                <div style={{ marginTop: 16 }}>
                  <label className="field-label">Diet tags</label>
                  <div className="flex flex-wrap gap-8">
                    {DIET_TAGS.map(tag => (
                      <button key={tag} type="button" className={`filter-chip${dietTags.includes(tag) ? ' active' : ''}`} onClick={() => toggleTag(tag)}>{tag}</button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Ingredients */}
              <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 24, marginBottom: 20 }}>
                <div className="flex-between mb-16">
                  <h3 style={{ fontSize: '1rem', margin: 0 }}>Ingredients</h3>
                  <button type="button" className="btn btn-outline btn-sm" onClick={addIngredient}>+ Add</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {ingredients.map((ing, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 90px 32px', gap: 8, alignItems: 'center' }}>
                      <input type="text" className="input" placeholder="Ingredient" value={ing.name} onChange={e => updateIngredient(i, 'name', e.target.value)} />
                      <input type="number" className="input" placeholder="100" value={ing.amount || ''} onChange={e => updateIngredient(i, 'amount', +e.target.value)} min={0} />
                      <select className="select" value={ing.unit} onChange={e => updateIngredient(i, 'unit', e.target.value)}>
                        {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                      <button type="button" onClick={() => removeIngredient(i)} disabled={ingredients.length === 1} style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', opacity: ingredients.length === 1 ? 0.3 : 1 }}>×</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Steps */}
              <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 24 }}>
                <div className="flex-between mb-16">
                  <h3 style={{ fontSize: '1rem', margin: 0 }}>Instructions</h3>
                  <button type="button" className="btn btn-outline btn-sm" onClick={addStep}>+ Add step</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {steps.map((step, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'grid', placeItems: 'center', fontSize: '0.82rem', fontWeight: 700, flexShrink: 0, marginTop: 6 }}>{step.order}</div>
                      <textarea className="input" placeholder={`Step ${step.order}…`} value={step.instruction} onChange={e => updateStep(i, e.target.value)} rows={2} style={{ flex: 1 }} />
                      <button type="button" onClick={() => removeStep(i)} disabled={steps.length === 1} style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', opacity: steps.length === 1 ? 0.3 : 1, marginTop: 6 }}>×</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div style={{ position: 'sticky', top: 88, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {imageUrl && (
                <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
                  <img src={imageUrl} alt="" style={{ width: '100%', height: 160, objectFit: 'cover' }} />
                </div>
              )}
              <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 20 }}>
                <h4 style={{ fontSize: '0.92rem', marginBottom: 14 }}>Macros (per serving)</h4>
                {[
                  { label: 'Calories (kcal)', val: kcal, set: setKcal },
                  { label: 'Protein (g)',     val: protein, set: setProtein },
                  { label: 'Carbs (g)',       val: carbs, set: setCarbs },
                  { label: 'Fat (g)',         val: fat, set: setFat },
                ].map(({ label, val, set }) => (
                  <div key={label} className="field" style={{ marginBottom: 10 }}>
                    <label className="field-label" style={{ fontSize: '0.78rem' }}>{label}</label>
                    <input type="number" className="input" value={val} onChange={e => set(e.target.value ? +e.target.value : '')} min={0} style={{ fontSize: '0.88rem' }} />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button className={`btn btn-primary w-full${saving ? ' btn-loading' : ''}`} onClick={() => handleUpdate('published')} disabled={saving} style={{ height: 44 }}>
                  {saving ? '' : '✅ Update recipe'}
                </button>
                <button className="btn btn-outline w-full" onClick={() => handleUpdate('draft')} disabled={saving}>
                  💾 Save as draft
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
