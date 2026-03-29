import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { progress_id } = await req.json() as { progress_id: string };
    const db = getServerSupabase();

    // Verify progress belongs to user via session
    const { data: progress } = await db
      .from("session_card_progress")
      .select("id, card_id, session_id, game_sessions!session_id(explorer_id)")
      .eq("id", progress_id)
      .maybeSingle();

    if (!progress) return NextResponse.json({ error: "Progress not found" }, { status: 404 });
    const session = progress.game_sessions as unknown as { explorer_id: string } | null;
    if (session?.explorer_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Mark hint used
    await db
      .from("session_card_progress")
      .update({ navigator_hint_used: true })
      .eq("id", progress_id);

    // Get clue_extra from challenge_content
    const { data: card } = await db
      .from("cards")
      .select("challenge_content")
      .eq("id", progress.card_id)
      .maybeSingle();

    const clue_extra = (card?.challenge_content as Record<string, string> | null)?.clue_extra ?? "Sei sulla strada giusta...";

    return NextResponse.json({ clue_extra });
  } catch (err) {
    console.error("session/hint error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
