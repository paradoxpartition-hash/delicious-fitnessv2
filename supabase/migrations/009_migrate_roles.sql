/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 *
 * Migration 009 — Migrate USER role to member
 *
 * Only USER needs migrating to the new lowercase 'member' value.
 * CHEF, ADMIN, MODERATOR remain as uppercase in the enum — they were
 * defined that way in migration 001 and are still valid.
 */

UPDATE public.profiles
  SET role = 'member'::user_role
  WHERE role::TEXT = 'USER';
