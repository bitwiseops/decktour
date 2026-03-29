import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get("month") ?? new Date().toISOString().slice(0, 7);
  const db = getServerSupabase();

  const { data } = await db
    .from("leaderboard_plans")
    .select("id, plan_id, times_played, avg_score, plans!plan_id(title, cities!city_id(name))")
    .eq("month", month)
    .order("times_played", { ascending: false })
    .limit(20);

  const result = (data ?? []).map((r, i) => {
    const plan = r.plans as unknown as { title: string; cities: { name: string } | null } | null;
    return {
      rank: i + 1,
      plan_id: r.plan_id,
      title: plan?.title ?? "Piano",
      city_name: plan?.cities?.name ?? null,
      times_played: r.times_played,
      avg_score: Math.round(r.avg_score),
    };
  });

  return NextResponse.json({ plans: result, month });
}
