-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.badges (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  code text NOT NULL UNIQUE,
  label text NOT NULL,
  description text NOT NULL,
  icon_url text,
  CONSTRAINT badges_pkey PRIMARY KEY (id)
);
CREATE TABLE public.cards (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  city_id uuid NOT NULL,
  title text NOT NULL,
  story text NOT NULL,
  rarity text NOT NULL DEFAULT 'common'::text CHECK (rarity = ANY (ARRAY['common'::text, 'rare'::text, 'secret'::text])),
  challenge_type text NOT NULL DEFAULT 'scelta_multipla'::text CHECK (challenge_type = ANY (ARRAY['scelta_multipla'::text, 'quiz'::text, 'enigma'::text, 'mini_enigma'::text, 'osservazione'::text, 'interazione_contestuale'::text])),
  challenge_content jsonb NOT NULL,
  mood_tags ARRAY NOT NULL DEFAULT '{}'::text[],
  is_temporary boolean NOT NULL DEFAULT false,
  valid_from date,
  valid_until date,
  lat double precision NOT NULL,
  lon double precision NOT NULL,
  photo_url text,
  base_points integer NOT NULL DEFAULT 100,
  voucher_text text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT cards_pkey PRIMARY KEY (id),
  CONSTRAINT cards_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.cities(id)
);
CREATE TABLE public.checkins (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  card_id uuid NOT NULL,
  player_id uuid NOT NULL,
  player_location USER-DEFINED NOT NULL,
  distance_meters double precision NOT NULL,
  location_valid boolean DEFAULT false,
  location_exact boolean DEFAULT false,
  quiz_answers jsonb DEFAULT '[]'::jsonb,
  quiz_correct integer DEFAULT 0,
  quiz_total integer DEFAULT 0,
  hints_revealed smallint DEFAULT 1 CHECK (hints_revealed >= 1 AND hints_revealed <= 3),
  photo_url text,
  score_earned integer DEFAULT 0,
  voucher_unlocked boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT checkins_pkey PRIMARY KEY (id),
  CONSTRAINT checkins_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.cities (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  country text NOT NULL,
  country_code text NOT NULL,
  lat double precision NOT NULL,
  lon double precision NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  cover_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  audio_url text,
  CONSTRAINT cities_pkey PRIMARY KEY (id)
);
CREATE TABLE public.game_sessions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  plan_id uuid NOT NULL,
  explorer_id uuid NOT NULL,
  session_code text NOT NULL UNIQUE,
  mode text NOT NULL DEFAULT 'solo'::text CHECK (mode = ANY (ARRAY['solo'::text, 'co-op'::text])),
  status text NOT NULL DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'completed'::text, 'abandoned'::text])),
  current_card_index integer NOT NULL DEFAULT 0,
  total_score integer NOT NULL DEFAULT 0,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  CONSTRAINT game_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT game_sessions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id),
  CONSTRAINT game_sessions_explorer_id_fkey FOREIGN KEY (explorer_id) REFERENCES auth.users(id)
);
CREATE TABLE public.leaderboard_plans (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  plan_id uuid NOT NULL,
  month text NOT NULL,
  times_played integer NOT NULL DEFAULT 0,
  avg_score double precision NOT NULL DEFAULT 0,
  CONSTRAINT leaderboard_plans_pkey PRIMARY KEY (id),
  CONSTRAINT leaderboard_plans_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id)
);
CREATE TABLE public.leaderboard_users (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  month text NOT NULL,
  monthly_points integer NOT NULL DEFAULT 0,
  total_points integer NOT NULL DEFAULT 0,
  CONSTRAINT leaderboard_users_pkey PRIMARY KEY (id),
  CONSTRAINT leaderboard_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.partners (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  city_id uuid NOT NULL,
  name text NOT NULL,
  category text NOT NULL,
  lat double precision NOT NULL,
  lon double precision NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  CONSTRAINT partners_pkey PRIMARY KEY (id),
  CONSTRAINT partners_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.cities(id)
);
CREATE TABLE public.plan_day_cards (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  plan_day_id uuid NOT NULL,
  card_id uuid NOT NULL,
  position integer NOT NULL,
  CONSTRAINT plan_day_cards_pkey PRIMARY KEY (id),
  CONSTRAINT plan_day_cards_plan_day_id_fkey FOREIGN KEY (plan_day_id) REFERENCES public.plan_days(id),
  CONSTRAINT plan_day_cards_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.cards(id)
);
CREATE TABLE public.plan_days (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  plan_id uuid NOT NULL,
  day_number integer NOT NULL,
  title text,
  CONSTRAINT plan_days_pkey PRIMARY KEY (id),
  CONSTRAINT plan_days_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id)
);
CREATE TABLE public.plan_reviews (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  plan_id uuid NOT NULL,
  session_id uuid NOT NULL,
  reviewer_id uuid NOT NULL,
  stars integer NOT NULL CHECK (stars >= 1 AND stars <= 5),
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT plan_reviews_pkey PRIMARY KEY (id),
  CONSTRAINT plan_reviews_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id),
  CONSTRAINT plan_reviews_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.game_sessions(id),
  CONSTRAINT plan_reviews_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES auth.users(id)
);
CREATE TABLE public.planning_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  city_id uuid NOT NULL,
  date_from date NOT NULL,
  date_to date NOT NULL,
  stops_per_day integer NOT NULL DEFAULT 2,
  stop_duration text NOT NULL DEFAULT '2h'::text,
  num_days integer NOT NULL DEFAULT 1,
  total_stops integer NOT NULL DEFAULT 2,
  deck jsonb NOT NULL DEFAULT '[]'::jsonb,
  picks jsonb NOT NULL DEFAULT '[]'::jsonb,
  current_trio jsonb,
  reshuffle_count integer NOT NULL DEFAULT 0,
  moods_snapshot jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + '24:00:00'::interval),
  CONSTRAINT planning_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT planning_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT planning_sessions_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.cities(id)
);
CREATE TABLE public.plans (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  city_id uuid NOT NULL,
  creator_id uuid NOT NULL,
  title text NOT NULL,
  diary_blurred text,
  diary_revealed text,
  moods_summary jsonb,
  valid_from date,
  valid_until date,
  num_days integer NOT NULL DEFAULT 1,
  stops_per_day integer NOT NULL DEFAULT 2,
  stop_duration text NOT NULL DEFAULT '2h'::text,
  is_published boolean NOT NULL DEFAULT false,
  avg_rating double precision NOT NULL DEFAULT 0,
  times_played integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT plans_pkey PRIMARY KEY (id),
  CONSTRAINT plans_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.cities(id),
  CONSTRAINT plans_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES auth.users(id)
);
CREATE TABLE public.player_profiles (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL UNIQUE,
  mood_art integer NOT NULL DEFAULT 50 CHECK (mood_art >= 0 AND mood_art <= 100),
  mood_food integer NOT NULL DEFAULT 50 CHECK (mood_food >= 0 AND mood_food <= 100),
  mood_nature integer NOT NULL DEFAULT 50 CHECK (mood_nature >= 0 AND mood_nature <= 100),
  mood_shopping integer NOT NULL DEFAULT 50 CHECK (mood_shopping >= 0 AND mood_shopping <= 100),
  mood_nightlife integer NOT NULL DEFAULT 50 CHECK (mood_nightlife >= 0 AND mood_nightlife <= 100),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  display_name text,
  avatar_url text,
  CONSTRAINT player_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT player_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.pois (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  city_id uuid NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT ''::text,
  location USER-DEFINED NOT NULL,
  image_url text,
  moods ARRAY DEFAULT '{}'::mood_type[],
  event_kind USER-DEFINED DEFAULT 'permanent'::event_kind,
  valid_from date,
  valid_to date,
  source_url text,
  source_name text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT pois_pkey PRIMARY KEY (id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  display_name text,
  email text UNIQUE,
  avatar_url text,
  mood_shopping smallint DEFAULT 50 CHECK (mood_shopping >= 0 AND mood_shopping <= 100),
  mood_food smallint DEFAULT 50 CHECK (mood_food >= 0 AND mood_food <= 100),
  mood_art smallint DEFAULT 50 CHECK (mood_art >= 0 AND mood_art <= 100),
  mood_nature smallint DEFAULT 50 CHECK (mood_nature >= 0 AND mood_nature <= 100),
  mood_nightlife smallint DEFAULT 50 CHECK (mood_nightlife >= 0 AND mood_nightlife <= 100),
  total_score integer DEFAULT 0,
  badges jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id)
);
CREATE TABLE public.reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL,
  reviewer_id uuid NOT NULL,
  stars smallint NOT NULL CHECK (stars >= 1 AND stars <= 5),
  comment text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT reviews_pkey PRIMARY KEY (id),
  CONSTRAINT reviews_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.session_card_progress (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  session_id uuid NOT NULL,
  card_id uuid NOT NULL,
  day_number integer NOT NULL,
  position integer NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'checked_in'::text, 'completed'::text, 'skipped'::text])),
  checkin_lat double precision,
  checkin_lon double precision,
  checkin_time timestamp with time zone,
  navigator_hint_used boolean NOT NULL DEFAULT false,
  bonus_intuition boolean NOT NULL DEFAULT false,
  challenge_answer jsonb,
  is_correct boolean,
  points_earned integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT session_card_progress_pkey PRIMARY KEY (id),
  CONSTRAINT session_card_progress_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.game_sessions(id),
  CONSTRAINT session_card_progress_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.cards(id)
);
CREATE TABLE public.spatial_ref_sys (
  srid integer NOT NULL CHECK (srid > 0 AND srid <= 998999),
  auth_name character varying,
  auth_srid integer,
  srtext character varying,
  proj4text character varying,
  CONSTRAINT spatial_ref_sys_pkey PRIMARY KEY (srid)
);
CREATE TABLE public.user_badges (
  user_id uuid NOT NULL,
  badge_id uuid NOT NULL,
  earned_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_badges_pkey PRIMARY KEY (user_id, badge_id),
  CONSTRAINT user_badges_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT user_badges_badge_id_fkey FOREIGN KEY (badge_id) REFERENCES public.badges(id)
);
CREATE TABLE public.city_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  city_name text NOT NULL,
  country text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
  city_id uuid REFERENCES public.cities(id),
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);
CREATE UNIQUE INDEX city_requests_unique_pending
  ON public.city_requests (lower(city_name), lower(country))
  WHERE status IN ('pending', 'processing');