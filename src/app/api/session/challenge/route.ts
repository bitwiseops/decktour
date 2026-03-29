import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const progress_id = req.nextUrl.searchParams.get("progress_id");
    if (!progress_id) return NextResponse.json({ error: "Missing progress_id" }, { status: 400 });

    const db = getServerSupabase();

    const { data: progress } = await db
      .from("session_card_progress")
      .select("card_id, game_sessions!session_id(explorer_id)")
      .eq("id", progress_id)
      .maybeSingle();

    if (!progress) return NextResponse.json({ error: "Progress not found" }, { status: 404 });
    const session = progress.game_sessions as { explorer_id: string } | null;
    if (session?.explorer_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data: card } = await db
      .from("cards")
      .select("challenge_content")
      .eq("id", progress.card_id)
      .maybeSingle();

    const cc = card?.challenge_content as Record<string, unknown> | null;
    // Return ONLY question + options — NOT correct_index
    return NextResponse.json({
      question: cc?.question ?? null,
      options: cc?.options ?? [],
    });
  } catch (err) {
    console.error("session/challenge error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
