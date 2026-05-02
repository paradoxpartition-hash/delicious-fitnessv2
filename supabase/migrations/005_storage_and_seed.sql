/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 *
 * Migration 005 — Storage buckets + seed data
 */

-- ─── STORAGE BUCKETS ──────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'recipe-images',
    'recipe-images',
    TRUE,
    5242880,
    ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/gif']
  ),
  (
    'avatars',
    'avatars',
    TRUE,
    2097152,
    ARRAY['image/jpeg','image/jpg','image/png','image/webp']
  ),
  (
    'blog-covers',
    'blog-covers',
    TRUE,
    8388608,
    ARRAY['image/jpeg','image/jpg','image/png','image/webp']
  )
ON CONFLICT (id) DO NOTHING;

-- ─── STORAGE RLS ─────────────────────────────────────────────────────────────
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

CREATE POLICY "blog_covers_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'blog-covers');

CREATE POLICY "blog_covers_write_admin"
  ON storage.objects FOR ALL
  USING (bucket_id = 'blog-covers' AND public.is_admin());

-- ─── SEED: WORKOUTS ───────────────────────────────────────────────────────────
INSERT INTO public.workouts (title, description, level, type, duration_min, goal, exercises) VALUES

('Full Body Strength Starter',
 'A beginner-friendly full body workout using basic compound movements.',
 'beginner', 'strength', 45, 'bulk',
 '[
   {"name":"Goblet Squat","sets":3,"reps":"12"},
   {"name":"Push-Up","sets":3,"reps":"10"},
   {"name":"Dumbbell Row","sets":3,"reps":"12 each"},
   {"name":"Hip Hinge (Romanian Deadlift)","sets":3,"reps":"10"},
   {"name":"Plank Hold","sets":3,"reps":"30 sec"}
 ]'),

('HIIT Fat Burner',
 '20-minute high intensity interval training session. No equipment needed.',
 'intermediate', 'hiit', 20, 'cut',
 '[
   {"name":"Jump Squat","sets":4,"reps":"40 sec on / 20 sec off"},
   {"name":"Mountain Climbers","sets":4,"reps":"40 sec on / 20 sec off"},
   {"name":"Burpee","sets":4,"reps":"40 sec on / 20 sec off"},
   {"name":"High Knees","sets":4,"reps":"40 sec on / 20 sec off"},
   {"name":"Push-Up to T","sets":4,"reps":"40 sec on / 20 sec off"}
 ]'),

('Upper Body Power',
 'Advanced upper body session targeting chest, back and shoulders.',
 'advanced', 'strength', 60, 'bulk',
 '[
   {"name":"Barbell Bench Press","sets":4,"reps":"5"},
   {"name":"Weighted Pull-Up","sets":4,"reps":"6"},
   {"name":"Overhead Press","sets":3,"reps":"8"},
   {"name":"Pendlay Row","sets":4,"reps":"6"},
   {"name":"Dips","sets":3,"reps":"10"},
   {"name":"Face Pull","sets":3,"reps":"15"}
 ]'),

('Morning Mobility Flow',
 'A gentle 30-minute morning flow to wake up your joints and reduce stiffness.',
 'beginner', 'mobility', 30, 'maintain',
 '[
   {"name":"Cat-Cow","sets":2,"reps":"10 slow breaths"},
   {"name":"World Greatest Stretch","sets":2,"reps":"5 each side"},
   {"name":"Hip 90-90 Stretch","sets":2,"reps":"60 sec each"},
   {"name":"Thoracic Rotation","sets":2,"reps":"8 each side"},
   {"name":"Deep Squat Hold","sets":2,"reps":"60 sec"},
   {"name":"Child Pose to Cobra","sets":2,"reps":"8"}
 ]'),

('Leg Day Hypertrophy',
 'High volume leg session focused on quad, hamstring and glute development.',
 'intermediate', 'strength', 70, 'bulk',
 '[
   {"name":"Back Squat","sets":4,"reps":"10"},
   {"name":"Romanian Deadlift","sets":4,"reps":"10"},
   {"name":"Leg Press","sets":3,"reps":"15"},
   {"name":"Walking Lunge","sets":3,"reps":"12 each"},
   {"name":"Leg Curl","sets":3,"reps":"12"},
   {"name":"Calf Raise","sets":4,"reps":"20"}
 ]'),

('30-Min Steady Cardio',
 'A moderate intensity cardio session — run, bike, or row at a sustainable pace.',
 'beginner', 'cardio', 30, 'cut',
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

('No Added Sugar 21 Days',
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
 'Follow a structured bulk for 60 days. Calorie surplus plus progressive overload. Log your meals and lifts weekly.',
 '🏋️', 60, 'bulk',
 CURRENT_DATE, CURRENT_DATE + 60),

('Veggie Week',
 'Eat plant-based for 7 days straight. Use our vegan recipe filter to find your meals. Community support included.',
 '🥦', 7, 'maintain',
 CURRENT_DATE, CURRENT_DATE + 7);

-- ─── NOTE: Blog posts and recipes require a user account ─────────────────────
-- Run supabase/seed/01_sample_recipes.sql AFTER creating your first user account
-- via the app or Supabase dashboard (Authentication → Users → Add user)
