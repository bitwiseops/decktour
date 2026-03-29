-- Migration 009 — Fix plan_cards_view to use mood_tags instead of moods
-- The actual cards table has mood_tags column (not moods as in schema.sql).
-- This fixes the view so that getCardsByPlan returns cards correctly.
-- Run in Supabase SQL Editor.

CREATE OR REPLACE VIEW plan_cards_view AS
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
    cv.mood_tags    AS moods,
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
  FROM plan_cards pc
  JOIN cards_view cv ON cv.id = pc.card_id;

GRANT SELECT ON plan_cards_view TO anon, authenticated;
