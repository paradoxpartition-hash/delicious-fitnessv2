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
import { detectLanguage, type LangCode } from '@/lib/i18n';

interface MealSlot {
  recipe_id:    string | null;
  recipe_title: string | null;
  kcal:         number | null;
  custom_label: string | null;
}

interface DayPlan {
  day:        number;
  day_name:   string;
  breakfast:  MealSlot;
  lunch:      MealSlot;
  dinner:     MealSlot;
  snack:      MealSlot | null;
}

type Goal = 'bulk' | 'cut' | 'maintain';
type Calories = 1500 | 2000 | 2500 | 3000;

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEAL_SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
const SLOT_EMOJI: Record<string, string> = {
  breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍎',
};

export default function MealPlanPage() {
  const [lang, setLang]         = useState<LangCode>('en');
  const [plan, setPlan]         = useState<DayPlan[] | null>(null);
  const [loading, setLoading]   = useState(false);
  const [fetching, setFetching] = useState(true);
  const [goal, setGoal]         = useState<Goal>('maintain');
  const [calories, setCalories] = useState<Calories>(2000);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const supabase = createBrowserClient();
  const router   = useRouter();

  useEffect(() => { setLang(detectLanguage()); }, []);
  useEffect(() => {
    const h = (e: Event) => setLang((e as CustomEvent).detail);
    window.addEventListener('df:langchange', h);
    return () => window.removeEventListener('df:langchange', h);
  }, []);

  // Auth + fetch existing plan (PRESERVED)
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setCurrentUser(data.user);
      if (data.user) {
        const { data: existingPlan } = await supabase
          .from('meal_plans')
          .select('plan_data, goal, target_kcal')
          .eq('user_id', data.user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (existingPlan) {
          setPlan(existingPlan.plan_data);
          setGoal(existingPlan.goal ?? 'maintain');
          setCalories(existingPlan.target_kcal ?? 2000);
        }
      }
      setFetching(false);
    });
  }, []);

  // Generate AI meal plan (PRESERVED edge function call)
  const generatePlan = async () => {
    if (!currentUser) { router.push('/auth/signin?next=/meal-plan'); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-meal-plan', {
        body: { goal, target_kcal: calories, lang },
      });
      if (error) throw error;
      setPlan(data.plan);
      // Persist (PRESERVED)
      await supabase.from('meal_plans').upsert({
        user_id:    currentUser.id,
        plan_data:  data.plan,
        goal,
        target_kcal: calories,
      });
    } catch (e: any) {
      alert(e.message ?? 'Generation failed');
    }
    setLoading(false);
  };

  // Compute daily totals
  const getDayKcal = (day: DayPlan) =>
    [day.breakfast, day.lunch, day.dinner, day.snack]
      .reduce((sum, slot) => sum + (slot?.kcal ?? 0), 0);

  if (fetching) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
        <div className="skeleton" style={{ width: 200, height: 20 }} />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh', textAlign: 'center', padding: 24 }}>
        <div>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>🤖</div>
          <h2 style={{ marginBottom: 12 }}>AI Meal Planner</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
            Sign in to generate a personalised 7-day meal plan matched to your fitness goal.
          </p>
          <Link href="/auth/signin?next=/meal-plan" className="btn btn-primary btn-lg">
            Sign in to get started
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <h1>🤖 AI Meal Planner</h1>
          <p>Generate a personalised 7-day meal plan in seconds, matched to your goal and calorie target.</p>
        </div>
      </section>

      <section className="section-sm">
        <div className="container">

          {/* Generator controls */}
          <div style={{
            background: 'white', border: '1px solid var(--border)',
            borderRadius: 'var(--r-lg)', padding: '24px', marginBottom: 32,
          }}>
            <h3 style={{ marginBottom: 20, fontSize: '1.05rem' }}>Generate new plan</h3>
            <div className="flex gap-16 flex-wrap items-end">
              {/* Goal */}
              <div className="field" style={{ margin: 0, minWidth: 160 }}>
                <label className="field-label">Fitness goal</label>
                <select
                  className="select"
                  value={goal}
                  onChange={e => setGoal(e.target.value as Goal)}
                >
                  <option value="bulk">🏋️ Bulk</option>
                  <option value="cut">🔥 Cut</option>
                  <option value="maintain">⚖️ Maintain</option>
                </select>
              </div>

              {/* Calories */}
              <div className="field" style={{ margin: 0, minWidth: 200 }}>
                <label className="field-label">Daily calories</label>
                <select
                  className="select"
                  value={calories}
                  onChange={e => setCalories(+e.target.value as Calories)}
                >
                  <option value={1500}>1,500 kcal</option>
                  <option value={2000}>2,000 kcal</option>
                  <option value={2500}>2,500 kcal</option>
                  <option value={3000}>3,000 kcal</option>
                </select>
              </div>

              <button
                className={`btn btn-primary${loading ? ' btn-loading' : ''}`}
                style={{ height: 42 }}
                onClick={generatePlan}
                disabled={loading}
              >
                {loading ? '' : '✨ Generate plan'}
              </button>

              {plan && (
                <button className="btn btn-outline" onClick={() => setPlan(null)}>
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Meal plan grid */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 16, animation: 'spin 1s linear infinite', display: 'inline-block' }}>🤖</div>
              <p style={{ color: 'var(--text-muted)' }}>Generating your personalised meal plan…</p>
            </div>
          ) : plan ? (
            <>
              {/* Weekly summary */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))',
                gap: 12, marginBottom: 24,
              }}>
                {plan.map(day => (
                  <div key={day.day} style={{
                    background: 'white', border: '1px solid var(--border)',
                    borderRadius: 'var(--r)', padding: '12px 14px', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 4 }}>
                      {day.day_name.slice(0, 3)}
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}>
                      {getDayKcal(day).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>kcal</div>
                  </div>
                ))}
              </div>

              {/* Day cards */}
              <div className="meal-grid">
                {plan.map(day => (
                  <div key={day.day} className="meal-day-card">
                    <div className="meal-day-head">
                      <div className="meal-day-name">{day.day_name}</div>
                    </div>
                    {MEAL_SLOTS.map(slot => {
                      const mealSlot = day[slot as keyof DayPlan] as MealSlot | null;
                      if (!mealSlot) return null;
                      return (
                        <div key={slot} className="meal-slot">
                          <div className="meal-slot-label">{SLOT_EMOJI[slot]} {slot}</div>
                          {mealSlot.recipe_id ? (
                            <Link href={`/recipes/${mealSlot.recipe_id}`} className="meal-slot-name" style={{ color: 'var(--primary)', display: 'block' }}>
                              {mealSlot.recipe_title}
                            </Link>
                          ) : (
                            <div className="meal-slot-name">{mealSlot.custom_label ?? '—'}</div>
                          )}
                          {mealSlot.kcal && (
                            <div className="meal-slot-kcal">{mealSlot.kcal} kcal</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              <div style={{ textAlign: 'center', marginTop: 32 }}>
                <button className="btn btn-primary" onClick={generatePlan} disabled={loading}>
                  🔄 Regenerate
                </button>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 10 }}>
                  Plan is automatically saved to your profile
                </p>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">🥗</div>
              <h3 className="empty-title">No meal plan yet</h3>
              <p className="empty-desc">Set your goal and calories above, then click "Generate plan"</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
