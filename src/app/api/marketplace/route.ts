import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const city_id = searchParams.get("city_id") ?? null;
  const mood = searchParams.get("mood") ?? null;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const offset = (page - 1) * 12;

  const db = getServerSupabase();

  let query = db
    .from("plans")
    .select(
      `id, title, diary_blurred, avg_rating, times_played, valid_from, valid_until, moods_summary,
       cities!city_id(name, cover_url),
       creator:creator_id(email)`
    )
    .eq("is_published", true)
    .order("avg_rating", { ascending: false })
    .order("times_played", { ascending: false })
    .range(offset, offset + 11);

  if (city_id) query = query.eq("city_id", city_id);

  const { data, error } = await query;
  if (error) {
    console.error("marketplace query error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  // Filter by mood if provided (moods_summary is a JSON snapshot)
  let results = data ?? [];
  if (mood && results.length > 0) {
    const moodKey = `mood_${mood}`;
    results = results.filter((p) => {
      const ms = p.moods_summary as Record<string, number> | null;
      if (!ms) return true;
      return (ms[moodKey] ?? 0) >= 60;
    });
  }

  const plans = results.map((p) => {
    const city = (Array.isArray(p.cities) ? p.cities[0] : p.cities) as { name: string; cover_url: string | null } | null;
    const creator = (Array.isArray(p.creator) ? p.creator[0] : p.creator) as { email: string } | null;
    return {
      id: p.id,
      title: p.title,
      diary_blurred: p.diary_blurred,
      avg_rating: p.avg_rating,
      times_played: p.times_played,
      valid_from: p.valid_from,
      valid_until: p.valid_until,
      city_name: city?.name ?? null,
      cover_url: city?.cover_url ?? null,
      creator_email: creator?.email ? creator.email.split("@")[0] : "Anonimo",
    };
  });

  return NextResponse.json({ plans, page, has_more: results.length === 12 });
}
