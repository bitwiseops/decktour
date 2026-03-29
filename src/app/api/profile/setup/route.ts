import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json() as {
      mood_art: number;
      mood_food: number;
      mood_nature: number;
      mood_shopping: number;
      mood_nightlife: number;
    };

    // Read display_name and avatar_url from Supabase user metadata (set by Google OAuth etc.)
    const meta = (user.user_metadata ?? {}) as Record<string, string>;
    const display_name = meta.full_name ?? meta.name ?? user.email?.split("@")[0] ?? null;
    const avatar_url = meta.avatar_url ?? meta.picture ?? null;

    const db = getServerSupabase();
    const { error } = await db.from("player_profiles").upsert(
      {
        user_id: user.id,
        display_name,
        avatar_url,
        mood_art: body.mood_art,
        mood_food: body.mood_food,
        mood_nature: body.mood_nature,
        mood_shopping: body.mood_shopping,
        mood_nightlife: body.mood_nightlife,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("profile/setup error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
