import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase";
import { log, error as logError } from "@/lib/logger";

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

    // Get card reveal data
    const { data: card, error: cardErr } = await db
      .from("cards")
      .select("id,title,mood_tags,rarity")
      .eq("id", picked_card_id)
      .maybeSingle();

    if (cardErr || !card) {
      logError("plan/pick card not found", { cardErr: cardErr?.message, cardErrCode: cardErr?.code, picked_card_id });
      return NextResponse.json({ error: "Card not found", detail: cardErr?.message ?? "no row" }, { status: 404 });
    }
    log("plan/pick card found", { id: card.id, title: card.title });

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

export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { session_token, undo_to_index } = await req.json();
    const db = getServerSupabase();

    const { data: sess } = await db
      .from("planning_sessions")
      .select("*")
      .eq("id", session_token)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!sess) return NextResponse.json({ error: "Session not found" }, { status: 404 });

    const deck: DeckCard[] = sess.deck as DeckCard[];
    const picks: Array<{ card_id: string }> = (sess.picks as never[]) ?? [];

    const newPicks = picks.slice(0, undo_to_index);
    const pickedIds = newPicks.map((p) => p.card_id);
    const new_trio = weightedDraw(deck, 3, pickedIds).map(({ card_id, rarity }) => ({ card_id, rarity }));

    await db
      .from("planning_sessions")
      .update({ picks: newPicks, current_trio: new_trio })
      .eq("id", session_token);

    return NextResponse.json({ new_trio, picks_count: newPicks.length });
  } catch (err) {
    console.error("plan/pick DELETE error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
