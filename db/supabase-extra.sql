-- ============================================================
-- Supabase extra setup — eseguire DOPO db/schema.sql
-- nel SQL Editor di Supabase (https://kfygxbrlikrwoidrwqpm.supabase.co)
-- ============================================================

-- 1. Disabilita RLS su tutte le tabelle (app usa connessione diretta con anon key)
ALTER TABLE profiles    DISABLE ROW LEVEL SECURITY;
ALTER TABLE cities      DISABLE ROW LEVEL SECURITY;
ALTER TABLE pois        DISABLE ROW LEVEL SECURITY;
ALTER TABLE plans       DISABLE ROW LEVEL SECURITY;
ALTER TABLE cards       DISABLE ROW LEVEL SECURITY;
ALTER TABLE plan_cards  DISABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE checkins    DISABLE ROW LEVEL SECURITY;
ALTER TABLE reviews     DISABLE ROW LEVEL SECURITY;

-- 2. Vista cards con lat/lon esposti (lato JS non può fare ST_Y nel SELECT)
CREATE OR REPLACE VIEW cards_view AS
  SELECT *,
    ST_Y(location::geometry) AS lat,
    ST_X(location::geometry) AS lon
  FROM cards;

-- 2b. Vista plan_cards con tutti i campi della carta + ordinamento del piano
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
    cv.moods,
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
    cv.is_temporary_event,
    cv.created_at,
    cv.lat,
    cv.lon
  FROM plan_cards pc
  JOIN cards_view cv ON cv.id = pc.card_id;

-- 3. Vista pois con lat/lon esposti
CREATE OR REPLACE VIEW pois_view AS
  SELECT *,
    ST_Y(location::geometry) AS lat,
    ST_X(location::geometry) AS lon
  FROM pois;

-- 4. Permessi per anon role sulle nuove viste
GRANT SELECT ON cards_view        TO anon, authenticated;
GRANT SELECT ON plan_cards_view   TO anon, authenticated;
GRANT SELECT ON pois_view         TO anon, authenticated;
GRANT SELECT ON cities_view  TO anon, authenticated;
GRANT SELECT ON leaderboard_users TO anon, authenticated;
GRANT SELECT ON leaderboard_plans TO anon, authenticated;

-- Permessi CRUD su tabelle base
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles     TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON cities       TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON pois         TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON plans        TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON cards        TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON plan_cards   TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON game_sessions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON checkins     TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON reviews      TO anon, authenticated;

-- Permessi per chiamare le funzioni spaziali
GRANT EXECUTE ON FUNCTION nearby_pois(double precision, double precision, double precision, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION check_in_distance(double precision, double precision, uuid) TO anon, authenticated;
