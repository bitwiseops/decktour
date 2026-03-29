import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getAuthedSupabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = req.headers.get("authorization")!.slice(7);
  const db = getAuthedSupabase(token);

  const { data, error } = await db
    .from("plans")
    .select("id, title, valid_from, valid_until, num_days, times_played, avg_rating, diary_blurred, is_published, cities:city_id(name, cover_url)")
    .eq("creator_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const plans = (data ?? []).map((p: {
    id: string; title: string; valid_from: string | null; valid_until: string | null;
    num_days: number; times_played: number; avg_rating: number; diary_blurred: string | null;
    is_published: boolean;
    cities: { name: string; cover_url: string | null } | null;
  }) => ({
    id: p.id,
    title: p.title,
    valid_from: p.valid_from,
    valid_until: p.valid_until,
    num_days: p.num_days,
    times_played: p.times_played,
    avg_rating: p.avg_rating,
    diary_blurred: p.diary_blurred,
    is_published: p.is_published,
    city_name: p.cities?.name ?? null,
    cover_url: p.cities?.cover_url ?? null,
  }));

  return NextResponse.json(plans);
}
