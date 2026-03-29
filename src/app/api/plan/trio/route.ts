import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase";

// Returns the current trio for a planning session
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const session_token = req.nextUrl.searchParams.get("session_token");
  if (!session_token) return NextResponse.json({ error: "Missing session_token" }, { status: 400 });

  const db = getServerSupabase();
  const { data: sess } = await db
    .from("planning_sessions")
    .select("current_trio,total_stops,picks")
    .eq("id", session_token)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!sess) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  return NextResponse.json({ trio: sess.current_trio ?? [] });
}
