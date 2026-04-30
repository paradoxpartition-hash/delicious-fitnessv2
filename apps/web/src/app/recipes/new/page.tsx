/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/browser';

// ── Types (PRESERVED from original) ──────────────────────────────────────────
type Category = 'meat' | 'fish' | 'fruit' | 'dairy' | 'drinks' | 'vegan' | 'pasta' | 'salad';
type DietTag  = 'halal' | 'vegan' | 'kosher' | 'gluten-free';
type Goal     = 'bulk' | 'cut' | 'maintain';

interface Ingredient { name: string; amount: number; unit: string; }
interface Step       { order: number; instruction: string; }

const CATEGORIES: Category[] = ['meat','fish','fruit','dairy','drinks','vegan','pasta','salad'];
const DIET_TAGS:  DietTag[]  = ['halal','vegan','kosher','gluten-free'];
const GOALS:      Goal[]     = ['bulk','cut','maintain'];
const UNITS = ['g','ml','tbsp','tsp','cup','oz','lb','piece','slice','clove','handful'];

export default function NewRecipePage() {
  const router   = useRouter();
  const supabase = createBrowserClient();

  // Form state
  const [title, setTitle]           = useState('');
  const [description, setDesc]      = useState('');
  const [category, setCategory]     = useState<Category | ''>('');
  const [goal, setGoal]             = useState<Goal | ''>('');
  const [dietTags, setDietTags]     = useState<DietTag[]>([]);
  const [servings, setServings]     = useState(2);
  const [prepTime, setPrepTime]     = useState<number | ''>('');
  const [cookTime, setCookTime]     = useState<number | ''>('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { name: '', amount: 0, unit: 'g' },
  ]);
  const [steps, setSteps]           = useState<Step[]>([{ order: 1, instruction: '' }]);
  const [kcal, setKcal]             = useState<number | ''>('');
  const [protein, setProtein]       = useState<number | ''>('');
  const [carbs, setCarbs]           = useState<number | ''>('');
  const [fat, setFat]               = useState<number | ''>('');
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');
  const [imageFile, setImageFile]   = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Auth guard
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push('/auth/signin?next=/recipes/new');
    });
  }, []);

  // Image preview
  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = ev => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  // Ingredient helpers
  const addIngredient   = () => setIngredients(prev => [...prev, { name: '', amount: 0, unit: 'g' }]);
  const removeIngredient = (i: number) => setIngredients(prev => prev.filter((_, idx) => idx !== i));
  const updateIngredient = (i: number, field: keyof Ingredient, val: string | number) =>
    setIngredients(prev => prev.map((ing, idx) => idx === i ? { ...ing, [field]: val } : ing));

  // Step helpers
  const addStep    = () => setSteps(prev => [...prev, { order: prev.length + 1, instruction: '' }]);
  const removeStep = (i: number) => setSteps(prev => prev.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, order: idx + 1 })));
  const updateStep = (i: number, val: string) =>
    setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, instruction: val } : s));

  // Toggle diet tag
  const toggleTag = (tag: DietTag) =>
    setDietTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);

  // Save recipe (PRESERVED Supabase insert + storage upload logic)
  const handleSave = async (status: 'draft' | 'published') => {
    if (!title.trim()) { setError('Title is required'); return; }
    if (ingredients.filter(i => i.name.trim()).length === 0) { setError('Add at least one ingredient'); return; }
    if (steps.filter(s => s.instruction.trim()).length === 0) { setError('Add at least one step'); return; }

    setSaving(true); setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload image (PRESERVED storage logic)
      let imageUrl: string | null = null;
      if (imageFile) {
        const ext  = imageFile.name.split('.').pop();
        const path = `recipes/${user.id}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from('recipe-images').upload(path, imageFile);
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from('recipe-images').getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }

      // Build cached_macros (PRESERVED structure)
      const cached_macros = (kcal || protein || carbs || fat) ? {
        kcal:      Number(kcal)    || 0,
        protein_g: Number(protein) || 0,
        carbs_g:   Number(carbs)   || 0,
        fat_g:     Number(fat)     || 0,
      } : null;

      // Insert recipe (PRESERVED schema)
      const { data: recipe, error: insertErr } = await supabase
        .from('recipes')
        .insert({
          title:         title.trim(),
          description:   description.trim() || null,
          category:      category || null,
          goal:          goal || null,
          diet_tags:     dietTags,
          servings,
          prep_time_min: prepTime || null,
          cook_time_min: cookTime || null,
          ingredients:   ingredients.filter(i => i.name.trim()),
          steps:         steps.filter(s => s.instruction.trim()),
          cached_macros,
          image_url:     imageUrl,
          status,
          author_id:     user.id,
        })
        .select('id')
        .single();

      if (insertErr) throw insertErr;

      // Trigger translation edge function (PRESERVED async call)
      supabase.functions.invoke('translate-recipe', { body: { recipe_id: recipe.id } }).catch(() => {});

      router.push(status === 'published' ? `/recipes/${recipe.id}` : '/chef/dashboard');
    } catch (e: any) {
      setError(e.message ?? 'Failed to save recipe');
    }
    setSaving(false);
  };

  return (
    <>
      <section className="page-hero" style={{ paddingBlock: 48 }}>
        <div className="container">
          <div className="flex-between flex-wrap gap-16">
            <div>
              <h1 style={{ marginBottom: 6 }}>New recipe</h1>
              <p>Create a structured, macro-accurate recipe</p>
            </div>
            <div className="flex gap-8">
              <button className="btn btn-outline" onClick={() => router.back()}>Cancel</button>
              <button className="btn btn-outline" onClick={() => handleSave('draft')} disabled={saving}>Save draft</button>
              <button className={`btn btn-primary${saving ? ' btn-loading' : ''}`} onClick={() => handleSave('published')} disabled={saving}>
                {saving ? '' : 'Publish'}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="section-sm">
        <div className="container" style={{ maxWidth: 860, marginInline: 'auto' }}>
          {error && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: 'var(--r)', padding: '12px 16px',
              color: '#dc2626', fontSize: '0.88rem', marginBottom: 24,
            }}>{error}</div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 28, alignItems: 'start' }}>
            {/* ── LEFT: Main fields ─────────────────────────────────────── */}
            <div>
              {/* Basic info */}
              <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 24, marginBottom: 20 }}>
                <h3 style={{ fontSize: '1rem', marginBottom: 18 }}>Basic information</h3>

                <div className="field">
                  <label className="field-label">Recipe title *</label>
                  <input type="text" className="input" placeholder="e.g. High-protein chicken bowl" value={title} onChange={e => setTitle(e.target.value)} />
                </div>

                <div className="field">
                  <label className="field-label">Description</label>
                  <textarea className="input" placeholder="Short description of your recipe…" value={description} onChange={e => setDesc(e.target.value)} rows={3} />
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
                    <input type="number" className="input" placeholder="15" value={prepTime} onChange={e => setPrepTime(e.target.value ? +e.target.value : '')} min={0} />
                  </div>
                  <div className="field" style={{ margin: 0 }}>
                    <label className="field-label">Cook time (min)</label>
                    <input type="number" className="input" placeholder="30" value={cookTime} onChange={e => setCookTime(e.target.value ? +e.target.value : '')} min={0} />
                  </div>
                  <div className="field" style={{ margin: 0 }}>
                    <label className="field-label">Servings</label>
                    <input type="number" className="input" value={servings} onChange={e => setServings(+e.target.value)} min={1} max={20} />
                  </div>
                </div>

                {/* Diet tags */}
                <div style={{ marginTop: 16 }}>
                  <label className="field-label">Diet tags</label>
                  <div className="flex flex-wrap gap-8">
                    {DIET_TAGS.map(tag => (
                      <button
                        key={tag}
                        type="button"
                        className={`filter-chip${dietTags.includes(tag) ? ' active' : ''}`}
                        onClick={() => toggleTag(tag)}
                      >
                        {tag}
                      </button>
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
                      <input
                        type="text" className="input" placeholder="Ingredient name"
                        value={ing.name} onChange={e => updateIngredient(i, 'name', e.target.value)}
                      />
                      <input
                        type="number" className="input" placeholder="100"
                        value={ing.amount || ''} onChange={e => updateIngredient(i, 'amount', +e.target.value)}
                        min={0}
                      />
                      <select className="select" value={ing.unit} onChange={e => updateIngredient(i, 'unit', e.target.value)}>
                        {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                      <button
                        type="button"
                        onClick={() => removeIngredient(i)}
                        disabled={ingredients.length === 1}
                        style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', opacity: ingredients.length === 1 ? 0.3 : 1 }}
                      >×</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Steps */}
              <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 24, marginBottom: 20 }}>
                <div className="flex-between mb-16">
                  <h3 style={{ fontSize: '1rem', margin: 0 }}>Instructions</h3>
                  <button type="button" className="btn btn-outline btn-sm" onClick={addStep}>+ Add step</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {steps.map((step, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: '50%',
                        background: 'var(--primary)', color: 'white',
                        display: 'grid', placeItems: 'center',
                        fontSize: '0.82rem', fontWeight: 700, flexShrink: 0, marginTop: 6,
                      }}>{step.order}</div>
                      <textarea
                        className="input" placeholder={`Step ${step.order}…`}
                        value={step.instruction} onChange={e => updateStep(i, e.target.value)}
                        rows={2} style={{ flex: 1 }}
                      />
                      <button
                        type="button"
                        onClick={() => removeStep(i)}
                        disabled={steps.length === 1}
                        style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', opacity: steps.length === 1 ? 0.3 : 1, marginTop: 6 }}
                      >×</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── RIGHT: Sidebar ─────────────────────────────────────────── */}
            <div style={{ position: 'sticky', top: 88, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Image upload */}
              <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 20 }}>
                <h4 style={{ fontSize: '0.92rem', marginBottom: 14 }}>Recipe image</h4>
                <label style={{
                  display: 'block', cursor: 'pointer',
                  border: '2px dashed var(--border)', borderRadius: 'var(--r)',
                  overflow: 'hidden',
                  transition: 'border-color var(--duration) var(--ease)',
                }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'}
                >
                  {imagePreview
                    ? <img src={imagePreview} alt="" style={{ width: '100%', height: 180, objectFit: 'cover' }} />
                    : <div style={{ height: 140, display: 'grid', placeItems: 'center', textAlign: 'center', padding: 16 }}>
                        <div>
                          <div style={{ fontSize: '2rem', marginBottom: 8 }}>📷</div>
                          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Click to upload image</p>
                          <p style={{ fontSize: '0.74rem', color: 'var(--text-light)', marginTop: 4 }}>JPG, PNG, WebP · max 5MB</p>
                        </div>
                      </div>
                  }
                  <input type="file" accept="image/*" onChange={handleImage} style={{ display: 'none' }} />
                </label>
                {imagePreview && (
                  <button type="button" className="btn btn-ghost btn-sm w-full" style={{ marginTop: 8, color: '#dc2626' }} onClick={() => { setImageFile(null); setImagePreview(null); }}>
                    Remove image
                  </button>
                )}
              </div>

              {/* Macros */}
              <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 20 }}>
                <h4 style={{ fontSize: '0.92rem', marginBottom: 4 }}>Macros</h4>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 14 }}>Per serving · leave blank to calculate automatically</p>
                {[
                  { label: 'Calories (kcal)', val: kcal, set: setKcal, placeholder: '450' },
                  { label: 'Protein (g)',     val: protein, set: setProtein, placeholder: '42' },
                  { label: 'Carbs (g)',       val: carbs, set: setCarbs, placeholder: '38' },
                  { label: 'Fat (g)',         val: fat, set: setFat, placeholder: '12' },
                ].map(({ label, val, set, placeholder }) => (
                  <div key={label} className="field" style={{ marginBottom: 10 }}>
                    <label className="field-label" style={{ fontSize: '0.78rem' }}>{label}</label>
                    <input
                      type="number" className="input" placeholder={placeholder}
                      value={val} onChange={e => set(e.target.value ? +e.target.value : '')}
                      min={0} style={{ fontSize: '0.88rem' }}
                    />
                  </div>
                ))}
              </div>

              {/* Save actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  type="button"
                  className={`btn btn-primary w-full${saving ? ' btn-loading' : ''}`}
                  onClick={() => handleSave('published')}
                  disabled={saving}
                  style={{ height: 44 }}
                >
                  {saving ? '' : '🚀 Publish recipe'}
                </button>
                <button
                  type="button"
                  className="btn btn-outline w-full"
                  onClick={() => handleSave('draft')}
                  disabled={saving}
                >
                  💾 Save as draft
                </button>
              </div>

              <p style={{ fontSize: '0.74rem', color: 'var(--text-light)', textAlign: 'center' }}>
                Published recipes are auto-translated to 5 languages
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
