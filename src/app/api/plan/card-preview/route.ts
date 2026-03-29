import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";

// Returns title + mood_tags for a card — no location data
export async function GET(req: NextRequest) {
  const card_id = req.nextUrl.searchParams.get("card_id");
  if (!card_id) return NextResponse.json({ error: "Missing card_id" }, { status: 400 });

  const db = getServerSupabase();
  const { data } = await db
    .from("cards")
    .select("id,title,mood_tags,rarity")
    .eq("id", card_id)
    .maybeSingle();

  if (!data) return NextResponse.json({ error: "Card not found" }, { status: 404 });

  return NextResponse.json({ title: data.title, mood_tags: data.mood_tags, rarity: data.rarity });
}
