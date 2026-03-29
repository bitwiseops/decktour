import { supabase, getAuthedSupabase } from "./supabase";
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
  const { data } = await supabase.from("profiles").select("*").eq("id", id).single();
  return data;
}

export async function upsertMoodProfile(id: string, mood: MoodProfile) {
  const { data } = await supabase
    .from("profiles")
    .update({
      mood_shopping: mood.shopping,
      mood_food: mood.food,
      mood_art: mood.art,
      mood_nature: mood.nature,
      mood_nightlife: mood.nightlife,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();
  return data;
}

// ── Cities ──

export async function getCities(): Promise<City[]> {
  const { data } = await supabase.from("cities_view").select("*").order("name");
  return (data ?? []) as unknown as City[];
}

export async function getCityByName(name: string) {
  const { data } = await supabase
    .from("cities_view")
    .select("*")
    .ilike("name", name)
    .maybeSingle();
  return data as unknown as City | null;
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
  const { data } = await supabase
    .from("plans")
    .insert({
      creator_id: creatorId,
      city_id: cityId,
      title,
      date_from: dateFrom,
      date_to: dateTo,
      num_stages: numStages,
      avg_stage_duration_min: avgDuration,
    })
    .select("*")
    .single();
  return data as Plan | null;
}

export async function getPlan(id: string, token?: string) {
  const db = token ? getAuthedSupabase(token) : supabase;
  const { data } = await db
    .from("plans")
    .select("*, cities:city_id(name, country), profiles:creator_id(display_name)")
    .eq("id", id)
    .single();
  if (!data) return null;
  const d = data as Record<string, unknown> & {
    cities?: { name: string; country: string } | null;
    profiles?: { display_name: string } | null;
  };
  return {
    ...d,
    city_name: d.cities?.name ?? null,
    country: d.cities?.country ?? null,
    city_lat: null,
    city_lon: null,
    creator_name: d.profiles?.display_name ?? null,
    cities: undefined,
    profiles: undefined,
  };
}

export async function listPlans(status?: string) {
  let q = supabase
    .from("plans")
    .select(
      "*, cities:city_id(name, country), profiles:creator_id(display_name), plan_cards(cards(rarity))"
    )
    .order("created_at", { ascending: false });
  if (status) q = q.eq("status", status as never);
  const { data } = await q;
  return (data ?? []).map((d: Record<string, unknown> & {
    cities?: { name: string; country: string } | null;
    profiles?: { display_name: string } | null;
    plan_cards?: Array<{ cards: { rarity: string } | null }> | null;
  }) => ({
    ...d,
    city_name: d.cities?.name ?? null,
    country: d.cities?.country ?? null,
    creator_name: d.profiles?.display_name ?? null,
    has_rare_cards: (d.plan_cards ?? []).some(
      (pc) => pc.cards?.rarity === "rare" || pc.cards?.rarity === "secret"
    ),
    cities: undefined,
    profiles: undefined,
    plan_cards: undefined,
  }));
}

export async function updatePlanStatus(id: string, status: string) {
  const { data } = await supabase
    .from("plans")
    .update({ status: status as never, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  return data;
}

export async function updatePlanDescription(id: string, description: string) {
  const { data } = await supabase
    .from("plans")
    .update({ description, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  return data as Plan | null;
}

export async function updatePlanImageUrl(id: string, imageUrl: string) {
  const { data } = await supabase
    .from("plans")
    .update({ image_url: imageUrl, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  return data as Plan | null;
}

// ── Cards ──

export async function insertCards(
  planId: string,
  cityId: string,
  cards: (GeneratedCard & { day_number: number; stage_order: number })[],
  durationMin: number
) {
  const rows = cards.map((c) => {
    const rarity = (c.rarity || "common") as CardRarity;
    const powerLevel = RARITY_POWER[rarity] ?? 1;
    return {
      city_id: cityId,
      title: c.title,
      description: c.description,
      moods: c.moods,
      // PostGIS geography in WKT format — accettato da PostgREST
      location: `SRID=4326;POINT(${c.lon} ${c.lat})`,
      duration_min: durationMin,
      quiz_data: c.quiz_data,
      hint_hard: c.hint_hard,
      hint_medium: c.hint_medium,
      hint_easy: c.hint_easy,
      historical_info: c.historical_info,
      voucher_description: c.suggested_voucher || null,
      voucher_partner: c.suggested_voucher_partner || null,
      voucher_code: c.suggested_voucher ? generateVoucherCode() : null,
      is_temporary_event: c.is_temporary_event,
      rarity,
      power_level: powerLevel,
    };
  });

  const { data: insertedCards } = await supabase
    .from("cards")
    .insert(rows as never[])
    .select("id");

  // Crea le associazioni plan_cards
  const planCardRows = (insertedCards ?? []).map((card: { id: string }, i) => ({
    plan_id: planId,
    card_id: card.id,
    day_number: cards[i].day_number,
    stage_order: cards[i].stage_order,
  }));
  await supabase.from("plan_cards").insert(planCardRows as never[]);

  // Rilegge da plan_cards_view per ottenere lat/lon calcolati e ordinamento
  const { data } = await supabase
    .from("plan_cards_view")
    .select("*")
    .eq("plan_id", planId)
    .order("day_number")
    .order("stage_order");
  return (data ?? []) as unknown as (Card & { lat: number; lon: number })[];
}

export async function updateCardImageUrl(cardId: string, imageUrl: string) {
  await supabase.from("cards").update({ image_url: imageUrl }).eq("id", cardId);
  const { data } = await supabase.from("cards_view").select("*").eq("id", cardId).single();
  return data as unknown as Card & { lat: number; lon: number };
}

export async function getCardsByPlan(planId: string, token?: string) {
  const db = token ? getAuthedSupabase(token) : supabase;
  const { data } = await db
    .from("plan_cards_view")
    .select("*")
    .eq("plan_id", planId)
    .order("day_number")
    .order("stage_order");
  return (data ?? []) as unknown as (Card & { lat: number; lon: number })[];
}

// ── Game Sessions ──

export async function createSession(playerId: string, planId: string) {
  const { data } = await supabase
    .from("game_sessions")
    .insert({ player_id: playerId, plan_id: planId })
    .select("*")
    .single();
  return data;
}

export async function completeSession(sessionId: string) {
  const { data } = await supabase
    .from("game_sessions")
    .update({ status: "completed" as never, completed_at: new Date().toISOString() })
    .eq("id", sessionId)
    .select("*")
    .single();
  return data;
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
  const { data } = await supabase
    .from("checkins")
    .insert({
      session_id: sessionId,
      card_id: cardId,
      player_id: playerId,
      player_location: `SRID=4326;POINT(${playerLon} ${playerLat})`,
      distance_meters: distanceMeters,
      location_valid: locationValid,
      location_exact: locationExact,
      quiz_answers: quizAnswers,
      quiz_correct: quizCorrect,
      quiz_total: quizTotal,
      hints_revealed: hintsRevealed,
      score_earned: scoreEarned,
      voucher_unlocked: voucherUnlocked,
    } as never)
    .select("*")
    .single();
  return data;
}

// ── Spatial queries ──

export async function nearbyPois(lat: number, lon: number, radiusM = 5000, limit = 50) {
  const { data } = await supabase.rpc("nearby_pois", {
    search_lat: lat,
    search_lon: lon,
    radius_meters: radiusM,
    lim: limit,
  });
  return data ?? [];
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

function moodScore(moods: MoodType[], profile: MoodProfile): number {
  let s = 0;
  for (const m of moods) {
    if (m === "shopping") s += profile.shopping;
    else if (m === "food") s += profile.food;
    else if (m === "art") s += profile.art;
    else if (m === "nature") s += profile.nature;
    else if (m === "nightlife") s += profile.nightlife;
  }
  return s;
}

/**
 * Seleziona POI dal DB per la generazione delle carte.
 * Filtra per città, ordina per affinità mood (calcolata lato JS), esclude già usati.
 */
export async function selectPoisForStage(
  cityId: string,
  moodProfile: MoodProfile,
  dateFrom: string,
  dateTo: string,
  excludePoiIds: string[],
  limit: number = 3
): Promise<SelectedPoi[]> {
  let q = supabase.from("pois_view").select("*").eq("city_id", cityId).limit(150);

  if (excludePoiIds.length > 0) {
    q = q.not("id", "in", `(${excludePoiIds.join(",")})`);
  }

  const { data: pois } = await q;

  const candidates = (pois ?? []).filter((p: Record<string, unknown>) => {
    if (p.event_kind === "permanent") return true;
    // per eventi temporanei controlla sovrapposizione date
    return (
      String(p.valid_from) <= dateTo &&
      String(p.valid_to) >= dateFrom
    );
  });

  const scored = candidates
    .map((p: Record<string, unknown>) => ({
      ...p,
      _score: moodScore((p.moods as MoodType[]) ?? [], moodProfile) + Math.random() * 0.3,
    }))
    .sort((a, b) => (b._score as number) - (a._score as number));

  return scored.slice(0, limit) as unknown as SelectedPoi[];
}

// ── Score ─────────────────────────────────────────────────────────────────────

export async function addPlayerScore(playerId: string, delta: number) {
  const { data: current, error: fetchErr } = await supabase
    .from("profiles")
    .select("total_score")
    .eq("id", playerId)
    .single();
  if (fetchErr && fetchErr.code !== "PGRST116") throw fetchErr;
  const newTotal = (current?.total_score ?? 0) + delta;
  const { data, error } = await supabase
    .from("profiles")
    .update({ total_score: newTotal })
    .eq("id", playerId)
    .select()
    .single();
  if (error) throw error;
  return data;
}
