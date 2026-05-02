/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 *
 * Migration 001 — Core schema
 */

-- ─── EXTENSIONS ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- ─── CUSTOM TYPES ─────────────────────────────────────────────────────────────
CREATE TYPE recipe_status   AS ENUM ('draft', 'published', 'archived');
CREATE TYPE recipe_category AS ENUM ('meat','fish','fruit','dairy','drinks','vegan','pasta','salad');
CREATE TYPE recipe_goal     AS ENUM ('bulk','cut','maintain');
CREATE TYPE diet_tag        AS ENUM ('halal','vegan','kosher','gluten-free');
CREATE TYPE user_role       AS ENUM ('USER','CHEF','MODERATOR','ADMIN');

-- ─── PROFILES ─────────────────────────────────────────────────────────────────
CREATE TABLE public.profiles (
  id            UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username      TEXT        NOT NULL UNIQUE,
  avatar_url    TEXT,
  bio           TEXT,
  role          user_role   NOT NULL DEFAULT 'USER',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT username_length CHECK (char_length(username) BETWEEN 2 AND 32),
  CONSTRAINT username_format CHECK (username ~ '^[a-z0-9_]+$')
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      LOWER(REGEXP_REPLACE(SPLIT_PART(NEW.email, '@', 1), '[^a-z0-9]', '_', 'g'))
    ),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── RECIPES ──────────────────────────────────────────────────────────────────
CREATE TABLE public.recipes (
  id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id       UUID            NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title           TEXT            NOT NULL,
  description     TEXT,
  category        recipe_category,
  goal            recipe_goal,
  diet_tags       diet_tag[]      NOT NULL DEFAULT '{}',
  servings        SMALLINT        NOT NULL DEFAULT 1 CHECK (servings > 0),
  prep_time_min   SMALLINT        CHECK (prep_time_min >= 0),
  cook_time_min   SMALLINT        CHECK (cook_time_min >= 0),
  ingredients     JSONB           NOT NULL DEFAULT '[]',
  steps           JSONB           NOT NULL DEFAULT '[]',
  cached_macros   JSONB,
  image_url       TEXT,
  status          recipe_status   NOT NULL DEFAULT 'draft',
  forked_from_id  UUID            REFERENCES public.recipes(id) ON DELETE SET NULL,
  fork_count      INT             NOT NULL DEFAULT 0 CHECK (fork_count >= 0),
  view_count      INT             NOT NULL DEFAULT 0 CHECK (view_count >= 0),
  save_count      INT             NOT NULL DEFAULT 0 CHECK (save_count >= 0),
  rating_avg      NUMERIC(3,2)    CHECK (rating_avg BETWEEN 1 AND 5),
  rating_count    INT             NOT NULL DEFAULT 0 CHECK (rating_count >= 0),
  translations    JSONB           NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
  -- Full-text search vector — populated by trigger below
  fts             TSVECTOR
);

CREATE INDEX recipes_author_idx    ON public.recipes(author_id);
CREATE INDEX recipes_status_idx    ON public.recipes(status);
CREATE INDEX recipes_category_idx  ON public.recipes(category);
CREATE INDEX recipes_goal_idx      ON public.recipes(goal);
CREATE INDEX recipes_fts_idx       ON public.recipes USING GIN(fts);
CREATE INDEX recipes_diet_tags_idx ON public.recipes USING GIN(diet_tags);
CREATE INDEX recipes_created_idx   ON public.recipes(created_at DESC);
CREATE INDEX recipes_rating_idx    ON public.recipes(rating_avg DESC NULLS LAST);

-- Trigger to keep fts column up to date
CREATE OR REPLACE FUNCTION public.recipes_fts_update()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.fts := to_tsvector('english',
    COALESCE(NEW.title, '') || ' ' ||
    COALESCE(NEW.description, '') || ' ' ||
    COALESCE(NEW.category::TEXT, '') || ' ' ||
    COALESCE(NEW.goal::TEXT, '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER recipes_fts_trigger
  BEFORE INSERT OR UPDATE ON public.recipes
  FOR EACH ROW EXECUTE FUNCTION public.recipes_fts_update();

CREATE TRIGGER recipes_updated_at
  BEFORE UPDATE ON public.recipes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── RECIPE RATINGS ───────────────────────────────────────────────────────────
CREATE TABLE public.recipe_ratings (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id   UUID        NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating      SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (recipe_id, user_id)
);

CREATE INDEX recipe_ratings_recipe_idx ON public.recipe_ratings(recipe_id);
CREATE INDEX recipe_ratings_user_idx   ON public.recipe_ratings(user_id);

CREATE TRIGGER recipe_ratings_updated_at
  BEFORE UPDATE ON public.recipe_ratings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-recalculate rating_avg
CREATE OR REPLACE FUNCTION public.refresh_recipe_rating()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_recipe_id UUID;
BEGIN
  v_recipe_id := COALESCE(NEW.recipe_id, OLD.recipe_id);
  UPDATE public.recipes SET
    rating_avg   = (SELECT AVG(rating)::NUMERIC(3,2) FROM public.recipe_ratings WHERE recipe_id = v_recipe_id),
    rating_count = (SELECT COUNT(*)                  FROM public.recipe_ratings WHERE recipe_id = v_recipe_id)
  WHERE id = v_recipe_id;
  RETURN NULL;
END;
$$;

CREATE TRIGGER refresh_rating_on_change
  AFTER INSERT OR UPDATE OR DELETE ON public.recipe_ratings
  FOR EACH ROW EXECUTE FUNCTION public.refresh_recipe_rating();

-- ─── RECIPE COMMENTS ─────────────────────────────────────────────────────────
CREATE TABLE public.recipe_comments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id   UUID        NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content     TEXT        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  parent_id   UUID        REFERENCES public.recipe_comments(id) ON DELETE CASCADE,
  like_count  INT         NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX recipe_comments_recipe_idx  ON public.recipe_comments(recipe_id);
CREATE INDEX recipe_comments_user_idx    ON public.recipe_comments(user_id);
CREATE INDEX recipe_comments_created_idx ON public.recipe_comments(created_at DESC);

CREATE TRIGGER recipe_comments_updated_at
  BEFORE UPDATE ON public.recipe_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── SAVED RECIPES ────────────────────────────────────────────────────────────
CREATE TABLE public.saved_recipes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipe_id   UUID        NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, recipe_id)
);

CREATE INDEX saved_recipes_user_idx   ON public.saved_recipes(user_id);
CREATE INDEX saved_recipes_recipe_idx ON public.saved_recipes(recipe_id);

-- ─── RECIPE VIEWS ─────────────────────────────────────────────────────────────
CREATE TABLE public.recipe_views (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id   UUID        NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  author_id   UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewer_id   UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  viewed_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX recipe_views_recipe_idx ON public.recipe_views(recipe_id);
CREATE INDEX recipe_views_author_idx ON public.recipe_views(author_id);
CREATE INDEX recipe_views_date_idx   ON public.recipe_views(viewed_at DESC);

-- Auto-increment view_count
CREATE OR REPLACE FUNCTION public.increment_view_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.recipes SET view_count = view_count + 1 WHERE id = NEW.recipe_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER increment_view_on_insert
  AFTER INSERT ON public.recipe_views
  FOR EACH ROW EXECUTE FUNCTION public.increment_view_count();
