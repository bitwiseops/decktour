import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";

// Public endpoint — returns plan info for the play landing page
export async function GET(req: NextRequest, { params }: { params: Promise<{ plan_id: string }> }) {
  const { plan_id } = await params;
  const db = getServerSupabase();

  const { data } = await db
    .from("plans")
    .select("id,title,diary_blurred,avg_rating,times_played,num_days,stop_duration,city_id,creator_id,is_published,cities!city_id(name,cover_url)")
    .eq("id", plan_id)
    .maybeSingle();

  if (!data) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

  const city = data.cities as unknown as { name: string; cover_url: string | null } | null;

  // Fetch creator name separately (no direct FK between plans and player_profiles)
  let creatorName = "Esploratore";
  if (data.creator_id) {
    const { data: profile } = await db
      .from("player_profiles")
      .select("display_name")
      .eq("user_id", data.creator_id)
      .maybeSingle();
    if (profile?.display_name) creatorName = profile.display_name;
  }

  return NextResponse.json({
    id: data.id,
    title: data.title,
    diary_blurred: data.diary_blurred,
    avg_rating: data.avg_rating,
    times_played: data.times_played,
    num_days: data.num_days,
    stop_duration: data.stop_duration,
    city_name: city?.name ?? null,
    cover_url: city?.cover_url ?? null,
    creator_email: creatorName,
    is_published: data.is_published,
  });
}
