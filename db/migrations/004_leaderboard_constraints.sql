-- Migration 004 — Add unique constraints required for upsert operations
-- Run in Supabase SQL Editor AFTER migration 003.

-- Unique constraint for leaderboard upsert
ALTER TABLE public.leaderboard_users 
  ADD CONSTRAINT leaderboard_users_user_month_unique UNIQUE (user_id, month);

ALTER TABLE public.leaderboard_plans 
  ADD CONSTRAINT leaderboard_plans_plan_month_unique UNIQUE (plan_id, month);

-- Add times_played column to plans if not present (it's in the schema but verify)
-- ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS times_played integer NOT NULL DEFAULT 0;
