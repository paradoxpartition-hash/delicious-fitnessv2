/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 *
 * Migration 007 — Post comments, affiliate click log, admin audit log
 */

-- ─── POST COMMENTS (threaded) ────────────────────────────────────────────────
CREATE TABLE public.post_comments (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id     UUID        NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content     TEXT        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 1000),
  parent_id   UUID        REFERENCES public.post_comments(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX post_comments_post_idx    ON public.post_comments(post_id);
CREATE INDEX post_comments_user_idx    ON public.post_comments(user_id);
CREATE INDEX post_comments_parent_idx  ON public.post_comments(parent_id);
CREATE INDEX post_comments_created_idx ON public.post_comments(created_at ASC);

CREATE TRIGGER post_comments_updated_at
  BEFORE UPDATE ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "post_comments_select_public"
  ON public.post_comments FOR SELECT USING (TRUE);

CREATE POLICY "post_comments_insert_auth"
  ON public.post_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "post_comments_update_own"
  ON public.post_comments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "post_comments_delete_own"
  ON public.post_comments FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "post_comments_delete_admin"
  ON public.post_comments FOR DELETE
  USING (public.is_admin());

-- ─── AFFILIATE CLICK LOG ──────────────────────────────────────────────────────
-- Detailed click tracking for affiliate link analytics
CREATE TABLE public.affiliate_click_log (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  link_id     UUID        NOT NULL REFERENCES public.affiliate_links(id) ON DELETE CASCADE,
  referrer    TEXT,
  user_agent  TEXT,
  clicked_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX affiliate_click_log_link_idx    ON public.affiliate_click_log(link_id);
CREATE INDEX affiliate_click_log_clicked_idx ON public.affiliate_click_log(clicked_at DESC);

ALTER TABLE public.affiliate_click_log ENABLE ROW LEVEL SECURITY;

-- Chef can view their own affiliate click logs
CREATE POLICY "affiliate_click_log_select_own"
  ON public.affiliate_click_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.affiliate_links al
      WHERE al.id = link_id AND al.chef_id = auth.uid()
    )
  );

-- Admins can see all
CREATE POLICY "affiliate_click_log_select_admin"
  ON public.affiliate_click_log FOR SELECT
  USING (public.is_admin());

-- Insert via edge function (service role)
CREATE POLICY "affiliate_click_log_insert_service"
  ON public.affiliate_click_log FOR INSERT
  WITH CHECK (TRUE);

-- ─── ADMIN AUDIT LOG ──────────────────────────────────────────────────────────
CREATE TABLE public.admin_audit_log (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action      TEXT        NOT NULL,
  target_type TEXT,
  target_id   UUID,
  meta        JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX admin_audit_log_admin_idx   ON public.admin_audit_log(admin_id);
CREATE INDEX admin_audit_log_created_idx ON public.admin_audit_log(created_at DESC);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_select_admin"
  ON public.admin_audit_log FOR SELECT
  USING (public.is_admin());

CREATE POLICY "audit_log_insert_admin"
  ON public.admin_audit_log FOR INSERT
  WITH CHECK (public.is_admin() AND auth.uid() = admin_id);

-- ─── FOLLOWS ──────────────────────────────────────────────────────────────────
CREATE TABLE public.follows (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id  UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (follower_id, following_id),
  CHECK (follower_id != following_id)
);

CREATE INDEX follows_follower_idx  ON public.follows(follower_id);
CREATE INDEX follows_following_idx ON public.follows(following_id);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "follows_select_public"
  ON public.follows FOR SELECT USING (TRUE);

CREATE POLICY "follows_insert_auth"
  ON public.follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "follows_delete_own"
  ON public.follows FOR DELETE
  USING (auth.uid() = follower_id);

-- ─── FOLLOW / UNFOLLOW RPC ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.toggle_follow(p_target_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID;
  v_exists  BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF v_user_id = p_target_id THEN RAISE EXCEPTION 'Cannot follow yourself'; END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.follows
    WHERE follower_id = v_user_id AND following_id = p_target_id
  ) INTO v_exists;

  IF v_exists THEN
    DELETE FROM public.follows WHERE follower_id = v_user_id AND following_id = p_target_id;
    RETURN FALSE; -- unfollowed
  ELSE
    INSERT INTO public.follows (follower_id, following_id) VALUES (v_user_id, p_target_id)
    ON CONFLICT DO NOTHING;
    RETURN TRUE; -- followed
  END IF;
END;
$$;

-- Add realtime to follows
ALTER PUBLICATION supabase_realtime ADD TABLE public.follows;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_comments;
