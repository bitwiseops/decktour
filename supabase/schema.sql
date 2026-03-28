-- Deck Tour — Schema completo per Supabase

-- Enum types
CREATE TYPE mood_type AS ENUM ('shopping', 'food', 'art', 'nature', 'nightlife');
CREATE TYPE event_kind AS ENUM ('permanent', 'temporary');
CREATE TYPE plan_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE mission_type AS ENUM ('quiz', 'photo', 'both');
CREATE TYPE session_status AS ENUM ('active', 'completed', 'abandoned');

-- Profiles (estende auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
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
  lat DOUBLE PRECISION NOT NULL,
  lon DOUBLE PRECISION NOT NULL,
  image_url TEXT
);

-- POIs
CREATE TABLE pois (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  lat DOUBLE PRECISION NOT NULL,
  lon DOUBLE PRECISION NOT NULL,
  image_url TEXT,
  moods mood_type[] DEFAULT '{}',
  event_kind event_kind DEFAULT 'permanent',
  valid_from DATE,
  valid_to DATE,
  source_url TEXT,
  source_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

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
  lat DOUBLE PRECISION NOT NULL,
  lon DOUBLE PRECISION NOT NULL,
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
  player_lat DOUBLE PRECISION NOT NULL,
  player_lon DOUBLE PRECISION NOT NULL,
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

-- Haversine distance function
CREATE OR REPLACE FUNCTION haversine_distance(
  lat1 DOUBLE PRECISION, lon1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION, lon2 DOUBLE PRECISION
) RETURNS DOUBLE PRECISION AS $$
DECLARE
  r CONSTANT DOUBLE PRECISION := 6371000;
  dlat DOUBLE PRECISION := radians(lat2 - lat1);
  dlon DOUBLE PRECISION := radians(lon2 - lon1);
  a DOUBLE PRECISION;
BEGIN
  a := sin(dlat/2)^2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)^2;
  RETURN r * 2 * atan2(sqrt(a), sqrt(1-a));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger: update scores on checkin
CREATE OR REPLACE FUNCTION on_checkin_score() RETURNS TRIGGER AS $$
BEGIN
  UPDATE game_sessions SET total_score = total_score + NEW.score_earned WHERE id = NEW.session_id;
  UPDATE profiles SET total_score = total_score + NEW.score_earned WHERE id = NEW.player_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_checkin_score AFTER INSERT ON checkins
  FOR EACH ROW EXECUTE FUNCTION on_checkin_score();

-- Trigger: update plan stats on review
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

-- Views
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

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE pois ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Profiles: read all, write own
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Cities: read all
CREATE POLICY "cities_select" ON cities FOR SELECT USING (true);

-- POIs: read all
CREATE POLICY "pois_select" ON pois FOR SELECT USING (true);

-- Plans: published = public, draft = creator only
CREATE POLICY "plans_select" ON plans FOR SELECT USING (status = 'published' OR creator_id = auth.uid());
CREATE POLICY "plans_insert" ON plans FOR INSERT WITH CHECK (creator_id = auth.uid());
CREATE POLICY "plans_update" ON plans FOR UPDATE USING (creator_id = auth.uid());
CREATE POLICY "plans_delete" ON plans FOR DELETE USING (creator_id = auth.uid());

-- Cards: visible if plan is accessible
CREATE POLICY "cards_select" ON cards FOR SELECT USING (
  EXISTS (SELECT 1 FROM plans WHERE plans.id = cards.plan_id AND (plans.status = 'published' OR plans.creator_id = auth.uid()))
);
CREATE POLICY "cards_insert" ON cards FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM plans WHERE plans.id = cards.plan_id AND plans.creator_id = auth.uid())
);

-- Game sessions: player only
CREATE POLICY "sessions_select" ON game_sessions FOR SELECT USING (player_id = auth.uid());
CREATE POLICY "sessions_insert" ON game_sessions FOR INSERT WITH CHECK (player_id = auth.uid());
CREATE POLICY "sessions_update" ON game_sessions FOR UPDATE USING (player_id = auth.uid());

-- Checkins: player only
CREATE POLICY "checkins_select" ON checkins FOR SELECT USING (player_id = auth.uid());
CREATE POLICY "checkins_insert" ON checkins FOR INSERT WITH CHECK (player_id = auth.uid());

-- Reviews: read all, write own
CREATE POLICY "reviews_select" ON reviews FOR SELECT USING (true);
CREATE POLICY "reviews_insert" ON reviews FOR INSERT WITH CHECK (reviewer_id = auth.uid());
CREATE POLICY "reviews_update" ON reviews FOR UPDATE USING (reviewer_id = auth.uid());

-- Seed some cities
INSERT INTO cities (name, country, lat, lon) VALUES
  ('Roma', 'Italia', 41.9028, 12.4964),
  ('Milano', 'Italia', 45.4642, 9.1900),
  ('Napoli', 'Italia', 40.8518, 14.2681),
  ('Firenze', 'Italia', 43.7696, 11.2558),
  ('Venezia', 'Italia', 45.4408, 12.3155),
  ('Torino', 'Italia', 45.0703, 7.6869),
  ('Bologna', 'Italia', 44.4949, 11.3426),
  ('Palermo', 'Italia', 38.1157, 13.3615),
  ('Barcellona', 'Spagna', 41.3874, 2.1686),
  ('Parigi', 'Francia', 48.8566, 2.3522),
  ('Londra', 'Regno Unito', 51.5074, -0.1278),
  ('Amsterdam', 'Paesi Bassi', 52.3676, 4.9041);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, display_name, avatar_url)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
