/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 *
 * Migration 006 — Scheduled jobs, views, realtime
 */

-- ─── ENABLE PG_CRON (if available) ───────────────────────────────────────────
-- Note: pg_cron must be enabled in Supabase dashboard under Database → Extensions
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ─── AUTO-PUBLISH BLOG POSTS ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_blog_published_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'published' AND (OLD.status IS NULL OR OLD.status != 'published') THEN
    NEW.published_at = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER blog_set_published_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_blog_published_at();

-- ─── AUTO-REFRESH CHEF STATS ON RECIPE STATUS CHANGE ─────────────────────────
CREATE OR REPLACE FUNCTION public.on_recipe_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public.refresh_chef_stats(NEW.author_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER recipe_status_changed
  AFTER UPDATE OF status ON public.recipes
  FOR EACH ROW EXECUTE FUNCTION public.on_recipe_status_change();

-- ─── ADD fts_all COLUMN (trigger-based, not generated) ───────────────────────
ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS fts_all TSVECTOR;

CREATE INDEX IF NOT EXISTS recipes_fts_all_idx ON public.recipes USING GIN(fts_all);

-- Trigger to keep fts_all up to date with translations
CREATE OR REPLACE FUNCTION public.recipes_fts_all_update()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.fts_all := to_tsvector('simple',
    COALESCE(NEW.title, '') || ' ' ||
    COALESCE(NEW.description, '') || ' ' ||
    COALESCE(NEW.translations->>'nl', '') || ' ' ||
    COALESCE(NEW.translations->>'de', '') || ' ' ||
    COALESCE(NEW.translations->>'fr', '') || ' ' ||
    COALESCE(NEW.translations->>'es', '') || ' ' ||
    COALESCE(NEW.category::TEXT, '') || ' ' ||
    COALESCE(NEW.goal::TEXT, '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER recipes_fts_all_trigger
  BEFORE INSERT OR UPDATE ON public.recipes
  FOR EACH ROW EXECUTE FUNCTION public.recipes_fts_all_update();

-- ─── USEFUL VIEWS ─────────────────────────────────────────────────────────────

-- Public recipe feed (used by homepage community section)
CREATE OR REPLACE VIEW public.v_recent_activity AS
SELECT
  rc.id,
  rc.content,
  rc.created_at,
  p.username,
  p.avatar_url,
  r.id    AS recipe_id,
  r.title AS recipe_title
FROM public.recipe_comments rc
JOIN public.profiles p ON p.id = rc.user_id
LEFT JOIN public.recipes r ON r.id = rc.recipe_id
WHERE rc.created_at > now() - INTERVAL '7 days'
ORDER BY rc.created_at DESC
LIMIT 50;

-- Top recipes by rating this month
CREATE OR REPLACE VIEW public.v_top_recipes_monthly AS
SELECT
  r.id,
  r.title,
  r.category,
  r.cached_macros,
  r.rating_avg,
  r.rating_count,
  r.fork_count,
  r.view_count,
  r.image_url,
  p.username    AS author_username,
  p.avatar_url  AS author_avatar
FROM public.recipes r
JOIN public.profiles p ON p.id = r.author_id
WHERE
  r.status = 'published'
  AND r.rating_avg IS NOT NULL
  AND r.updated_at > now() - INTERVAL '30 days'
ORDER BY r.rating_avg DESC, r.rating_count DESC
LIMIT 20;

-- Chef leaderboard
CREATE OR REPLACE VIEW public.v_chef_leaderboard AS
SELECT
  p.id,
  p.username,
  p.avatar_url,
  cp.verified,
  (cp.stats->>'total_views')::INT    AS total_views,
  (cp.stats->>'recipe_count')::INT   AS recipe_count,
  (cp.stats->>'avg_rating')::NUMERIC AS avg_rating
FROM public.chef_profiles cp
JOIN public.profiles p ON p.id = cp.user_id
ORDER BY (cp.stats->>'total_views')::INT DESC NULLS LAST
LIMIT 50;

-- ─── GRANT PERMISSIONS ON VIEWS ──────────────────────────────────────────────
GRANT SELECT ON public.v_recent_activity     TO anon, authenticated;
GRANT SELECT ON public.v_top_recipes_monthly TO anon, authenticated;
GRANT SELECT ON public.v_chef_leaderboard    TO anon, authenticated;

-- ─── REALTIME PUBLICATIONS ───────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.recipe_comments;
