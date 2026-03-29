import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase";

// Returns clue info for a stop — no lat/lon/location_name
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const progress_id = req.nextUrl.searchParams.get("progress_id");
  if (!progress_id) return NextResponse.json({ error: "Missing progress_id" }, { status: 400 });

  const db = getServerSupabase();
  const { data: progress } = await db
    .from("session_card_progress")
    .select("id, card_id, day_number, position, session_id, game_sessions!session_id(explorer_id, plans!plan_id(stop_duration))")
    .eq("id", progress_id)
    .maybeSingle();

  if (!progress) return NextResponse.json({ error: "Progress not found" }, { status: 404 });
  const gameSession = progress.game_sessions as unknown as { explorer_id: string; plans: { stop_duration: string } | null } | null;
  if (gameSession?.explorer_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: card } = await db
    .from("cards")
    .select("rarity, mood_tags, challenge_content")
    .eq("id", progress.card_id)
    .maybeSingle();

  const cc = card?.challenge_content as Record<string, string> | null;

  return NextResponse.json({
    clue_primary: cc?.clue_primary ?? "Parti alla scoperta...",
    rarity: card?.rarity ?? "common",
    mood_tags: card?.mood_tags ?? [],
    day_number: progress.day_number,
    position: progress.position,
    stop_duration: gameSession?.plans?.stop_duration ?? "2h",
  });
}
