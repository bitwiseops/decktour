import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getAuthedSupabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({})) as { display_name?: string };

    // Prefer nickname from body, fallback to OAuth metadata
    const meta = (user.user_metadata ?? {}) as Record<string, string>;
    const display_name = body.display_name?.trim() || meta.full_name || meta.name || user.email?.split("@")[0] || null;
    const avatar_url = meta.avatar_url ?? meta.picture ?? null;

    const token = req.headers.get("authorization")!.slice(7);
    const db = getAuthedSupabase(token);
    const { error } = await db.from("player_profiles").upsert(
      {
        user_id: user.id,
        display_name,
        avatar_url,
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
