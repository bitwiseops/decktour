import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";

export async function GET() {
  const db = getServerSupabase();
  const { data } = await db
    .from("cities")
    .select("id,name,country,lat,lon,cover_url,audio_url")
    .eq("is_active", true)
    .order("name");
  return NextResponse.json(data ?? []);
}
