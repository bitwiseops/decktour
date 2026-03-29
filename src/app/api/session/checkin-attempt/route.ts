import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getAuthedSupabase } from "@/lib/supabase";

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { progress_id, user_lat, user_lon } = await req.json() as { progress_id: string; user_lat: number; user_lon: number };
    const token = req.headers.get("authorization")!.slice(7);
    const db = getAuthedSupabase(token);

    // Verify ownership
    const { data: progress } = await db
      .from("session_card_progress")
      .select("id, card_id, session_id, navigator_hint_used, game_sessions!session_id(explorer_id)")
      .eq("id", progress_id)
      .maybeSingle();

    if (!progress) return NextResponse.json({ error: "Progress not found" }, { status: 404 });
    const session = (Array.isArray(progress.game_sessions) ? progress.game_sessions[0] : progress.game_sessions) as { explorer_id: string } | null;
    if (session?.explorer_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Get card coordinates (server-side only)
    const { data: card } = await db
      .from("cards")
      .select("lat, lon, story, photo_url, challenge_content")
      .eq("id", progress.card_id)
      .maybeSingle();

    if (!card) return NextResponse.json({ error: "Card not found" }, { status: 404 });

    const distance = haversineDistance(user_lat, user_lon, card.lat, card.lon);

    if (distance > 500) {
      return NextResponse.json({
        success: false,
        distance_meters: Math.round(distance),
        message: "Sei ancora lontano, continua a cercare!",
      });
    }

    const bonus_intuition = !progress.navigator_hint_used;
    const location_name = (card.challenge_content as Record<string, string> | null)?.location_name ?? "Luogo Misterioso";

    await db.from("session_card_progress").update({
      status: "checked_in",
      checkin_lat: user_lat,
      checkin_lon: user_lon,
      checkin_time: new Date().toISOString(),
      bonus_intuition,
    }).eq("id", progress_id);

    return NextResponse.json({
      success: true,
      bonus_intuition,
      location_name,
      story: card.story,
      photo_url: card.photo_url,
      bonus_points: bonus_intuition ? 20 : 0,
    });
  } catch (err) {
    console.error("session/checkin-attempt error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
