/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 *
 * Edge Function: translate-recipe
 * Translates recipes to NL, DE, FR, ES using Groq (free tier).
 * Fallback chain: Groq Llama 3.3 → Gemini Flash → OpenRouter
 */
import { ok, err, handleOptions } from '../_shared/cors.ts';
import { getSupabaseAdmin } from '../_shared/supabase.ts';

const GROQ_API_KEY       = Deno.env.get('GROQ_API_KEY');
const GEMINI_API_KEY     = Deno.env.get('GEMINI_API_KEY');
const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');

const TARGET_LANGS = ['nl', 'de', 'fr', 'es'] as const;
type TargetLang = typeof TARGET_LANGS[number];

const LANG_NAMES: Record<TargetLang, string> = {
  nl: 'Dutch',
  de: 'German',
  fr: 'French',
  es: 'Spanish',
};

interface RecipeRow {
  id:           string;
  title:        string;
  description:  string | null;
  steps:        { order: number; instruction: string }[];
  translations: Record<string, unknown>;
}

// ── Groq translation ──────────────────────────────────────────────────────────
async function translateWithGroq(texts: string[], targetLang: TargetLang): Promise<string[]> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      model:       'llama-3.3-70b-versatile',
      temperature: 0.1,
      max_tokens:  2500,
      messages: [
        {
          role: 'system',
          content: `You are a professional culinary translator. Translate the given texts from English to ${LANG_NAMES[targetLang]}.
Rules:
- Return ONLY a valid JSON array of translated strings, same order as input
- Preserve all numbers, measurements (g, ml, tbsp, etc.) and quantities exactly
- Keep cooking terms accurate and natural in the target language
- Do NOT add any explanation, markdown, or extra text — ONLY the JSON array`,
        },
        {
          role: 'user',
          content: JSON.stringify(texts),
        },
      ],
    }),
  });

  if (!res.ok) throw new Error(`Groq error ${res.status}: ${await res.text()}`);

  const data    = await res.json();
  const content = data.choices[0].message.content as string;

  // Strip any accidental markdown fences
  const cleaned = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
  const parsed  = JSON.parse(cleaned);

  return Array.isArray(parsed) ? parsed : Object.values(parsed);
}

// ── Gemini Flash fallback ────────────────────────────────────────────────────
async function translateWithGemini(texts: string[], targetLang: TargetLang): Promise<string[]> {
  const prompt = `Translate these culinary texts from English to ${LANG_NAMES[targetLang]}.
Return ONLY a JSON array of translated strings in the same order. No extra text.

${JSON.stringify(texts)}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 2500 },
      }),
    }
  );

  if (!res.ok) throw new Error(`Gemini error ${res.status}`);

  const data    = await res.json();
  const content = data.candidates[0].content.parts[0].text as string;
  const cleaned = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
  const parsed  = JSON.parse(cleaned);

  return Array.isArray(parsed) ? parsed : Object.values(parsed);
}

// ── OpenRouter fallback ──────────────────────────────────────────────────────
async function translateWithOpenRouter(texts: string[], targetLang: TargetLang): Promise<string[]> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type':  'application/json',
      'X-Title':       'Delicious Fitness',
    },
    body: JSON.stringify({
      model:       'mistralai/mistral-7b-instruct:free',
      temperature: 0.1,
      messages: [
        {
          role: 'user',
          content: `Translate these culinary texts from English to ${LANG_NAMES[targetLang]}.
Return ONLY a JSON array of translated strings, same order. No extra text.

${JSON.stringify(texts)}`,
        },
      ],
    }),
  });

  if (!res.ok) throw new Error(`OpenRouter error ${res.status}`);

  const data    = await res.json();
  const content = data.choices[0].message.content as string;
  const cleaned = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
  const parsed  = JSON.parse(cleaned);

  return Array.isArray(parsed) ? parsed : Object.values(parsed);
}

// ── Main translation function with fallback chain ────────────────────────────
async function translate(texts: string[], targetLang: TargetLang): Promise<{ translations: string[]; source: string }> {
  // 1. Groq (14,400 req/day free)
  if (GROQ_API_KEY) {
    try {
      const translations = await translateWithGroq(texts, targetLang);
      return { translations, source: 'groq' };
    } catch (e: any) {
      console.warn(`[translate-recipe] Groq failed for ${targetLang}:`, e.message);
    }
  }

  // 2. Gemini Flash (1,500 req/day free)
  if (GEMINI_API_KEY) {
    try {
      const translations = await translateWithGemini(texts, targetLang);
      return { translations, source: 'gemini' };
    } catch (e: any) {
      console.warn(`[translate-recipe] Gemini failed for ${targetLang}:`, e.message);
    }
  }

  // 3. OpenRouter free tier (50 req/day)
  if (OPENROUTER_API_KEY) {
    try {
      const translations = await translateWithOpenRouter(texts, targetLang);
      return { translations, source: 'openrouter' };
    } catch (e: any) {
      console.warn(`[translate-recipe] OpenRouter failed for ${targetLang}:`, e.message);
    }
  }

  throw new Error('All translation services failed. Set GROQ_API_KEY, GEMINI_API_KEY, or OPENROUTER_API_KEY.');
}

// ── Main handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions();

  try {
    const { recipe_id } = await req.json();
    if (!recipe_id) return err('Missing recipe_id');

    const supabase = getSupabaseAdmin();

    // Fetch recipe
    const { data: recipe, error: fetchErr } = await supabase
      .from('recipes')
      .select('id, title, description, steps, translations')
      .eq('id', recipe_id)
      .single<RecipeRow>();

    if (fetchErr || !recipe) return err('Recipe not found', 404);

    // Build text batch:
    // [0] title, [1] description, [2..N] step instructions
    const texts: string[] = [
      recipe.title,
      recipe.description ?? '',
      ...recipe.steps.map(s => s.instruction),
    ];

    const updatedTranslations: Record<string, unknown> = {
      ...(recipe.translations ?? {}),
    };

    // Translate to each language
    for (const lang of TARGET_LANGS) {
      try {
        console.log(`[translate-recipe] Translating ${recipe_id} → ${lang}…`);

        const { translations: translated, source } = await translate(texts, lang);

        updatedTranslations[lang] = {
          title:          translated[0] ?? recipe.title,
          description:    translated[1] ?? recipe.description,
          steps:          recipe.steps.map((step, i) => ({
            order:       step.order,
            instruction: translated[i + 2] ?? step.instruction,
          })),
          translated_at: new Date().toISOString(),
          source,
        };

        console.log(`[translate-recipe] ✓ ${lang} (${source})`);
      } catch (langErr: any) {
        console.error(`[translate-recipe] ✗ ${lang}:`, langErr.message);
        // Continue with remaining languages
      }
    }

    // Save to DB
    const { error: updateErr } = await supabase
      .from('recipes')
      .update({ translations: updatedTranslations })
      .eq('id', recipe_id);

    if (updateErr) throw updateErr;

    return ok({
      recipe_id,
      languages: Object.keys(updatedTranslations),
    });

  } catch (e: any) {
    console.error('[translate-recipe]', e);
    return err(e.message ?? 'Translation failed', 500);
  }
});
