-- Migration: Replace location_hint with progressive hints and historical_info

ALTER TABLE cards ADD COLUMN hint_hard TEXT DEFAULT '';
ALTER TABLE cards ADD COLUMN hint_medium TEXT DEFAULT '';
ALTER TABLE cards ADD COLUMN hint_easy TEXT DEFAULT '';
ALTER TABLE cards ADD COLUMN historical_info TEXT DEFAULT '';

-- Migrate existing data: copy location_hint to hint_hard
UPDATE cards SET hint_hard = location_hint WHERE location_hint IS NOT NULL AND location_hint != '';

ALTER TABLE cards DROP COLUMN location_hint;
