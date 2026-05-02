/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 *
 * Migration 002 — Chef, subscriptions, affiliates, meal plans, community
 */

-- ─── CHEF PROFILES ────────────────────────────────────────────────────────────
CREATE TABLE public.chef_profiles (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_customer_id TEXT     UNIQUE,
  bio             TEXT,
  specialties     TEXT[],
  social_links    JSONB       NOT NULL DEFAULT '{}',
  -- { instagram, tiktok, youtube, website }
  stats           JSONB       NOT NULL DEFAULT '{}',
  -- Cached: { recipe_count, total_views, total_forks, total_saves, avg_rating, affiliate_clicks, monthly_views }
  verified        BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX chef_profiles_user_idx ON public.chef_profiles(user_id);

CREATE TRIGGER chef_profiles_updated_at
  BEFORE UPDATE ON public.chef_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Promote user to CHEF role when chef_profile is created
CREATE OR REPLACE FUNCTION public.promote_to_chef()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.profiles SET role = 'CHEF' WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_chef_profile_created
  AFTER INSERT ON public.chef_profiles
  FOR EACH ROW EXECUTE FUNCTION public.promote_to_chef();

-- ─── SUBSCRIPTIONS ────────────────────────────────────────────────────────────
CREATE TYPE subscription_status AS ENUM ('trialing','active','past_due','canceled','unpaid','paused');
CREATE TYPE subscription_plan   AS ENUM ('monthly','annual');

CREATE TABLE public.subscriptions (
  id                      UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID                NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_subscription_id  TEXT                NOT NULL UNIQUE,
  stripe_customer_id      TEXT                NOT NULL,
  status                  subscription_status NOT NULL DEFAULT 'trialing',
  plan                    subscription_plan   NOT NULL,
  current_period_start    TIMESTAMPTZ         NOT NULL,
  current_period_end      TIMESTAMPTZ         NOT NULL,
  cancel_at_period_end    BOOLEAN             NOT NULL DEFAULT FALSE,
  trial_end               TIMESTAMPTZ,
  created_at              TIMESTAMPTZ         NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ         NOT NULL DEFAULT now()
);

CREATE INDEX subscriptions_user_idx   ON public.subscriptions(user_id);
CREATE INDEX subscriptions_stripe_idx ON public.subscriptions(stripe_subscription_id);
CREATE INDEX subscriptions_status_idx ON public.subscriptions(status);

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── AFFILIATE LINKS ──────────────────────────────────────────────────────────
CREATE TABLE public.affiliate_links (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id       UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipe_id     UUID        NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  partner_name  TEXT        NOT NULL,
  url           TEXT        NOT NULL,
  click_count   INT         NOT NULL DEFAULT 0 CHECK (click_count >= 0),
  active        BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX affiliate_links_chef_idx   ON public.affiliate_links(chef_id);
CREATE INDEX affiliate_links_recipe_idx ON public.affiliate_links(recipe_id);
CREATE INDEX affiliate_links_active_idx ON public.affiliate_links(active) WHERE active = TRUE;

CREATE TRIGGER affiliate_links_updated_at
  BEFORE UPDATE ON public.affiliate_links
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── MEAL PLANS ───────────────────────────────────────────────────────────────
CREATE TABLE public.meal_plans (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_data     JSONB       NOT NULL DEFAULT '[]',
  -- Array of DayPlan objects (see meal-plan/page.tsx for structure)
  goal          recipe_goal,
  target_kcal   SMALLINT    CHECK (target_kcal > 0),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One active plan per user (upsert replaces)
CREATE UNIQUE INDEX meal_plans_user_idx ON public.meal_plans(user_id);

CREATE TRIGGER meal_plans_updated_at
  BEFORE UPDATE ON public.meal_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── COMMUNITY POSTS ──────────────────────────────────────────────────────────
CREATE TABLE public.community_posts (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content     TEXT        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 3000),
  image_url   TEXT,
  recipe_id   UUID        REFERENCES public.recipes(id) ON DELETE SET NULL,
  like_count  INT         NOT NULL DEFAULT 0 CHECK (like_count >= 0),
  liked       BOOLEAN     NOT NULL DEFAULT FALSE, -- computed per-user in query
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX community_posts_user_idx     ON public.community_posts(user_id);
CREATE INDEX community_posts_created_idx  ON public.community_posts(created_at DESC);
CREATE INDEX community_posts_likes_idx    ON public.community_posts(like_count DESC);

CREATE TRIGGER community_posts_updated_at
  BEFORE UPDATE ON public.community_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── POST LIKES ───────────────────────────────────────────────────────────────
CREATE TABLE public.post_likes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID        NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (post_id, user_id)
);

CREATE INDEX post_likes_post_idx ON public.post_likes(post_id);
CREATE INDEX post_likes_user_idx ON public.post_likes(user_id);

-- Auto increment/decrement like_count
CREATE OR REPLACE FUNCTION public.sync_post_like_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER sync_like_count
  AFTER INSERT OR DELETE ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION public.sync_post_like_count();

-- ─── WORKOUTS ─────────────────────────────────────────────────────────────────
CREATE TYPE workout_level AS ENUM ('beginner','intermediate','advanced');
CREATE TYPE workout_type  AS ENUM ('strength','cardio','hiit','yoga','mobility');

CREATE TABLE public.workouts (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT          NOT NULL,
  description   TEXT,
  level         workout_level NOT NULL DEFAULT 'beginner',
  type          workout_type  NOT NULL DEFAULT 'strength',
  duration_min  SMALLINT      NOT NULL CHECK (duration_min > 0),
  goal          recipe_goal,
  exercises     JSONB         NOT NULL DEFAULT '[]',
  -- Structure: [{ name, sets, reps }]
  image_url     TEXT,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX workouts_level_idx ON public.workouts(level);
CREATE INDEX workouts_type_idx  ON public.workouts(type);
CREATE INDEX workouts_goal_idx  ON public.workouts(goal);

CREATE TRIGGER workouts_updated_at
  BEFORE UPDATE ON public.workouts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── CHALLENGES ───────────────────────────────────────────────────────────────
CREATE TABLE public.challenges (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT        NOT NULL,
  description       TEXT        NOT NULL,
  icon              TEXT        NOT NULL DEFAULT '🎯',
  duration_days     SMALLINT    NOT NULL CHECK (duration_days > 0),
  goal              recipe_goal,
  participant_count INT         NOT NULL DEFAULT 0 CHECK (participant_count >= 0),
  start_date        DATE,
  end_date          DATE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER challenges_updated_at
  BEFORE UPDATE ON public.challenges
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.challenge_participants (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID        NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  enrolled     BOOLEAN     NOT NULL DEFAULT TRUE,
  day          SMALLINT    NOT NULL DEFAULT 1,
  completed    BOOLEAN     NOT NULL DEFAULT FALSE,
  enrolled_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (challenge_id, user_id)
);

CREATE INDEX challenge_participants_challenge_idx ON public.challenge_participants(challenge_id);
CREATE INDEX challenge_participants_user_idx      ON public.challenge_participants(user_id);

CREATE TRIGGER challenge_participants_updated_at
  BEFORE UPDATE ON public.challenge_participants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-sync participant_count
CREATE OR REPLACE FUNCTION public.sync_challenge_participant_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_challenge_id UUID;
BEGIN
  v_challenge_id := COALESCE(NEW.challenge_id, OLD.challenge_id);
  UPDATE public.challenges
  SET participant_count = (SELECT COUNT(*) FROM public.challenge_participants WHERE challenge_id = v_challenge_id AND enrolled = TRUE)
  WHERE id = v_challenge_id;
  RETURN NULL;
END;
$$;

CREATE TRIGGER sync_participant_count
  AFTER INSERT OR UPDATE OR DELETE ON public.challenge_participants
  FOR EACH ROW EXECUTE FUNCTION public.sync_challenge_participant_count();

-- ─── BLOG ─────────────────────────────────────────────────────────────────────
CREATE TYPE blog_status AS ENUM ('draft','published','archived');

CREATE TABLE public.blog_posts (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title         TEXT        NOT NULL,
  slug          TEXT        NOT NULL UNIQUE,
  excerpt       TEXT,
  content       TEXT,
  cover_url     TEXT,
  category      TEXT,
  read_time     SMALLINT,
  status        blog_status NOT NULL DEFAULT 'draft',
  published_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX blog_posts_status_idx    ON public.blog_posts(status);
CREATE INDEX blog_posts_category_idx  ON public.blog_posts(category);
CREATE INDEX blog_posts_published_idx ON public.blog_posts(published_at DESC) WHERE status = 'published';
CREATE INDEX blog_posts_slug_idx      ON public.blog_posts(slug);

CREATE TRIGGER blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
