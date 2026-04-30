/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 *
 * Migration 003 — RPC functions
 */

-- ─── FORK RECIPE ─────────────────────────────────────────────────────────────
-- Creates a deep copy of a recipe under the calling user's account.
-- Returns the new recipe's UUID.
CREATE OR REPLACE FUNCTION public.fork_recipe(p_recipe_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id   UUID;
  v_new_id    UUID;
  v_recipe    public.recipes%ROWTYPE;
BEGIN
  -- Get calling user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Fetch original recipe
  SELECT * INTO v_recipe FROM public.recipes WHERE id = p_recipe_id AND status = 'published';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Recipe not found or not published';
  END IF;

  -- Prevent self-forking
  IF v_recipe.author_id = v_user_id THEN
    RAISE EXCEPTION 'Cannot fork your own recipe';
  END IF;

  -- Insert forked copy as draft
  INSERT INTO public.recipes (
    author_id, title, description, category, goal, diet_tags,
    servings, prep_time_min, cook_time_min, ingredients, steps,
    cached_macros, image_url, status, forked_from_id
  )
  VALUES (
    v_user_id,
    v_recipe.title || ' (fork)',
    v_recipe.description,
    v_recipe.category,
    v_recipe.goal,
    v_recipe.diet_tags,
    v_recipe.servings,
    v_recipe.prep_time_min,
    v_recipe.cook_time_min,
    v_recipe.ingredients,
    v_recipe.steps,
    v_recipe.cached_macros,
    v_recipe.image_url,
    'draft',
    p_recipe_id
  )
  RETURNING id INTO v_new_id;

  -- Increment fork_count on original
  UPDATE public.recipes SET fork_count = fork_count + 1 WHERE id = p_recipe_id;

  RETURN v_new_id;
END;
$$;

-- ─── TOGGLE SAVE RECIPE ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.toggle_save_recipe(p_recipe_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID;
  v_exists  BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.saved_recipes
    WHERE user_id = v_user_id AND recipe_id = p_recipe_id
  ) INTO v_exists;

  IF v_exists THEN
    DELETE FROM public.saved_recipes WHERE user_id = v_user_id AND recipe_id = p_recipe_id;
    UPDATE public.recipes SET save_count = GREATEST(0, save_count - 1) WHERE id = p_recipe_id;
    RETURN FALSE; -- unsaved
  ELSE
    INSERT INTO public.saved_recipes (user_id, recipe_id) VALUES (v_user_id, p_recipe_id)
    ON CONFLICT DO NOTHING;
    UPDATE public.recipes SET save_count = save_count + 1 WHERE id = p_recipe_id;
    RETURN TRUE; -- saved
  END IF;
END;
$$;

-- ─── UPSERT RECIPE RATING ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.upsert_recipe_rating(p_recipe_id UUID, p_rating SMALLINT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_rating NOT BETWEEN 1 AND 5 THEN RAISE EXCEPTION 'Rating must be 1-5'; END IF;

  INSERT INTO public.recipe_ratings (recipe_id, user_id, rating)
  VALUES (p_recipe_id, v_user_id, p_rating)
  ON CONFLICT (recipe_id, user_id)
  DO UPDATE SET rating = EXCLUDED.rating, updated_at = now();
  -- The refresh_recipe_rating trigger handles avg recalculation
END;
$$;

-- ─── LIKE / UNLIKE POST ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.like_post(p_post_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  INSERT INTO public.post_likes (post_id, user_id) VALUES (p_post_id, v_user_id)
  ON CONFLICT DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.unlike_post(p_post_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  DELETE FROM public.post_likes WHERE post_id = p_post_id AND user_id = v_user_id;
END;
$$;

-- ─── TRACK RECIPE VIEW ────────────────────────────────────────────────────────
-- Inserts a view only if the viewer hasn't viewed this recipe in the last hour
-- (prevents refresh-spam inflating counts)
CREATE OR REPLACE FUNCTION public.track_recipe_view(p_recipe_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_author_id UUID;
  v_viewer_id UUID;
  v_recent    BOOLEAN;
BEGIN
  v_viewer_id := auth.uid();

  SELECT author_id INTO v_author_id FROM public.recipes WHERE id = p_recipe_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- Don't count the author viewing their own recipe
  IF v_viewer_id = v_author_id THEN RETURN; END IF;

  -- Deduplicate within 1 hour per viewer (anonymous views always counted)
  IF v_viewer_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.recipe_views
      WHERE recipe_id = p_recipe_id
        AND viewer_id = v_viewer_id
        AND viewed_at > now() - INTERVAL '1 hour'
    ) INTO v_recent;
    IF v_recent THEN RETURN; END IF;
  END IF;

  INSERT INTO public.recipe_views (recipe_id, author_id, viewer_id)
  VALUES (p_recipe_id, v_author_id, v_viewer_id);
END;
$$;

-- ─── REFRESH CHEF STATS ───────────────────────────────────────────────────────
-- Call this after any significant chef data change or on a schedule
CREATE OR REPLACE FUNCTION public.refresh_chef_stats(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'recipe_count',     COUNT(DISTINCT r.id),
    'total_views',      COALESCE(SUM(r.view_count), 0),
    'total_forks',      COALESCE(SUM(r.fork_count), 0),
    'total_saves',      COALESCE(SUM(r.save_count), 0),
    'avg_rating',       ROUND(AVG(r.rating_avg)::NUMERIC, 2),
    'affiliate_clicks', COALESCE((
                          SELECT SUM(click_count)
                          FROM public.affiliate_links
                          WHERE chef_id = p_user_id
                        ), 0),
    'monthly_views',    COALESCE((
                          SELECT COUNT(*)
                          FROM public.recipe_views rv
                          JOIN public.recipes r2 ON r2.id = rv.recipe_id
                          WHERE r2.author_id = p_user_id
                            AND rv.viewed_at > now() - INTERVAL '30 days'
                        ), 0)
  )
  INTO v_stats
  FROM public.recipes r
  WHERE r.author_id = p_user_id AND r.status = 'published';

  UPDATE public.chef_profiles
  SET stats = COALESCE(v_stats, '{}'), updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;

-- ─── TRACK AFFILIATE CLICK ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.track_affiliate_click(p_link_id UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_url TEXT;
BEGIN
  UPDATE public.affiliate_links
  SET click_count = click_count + 1
  WHERE id = p_link_id AND active = TRUE
  RETURNING url INTO v_url;

  RETURN v_url;
END;
$$;

-- ─── GET RECIPE WITH USER CONTEXT ────────────────────────────────────────────
-- Returns a recipe with the current user's save/rating status
CREATE OR REPLACE FUNCTION public.get_recipe_with_context(p_recipe_id UUID)
RETURNS TABLE (
  id              UUID,
  title           TEXT,
  is_saved        BOOLEAN,
  user_rating     SMALLINT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  RETURN QUERY
  SELECT
    r.id,
    r.title,
    EXISTS(SELECT 1 FROM public.saved_recipes s WHERE s.recipe_id = r.id AND s.user_id = v_user_id),
    (SELECT rating FROM public.recipe_ratings rr WHERE rr.recipe_id = r.id AND rr.user_id = v_user_id)
  FROM public.recipes r
  WHERE r.id = p_recipe_id;
END;
$$;
