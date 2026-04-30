/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 *
 * Seed: Sample recipes for local development and demo
 * Run AFTER migrations: supabase db seed
 */

-- ─── DEMO CHEF USER ──────────────────────────────────────────────────────────
-- Insert a demo profile (auth user must exist first via Supabase Auth)
-- For local dev, create via: supabase auth signup demo@deliciousfitness.eu / demo1234
-- Then run this seed to promote to CHEF and add sample data.

DO $$
DECLARE
  v_demo_user_id UUID;
BEGIN
  -- Try to get the demo user
  SELECT id INTO v_demo_user_id
  FROM public.profiles
  WHERE username = 'demochef'
  LIMIT 1;

  -- If no demo user exists yet, skip (seed after creating the user)
  IF v_demo_user_id IS NULL THEN
    RAISE NOTICE 'No demochef user found — skipping recipe seed. Create a user first.';
    RETURN;
  END IF;

  -- Promote to CHEF
  UPDATE public.profiles SET role = 'CHEF' WHERE id = v_demo_user_id;

  -- Create chef profile
  INSERT INTO public.chef_profiles (user_id, verified, bio)
  VALUES (v_demo_user_id, TRUE, 'Fitness chef and nutrition coach. Creating macro-accurate recipes since 2020.')
  ON CONFLICT (user_id) DO NOTHING;

  -- ── RECIPE 1: High-Protein Chicken Bowl ──────────────────────────────────
  INSERT INTO public.recipes (
    author_id, title, description, category, goal, diet_tags,
    servings, prep_time_min, cook_time_min,
    ingredients, steps, cached_macros, status
  ) VALUES (
    v_demo_user_id,
    'High-Protein Chicken Rice Bowl',
    'A macro-balanced bowl packed with lean protein. Perfect for a post-workout meal or a clean bulk.',
    'meat', 'bulk', ARRAY['halal']::diet_tag[],
    2, 10, 25,
    '[
      {"name":"Chicken breast","amount":300,"unit":"g"},
      {"name":"Basmati rice (dry)","amount":160,"unit":"g"},
      {"name":"Broccoli florets","amount":200,"unit":"g"},
      {"name":"Olive oil","amount":15,"unit":"ml"},
      {"name":"Soy sauce","amount":20,"unit":"ml"},
      {"name":"Garlic cloves","amount":2,"unit":"piece"},
      {"name":"Ginger (fresh)","amount":5,"unit":"g"},
      {"name":"Sesame seeds","amount":5,"unit":"g"}
    ]',
    '[
      {"order":1,"instruction":"Cook the basmati rice according to package instructions. Season lightly with salt."},
      {"order":2,"instruction":"Cut the chicken breast into strips. Season with salt, pepper, and crushed garlic."},
      {"order":3,"instruction":"Heat olive oil in a wok or large pan over high heat. Stir-fry the chicken for 5-6 minutes until cooked through."},
      {"order":4,"instruction":"Add the broccoli to the pan and stir-fry for 3-4 minutes until tender-crisp."},
      {"order":5,"instruction":"Add soy sauce and grated ginger. Toss everything together for 1 minute."},
      {"order":6,"instruction":"Serve the chicken and broccoli over the rice. Top with sesame seeds."}
    ]',
    '{"kcal":520,"protein_g":48,"carbs_g":54,"fat_g":10}',
    'published'
  );

  -- ── RECIPE 2: Vegan Lentil Dal ────────────────────────────────────────────
  INSERT INTO public.recipes (
    author_id, title, description, category, goal, diet_tags,
    servings, prep_time_min, cook_time_min,
    ingredients, steps, cached_macros, status
  ) VALUES (
    v_demo_user_id,
    'Red Lentil Dal with Turmeric',
    'A warming, protein-rich vegan curry. High fibre, low fat, and incredibly cheap to make.',
    'vegan', 'maintain', ARRAY['vegan','halal','gluten-free']::diet_tag[],
    4, 10, 30,
    '[
      {"name":"Red lentils (dry)","amount":300,"unit":"g"},
      {"name":"Coconut milk (light)","amount":200,"unit":"ml"},
      {"name":"Chopped tomatoes (canned)","amount":400,"unit":"g"},
      {"name":"Onion","amount":1,"unit":"piece"},
      {"name":"Garlic cloves","amount":3,"unit":"piece"},
      {"name":"Ginger (fresh)","amount":10,"unit":"g"},
      {"name":"Turmeric","amount":5,"unit":"g"},
      {"name":"Cumin","amount":5,"unit":"g"},
      {"name":"Coriander (ground)","amount":5,"unit":"g"},
      {"name":"Coconut oil","amount":15,"unit":"ml"},
      {"name":"Vegetable stock","amount":500,"unit":"ml"}
    ]',
    '[
      {"order":1,"instruction":"Rinse the red lentils under cold water until water runs clear."},
      {"order":2,"instruction":"Dice the onion and fry in coconut oil over medium heat for 5 minutes until softened."},
      {"order":3,"instruction":"Add minced garlic and grated ginger. Cook for 1 minute until fragrant."},
      {"order":4,"instruction":"Add turmeric, cumin, and coriander. Stir for 30 seconds to bloom the spices."},
      {"order":5,"instruction":"Add lentils, chopped tomatoes, coconut milk, and vegetable stock. Stir to combine."},
      {"order":6,"instruction":"Bring to a boil, then reduce heat. Simmer for 20-25 minutes until lentils are soft and creamy."},
      {"order":7,"instruction":"Season with salt and pepper. Serve with rice or naan bread."}
    ]',
    '{"kcal":340,"protein_g":18,"carbs_g":48,"fat_g":8}',
    'published'
  );

  -- ── RECIPE 3: Salmon & Sweet Potato Cut Meal ──────────────────────────────
  INSERT INTO public.recipes (
    author_id, title, description, category, goal, diet_tags,
    servings, prep_time_min, cook_time_min,
    ingredients, steps, cached_macros, status
  ) VALUES (
    v_demo_user_id,
    'Baked Salmon with Sweet Potato Mash',
    'A clean-cut favourite. Omega-3-rich salmon paired with carotenoid-dense sweet potato. 420kcal, 38g protein.',
    'fish', 'cut', ARRAY['gluten-free']::diet_tag[],
    2, 10, 30,
    '[
      {"name":"Salmon fillet","amount":280,"unit":"g"},
      {"name":"Sweet potato","amount":300,"unit":"g"},
      {"name":"Asparagus spears","amount":150,"unit":"g"},
      {"name":"Olive oil","amount":10,"unit":"ml"},
      {"name":"Lemon","amount":1,"unit":"piece"},
      {"name":"Garlic powder","amount":3,"unit":"g"},
      {"name":"Paprika","amount":3,"unit":"g"},
      {"name":"Butter","amount":10,"unit":"g"}
    ]',
    '[
      {"order":1,"instruction":"Preheat oven to 200°C / 400°F. Peel and cube the sweet potato. Boil in salted water for 15-18 minutes until tender."},
      {"order":2,"instruction":"Pat the salmon dry. Rub with olive oil, garlic powder, paprika, salt and pepper."},
      {"order":3,"instruction":"Place salmon on a baking tray lined with parchment. Bake for 12-14 minutes until the flesh flakes easily."},
      {"order":4,"instruction":"Meanwhile, toss asparagus in olive oil and roast on a separate tray for 10-12 minutes."},
      {"order":5,"instruction":"Drain the sweet potato. Mash with butter, a squeeze of lemon juice, salt and pepper."},
      {"order":6,"instruction":"Plate the mash, add the salmon and asparagus. Finish with lemon zest."}
    ]',
    '{"kcal":420,"protein_g":38,"carbs_g":32,"fat_g":14}',
    'published'
  );

  -- ── RECIPE 4: Greek Yogurt Overnight Oats ────────────────────────────────
  INSERT INTO public.recipes (
    author_id, title, description, category, goal, diet_tags,
    servings, prep_time_min, cook_time_min,
    ingredients, steps, cached_macros, status
  ) VALUES (
    v_demo_user_id,
    'High-Protein Overnight Oats',
    'Prep the night before. 30g protein breakfast ready in the morning — no cooking required.',
    'dairy', 'maintain', ARRAY['vegetarian','gluten-free']::diet_tag[],
    1, 5, 0,
    '[
      {"name":"Rolled oats","amount":80,"unit":"g"},
      {"name":"Greek yogurt (0% fat)","amount":150,"unit":"g"},
      {"name":"Milk (skimmed)","amount":100,"unit":"ml"},
      {"name":"Vanilla protein powder","amount":30,"unit":"g"},
      {"name":"Banana","amount":1,"unit":"piece"},
      {"name":"Frozen blueberries","amount":60,"unit":"g"},
      {"name":"Chia seeds","amount":10,"unit":"g"},
      {"name":"Honey","amount":10,"unit":"g"}
    ]',
    '[
      {"order":1,"instruction":"Add oats, protein powder, chia seeds, and a pinch of salt to a jar or bowl. Mix the dry ingredients."},
      {"order":2,"instruction":"Add Greek yogurt, milk, and honey. Stir well until fully combined."},
      {"order":3,"instruction":"Slice half the banana and stir into the mixture. Place the rest on top."},
      {"order":4,"instruction":"Cover and refrigerate overnight (minimum 6 hours)."},
      {"order":5,"instruction":"In the morning, top with frozen blueberries (they thaw overnight). Add a drizzle of honey if desired."}
    ]',
    '{"kcal":490,"protein_g":30,"carbs_g":68,"fat_g":8}',
    'published'
  );

  -- ── RECIPE 5: Pasta Bolognese (Bulk) ─────────────────────────────────────
  INSERT INTO public.recipes (
    author_id, title, description, category, goal, diet_tags,
    servings, prep_time_min, cook_time_min,
    ingredients, steps, cached_macros, status
  ) VALUES (
    v_demo_user_id,
    'Lean Beef Bolognese',
    'The classic bulk meal. Using 5% fat mince keeps calories controlled while delivering a massive protein hit.',
    'pasta', 'bulk', '{}'::diet_tag[],
    4, 10, 45,
    '[
      {"name":"Dried penne pasta","amount":320,"unit":"g"},
      {"name":"Lean beef mince (5% fat)","amount":500,"unit":"g"},
      {"name":"Chopped tomatoes (canned)","amount":800,"unit":"g"},
      {"name":"Onion","amount":1,"unit":"piece"},
      {"name":"Carrot","amount":1,"unit":"piece"},
      {"name":"Celery stalk","amount":2,"unit":"piece"},
      {"name":"Garlic cloves","amount":4,"unit":"piece"},
      {"name":"Tomato purée","amount":30,"unit":"g"},
      {"name":"Beef stock","amount":200,"unit":"ml"},
      {"name":"Olive oil","amount":15,"unit":"ml"},
      {"name":"Parmesan (grated)","amount":40,"unit":"g"}
    ]',
    '[
      {"order":1,"instruction":"Finely dice the onion, carrot, and celery. This soffritto base is key to depth of flavour."},
      {"order":2,"instruction":"Heat olive oil in a large heavy pan. Cook the soffritto over medium-low heat for 8-10 minutes until soft."},
      {"order":3,"instruction":"Add minced garlic and cook for 1 minute. Turn heat to high and add the beef mince."},
      {"order":4,"instruction":"Brown the mince thoroughly, breaking up any lumps, about 8 minutes."},
      {"order":5,"instruction":"Add tomato purée and cook for 2 minutes. Add chopped tomatoes and beef stock."},
      {"order":6,"instruction":"Bring to a boil, reduce heat to low. Simmer uncovered for 30 minutes, stirring occasionally."},
      {"order":7,"instruction":"Cook pasta according to package instructions. Reserve 100ml pasta water before draining."},
      {"order":8,"instruction":"Toss pasta with bolognese sauce, adding pasta water to loosen if needed. Finish with Parmesan."}
    ]',
    '{"kcal":620,"protein_g":46,"carbs_g":72,"fat_g":14}',
    'published'
  );

  RAISE NOTICE 'Seed complete — 5 sample recipes inserted for demochef';
END;
$$;
