-- Migration 008 — Fix permissions on planning_sessions
-- La tabella era stata creata senza GRANT → la anon key server-side non poteva fare INSERT.
-- Run in Supabase SQL Editor.

ALTER TABLE public.planning_sessions DISABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.planning_sessions TO anon, authenticated;
