/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 *
 * Edge Function: generate-meal-plan
 * Generates a personalised 7-day meal plan.
 * Uses Groq (free) as primary, Gemini Flash (free) as fallback.
 */
import { ok, err, handleOptions } from '../_shared/cors.ts';
import { getSupabaseUser, getSupabaseAdmin } from '../_shared/supabase.ts';

const GROQ_API_KEY   = Deno.env.get('GROQ_API_KEY')!;
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

type Goal = 'bulk' | 'cut' | 'maintain';
type Lang = 'en' | 'nl' | 'de' | 'fr' | 'es';

interface MealSlot {
  recipe_id:    string | null;
  recipe_title: string | null;
  kcal:         number | null;
  custom_label: string | null;
}

interface DayPlan {
  day:       number;
  day_name:  string;
  breakfast: MealSlot;
  lunch:     MealSlot;
  dinner:    MealSlot;
  snack:     MealSlot | null;
}

const MACRO_SPLITS: Record<Goal, { protein: number; carbs: number; fat: number }> = {
  bulk:     { protein: 0.30, carbs: 0.45, fat: 0.25 },
  cut:      { protein: 0.40, carbs: 0.30, fat: 0.30 },
  maintain: { protein: 0.30, carbs: 0.40, fat: 0.30 },
};

// ── Build the prompt ──────────────────────────────────────────────────────────
function buildPrompt(
  goal: Goal,
  target_kcal: number,
  recipeList: any[],
  mealKcal: Record<string, number>
): { system: string; user: string } {
  const split = MACRO_SPLITS[goal];

  const system = `You are a nutrition coach building structured weekly meal plans.
Respond with ONLY valid JSON — no markdown, no explanation, no extra text whatsoever.`;

  const user = `Create a 7-day meal plan:
- Goal: ${goal} (${goal === 'bulk' ? 'calorie surplus' : goal === 'cut' ? 'calorie deficit, high protein' : 'maintenance'})
- Daily target: ${target_kcal} kcal
- Protein: ${Math.round(target_kcal * split.protein / 4)}g | Carbs: ${Math.round(target_kcal * split.carbs / 4)}g | Fat: ${Math.round(target_kcal * split.fat / 9)}g
- Meal targets: breakfast ~${mealKcal.breakfast}, lunch ~${mealKcal.lunch}, dinner ~${mealKcal.dinner}, snack ~${mealKcal.snack} kcal

Available recipes (prefer these when kcal is within ±150 of target):
${JSON.stringify(recipeList.slice(0, 25))}

Return a JSON array of exactly 7 objects:
[{
  "day": 1,
  "day_name": "Monday",
  "breakfast": { "recipe_id": "<uuid or null>", "recipe_title": "<string or null>", "kcal": <number>, "custom_label": "<string if no recipe>" },
  "lunch":     { "recipe_id": "<uuid or null>", "recipe_title": "<string or null>", "kcal": <number>, "custom_label": "<string if no recipe>" },
  "dinner":    { "recipe_id": "<uuid or null>", "recipe_title": "<string or null>", "kcal": <number>, "custom_label": "<string if no recipe>" },
  "snack":     { "recipe_id": null, "recipe_title": null, "kcal": <number>, "custom_label": "<snack name>" }
}]

Rules: vary meals across days, total kcal within ±100 of ${target_kcal}, return ONLY the JSON array.`;

  return { system, user };
}

// ── Groq call ─────────────────────────────────────────────────────────────────
async function callGroq(system: string, user: string): Promise<string> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model:       'llama-3.3-70b-versatile',
      temperature: 0.4,
      max_tokens:  3000,
      messages:    [{ role: 'system', content: system }, { role: 'user', content: user }],
    }),
  });
  if (!res.ok) throw new Error(`Groq ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices[0].message.content as string;
}

// ── Gemini Flash call ─────────────────────────────────────────────────────────
async function callGemini(system: string, user: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${system}\n\n${user}` }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 3000 },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = await res.json();
  return data.candidates[0].content.parts[0].text as string;
}

// ── Parse LLM response into DayPlan[] ────────────────────────────────────────
function parseResponse(raw: string): DayPlan[] {
  const cleaned = raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim();

  // Find the JSON array even if there's surrounding text
  const match = cleaned.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('No JSON array found in response');

  const plan = JSON.parse(match[0]);
  if (!Array.isArray(plan) || plan.length !== 7) throw new Error('Invalid plan structure');
  return plan as DayPlan[];
}

// ── Enrich slots with real DB recipe data ────────────────────────────────────
function enrichSlot(slot: MealSlot, recipeMap: Map<string, any>): MealSlot {
  if (!slot?.recipe_id) return slot;
  const db = recipeMap.get(slot.recipe_id);
  if (!db) return { ...slot, recipe_id: null, recipe_title: null }; // hallucinated ID
  return { ...slot, recipe_title: db.title, kcal: db.cached_macros?.kcal ?? slot.kcal };
}

// ── Fallback plan when all LLMs fail ─────────────────────────────────────────
function buildFallbackPlan(mealKcal: Record<string, number>): DayPlan[] {
  const meals = {
    bulk: {
      breakfast: 'Oats with banana, protein powder and peanut butter',
      lunch:     'Chicken rice bowl with vegetables',
      dinner:    'Beef pasta with tomato sauce and parmesan',
      snack:     'Greek yogurt with granola and honey',
    },
    cut: {
      breakfast: 'Egg white omelette with spinach and feta',
      lunch:     'Tuna salad with mixed greens and olive oil',
      dinner:    'Baked salmon with broccoli and sweet potato',
      snack:     'Cottage cheese with cucumber slices',
    },
    maintain: {
      breakfast: 'Overnight oats with berries and chia seeds',
      lunch:     'Quinoa bowl with roasted vegetables and chickpeas',
      dinner:    'Grilled chicken with brown rice and asparagus',
      snack:     'Apple with almond butter',
    },
  };

  return DAYS.map((day_name, i) => ({
    day: i + 1,
    day_name,
    breakfast: { recipe_id: null, recipe_title: null, kcal: mealKcal.breakfast, custom_label: meals.maintain.breakfast },
    lunch:     { recipe_id: null, recipe_title: null, kcal: mealKcal.lunch,     custom_label: meals.maintain.lunch },
    dinner:    { recipe_id: null, recipe_title: null, kcal: mealKcal.dinner,    custom_label: meals.maintain.dinner },
    snack:     { recipe_id: null, recipe_title: null, kcal: mealKcal.snack,     custom_label: meals.maintain.snack },
  }));
}

// ── Main handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions();

  try {
    // Auth
    const supabaseUser = getSupabaseUser(req.headers.get('Authorization'));
    const { data: { user }, error: authErr } = await supabaseUser.auth.getUser();
    if (authErr || !user) return err('Unauthorized', 401);

    const {
      goal        = 'maintain',
      target_kcal = 2000,
      lang        = 'en',
    } = await req.json() as { goal?: Goal; target_kcal?: number; lang?: Lang };

    const supabaseAdmin = getSupabaseAdmin();

    // Fetch candidate recipes
    const { data: candidates } = await supabaseAdmin
      .from('recipes')
      .select('id, title, cached_macros, category, goal')
      .eq('status', 'published')
      .or(`goal.eq.${goal},goal.is.null`)
      .not('cached_macros', 'is', null)
      .limit(40);

    const recipeList = (candidates ?? [])
      .filter((r: any) => r.cached_macros?.kcal)
      .map((r: any) => ({ id: r.id, title: r.title, kcal: r.cached_macros.kcal, category: r.category }));

    const mealKcal = {
      breakfast: Math.round(target_kcal * 0.25),
      lunch:     Math.round(target_kcal * 0.35),
      dinner:    Math.round(target_kcal * 0.30),
      snack:     Math.round(target_kcal * 0.10),
    };

    const { system, user: userPrompt } = buildPrompt(goal, target_kcal, recipeList, mealKcal);

    // Try Groq → Gemini → fallback
    let plan: DayPlan[];
    let usedModel = 'fallback';

    if (GROQ_API_KEY) {
      try {
        const raw = await callGroq(system, userPrompt);
        plan = parseResponse(raw);
        usedModel = 'groq';
        console.log('[generate-meal-plan] ✓ Groq');
      } catch (e: any) {
        console.warn('[generate-meal-plan] Groq failed:', e.message);
        if (GEMINI_API_KEY) {
          try {
            const raw = await callGemini(system, userPrompt);
            plan = parseResponse(raw);
            usedModel = 'gemini';
            console.log('[generate-meal-plan] ✓ Gemini fallback');
          } catch (e2: any) {
            console.warn('[generate-meal-plan] Gemini failed:', e2.message);
            plan = buildFallbackPlan(mealKcal);
          }
        } else {
          plan = buildFallbackPlan(mealKcal);
        }
      }
    } else if (GEMINI_API_KEY) {
      try {
        const raw = await callGemini(system, userPrompt);
        plan = parseResponse(raw);
        usedModel = 'gemini';
      } catch (e: any) {
        console.warn('[generate-meal-plan] Gemini failed:', e.message);
        plan = buildFallbackPlan(mealKcal);
      }
    } else {
      console.warn('[generate-meal-plan] No AI key set — using fallback plan');
      plan = buildFallbackPlan(mealKcal);
    }

    // Enrich with real DB data
    const allIds = plan.flatMap(d =>
      [d.breakfast, d.lunch, d.dinner, d.snack]
        .map(s => s?.recipe_id)
        .filter(Boolean) as string[]
    );

    if (allIds.length > 0) {
      const { data: matched } = await supabaseAdmin
        .from('recipes')
        .select('id, title, cached_macros')
        .in('id', [...new Set(allIds)]);

      const recipeMap = new Map((matched ?? []).map((r: any) => [r.id, r]));

      plan = plan.map(day => ({
        ...day,
        breakfast: enrichSlot(day.breakfast, recipeMap),
        lunch:     enrichSlot(day.lunch,     recipeMap),
        dinner:    enrichSlot(day.dinner,    recipeMap),
        snack:     day.snack ? enrichSlot(day.snack, recipeMap) : null,
      }));
    }

    return ok({
      plan,
      goal,
      target_kcal,
      model:        usedModel,
      generated_at: new Date().toISOString(),
    });

  } catch (e: any) {
    console.error('[generate-meal-plan]', e);
    return err(e.message ?? 'Generation failed', 500);
  }
});
