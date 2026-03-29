import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getAuthedSupabase } from "@/lib/supabase";

interface InitRequest {
  city_id: string;
  date_from: string;
  date_to: string;
  stops_per_day: number;
  stop_duration: string;
  mood_art: number;
  mood_food: number;
  mood_nature: number;
  mood_shopping: number;
  mood_nightlife: number;
}

interface DeckCard {
  card_id: string;
  rarity: string;
  weight: number;
}

interface PickedCard {
  card_id: string;
  rarity: string;
}

/** Weighted random draw without replacement */
function weightedDraw(deck: DeckCard[], count: number, exclude: string[]): DeckCard[] {
  const available = deck.filter((c) => !exclude.includes(c.card_id));
  const result: DeckCard[] = [];
  const pool = [...available];

  for (let i = 0; i < count && pool.length > 0; i++) {
    const totalWeight = pool.reduce((s, c) => s + c.weight, 0);
    let rand = Math.random() * totalWeight;
    let idx = 0;
    for (; idx < pool.length - 1; idx++) {
      rand -= pool[idx].weight;
      if (rand <= 0) break;
    }
    result.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return result;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json()) as InitRequest;
    const token = req.headers.get("authorization")!.slice(7);
    const db = getAuthedSupabase(token);

    // Mood profile comes from the request (per-plan, not per-user)
    const moods: Record<string, number> = {
      arte_storia: body.mood_art ?? 50,
      enogastronomia: body.mood_food ?? 50,
      natura_outdoor: body.mood_nature ?? 50,
      acquisti: body.mood_shopping ?? 50,
      vita_notturna: body.mood_nightlife ?? 50,
    };

    const moodSnapshot = {
      mood_art: body.mood_art ?? 50,
      mood_food: body.mood_food ?? 50,
      mood_nature: body.mood_nature ?? 50,
      mood_shopping: body.mood_shopping ?? 50,
      mood_nightlife: body.mood_nightlife ?? 50,
    };

    // Calculate days and stops
    const from = new Date(body.date_from);
    const to = new Date(body.date_to);
    const num_days = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000) + 1);
    const total_stops = num_days * body.stops_per_day;

    // Query cards for this city
    const { data: cards, error: cardsErr } = await db
      .from("cards")
      .select("id,rarity,mood_tags,is_temporary,valid_from,valid_until")
      .eq("city_id", body.city_id)
      .eq("is_active", true);

    if (cardsErr || !cards || cards.length === 0) {
      return NextResponse.json({ error: "No cards available for this city." }, { status: 400 });
    }

    // Filter temporary cards by date overlap
    const validCards = cards.filter((c) => {
      if (!c.is_temporary) return true;
      const validFrom = c.valid_from ? new Date(c.valid_from) : null;
      const validUntil = c.valid_until ? new Date(c.valid_until) : null;
      if (validFrom && validFrom > to) return false;
      if (validUntil && validUntil < from) return false;
      return true;
    });

    // Build weighted deck
    const deck: DeckCard[] = validCards.map((c) => {
      const tags: string[] = c.mood_tags ?? [];
      const affinity = tags.length > 0
        ? tags.reduce((sum, t) => sum + (moods[t] ?? 50), 0) / tags.length / 100
        : 0.5;

      let weight: number;
      if (c.rarity === "common") weight = 70 * affinity;
      else if (c.rarity === "rare") weight = 25 * affinity;
      else weight = 5; // secret — peso fisso, sorpresa

      return { card_id: c.id, rarity: c.rarity, weight: Math.max(weight, 0.1) };
    });

    // Draw first trio
    const first_trio = weightedDraw(deck, 3, []).map(({ card_id, rarity }) => ({ card_id, rarity }));

    // Save planning session
    const { data: session, error: sessionErr } = await db
      .from("planning_sessions")
      .insert({
        user_id: user.id,
        city_id: body.city_id,
        date_from: body.date_from,
        date_to: body.date_to,
        stops_per_day: body.stops_per_day,
        stop_duration: body.stop_duration,
        num_days,
        total_stops,
        deck: deck,
        moods_snapshot: moodSnapshot,
        picks: [],
        current_trio: first_trio,
        reshuffle_count: 0,
      })
      .select("id")
      .single();

    if (sessionErr || !session) {
      console.error("planning_sessions insert error:", sessionErr);
      return NextResponse.json({ error: "Could not create planning session." }, { status: 500 });
    }

    return NextResponse.json({
      session_token: session.id,
      num_days,
      total_stops,
      first_trio,
    });
  } catch (err) {
    console.error("plan/init error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
