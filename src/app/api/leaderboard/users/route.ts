import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get("month") ?? new Date().toISOString().slice(0, 7);
  const db = getServerSupabase();

  const { data } = await db
    .from("leaderboard_users")
    .select("id, user_id, monthly_points, total_points")
    .eq("month", month)
    .order("monthly_points", { ascending: false })
    .limit(20);

  // Fetch emails from auth.users via service role
  const userIds = (data ?? []).map((r) => r.user_id);
  const emailMap: Record<string, string> = {};

  if (userIds.length > 0) {
    for (const uid of userIds) {
      const { data: authUser } = await db.auth.admin.getUserById(uid);
      emailMap[uid] = authUser?.user?.email?.split("@")[0] ?? "Anonimo";
    }
  }

  const result = (data ?? []).map((r, i) => ({
    rank: i + 1,
    user_id: r.user_id,
    username: emailMap[r.user_id] ?? "Anonimo",
    monthly_points: r.monthly_points,
    total_points: r.total_points,
  }));

  return NextResponse.json({ users: result, month });
}
