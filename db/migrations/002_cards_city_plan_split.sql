-- Migration 002 — Cards diventano city-scoped + tabella plan_cards
-- Eseguire su Supabase nel SQL Editor DOPO che il DB è in stato 001.
-- ============================================================

-- 1. Aggiungi city_id (nullable inizialmente per la migrazione dei dati esistenti)
ALTER TABLE cards ADD COLUMN city_id UUID REFERENCES cities(id);

-- 2. Popola city_id dai piani collegati
UPDATE cards c
SET city_id = p.city_id
FROM plans p
WHERE c.plan_id = p.id;

-- 3. Rendi city_id NOT NULL
ALTER TABLE cards ALTER COLUMN city_id SET NOT NULL;

-- 4. Crea la tabella di associazione plan_cards
CREATE TABLE plan_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL DEFAULT 1,
  stage_order INTEGER NOT NULL DEFAULT 1,
  UNIQUE(plan_id, card_id)
);

CREATE INDEX idx_plan_cards_plan ON plan_cards (plan_id);
CREATE INDEX idx_plan_cards_card ON plan_cards (card_id);

-- 5. Migra i dati esistenti: crea le righe plan_cards dai dati attuali di cards
INSERT INTO plan_cards (plan_id, card_id, day_number, stage_order)
SELECT plan_id, id, COALESCE(day_number, 1), COALESCE(stage_order, 1)
FROM cards;

-- 6. Rimuovi le colonne ora spostate su plan_cards
ALTER TABLE cards DROP COLUMN plan_id;
ALTER TABLE cards DROP COLUMN day_number;
ALTER TABLE cards DROP COLUMN stage_order;

-- 7. Aggiorna indici
DROP INDEX IF EXISTS idx_cards_plan;
CREATE INDEX idx_cards_city ON cards (city_id);

-- 8. Disabilita RLS sulla nuova tabella
ALTER TABLE plan_cards DISABLE ROW LEVEL SECURITY;

-- 9. Permessi
GRANT SELECT, INSERT, UPDATE, DELETE ON plan_cards TO anon, authenticated;

-- 10. Crea la vista plan_cards_view
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

GRANT SELECT ON plan_cards_view TO anon, authenticated;
