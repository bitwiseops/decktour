import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { progress_id } = await req.json() as { progress_id: string };
    const db = getServerSupabase();

    const { data: progress } = await db
      .from("session_card_progress")
      .select("id, session_id, game_sessions!session_id(explorer_id, current_card_index)")
      .eq("id", progress_id)
      .maybeSingle();

    if (!progress) return NextResponse.json({ error: "Progress not found" }, { status: 404 });
    const gameSession = progress.game_sessions as unknown as { explorer_id: string; current_card_index: number } | null;
    if (gameSession?.explorer_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await db.from("session_card_progress").update({ status: "skipped", points_earned: 0 }).eq("id", progress_id);
    const newIndex = (gameSession?.current_card_index ?? 0) + 1;
    await db.from("game_sessions").update({ current_card_index: newIndex }).eq("id", progress.session_id);

    const { data: nextProgress } = await db
      .from("session_card_progress")
      .select("id")
      .eq("session_id", progress.session_id)
      .eq("status", "pending")
      .order("day_number")
      .order("position")
      .limit(1)
      .maybeSingle();

    return NextResponse.json({ next_progress_id: nextProgress?.id ?? null, is_last_stop: !nextProgress });
  } catch (err) {
    console.error("session/skip error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
