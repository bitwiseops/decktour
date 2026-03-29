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

    const { session_token, stop_index } = await req.json();
    const db = getServerSupabase();

    const { data: sess } = await db
      .from("planning_sessions")
      .select("*")
      .eq("id", session_token)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!sess) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    if (sess.reshuffle_count >= 2) return NextResponse.json({ error: "No reshuffles remaining" }, { status: 400 });

    const deck: DeckCard[] = sess.deck as DeckCard[];
    const picks: Array<{ card_id: string }> = (sess.picks as never[]) ?? [];
    const currentTrio: Array<{ card_id: string }> = (sess.current_trio as never[]) ?? [];

    // Exclude picked cards AND current trio cards
    const exclude = [...picks.map((p) => p.card_id), ...currentTrio.map((c) => c.card_id)];
    const next_trio = weightedDraw(deck, 3, exclude).map(({ card_id, rarity }) => ({ card_id, rarity }));

    const newCount = sess.reshuffle_count + 1;
    await db
      .from("planning_sessions")
      .update({ reshuffle_count: newCount, current_trio: next_trio })
      .eq("id", session_token);

    return NextResponse.json({ next_trio, reshuffle_count: newCount });
  } catch (err) {
    console.error("plan/reshuffle error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
