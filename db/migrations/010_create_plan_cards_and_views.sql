-- Migration 010 — Create plan_cards table + cards_view + plan_cards_view
-- The plan_cards table and dependent views are missing from the live DB.
-- The cards table uses the OLD schema (story, challenge_content, photo_url, etc.)
-- so cards_view maps those columns to the names the application expects.
-- Run in Supabase SQL Editor.

-- ── 1. plan_cards table ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.plan_cards (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  plan_id     uuid NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  card_id     uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  day_number  integer NOT NULL DEFAULT 1,
  stage_order integer NOT NULL DEFAULT 0,
  CONSTRAINT plan_cards_pkey PRIMARY KEY (id)
);

-- Index for fast look-up by plan
CREATE INDEX IF NOT EXISTS plan_cards_plan_id_idx ON public.plan_cards(plan_id);

-- Grant access
GRANT SELECT, INSERT, DELETE ON public.plan_cards TO anon, authenticated;

-- Enable RLS
ALTER TABLE public.plan_cards ENABLE ROW LEVEL SECURITY;

-- Anyone can read plan_cards (needed for play page without auth)
CREATE POLICY "plan_cards_select_all"
  ON public.plan_cards FOR SELECT
  USING (true);

-- Only the plan creator can insert cards for their plan
CREATE POLICY "plan_cards_insert_own"
  ON public.plan_cards FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.plans
      WHERE plans.id = plan_id
        AND plans.creator_id = auth.uid()
    )
  );

-- Only the plan creator can delete cards from their plan
CREATE POLICY "plan_cards_delete_own"
  ON public.plan_cards FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.plans
      WHERE plans.id = plan_id
        AND plans.creator_id = auth.uid()
    )
  );

-- ── 2. cards_view  ───────────────────────────────────────────────────────────
-- Maps the OLD cards schema to the column names expected by the application.
CREATE OR REPLACE VIEW public.cards_view AS
SELECT
  c.id,
  c.city_id,
  NULL::uuid                                       AS poi_id,
  c.title,
  c.story                                          AS description,
  c.mood_tags,
  c.photo_url                                      AS image_url,
  60                                               AS duration_min,
  c.challenge_type                                 AS mission_type,
  -- Transform single challenge_content object → quiz_data array (QuizQuestion[])
  CASE
    WHEN c.challenge_content IS NOT NULL
    THEN jsonb_build_array(
           jsonb_build_object(
             'question',     c.challenge_content->>'question',
             'options',      c.challenge_content->'options',
             'correctIndex', (c.challenge_content->>'correct_index')::int,
             'explanation',  COALESCE(c.challenge_content->>'fun_fact', '')
           )
         )
    ELSE '[]'::jsonb
  END                                              AS quiz_data,
  -- Hints derived from challenge_content
  COALESCE(c.challenge_content->>'clue_primary', '')  AS hint_hard,
  COALESCE(c.challenge_content->>'clue_extra',   '')  AS hint_medium,
  COALESCE(c.challenge_content->>'location_name','')  AS hint_easy,
  ''                                               AS historical_info,
  c.rarity,
  1                                                AS power_level,
  c.base_points                                    AS base_score,
  c.voucher_text                                   AS voucher_description,
  NULL::text                                       AS voucher_partner,
  NULL::text                                       AS voucher_code,
  0                                                AS voucher_validity_radius,
  c.is_temporary                                   AS is_temporary,
  c.created_at,
  c.lat,
  c.lon
FROM public.cards c
WHERE c.is_active = true;

GRANT SELECT ON public.cards_view TO anon, authenticated;

-- ── 3. plan_cards_view  ──────────────────────────────────────────────────────
-- (replaces the version from migration 009 which referenced the non-existent cards_view)
CREATE OR REPLACE VIEW public.plan_cards_view AS
SELECT
  pc.id          AS plan_card_id,
  pc.plan_id,
  pc.day_number,
  pc.stage_order,
  cv.id,
  cv.city_id,
  cv.poi_id,
  cv.title,
  cv.description,
  cv.mood_tags,
  cv.image_url,
  cv.duration_min,
  cv.mission_type,
  cv.quiz_data,
  cv.hint_hard,
  cv.hint_medium,
  cv.hint_easy,
  cv.historical_info,
  cv.rarity,
  cv.power_level,
  cv.base_score,
  cv.voucher_description,
  cv.voucher_partner,
  cv.voucher_code,
  cv.voucher_validity_radius,
  cv.is_temporary,
  cv.created_at,
  cv.lat,
  cv.lon
FROM public.plan_cards pc
JOIN public.cards_view cv ON cv.id = pc.card_id;

GRANT SELECT ON public.plan_cards_view TO anon, authenticated;
