/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 *
 * Migration 006 — Scheduled jobs & automated chef stats refresh
 */

-- ─── ENABLE PG_CRON EXTENSION ────────────────────────────────────────────────
-- Requires pg_cron to be enabled in Supabase dashboard (Database → Extensions)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ─── SCHEDULED: REFRESH ALL CHEF STATS (nightly at 02:00 UTC) ────────────────
SELECT cron.schedule(
  'refresh-all-chef-stats',
  '0 2 * * *',  -- Every day at 02:00 UTC
  $$
    DO $$
    DECLARE r RECORD;
    BEGIN
      FOR r IN SELECT DISTINCT user_id FROM public.chef_profiles LOOP
        PERFORM public.refresh_chef_stats(r.user_id);
      END LOOP;
    END;
    $$;
  $$
);

-- ─── SCHEDULED: CLEAN UP STALE VIEWS (weekly, Sunday 03:00 UTC) ──────────────
SELECT cron.schedule(
  'cleanup-old-views',
  '0 3 * * 0',  -- Every Sunday at 03:00 UTC
  $$
    DELETE FROM public.recipe_views
    WHERE viewed_at < now() - INTERVAL '180 days';
  $$
);

-- ─── AUTO-REFRESH CHEF STATS ON RECIPE PUBLISH ───────────────────────────────
-- Trigger: whenever a recipe status changes to 'published' or away from it,
-- refresh the author's chef stats
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

-- ─── AUTO-PUBLISH BLOG POSTS ──────────────────────────────────────────────────
-- Set published_at when status changes to 'published'
CREATE OR REPLACE FUNCTION public.set_blog_published_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'published' AND OLD.status != 'published' THEN
    NEW.published_at = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER blog_set_published_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_blog_published_at();

-- ─── USEFUL VIEWS ────────────────────────────────────────────────────────────

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
  p.username AS author_username,
  p.avatar_url AS author_avatar
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

-- ─── FULL-TEXT SEARCH: MULTILINGUAL ───────────────────────────────────────────
-- Add a separate searchable column combining all translation content
ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS fts_all TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('simple',
      COALESCE(title, '') || ' ' ||
      COALESCE(description, '') || ' ' ||
      COALESCE(translations->>'nl', '') || ' ' ||
      COALESCE(translations->>'de', '') || ' ' ||
      COALESCE(translations->>'fr', '') || ' ' ||
      COALESCE(translations->>'es', '') || ' ' ||
      COALESCE(category::TEXT, '') || ' ' ||
      COALESCE(goal::TEXT, '')
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS recipes_fts_all_idx ON public.recipes USING GIN(fts_all);

-- ─── REALTIME PUBLICATIONS ───────────────────────────────────────────────────
-- Enable Supabase Realtime for community feed
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.recipe_comments;
