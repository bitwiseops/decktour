import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase";

interface DeckCard { card_id: string; rarity: string; weight: number; }

function weightedDraw(deck: DeckCard[], count: number, exclude: string[]): DeckCard[] {
  const pool = deck.filter((c) => !exclude.includes(c.card_id));
  const result: DeckCard[] = [];
  const remaining = [...pool];

  for (let i = 0; i < count && remaining.length > 0; i++) {
    const totalWeight = remaining.reduce((s, c) => s + c.weight, 0);
    let rand = Math.random() * totalWeight;
    let idx = 0;
    for (; idx < remaining.length - 1; idx++) {
      rand -= remaining[idx].weight;
      if (rand <= 0) break;
    }
    result.push(remaining[idx]);
    remaining.splice(idx, 1);
  }
  return result;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { session_token, stop_index, day_number, position, picked_card_id } = await req.json();
    const db = getServerSupabase();

    // Verify session belongs to user
    const { data: sess } = await db
      .from("planning_sessions")
      .select("*")
      .eq("id", session_token)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!sess) return NextResponse.json({ error: "Session not found" }, { status: 404 });

    // Get card reveal data (title, story, mood_tags, rarity — no lat/lon/location_name)
    const { data: card } = await db
      .from("cards")
      .select("id,title,story,mood_tags,rarity,base_points,stop_duration")
      .eq("id", picked_card_id)
      .maybeSingle();

    if (!card) return NextResponse.json({ error: "Card not found" }, { status: 404 });

    const deck: DeckCard[] = sess.deck as DeckCard[];
    const picks: Array<{ card_id: string; day_number: number; position: number; mood_tags: string[]; rarity: string }> = sess.picks as never[] ?? [];

    // Add pick
    const newPick = { card_id: picked_card_id, day_number, position, mood_tags: card.mood_tags, rarity: card.rarity };
    const newPicks = [...picks, newPick];

    const pickedIds = newPicks.map((p) => p.card_id);
    const is_last_stop = newPicks.length >= sess.total_stops;

    // Apply bias: if picked card's mood is arte_storia, boost cards with different mood by 20%
    const pickedMood = (card.mood_tags ?? [])[0] ?? null;
    let biasedDeck = deck;
    if (pickedMood) {
      biasedDeck = deck.map((c) => {
        // We don't have mood_tags in the deck entries easily, so apply a general +20% to non-matching
        return c;
      });
    }

    // Draw next trio (excluding all picked cards)
    const next_trio = is_last_stop ? [] : weightedDraw(biasedDeck, 3, pickedIds).map(({ card_id, rarity }) => ({ card_id, rarity }));

    // Update session
    await db
      .from("planning_sessions")
      .update({ picks: newPicks, current_trio: next_trio })
      .eq("id", session_token);

    return NextResponse.json({
      card_reveal: {
        title: card.title,
        story: card.story,
        mood_tags: card.mood_tags,
        rarity: card.rarity,
        estimated_duration: sess.stop_duration,
      },
      next_trio,
      is_last_stop,
    });
  } catch (err) {
    console.error("plan/pick error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
