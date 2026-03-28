-- Migration 005 — Add display_name and avatar_url to player_profiles
-- Needed so the leaderboard can show user names without auth.admin API (service role).
-- Run in Supabase SQL Editor.

ALTER TABLE public.player_profiles
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url   TEXT;

-- Grant access to anon/authenticated (RLS is disabled, but explicit grants ensure API key access)
GRANT SELECT, INSERT, UPDATE ON public.player_profiles TO anon, authenticated;
