-- Deck Tour — Schema locale PostgreSQL + PostGIS

CREATE EXTENSION IF NOT EXISTS postgis;

-- Enum types
CREATE TYPE mood_type AS ENUM ('shopping', 'food', 'art', 'nature', 'nightlife');
CREATE TYPE event_kind AS ENUM ('permanent', 'temporary');
CREATE TYPE plan_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE mission_type AS ENUM ('quiz', 'photo', 'both');
CREATE TYPE session_status AS ENUM ('active', 'completed', 'abandoned');

-- Profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name TEXT,
  email TEXT UNIQUE,
  avatar_url TEXT,
  mood_shopping SMALLINT DEFAULT 50 CHECK (mood_shopping BETWEEN 0 AND 100),
  mood_food SMALLINT DEFAULT 50 CHECK (mood_food BETWEEN 0 AND 100),
  mood_art SMALLINT DEFAULT 50 CHECK (mood_art BETWEEN 0 AND 100),
  mood_nature SMALLINT DEFAULT 50 CHECK (mood_nature BETWEEN 0 AND 100),
  mood_nightlife SMALLINT DEFAULT 50 CHECK (mood_nightlife BETWEEN 0 AND 100),
  total_score INTEGER DEFAULT 0,
  badges JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Cities
CREATE TABLE cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  location GEOGRAPHY(Point, 4326) NOT NULL,
  image_url TEXT
);

CREATE INDEX idx_cities_location ON cities USING GIST (location);

-- Convenience view to expose lat/lon
CREATE OR REPLACE VIEW cities_view AS
  SELECT id, name, country, image_url,
    ST_Y(location::geometry) AS lat,
    ST_X(location::geometry) AS lon
  FROM cities;

-- POIs
CREATE TABLE pois (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  location GEOGRAPHY(Point, 4326) NOT NULL,
  image_url TEXT,
  moods mood_type[] DEFAULT '{}',
  event_kind event_kind DEFAULT 'permanent',
  valid_from DATE,
  valid_to DATE,
  source_url TEXT,
  source_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_pois_location ON pois USING GIST (location);
CREATE INDEX idx_pois_city ON pois (city_id);

-- Plans
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  city_id UUID NOT NULL REFERENCES cities(id),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  status plan_status DEFAULT 'draft',
  date_from DATE NOT NULL,
  date_to DATE NOT NULL,
  num_stages INTEGER DEFAULT 3,
  avg_stage_duration_min INTEGER DEFAULT 90,
  avg_rating NUMERIC(2,1) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  total_executions INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Cards
CREATE TABLE cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  poi_id UUID REFERENCES pois(id),
  day_number INTEGER NOT NULL DEFAULT 1,
  stage_order INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  moods mood_type[] DEFAULT '{}',
  image_url TEXT,
  location GEOGRAPHY(Point, 4326) NOT NULL,
  duration_min INTEGER DEFAULT 90,
  mission_type mission_type DEFAULT 'quiz',
  quiz_data JSONB DEFAULT '[]',
  location_hint TEXT DEFAULT '',
  base_score INTEGER DEFAULT 100,
  voucher_description TEXT,
  voucher_partner TEXT,
  is_temporary_event BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_cards_location ON cards USING GIST (location);
CREATE INDEX idx_cards_plan ON cards (plan_id);

-- Game Sessions
CREATE TABLE game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  status session_status DEFAULT 'active',
  total_score INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Check-ins
CREATE TABLE checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  player_location GEOGRAPHY(Point, 4326) NOT NULL,
  distance_meters DOUBLE PRECISION NOT NULL,
  location_valid BOOLEAN DEFAULT FALSE,
  location_exact BOOLEAN DEFAULT FALSE,
  quiz_answers JSONB DEFAULT '[]',
  quiz_correct INTEGER DEFAULT 0,
  quiz_total INTEGER DEFAULT 0,
  photo_url TEXT,
  score_earned INTEGER DEFAULT 0,
  voucher_unlocked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Reviews
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stars SMALLINT NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (plan_id, reviewer_id)
);

-- ============================================================
-- Spatial helper: find nearby POIs
-- ============================================================
CREATE OR REPLACE FUNCTION nearby_pois(
  search_lat DOUBLE PRECISION,
  search_lon DOUBLE PRECISION,
  radius_meters DOUBLE PRECISION DEFAULT 5000,
  lim INTEGER DEFAULT 50
)
RETURNS TABLE(
  id UUID, name TEXT, description TEXT,
  lat DOUBLE PRECISION, lon DOUBLE PRECISION,
  distance_m DOUBLE PRECISION,
  moods mood_type[], event_kind event_kind
) AS $$
  SELECT
    p.id, p.name, p.description,
    ST_Y(p.location::geometry) AS lat,
    ST_X(p.location::geometry) AS lon,
    ST_Distance(p.location, ST_SetSRID(ST_MakePoint(search_lon, search_lat), 4326)::geography) AS distance_m,
    p.moods, p.event_kind
  FROM pois p
  WHERE ST_DWithin(p.location, ST_SetSRID(ST_MakePoint(search_lon, search_lat), 4326)::geography, radius_meters)
  ORDER BY distance_m
  LIMIT lim;
$$ LANGUAGE sql STABLE;

-- ============================================================
-- Spatial helper: distance between player and card
-- ============================================================
CREATE OR REPLACE FUNCTION check_in_distance(
  player_lat DOUBLE PRECISION, player_lon DOUBLE PRECISION,
  card_id_param UUID
)
RETURNS DOUBLE PRECISION AS $$
  SELECT ST_Distance(
    ST_SetSRID(ST_MakePoint(player_lon, player_lat), 4326)::geography,
    c.location
  )
  FROM cards c WHERE c.id = card_id_param;
$$ LANGUAGE sql STABLE;

-- ============================================================
-- Triggers
-- ============================================================

-- Update scores on checkin
CREATE OR REPLACE FUNCTION on_checkin_score() RETURNS TRIGGER AS $$
BEGIN
  UPDATE game_sessions SET total_score = total_score + NEW.score_earned WHERE id = NEW.session_id;
  UPDATE profiles SET total_score = total_score + NEW.score_earned WHERE id = NEW.player_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_checkin_score AFTER INSERT ON checkins
  FOR EACH ROW EXECUTE FUNCTION on_checkin_score();

-- Update plan stats on review
CREATE OR REPLACE FUNCTION on_review_update_plan() RETURNS TRIGGER AS $$
BEGIN
  UPDATE plans SET
    avg_rating = (SELECT COALESCE(AVG(stars), 0) FROM reviews WHERE plan_id = NEW.plan_id),
    total_reviews = (SELECT COUNT(*) FROM reviews WHERE plan_id = NEW.plan_id)
  WHERE id = NEW.plan_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_review_update AFTER INSERT OR UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION on_review_update_plan();

-- ============================================================
-- Views
-- ============================================================

CREATE OR REPLACE VIEW leaderboard_users AS
  SELECT id, display_name, avatar_url, total_score,
    RANK() OVER (ORDER BY total_score DESC) AS rank
  FROM profiles
  WHERE total_score > 0;

CREATE OR REPLACE VIEW leaderboard_plans AS
  SELECT p.id, p.title, p.image_url, p.total_executions, p.avg_rating, p.total_reviews,
    c.name AS city_name, c.country,
    pr.display_name AS creator_name, pr.avatar_url AS creator_avatar,
    RANK() OVER (ORDER BY p.total_executions DESC) AS rank
  FROM plans p
  JOIN cities c ON c.id = p.city_id
  JOIN profiles pr ON pr.id = p.creator_id
  WHERE p.status = 'published';

-- ============================================================
-- Seed cities
-- ============================================================
INSERT INTO cities (name, country, location) VALUES
  ('Roma',       'Italia',       ST_SetSRID(ST_MakePoint(12.4964, 41.9028), 4326)::geography),
  ('Milano',     'Italia',       ST_SetSRID(ST_MakePoint(9.1900, 45.4642), 4326)::geography),
  ('Napoli',     'Italia',       ST_SetSRID(ST_MakePoint(14.2681, 40.8518), 4326)::geography),
  ('Firenze',    'Italia',       ST_SetSRID(ST_MakePoint(11.2558, 43.7696), 4326)::geography),
  ('Venezia',    'Italia',       ST_SetSRID(ST_MakePoint(12.3155, 45.4408), 4326)::geography),
  ('Torino',     'Italia',       ST_SetSRID(ST_MakePoint(7.6869, 45.0703), 4326)::geography),
  ('Bologna',    'Italia',       ST_SetSRID(ST_MakePoint(11.3426, 44.4949), 4326)::geography),
  ('Palermo',    'Italia',       ST_SetSRID(ST_MakePoint(13.3615, 38.1157), 4326)::geography),
  ('Barcellona', 'Spagna',      ST_SetSRID(ST_MakePoint(2.1686, 41.3874), 4326)::geography),
  ('Parigi',     'Francia',      ST_SetSRID(ST_MakePoint(2.3522, 48.8566), 4326)::geography),
  ('Londra',     'Regno Unito',  ST_SetSRID(ST_MakePoint(-0.1278, 51.5074), 4326)::geography),
  ('Amsterdam',  'Paesi Bassi',  ST_SetSRID(ST_MakePoint(4.9041, 52.3676), 4326)::geography);

-- Default demo profile
INSERT INTO profiles (id, display_name, email) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Demo Player', 'demo@decktour.dev');
