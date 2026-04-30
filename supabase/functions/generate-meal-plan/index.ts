/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 *
 * Edge Function: generate-meal-plan
 * Generates a personalised 7-day meal plan using Groq Llama,
 * grounding recipe slots in actual published recipes from the database
 * where possible, falling back to custom labels for gaps.
 */
import { ok, err, handleOptions } from '../_shared/cors.ts';
import { getSupabaseUser, getSupabaseAdmin } from '../_shared/supabase.ts';

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')!;

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

// ── Macro targets by goal ─────────────────────────────────────────────────────
const MACRO_SPLITS: Record<Goal, { protein: number; carbs: number; fat: number }> = {
  bulk:     { protein: 0.30, carbs: 0.45, fat: 0.25 },
  cut:      { protein: 0.40, carbs: 0.30, fat: 0.30 },
  maintain: { protein: 0.30, carbs: 0.40, fat: 0.30 },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions();

  try {
    // ── Auth ──────────────────────────────────────────────────────────────
    const supabaseUser = getSupabaseUser(req.headers.get('Authorization'));
    const { data: { user }, error: authErr } = await supabaseUser.auth.getUser();
    if (authErr || !user) return err('Unauthorized', 401);

    const { goal = 'maintain', target_kcal = 2000, lang = 'en' } = await req.json() as {
      goal?: Goal;
      target_kcal?: number;
      lang?: Lang;
    };

    const supabaseAdmin = getSupabaseAdmin();
    const split = MACRO_SPLITS[goal];

    // ── Fetch candidate recipes from DB ───────────────────────────────────
    // Pull up to 40 published recipes that match the goal or are goal-agnostic
    const { data: candidates } = await supabaseAdmin
      .from('recipes')
      .select('id, title, cached_macros, category, goal, diet_tags')
      .eq('status', 'published')
      .or(`goal.eq.${goal},goal.is.null`)
      .not('cached_macros', 'is', null)
      .limit(40);

    // Build a compact recipe list for the LLM to reference
    const recipeList = (candidates ?? [])
      .filter(r => r.cached_macros?.kcal)
      .map(r => ({
        id:       r.id,
        title:    r.title,
        kcal:     r.cached_macros.kcal,
        category: r.category,
        goal:     r.goal,
      }));

    // ── Build the LLM prompt ──────────────────────────────────────────────
    const mealKcal = {
      breakfast: Math.round(target_kcal * 0.25),
      lunch:     Math.round(target_kcal * 0.35),
      dinner:    Math.round(target_kcal * 0.30),
      snack:     Math.round(target_kcal * 0.10),
    };

    const systemPrompt = `You are a nutrition coach building a structured weekly meal plan.
You MUST respond with ONLY valid JSON — no markdown, no explanation, no extra text.
Use the provided recipe list when possible. If no recipe fits a slot, set recipe_id to null and provide a custom_label instead.`;

    const userPrompt = `Create a 7-day meal plan for:
- Goal: ${goal} (${goal === 'bulk' ? 'calorie surplus, high carbs' : goal === 'cut' ? 'calorie deficit, high protein' : 'maintenance, balanced'})
- Daily target: ${target_kcal} kcal
- Protein: ${Math.round(target_kcal * split.protein / 4)}g | Carbs: ${Math.round(target_kcal * split.carbs / 4)}g | Fat: ${Math.round(target_kcal * split.fat / 9)}g

Meal kcal targets: breakfast ~${mealKcal.breakfast}, lunch ~${mealKcal.lunch}, dinner ~${mealKcal.dinner}, snack ~${mealKcal.snack}

Available recipes (use these when kcal is close to the target — within ±150kcal):
${JSON.stringify(recipeList.slice(0, 30), null, 2)}

Return a JSON array of 7 day objects. Each day:
{
  "day": <1-7>,
  "day_name": "<Monday..Sunday>",
  "breakfast": { "recipe_id": "<uuid or null>", "recipe_title": "<string or null>", "kcal": <number>, "custom_label": "<string if no recipe>" },
  "lunch":     { "recipe_id": "<uuid or null>", "recipe_title": "<string or null>", "kcal": <number>, "custom_label": "<string if no recipe>" },
  "dinner":    { "recipe_id": "<uuid or null>", "recipe_title": "<string or null>", "kcal": <number>, "custom_label": "<string if no recipe>" },
  "snack":     { "recipe_id": null, "recipe_title": null, "kcal": <number>, "custom_label": "<snack suggestion>" }
}

Rules:
- Vary meals across days (no repeated dinner 3+ times in a row)
- Prefer using recipe_id when available
- Total daily kcal should be within ±100 of ${target_kcal}
- Return ONLY the JSON array, nothing else`;

    // ── Call Groq ─────────────────────────────────────────────────────────
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        model:       'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userPrompt },
        ],
        temperature: 0.4,
        max_tokens:  3000,
      }),
    });

    if (!groqRes.ok) {
      const groqErr = await groqRes.text();
      throw new Error(`Groq API error ${groqRes.status}: ${groqErr}`);
    }

    const groqData = await groqRes.json();
    const rawContent = groqData.choices[0].message.content as string;

    // ── Parse and validate ────────────────────────────────────────────────
    let plan: DayPlan[];
    try {
      // Strip any accidental markdown code fences
      const cleaned = rawContent.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      plan = JSON.parse(cleaned);
      if (!Array.isArray(plan) || plan.length !== 7) {
        throw new Error('Invalid plan structure');
      }
    } catch (parseErr: any) {
      console.error('[generate-meal-plan] Parse error:', parseErr, '\nRaw:', rawContent);
      // Fallback: build a minimal valid plan
      plan = DAYS.map((day_name, i) => ({
        day: i + 1,
        day_name,
        breakfast: { recipe_id: null, recipe_title: null, kcal: mealKcal.breakfast, custom_label: 'Oats with banana and protein powder' },
        lunch:     { recipe_id: null, recipe_title: null, kcal: mealKcal.lunch,     custom_label: 'Chicken rice bowl with vegetables' },
        dinner:    { recipe_id: null, recipe_title: null, kcal: mealKcal.dinner,    custom_label: 'Salmon with sweet potato and broccoli' },
        snack:     { recipe_id: null, recipe_title: null, kcal: mealKcal.snack,     custom_label: 'Greek yogurt with mixed nuts' },
      }));
    }

    // ── Enrich with DB data for any matched recipe_ids ────────────────────
    const allRecipeIds = plan.flatMap(day =>
      [day.breakfast, day.lunch, day.dinner, day.snack]
        .map(slot => slot?.recipe_id)
        .filter(Boolean) as string[]
    );

    if (allRecipeIds.length > 0) {
      const { data: matchedRecipes } = await supabaseAdmin
        .from('recipes')
        .select('id, title, cached_macros')
        .in('id', [...new Set(allRecipeIds)]);

      const recipeMap = new Map(
        (matchedRecipes ?? []).map(r => [r.id, r])
      );

      // Correct any hallucinated recipe data with real DB values
      plan = plan.map(day => ({
        ...day,
        breakfast: enrichSlot(day.breakfast, recipeMap),
        lunch:     enrichSlot(day.lunch,     recipeMap),
        dinner:    enrichSlot(day.dinner,    recipeMap),
        snack:     day.snack ? enrichSlot(day.snack, recipeMap) : null,
      }));
    }

    return ok({ plan, goal, target_kcal, generated_at: new Date().toISOString() });

  } catch (e: any) {
    console.error('[generate-meal-plan]', e);
    return err(e.message ?? 'Generation failed', 500);
  }
});

function enrichSlot(
  slot: MealSlot,
  recipeMap: Map<string, { id: string; title: string; cached_macros: any }>
): MealSlot {
  if (!slot?.recipe_id) return slot;
  const dbRecipe = recipeMap.get(slot.recipe_id);
  if (!dbRecipe) {
    // LLM hallucinated a recipe_id — clear it
    return { ...slot, recipe_id: null, recipe_title: null };
  }
  return {
    ...slot,
    recipe_title: dbRecipe.title,
    kcal:         dbRecipe.cached_macros?.kcal ?? slot.kcal,
  };
}
