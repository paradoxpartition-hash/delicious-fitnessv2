/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 *
 * Migration 005 — Storage buckets + seed data
 */

-- ─── STORAGE BUCKETS ──────────────────────────────────────────────────────────
-- Note: bucket creation via SQL requires the storage schema
-- Run these or create buckets in the Supabase dashboard

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'recipe-images',
    'recipe-images',
    TRUE,
    5242880, -- 5 MB
    ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/gif']
  ),
  (
    'avatars',
    'avatars',
    TRUE,
    2097152, -- 2 MB
    ARRAY['image/jpeg','image/jpg','image/png','image/webp']
  ),
  (
    'blog-covers',
    'blog-covers',
    TRUE,
    8388608, -- 8 MB
    ARRAY['image/jpeg','image/jpg','image/png','image/webp']
  )
ON CONFLICT (id) DO NOTHING;

-- ─── STORAGE RLS ─────────────────────────────────────────────────────────────
-- recipe-images: anyone can view, authenticated users can upload to their own folder
CREATE POLICY "recipe_images_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'recipe-images');

CREATE POLICY "recipe_images_insert_auth"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'recipe-images'
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

CREATE POLICY "recipe_images_update_own"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'recipe-images'
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

CREATE POLICY "recipe_images_delete_own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'recipe-images'
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

-- avatars
CREATE POLICY "avatars_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_insert_auth"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

CREATE POLICY "avatars_update_own"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

-- blog-covers: admin only for write
CREATE POLICY "blog_covers_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'blog-covers');

CREATE POLICY "blog_covers_write_admin"
  ON storage.objects FOR ALL
  USING (bucket_id = 'blog-covers' AND public.is_admin());

-- ─── SEED: WORKOUTS ───────────────────────────────────────────────────────────
INSERT INTO public.workouts (title, description, level, type, duration_min, goal, exercises) VALUES

('Full Body Strength Starter', 'A beginner-friendly full body workout using basic compound movements.', 'beginner', 'strength', 45, 'bulk',
'[
  {"name":"Goblet Squat","sets":3,"reps":"12"},
  {"name":"Push-Up","sets":3,"reps":"10"},
  {"name":"Dumbbell Row","sets":3,"reps":"12 each"},
  {"name":"Hip Hinge (Romanian Deadlift)","sets":3,"reps":"10"},
  {"name":"Plank Hold","sets":3,"reps":"30 sec"}
]'),

('HIIT Fat Burner', '20-minute high intensity interval training session. No equipment needed.', 'intermediate', 'hiit', 20, 'cut',
'[
  {"name":"Jump Squat","sets":4,"reps":"40 sec on / 20 sec off"},
  {"name":"Mountain Climbers","sets":4,"reps":"40 sec on / 20 sec off"},
  {"name":"Burpee","sets":4,"reps":"40 sec on / 20 sec off"},
  {"name":"High Knees","sets":4,"reps":"40 sec on / 20 sec off"},
  {"name":"Push-Up to T","sets":4,"reps":"40 sec on / 20 sec off"}
]'),

('Upper Body Power', 'Advanced upper body session targeting chest, back and shoulders.', 'advanced', 'strength', 60, 'bulk',
'[
  {"name":"Barbell Bench Press","sets":4,"reps":"5"},
  {"name":"Weighted Pull-Up","sets":4,"reps":"6"},
  {"name":"Overhead Press","sets":3,"reps":"8"},
  {"name":"Pendlay Row","sets":4,"reps":"6"},
  {"name":"Dips","sets":3,"reps":"10"},
  {"name":"Face Pull","sets":3,"reps":"15"}
]'),

('Morning Mobility Flow', 'A gentle 30-minute morning flow to wake up your joints and reduce stiffness.', 'beginner', 'mobility', 30, 'maintain',
'[
  {"name":"Cat-Cow","sets":2,"reps":"10 slow breaths"},
  {"name":"World''s Greatest Stretch","sets":2,"reps":"5 each side"},
  {"name":"Hip 90-90 Stretch","sets":2,"reps":"60 sec each"},
  {"name":"Thoracic Rotation","sets":2,"reps":"8 each side"},
  {"name":"Deep Squat Hold","sets":2,"reps":"60 sec"},
  {"name":"Child''s Pose to Cobra","sets":2,"reps":"8"}
]'),

('Leg Day Hypertrophy', 'High volume leg session focused on quad, hamstring and glute development.', 'intermediate', 'strength', 70, 'bulk',
'[
  {"name":"Back Squat","sets":4,"reps":"10"},
  {"name":"Romanian Deadlift","sets":4,"reps":"10"},
  {"name":"Leg Press","sets":3,"reps":"15"},
  {"name":"Walking Lunge","sets":3,"reps":"12 each"},
  {"name":"Leg Curl","sets":3,"reps":"12"},
  {"name":"Calf Raise","sets":4,"reps":"20"}
]'),

('30-Min Steady Cardio', 'A moderate intensity cardio session — run, bike, or row at a sustainable pace.', 'beginner', 'cardio', 30, 'cut',
'[
  {"name":"Warm-up walk / easy pace","sets":1,"reps":"5 min"},
  {"name":"Steady-state moderate pace","sets":1,"reps":"20 min"},
  {"name":"Cool-down walk","sets":1,"reps":"5 min"}
]');

-- ─── SEED: CHALLENGES ─────────────────────────────────────────────────────────
INSERT INTO public.challenges (title, description, icon, duration_days, goal, start_date, end_date) VALUES

('30-Day Protein Challenge',
 'Hit your daily protein target every single day for 30 days. Track each meal and share your meals in the community.',
 '💪', 30, 'bulk',
 CURRENT_DATE, CURRENT_DATE + 30),

('No Added Sugar — 21 Days',
 'Cut out all added sugars for 21 days. Whole fruit is fine. Discover how your body changes without the sweet stuff.',
 '🍎', 21, 'cut',
 CURRENT_DATE, CURRENT_DATE + 21),

('Cook 5 New Recipes',
 'Challenge yourself to cook 5 brand-new recipes from the platform in one week. Post your results to the community.',
 '🍽️', 7, 'maintain',
 CURRENT_DATE, CURRENT_DATE + 7),

('7-Day Hydration Reset',
 'Drink at least 2.5L of water every day for a week. Pair with your normal eating and notice the difference.',
 '💧', 7, 'maintain',
 CURRENT_DATE, CURRENT_DATE + 7),

('60-Day Bulk Program',
 'Follow a structured bulk for 60 days. Calorie surplus + progressive overload. Log your meals and lifts weekly.',
 '🏋️', 60, 'bulk',
 CURRENT_DATE, CURRENT_DATE + 60),

('Veggie Week',
 'Eat plant-based for 7 days straight. Use our vegan recipe filter to find your meals. Community support included.',
 '🥦', 7, 'maintain',
 CURRENT_DATE, CURRENT_DATE + 7);

-- ─── SEED: BLOG POSTS (stubs) ─────────────────────────────────────────────────
-- These are placeholder posts — replace content via the admin
INSERT INTO public.blog_posts (title, slug, excerpt, category, read_time, status, published_at, content) VALUES

('The Complete Guide to Tracking Macros',
 'complete-guide-tracking-macros',
 'Learn how to accurately track protein, carbs, and fat to hit your fitness goals — whether you''re bulking, cutting, or maintaining.',
 'nutrition', 8, 'published', now(),
 '<p>Tracking macronutrients is one of the most effective evidence-based approaches to managing body composition. Unlike calorie counting alone, tracking macros gives you precise control over protein intake — critical for muscle retention during a cut and muscle building during a bulk.</p><h2>Why macros matter</h2><p>Your body uses each macronutrient differently. Protein provides 4kcal/g and is the building block for muscle. Carbohydrates provide 4kcal/g and are your primary energy source. Fat provides 9kcal/g and supports hormones, brain function, and fat-soluble vitamin absorption.</p><h2>Setting your targets</h2><p>A simple starting point: multiply your bodyweight in kg by 2.0–2.4 for daily protein grams. Set fat at 0.8–1.0g per kg. Fill the rest of your calories with carbohydrates.</p>'),

('How We Auto-Translate Recipes to 5 Languages',
 'auto-translate-recipes-5-languages',
 'A deep dive into the AI pipeline we built to translate structured recipe data across English, Dutch, German, French, and Spanish.',
 'science', 6, 'published', now(),
 '<p>When we set out to make Delicious Fitness multilingual, we faced an unusual challenge: recipes aren''t just prose. They''re structured data with strict formatting requirements — ingredient amounts must stay numeric, cooking instructions must remain actionable, and terminology must be culinarily accurate.</p><h2>The pipeline</h2><p>We use DeepL for primary translation with an LLM post-processing step to handle culinary terminology. The translations are stored per-language in a JSONB column on the recipes table and community members can upvote or suggest corrections.</p>'),

('Bulking on a Budget: High Protein Meals Under €3',
 'bulking-budget-high-protein-meals',
 'You don''t need expensive supplements or fancy ingredients to build muscle. Here are our top high-protein budget meals.',
 'recipes', 5, 'published', now(),
 '<p>Building muscle on a budget is absolutely possible. The key is focusing on cost-per-gram-of-protein rather than cost per meal. Eggs, canned fish, legumes, and chicken thighs are your best friends.</p><h2>Top picks</h2><p>Canned tuna on rice with sriracha: ~35g protein, ~400kcal, roughly €1.50. Greek yogurt with oats and honey: ~25g protein, ~350kcal, under €1. Lentil and egg scramble: ~28g protein, ~380kcal, under €2.</p>'),

('Understanding the Glycaemic Index for Athletes',
 'glycaemic-index-athletes',
 'Does the GI of your carbohydrates actually matter if you''re training hard? The science is more nuanced than you think.',
 'science', 7, 'published', now(),
 '<p>The glycaemic index (GI) ranks carbohydrates by how quickly they raise blood glucose. High-GI foods spike glucose fast; low-GI foods release energy more gradually. For general health, low-GI is often recommended — but athletes have a more nuanced relationship with carbohydrate timing.</p><h2>Pre-workout</h2><p>Low-to-moderate GI carbs 2–3 hours before training provide sustained energy. Think oats, sweet potato, or brown rice. High-GI carbs immediately before training can cause an energy crash mid-session for some athletes.</p><h2>Post-workout</h2><p>Post-workout is the one time high-GI carbs make clear sense. Rapid glucose uptake combined with protein accelerates glycogen replenishment and muscle protein synthesis.</p>'),

('5 Dutch Recipes That Are Secretly High-Protein',
 'dutch-recipes-high-protein',
 'Traditional Dutch cuisine doesn''t have a reputation for being fitness-friendly — but these five classics can be adapted to pack serious protein.',
 'recipes', 4, 'published', now(),
 '<p>Dutch food is hearty, filling, and comforting. With a few smart swaps, it can also be macro-friendly. Here are five classics adapted for the gym.</p><h2>Stamppot with quark</h2><p>Replace the traditional butter with low-fat quark (Hüttenkäse) and serve with a lean rookworst. Protein jumps from 18g to 32g per serving.</p><h2>Erwtensoep (split pea soup)</h2><p>Already a protein powerhouse at 20g+ per bowl. Add an extra 100g of diced ham and you hit 30g easily. Pairs perfectly with a bulk goal.</p>');
