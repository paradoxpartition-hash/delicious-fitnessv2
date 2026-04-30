/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 *
 * Edge Function: translate-recipe
 * Translates a recipe's title, description, and steps to NL, DE, FR, ES.
 * Uses DeepL for primary translation, with Groq/LLM as fallback.
 * Stores results in recipes.translations JSONB column.
 */
import { ok, err, handleOptions } from '../_shared/cors.ts';
import { getSupabaseAdmin } from '../_shared/supabase.ts';

const DEEPL_API_KEY = Deno.env.get('DEEPL_API_KEY');
const GROQ_API_KEY  = Deno.env.get('GROQ_API_KEY');

const TARGET_LANGS = ['NL', 'DE', 'FR', 'ES'] as const;
type TargetLang = typeof TARGET_LANGS[number];

const LANG_NAMES: Record<TargetLang, string> = {
  NL: 'Dutch', DE: 'German', FR: 'French', ES: 'Spanish',
};

interface RecipeRow {
  id:          string;
  title:       string;
  description: string | null;
  steps:       { order: number; instruction: string }[];
  translations: Record<string, unknown>;
}

// ── DeepL translation ─────────────────────────────────────────────────────────
async function translateWithDeepl(texts: string[], targetLang: TargetLang): Promise<string[]> {
  const body = new URLSearchParams();
  texts.forEach(t => body.append('text', t));
  body.append('target_lang', targetLang);
  body.append('source_lang', 'EN');
  body.append('formality', 'default');

  const res = await fetch('https://api-free.deepl.com/v2/translate', {
    method:  'POST',
    headers: {
      'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`,
      'Content-Type':  'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!res.ok) throw new Error(`DeepL error: ${res.status} ${await res.text()}`);

  const data = await res.json();
  return data.translations.map((t: { text: string }) => t.text);
}

// ── Groq LLM fallback translation ────────────────────────────────────────────
async function translateWithGroq(texts: string[], targetLang: TargetLang): Promise<string[]> {
  const langName = LANG_NAMES[targetLang];
  const prompt = `Translate the following culinary texts from English to ${langName}.
Return ONLY a JSON array of translated strings, in the same order, with no extra commentary.
Preserve any numbers, measurements, and proper nouns.

Texts to translate:
${JSON.stringify(texts)}`;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      model:       'llama-3.3-70b-versatile',
      messages:    [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens:  2000,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) throw new Error(`Groq error: ${res.status}`);

  const data  = await res.json();
  const raw   = data.choices[0].message.content;
  const parsed = JSON.parse(raw);

  // Handle both { translations: [...] } and direct array
  return Array.isArray(parsed) ? parsed : (parsed.translations ?? parsed.texts ?? []);
}

async function translateTexts(texts: string[], targetLang: TargetLang): Promise<string[]> {
  if (DEEPL_API_KEY) {
    try {
      return await translateWithDeepl(texts, targetLang);
    } catch (e) {
      console.warn(`[translate-recipe] DeepL failed for ${targetLang}, falling back to Groq:`, e);
    }
  }
  if (GROQ_API_KEY) {
    return await translateWithGroq(texts, targetLang);
  }
  throw new Error('No translation service configured (DEEPL_API_KEY or GROQ_API_KEY required)');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions();

  try {
    const { recipe_id } = await req.json();
    if (!recipe_id) return err('Missing recipe_id');

    const supabase = getSupabaseAdmin();

    // ── Fetch recipe ─────────────────────────────────────────────────────────
    const { data: recipe, error: fetchErr } = await supabase
      .from('recipes')
      .select('id, title, description, steps, translations')
      .eq('id', recipe_id)
      .single<RecipeRow>();

    if (fetchErr || !recipe) return err('Recipe not found', 404);

    // ── Build text batch ──────────────────────────────────────────────────────
    // [0] = title, [1] = description, [2..N] = step instructions
    const textsToTranslate: string[] = [
      recipe.title,
      recipe.description ?? '',
      ...recipe.steps.map(s => s.instruction),
    ];

    const existingTranslations = recipe.translations ?? {};
    const updatedTranslations: Record<string, unknown> = { ...existingTranslations };

    // ── Translate to each target language ────────────────────────────────────
    for (const lang of TARGET_LANGS) {
      const langKey = lang.toLowerCase(); // 'nl', 'de', 'fr', 'es'

      try {
        console.log(`[translate-recipe] Translating ${recipe_id} to ${lang}…`);
        const translated = await translateTexts(textsToTranslate, lang);

        updatedTranslations[langKey] = {
          title:       translated[0] ?? recipe.title,
          description: translated[1] ?? recipe.description,
          steps:       recipe.steps.map((step, i) => ({
            order:       step.order,
            instruction: translated[i + 2] ?? step.instruction,
          })),
          translated_at: new Date().toISOString(),
          source:        DEEPL_API_KEY ? 'deepl' : 'groq',
        };
      } catch (langErr: any) {
        console.error(`[translate-recipe] Failed for ${lang}:`, langErr.message);
        // Continue with other languages even if one fails
      }
    }

    // ── Save translations ─────────────────────────────────────────────────────
    const { error: updateErr } = await supabase
      .from('recipes')
      .update({ translations: updatedTranslations })
      .eq('id', recipe_id);

    if (updateErr) throw updateErr;

    console.log(`[translate-recipe] Done for recipe ${recipe_id}`);
    return ok({
      recipe_id,
      languages_translated: Object.keys(updatedTranslations),
    });

  } catch (e: any) {
    console.error('[translate-recipe]', e);
    return err(e.message ?? 'Translation failed', 500);
  }
});
