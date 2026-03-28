// Data model types for Deck Tour

export type MoodType = "shopping" | "food" | "art" | "nature" | "nightlife";

export const MOODS: { id: MoodType; emoji: string; label: string; color: string }[] = [
  { id: "shopping", emoji: "🛍️", label: "Acquisti & Souvenir", color: "#f59e0b" },
  { id: "food", emoji: "🍕", label: "Enogastronomia", color: "#ef4444" },
  { id: "art", emoji: "🏛️", label: "Arte & Storia", color: "#8b5cf6" },
  { id: "nature", emoji: "🌳", label: "Natura & Outdoor", color: "#22c55e" },
  { id: "nightlife", emoji: "💃", label: "Vita Notturna & Eventi", color: "#ec4899" },
];

export interface MoodProfile {
  shopping: number;
  food: number;
  art: number;
  nature: number;
  nightlife: number;
}

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  mood_shopping: number;
  mood_food: number;
  mood_art: number;
  mood_nature: number;
  mood_nightlife: number;
  total_score: number;
  badges: Record<string, boolean>;
  created_at: string;
  updated_at: string;
}

export interface City {
  id: string;
  name: string;
  country: string;
  lat: number;
  lon: number;
  image_url: string | null;
}

export interface POI {
  id: string;
  city_id: string;
  name: string;
  description: string;
  lat: number;
  lon: number;
  image_url: string | null;
  moods: MoodType[];
  event_kind: "permanent" | "temporary";
  valid_from: string | null;
  valid_to: string | null;
  source_url: string | null;
  source_name: string | null;
}

export type PlanStatus = "draft" | "published" | "archived";

export interface Plan {
  id: string;
  creator_id: string;
  city_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  status: PlanStatus;
  date_from: string;
  date_to: string;
  num_stages: number;
  avg_stage_duration_min: number;
  avg_rating: number;
  total_reviews: number;
  total_executions: number;
  power_level: number;
  total_score: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  city?: City;
  creator?: Pick<Profile, "id" | "display_name" | "avatar_url">;
  cards?: Card[];
}

export type MissionType = "quiz" | "photo" | "both";

export type CardRarity = "common" | "rare" | "secret";

export const RARITIES: { id: CardRarity; label: string; color: string; glowColor: string }[] = [
  { id: "common", label: "Comune", color: "#9ca3af", glowColor: "rgba(156, 163, 175, 0.3)" },
  { id: "rare", label: "Rara", color: "#3b82f6", glowColor: "rgba(59, 130, 246, 0.4)" },
  { id: "secret", label: "Segreta", color: "#f59e0b", glowColor: "rgba(245, 158, 11, 0.5)" },
];

export const RARITY_POWER: Record<CardRarity, number> = {
  common: 1,
  rare: 3,
  secret: 5,
};

export const RARITY_META: Record<CardRarity, { label: string; color: string; glowColor: string }> = Object.fromEntries(
  RARITIES.map((r) => [r.id, { label: r.label, color: r.color, glowColor: r.glowColor }])
) as Record<CardRarity, { label: string; color: string; glowColor: string }>;

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export type HintLevel = 1 | 2 | 3;

export interface Card {
  id: string;
  plan_id: string;
  poi_id: string | null;
  day_number: number;
  stage_order: number;
  title: string;
  description: string;
  moods: MoodType[];
  image_url: string | null;
  lat: number;
  lon: number;
  duration_min: number;
  mission_type: MissionType;
  quiz_data: QuizQuestion[];
  hint_hard: string;
  hint_medium: string;
  hint_easy: string;
  historical_info: string;
  rarity: CardRarity;
  power_level: number;
  base_score: number;
  voucher_description: string | null;
  voucher_partner: string | null;
  is_temporary_event: boolean;
}

export type SessionStatus = "active" | "completed" | "abandoned";

export interface GameSession {
  id: string;
  player_id: string;
  plan_id: string;
  status: SessionStatus;
  total_score: number;
  started_at: string;
  completed_at: string | null;
}

export interface CheckIn {
  id: string;
  session_id: string;
  card_id: string;
  player_id: string;
  player_lat: number;
  player_lon: number;
  distance_meters: number;
  location_valid: boolean;
  location_exact: boolean;
  quiz_answers: number[];
  quiz_correct: number;
  quiz_total: number;
  hints_revealed: HintLevel;
  photo_url: string | null;
  score_earned: number;
  voucher_unlocked: boolean;
}

export interface Review {
  id: string;
  plan_id: string;
  reviewer_id: string;
  stars: number;
  comment: string | null;
  created_at: string;
}

// AI generation types
export interface GenerateCardsRequest {
  city: string;
  country: string;
  moodProfile: MoodProfile;
  dayNumber: number;
  stageOrder: number;
  durationMin: number;
  dateFrom: string;
  dateTo: string;
  language: string;
  excludePoiIds: string[];
}

export interface GeneratedCard {
  title: string;
  description: string;
  moods: MoodType[];
  rarity: CardRarity;
  lat: number;
  lon: number;
  hint_hard: string;
  hint_medium: string;
  hint_easy: string;
  historical_info: string;
  is_temporary_event: boolean;
  source_url: string | null;
  source_name: string | null;
  suggested_voucher: string | null;
  quiz_data: QuizQuestion[];
}

export interface GenerateQuizRequest {
  poiName: string;
  poiDescription: string;
  city: string;
  language: string;
  difficulty: "easy" | "medium" | "hard";
  numQuestions: number;
}

// Mood comparison pair for onboarding
export interface MoodComparison {
  moodA: MoodType;
  moodB: MoodType;
  value: number; // 0-100, 0 = all A, 100 = all B
}
