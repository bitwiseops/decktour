-- Migration 007 — Disable RLS on player_profiles + ensure grants
-- CAUSA DEL BUG: player_profiles era l'unica tabella con RLS attivo.
-- Le query server-side usano la anon key senza sessione utente,
-- quindi RLS bloccava la SELECT e plan/init restituiva "Player profile not found".
-- Run in Supabase SQL Editor.

ALTER TABLE public.player_profiles DISABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_profiles TO anon, authenticated;
