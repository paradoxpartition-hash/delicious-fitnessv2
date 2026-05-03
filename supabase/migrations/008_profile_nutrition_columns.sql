/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 *
 * Migration 008 — Nutrition columns + new role values
 *
 * NOTE: ALTER TYPE ADD VALUE cannot be used in the same transaction as
 * statements that reference the new value. So we add the enum values first,
 * and the UPDATE to use them is in migration 009.
 */

-- ─── ADD NUTRITION COLUMNS ────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS fitness_goal      TEXT
    CHECK (fitness_goal IN ('bulk','cut','maintain','recomposition')),
  ADD COLUMN IF NOT EXISTS daily_kcal_target SMALLINT
    CHECK (daily_kcal_target BETWEEN 1200 AND 4500),
  ADD COLUMN IF NOT EXISTS diet_type         TEXT
    CHECK (diet_type IN ('standard','high_protein','keto','vegan','vegetarian','mediterranean')),
  ADD COLUMN IF NOT EXISTS meal_plan_status  TEXT
    CHECK (meal_plan_status IN ('ok','needs_regeneration'))
    DEFAULT 'ok';

-- ─── ADD NEW ENUM VALUES ──────────────────────────────────────────────────────
-- These are committed immediately so migration 009 can safely reference them
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'dietitian';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'member';

-- ─── HELPER RPC: clear regen flag after meal plan is generated ────────────────
CREATE OR REPLACE FUNCTION public.clear_meal_plan_status(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.profiles
    SET meal_plan_status = 'ok',
        updated_at       = now()
    WHERE id = p_user_id;
END;
$$;

-- ─── INDEX ────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS profiles_meal_plan_status_idx
  ON public.profiles(meal_plan_status)
  WHERE meal_plan_status = 'needs_regeneration';
