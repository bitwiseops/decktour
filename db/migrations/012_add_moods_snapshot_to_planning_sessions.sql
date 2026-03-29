-- Add moods_snapshot to planning_sessions so mood profile is per-plan, not per-user
ALTER TABLE public.planning_sessions
  ADD COLUMN IF NOT EXISTS moods_snapshot jsonb DEFAULT '{}'::jsonb;
