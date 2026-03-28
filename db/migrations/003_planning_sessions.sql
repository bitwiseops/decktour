-- Migration 003 — planning_sessions table for the new draft-based planning flow
-- Run in Supabase SQL Editor AFTER migration 002.

CREATE TABLE IF NOT EXISTS public.planning_sessions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  city_id      uuid NOT NULL REFERENCES public.cities(id),
  date_from    date NOT NULL,
  date_to      date NOT NULL,
  stops_per_day integer NOT NULL DEFAULT 2,
  stop_duration text NOT NULL DEFAULT '2h',
  num_days     integer NOT NULL DEFAULT 1,
  total_stops  integer NOT NULL DEFAULT 2,
  deck         jsonb NOT NULL DEFAULT '[]',
  picks        jsonb NOT NULL DEFAULT '[]',
  current_trio jsonb,
  reshuffle_count integer NOT NULL DEFAULT 0,
  created_at   timestamp with time zone NOT NULL DEFAULT now(),
  expires_at   timestamp with time zone NOT NULL DEFAULT now() + interval '24 hours'
);

CREATE INDEX IF NOT EXISTS idx_planning_sessions_user ON public.planning_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_planning_sessions_expires ON public.planning_sessions(expires_at);

-- Auto-clean expired sessions (optional, can also be handled by a cron or cleanup job)
-- ALTER TABLE public.planning_sessions ENABLE ROW LEVEL SECURITY;
