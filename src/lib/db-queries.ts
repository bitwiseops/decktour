import { query, queryOne } from "./db";
import crypto from "node:crypto";
import type {
  MoodProfile,
  Card,
  Plan,
  City,
  MoodType,
  QuizQuestion,
  GeneratedCard,
  CardRarity,
} from "./types";
import { RARITY_POWER } from "./types";

function generateVoucherCode(): string {
  return `DT-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

// ── Profiles ──

export async function getProfile(id: string) {
  return queryOne("SELECT * FROM profiles WHERE id = $1", [id]);
}

export async function upsertMoodProfile(id: string, mood: MoodProfile) {
  return queryOne(
    `UPDATE profiles SET
       mood_shopping = $2, mood_food = $3, mood_art = $4,
       mood_nature = $5, mood_nightlife = $6, updated_at = now()
     WHERE id = $1 RETURNING *`,
    [id, mood.shopping, mood.food, mood.art, mood.nature, mood.nightlife]
  );
}

// ── Cities ──

export async function getCities(): Promise<City[]> {
  return query<City>(
    "SELECT id, name, country, image_url, ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lon FROM cities ORDER BY name"
  );
}

export async function getCityByName(name: string) {
  return queryOne<City>(
    "SELECT id, name, country, image_url, ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lon FROM cities WHERE LOWER(name) = LOWER($1)",
    [name]
  );
}

// ── Plans ──

export async function createPlan(
  creatorId: string,
  cityId: string,
  title: string,
  dateFrom: string,
  dateTo: string,
  numStages: number,
  avgDuration: number
) {
  return queryOne<Plan>(
    `INSERT INTO plans (creator_id, city_id, title, date_from, date_to, num_stages, avg_stage_duration_min)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [creatorId, cityId, title, dateFrom, dateTo, numStages, avgDuration]
  );
}

export async function getPlan(id: string) {
  return queryOne(
    `SELECT p.*,
       c.name AS city_name, c.country,
       ST_Y(c.location::geometry) AS city_lat, ST_X(c.location::geometry) AS city_lon,
       pr.display_name AS creator_name
     FROM plans p
     JOIN cities c ON c.id = p.city_id
     JOIN profiles pr ON pr.id = p.creator_id
     WHERE p.id = $1`,
    [id]
  );
}

export async function listPlans(status?: string) {
  const where = status ? "WHERE p.status = $1" : "";
  const params = status ? [status] : [];
  return query(
    `SELECT p.*,
       c.name AS city_name, c.country,
       pr.display_name AS creator_name,
       EXISTS (
         SELECT 1 FROM cards ca
         WHERE ca.plan_id = p.id AND ca.rarity IN ('rare', 'secret')
       ) AS has_rare_cards
     FROM plans p
     JOIN cities c ON c.id = p.city_id
     JOIN profiles pr ON pr.id = p.creator_id
     ${where}
     ORDER BY p.created_at DESC`,
    params
  );
}

export async function updatePlanStatus(id: string, status: string) {
  return queryOne("UPDATE plans SET status = $2, updated_at = now() WHERE id = $1 RETURNING *", [
    id,
    status,
  ]);
}

export async function updatePlanDescription(id: string, description: string) {
  return queryOne<Plan>(
    "UPDATE plans SET description = $2, updated_at = now() WHERE id = $1 RETURNING *",
    [id, description]
  );
}

export async function updatePlanImageUrl(id: string, imageUrl: string) {
  return queryOne<Plan>(
    "UPDATE plans SET image_url = $2, updated_at = now() WHERE id = $1 RETURNING *",
    [id, imageUrl]
  );
}

// ── Cards ──

export async function insertCards(
  planId: string,
  cards: (GeneratedCard & { day_number: number; stage_order: number })[],
  durationMin: number
) {
  const values: unknown[] = [];
  const placeholders: string[] = [];
  let idx = 1;

  for (const c of cards) {
    const rarity = c.rarity || "common";
    const powerLevel = RARITY_POWER[rarity] ?? 1;
    const hasVoucher = Boolean(c.suggested_voucher);
    placeholders.push(
      `($${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++},
        $${idx++}::mood_type[], ST_SetSRID(ST_MakePoint($${idx++}, $${idx++}), 4326)::geography,
        $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++},
        $${idx++}, $${idx++}::card_rarity, $${idx++})`
    );
    values.push(
      planId,
      c.day_number,
      c.stage_order,
      c.title,
      c.description,
      `{${c.moods.join(",")}}`,
      c.lon,
      c.lat,
      durationMin,
      JSON.stringify(c.quiz_data),
      c.hint_hard,
      c.hint_medium,
      c.hint_easy,
      c.historical_info,
      c.suggested_voucher || null,
      c.suggested_voucher_partner || null,
      hasVoucher ? generateVoucherCode() : null,
      c.is_temporary_event,
      rarity,
      powerLevel
    );
  }

  return query<Card>(
    `INSERT INTO cards (plan_id, day_number, stage_order, title, description,
       moods, location, duration_min, quiz_data, hint_hard, hint_medium, hint_easy, historical_info,
       voucher_description, voucher_partner, voucher_code,
       is_temporary_event, rarity, power_level)
     VALUES ${placeholders.join(", ")}
     RETURNING *, ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lon`,
    values
  );
}

export async function updateCardImageUrl(cardId: string, imageUrl: string) {
  return queryOne<Card>(
    "UPDATE cards SET image_url = $2 WHERE id = $1 RETURNING *, ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lon",
    [cardId, imageUrl]
  );
}

export async function getCardsByPlan(planId: string) {
  return query<Card & { lat: number; lon: number }>(
    `SELECT c.*, ST_Y(c.location::geometry) AS lat, ST_X(c.location::geometry) AS lon
     FROM cards c WHERE c.plan_id = $1
     ORDER BY c.day_number, c.stage_order`,
    [planId]
  );
}

// ── Game Sessions ──

export async function createSession(playerId: string, planId: string) {
  return queryOne(
    `INSERT INTO game_sessions (player_id, plan_id) VALUES ($1, $2) RETURNING *`,
    [playerId, planId]
  );
}

export async function completeSession(sessionId: string) {
  return queryOne(
    `UPDATE game_sessions SET status = 'completed', completed_at = now() WHERE id = $1 RETURNING *`,
    [sessionId]
  );
}

// ── Check-ins ──

export async function insertCheckIn(
  sessionId: string,
  cardId: string,
  playerId: string,
  playerLat: number,
  playerLon: number,
  distanceMeters: number,
  locationValid: boolean,
  locationExact: boolean,
  quizAnswers: number[],
  quizCorrect: number,
  quizTotal: number,
  hintsRevealed: number,
  scoreEarned: number
) {
  const voucherUnlocked = locationValid && quizCorrect > 0;
  return queryOne(
    `INSERT INTO checkins
       (session_id, card_id, player_id, player_location,
        distance_meters, location_valid, location_exact,
        quiz_answers, quiz_correct, quiz_total, hints_revealed,
        score_earned, voucher_unlocked)
     VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($5, $4), 4326)::geography,
        $6, $7, $8, $9, $10, $11, $12, $13, $14)
     RETURNING *`,
    [
      sessionId, cardId, playerId, playerLat, playerLon,
      distanceMeters, locationValid, locationExact,
      JSON.stringify(quizAnswers), quizCorrect, quizTotal, hintsRevealed, scoreEarned,
      voucherUnlocked,
    ]
  );
}

// ── Spatial queries ──

export async function nearbyPois(lat: number, lon: number, radiusM = 5000, limit = 50) {
  return query(
    "SELECT * FROM nearby_pois($1, $2, $3, $4)",
    [lat, lon, radiusM, limit]
  );
}

// ── POI selection for card generation ──

export interface SelectedPoi {
  id: string;
  name: string;
  description: string;
  lat: number;
  lon: number;
  moods: MoodType[];
  event_kind: "permanent" | "temporary";
  valid_from: string | null;
  valid_to: string | null;
  source_url: string | null;
  source_name: string | null;
}

/**
 * Select POIs from DB for card generation.
 * Filters by city, prioritizes by mood affinity, includes temporary events in date range.
 * Returns 3 POIs per call, excluding already-used ones.
 */
export async function selectPoisForStage(
  cityId: string,
  moodProfile: MoodProfile,
  dateFrom: string,
  dateTo: string,
  excludePoiIds: string[],
  limit: number = 3
): Promise<SelectedPoi[]> {
  // Build mood scoring expression: higher score for POIs matching dominant moods
  const moodWeights = `
    CASE WHEN 'shopping' = ANY(p.moods) THEN ${moodProfile.shopping} ELSE 0 END +
    CASE WHEN 'food' = ANY(p.moods) THEN ${moodProfile.food} ELSE 0 END +
    CASE WHEN 'art' = ANY(p.moods) THEN ${moodProfile.art} ELSE 0 END +
    CASE WHEN 'nature' = ANY(p.moods) THEN ${moodProfile.nature} ELSE 0 END +
    CASE WHEN 'nightlife' = ANY(p.moods) THEN ${moodProfile.nightlife} ELSE 0 END
  `;

  const excludeClause = excludePoiIds.length > 0
    ? `AND p.id != ALL($3::uuid[])`
    : "";
  const params: unknown[] = [cityId, dateTo];
  if (excludePoiIds.length > 0) {
    params.push(excludePoiIds);
  }

  const rows = await query<SelectedPoi>(
    `SELECT * FROM (
       SELECT p.id, p.name, p.description,
         ST_Y(p.location::geometry) AS lat, ST_X(p.location::geometry) AS lon,
         p.moods::text[] AS moods, p.event_kind, p.valid_from, p.valid_to, p.source_url, p.source_name,
         (${moodWeights}) AS mood_score,
         RANDOM() * 0.3 AS serendipity
       FROM pois p
       WHERE p.city_id = $1
         AND (p.event_kind = 'permanent' OR (p.valid_from <= $2::date AND p.valid_to >= $2::date - interval '30 days'))
         ${excludeClause}
     ) sub
     ORDER BY mood_score + serendipity DESC
     LIMIT ${limit}`,
    params
  );

  return rows;
}
