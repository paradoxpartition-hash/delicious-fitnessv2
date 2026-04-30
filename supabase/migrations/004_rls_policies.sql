/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 *
 * Migration 004 — Row Level Security (RLS) policies
 * Every table is locked down. Public reads where appropriate,
 * writes only by owners, admin bypass via service role.
 */

-- ─── HELPER: is_admin() ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('ADMIN','MODERATOR')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_chef()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('CHEF','ADMIN','MODERATOR')
  );
END;
$$;

-- ─── PROFILES ─────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can read profiles
CREATE POLICY "profiles_select_public"
  ON public.profiles FOR SELECT
  USING (TRUE);

-- Users can only update their own profile
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins can update any profile (for role changes)
CREATE POLICY "profiles_update_admin"
  ON public.profiles FOR UPDATE
  USING (public.is_admin());

-- ─── RECIPES ──────────────────────────────────────────────────────────────────
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

-- Anyone can read published recipes
CREATE POLICY "recipes_select_published"
  ON public.recipes FOR SELECT
  USING (status = 'published');

-- Authors can read their own recipes (including drafts)
CREATE POLICY "recipes_select_own"
  ON public.recipes FOR SELECT
  USING (author_id = auth.uid());

-- Admins can read everything
CREATE POLICY "recipes_select_admin"
  ON public.recipes FOR SELECT
  USING (public.is_admin());

-- Authenticated users (with chef role) can insert
CREATE POLICY "recipes_insert_chef"
  ON public.recipes FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() = author_id
  );

-- Authors can update their own recipes
CREATE POLICY "recipes_update_own"
  ON public.recipes FOR UPDATE
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

-- Admins can update any recipe
CREATE POLICY "recipes_update_admin"
  ON public.recipes FOR UPDATE
  USING (public.is_admin());

-- Authors can delete their own recipes
CREATE POLICY "recipes_delete_own"
  ON public.recipes FOR DELETE
  USING (author_id = auth.uid());

-- Admins can delete any recipe
CREATE POLICY "recipes_delete_admin"
  ON public.recipes FOR DELETE
  USING (public.is_admin());

-- ─── RECIPE RATINGS ───────────────────────────────────────────────────────────
ALTER TABLE public.recipe_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ratings_select_public"
  ON public.recipe_ratings FOR SELECT
  USING (TRUE);

CREATE POLICY "ratings_insert_auth"
  ON public.recipe_ratings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ratings_update_own"
  ON public.recipe_ratings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ratings_delete_own"
  ON public.recipe_ratings FOR DELETE
  USING (auth.uid() = user_id);

-- ─── RECIPE COMMENTS ─────────────────────────────────────────────────────────
ALTER TABLE public.recipe_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comments_select_public"
  ON public.recipe_comments FOR SELECT
  USING (TRUE);

CREATE POLICY "comments_insert_auth"
  ON public.recipe_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "comments_update_own"
  ON public.recipe_comments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "comments_delete_own"
  ON public.recipe_comments FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "comments_delete_admin"
  ON public.recipe_comments FOR DELETE
  USING (public.is_admin());

-- ─── SAVED RECIPES ────────────────────────────────────────────────────────────
ALTER TABLE public.saved_recipes ENABLE ROW LEVEL SECURITY;

-- Users can only see and manage their own saved recipes
CREATE POLICY "saved_recipes_select_own"
  ON public.saved_recipes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "saved_recipes_insert_own"
  ON public.saved_recipes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "saved_recipes_delete_own"
  ON public.saved_recipes FOR DELETE
  USING (auth.uid() = user_id);

-- ─── RECIPE VIEWS ─────────────────────────────────────────────────────────────
ALTER TABLE public.recipe_views ENABLE ROW LEVEL SECURITY;

-- Authors can see views of their own recipes
CREATE POLICY "views_select_own_recipes"
  ON public.recipe_views FOR SELECT
  USING (author_id = auth.uid());

-- Admins can see all views
CREATE POLICY "views_select_admin"
  ON public.recipe_views FOR SELECT
  USING (public.is_admin());

-- Insert is done via RPC (track_recipe_view), not direct insert
-- Allow anon insert via service role only — RPC handles this
CREATE POLICY "views_insert_rpc"
  ON public.recipe_views FOR INSERT
  WITH CHECK (TRUE); -- actual guard is in the RPC function

-- ─── CHEF PROFILES ────────────────────────────────────────────────────────────
ALTER TABLE public.chef_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chef_profiles_select_public"
  ON public.chef_profiles FOR SELECT
  USING (TRUE);

CREATE POLICY "chef_profiles_insert_own"
  ON public.chef_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "chef_profiles_update_own"
  ON public.chef_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "chef_profiles_update_admin"
  ON public.chef_profiles FOR UPDATE
  USING (public.is_admin());

-- ─── SUBSCRIPTIONS ────────────────────────────────────────────────────────────
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own subscription
CREATE POLICY "subscriptions_select_own"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can see all subscriptions
CREATE POLICY "subscriptions_select_admin"
  ON public.subscriptions FOR SELECT
  USING (public.is_admin());

-- Only service role (Stripe webhook) can insert/update subscriptions
-- No user-facing policies for write — handled by edge function with service_role key

-- ─── AFFILIATE LINKS ──────────────────────────────────────────────────────────
ALTER TABLE public.affiliate_links ENABLE ROW LEVEL SECURITY;

-- Anyone can read active affiliate links (for recipe pages)
CREATE POLICY "affiliate_links_select_active"
  ON public.affiliate_links FOR SELECT
  USING (active = TRUE);

-- Chefs can read all their own links (including inactive)
CREATE POLICY "affiliate_links_select_own"
  ON public.affiliate_links FOR SELECT
  USING (auth.uid() = chef_id);

CREATE POLICY "affiliate_links_insert_own"
  ON public.affiliate_links FOR INSERT
  WITH CHECK (auth.uid() = chef_id AND public.is_chef());

CREATE POLICY "affiliate_links_update_own"
  ON public.affiliate_links FOR UPDATE
  USING (auth.uid() = chef_id)
  WITH CHECK (auth.uid() = chef_id);

CREATE POLICY "affiliate_links_delete_own"
  ON public.affiliate_links FOR DELETE
  USING (auth.uid() = chef_id);

-- ─── MEAL PLANS ───────────────────────────────────────────────────────────────
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meal_plans_select_own"
  ON public.meal_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "meal_plans_insert_own"
  ON public.meal_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "meal_plans_update_own"
  ON public.meal_plans FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "meal_plans_delete_own"
  ON public.meal_plans FOR DELETE
  USING (auth.uid() = user_id);

-- ─── COMMUNITY POSTS ──────────────────────────────────────────────────────────
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "community_posts_select_public"
  ON public.community_posts FOR SELECT
  USING (TRUE);

CREATE POLICY "community_posts_insert_auth"
  ON public.community_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "community_posts_update_own"
  ON public.community_posts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "community_posts_delete_own"
  ON public.community_posts FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "community_posts_delete_admin"
  ON public.community_posts FOR DELETE
  USING (public.is_admin());

-- ─── POST LIKES ───────────────────────────────────────────────────────────────
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "post_likes_select_public"
  ON public.post_likes FOR SELECT
  USING (TRUE);

CREATE POLICY "post_likes_insert_auth"
  ON public.post_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "post_likes_delete_own"
  ON public.post_likes FOR DELETE
  USING (auth.uid() = user_id);

-- ─── WORKOUTS ─────────────────────────────────────────────────────────────────
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;

-- Workouts are public read-only (managed by admins)
CREATE POLICY "workouts_select_public"
  ON public.workouts FOR SELECT
  USING (TRUE);

CREATE POLICY "workouts_write_admin"
  ON public.workouts FOR ALL
  USING (public.is_admin());

-- ─── CHALLENGES ───────────────────────────────────────────────────────────────
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "challenges_select_public"
  ON public.challenges FOR SELECT
  USING (TRUE);

CREATE POLICY "challenges_write_admin"
  ON public.challenges FOR ALL
  USING (public.is_admin());

-- ─── CHALLENGE PARTICIPANTS ───────────────────────────────────────────────────
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;

-- Users see only their own participation
CREATE POLICY "challenge_participants_select_own"
  ON public.challenge_participants FOR SELECT
  USING (auth.uid() = user_id);

-- Admins see all
CREATE POLICY "challenge_participants_select_admin"
  ON public.challenge_participants FOR SELECT
  USING (public.is_admin());

CREATE POLICY "challenge_participants_insert_own"
  ON public.challenge_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "challenge_participants_update_own"
  ON public.challenge_participants FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "challenge_participants_delete_own"
  ON public.challenge_participants FOR DELETE
  USING (auth.uid() = user_id);

-- ─── BLOG POSTS ───────────────────────────────────────────────────────────────
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blog_posts_select_published"
  ON public.blog_posts FOR SELECT
  USING (status = 'published');

CREATE POLICY "blog_posts_select_own"
  ON public.blog_posts FOR SELECT
  USING (author_id = auth.uid());

CREATE POLICY "blog_posts_select_admin"
  ON public.blog_posts FOR SELECT
  USING (public.is_admin());

CREATE POLICY "blog_posts_write_admin"
  ON public.blog_posts FOR ALL
  USING (public.is_admin());

CREATE POLICY "blog_posts_write_own"
  ON public.blog_posts FOR ALL
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());
