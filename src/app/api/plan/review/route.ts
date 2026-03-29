import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getAuthedSupabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { plan_id, session_id, stars, description } = await req.json() as {
      plan_id: string; session_id: string; stars: number; description?: string;
    };

    if (stars < 1 || stars > 5) return NextResponse.json({ error: "Stars must be 1-5" }, { status: 400 });

    const token = req.headers.get("authorization")!.slice(7);
    const db = getAuthedSupabase(token);

    // Verify session belongs to user
    const { data: sess } = await db
      .from("game_sessions")
      .select("explorer_id")
      .eq("id", session_id)
      .maybeSingle();

    if (!sess || sess.explorer_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await db.from("plan_reviews").insert({
      plan_id,
      session_id,
      reviewer_id: user.id,
      stars,
      description: description ?? null,
    });

    // Recalculate avg_rating
    const { data: reviews } = await db.from("plan_reviews").select("stars").eq("plan_id", plan_id);
    if (reviews && reviews.length > 0) {
      const avg = reviews.reduce((s, r) => s + r.stars, 0) / reviews.length;
      await db.from("plans").update({ avg_rating: avg }).eq("id", plan_id);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("plan/review error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
