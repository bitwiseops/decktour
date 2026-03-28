import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

function parseJsonFromText(text: string): { title: string; diary_blurred: string } {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON in AI response");
  return JSON.parse(match[0]);
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { session_token, custom_title } = await req.json() as { session_token: string; custom_title?: string };
    const db = getServerSupabase();

    // Load planning session
    const { data: sess } = await db
      .from("planning_sessions")
      .select("*")
      .eq("id", session_token)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!sess) return NextResponse.json({ error: "Session not found" }, { status: 404 });

    // Load user mood profile
    const { data: profile } = await db
      .from("player_profiles")
      .select("mood_art,mood_food,mood_nature,mood_shopping,mood_nightlife")
      .eq("user_id", user.id)
      .maybeSingle();

    const moods = profile ?? { mood_art: 50, mood_food: 50, mood_nature: 50, mood_shopping: 50, mood_nightlife: 50 };
    const picks = (sess.picks ?? []) as Array<{ card_id: string; day_number: number; position: number; mood_tags: string[]; rarity: string }>;

    // First AI call — generate title + diary_blurred
    const aiPrompt = `
Sei il narratore poetico di DeckTour, un gioco di viaggio esperienziale.

Un viaggiatore ha pianificato un viaggio con queste tappe:
${JSON.stringify(picks.map((p) => ({ mood: p.mood_tags, rarity: p.rarity, day: p.day_number, position: p.position })))}

Il suo profilo emozionale:
- Arte & Storia: ${moods.mood_art}%
- Enogastronomia: ${moods.mood_food}%
- Natura: ${moods.mood_nature}%
- Acquisti: ${moods.mood_shopping}%
- Vita Notturna: ${moods.mood_nightlife}%

Genera in formato JSON:
1. "title": titolo poetico del viaggio (massimo 6 parole, italiano, evocativo, senza nomi di luoghi)
2. "diary_blurred": racconto in prima persona futura (3 paragrafi, ~150 parole totali).
   Regole: non nominare mai luoghi specifici, parla solo di sensazioni e atmosfere,
   usa metafore sensoriali, tono onirico, un paragrafo per giorno.

Rispondi SOLO con il JSON. Formato: {"title":"...","diary_blurred":"..."}
`.trim();

    const aiResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{ role: "user", content: aiPrompt }],
    });

    const aiText = aiResponse.content[0].type === "text" ? aiResponse.content[0].text : "{}";
    const { title: aiTitle, diary_blurred } = parseJsonFromText(aiText);

    const finalTitle = (custom_title && custom_title.trim()) ? custom_title.trim() : aiTitle;

    // Insert plan
    const { data: plan, error: planErr } = await db
      .from("plans")
      .insert({
        city_id: sess.city_id,
        creator_id: user.id,
        title: finalTitle,
        diary_blurred,
        moods_summary: moods,
        valid_from: sess.date_from,
        valid_until: sess.date_to,
        num_days: sess.num_days,
        stops_per_day: sess.stops_per_day,
        stop_duration: sess.stop_duration,
        is_published: false,
      })
      .select("id")
      .single();

    if (planErr || !plan) {
      console.error("plan insert error:", planErr);
      return NextResponse.json({ error: "Failed to save plan" }, { status: 500 });
    }

    // Insert plan_days and plan_day_cards
    const days = [...new Set(picks.map((p) => p.day_number))].sort();
    for (const dayNum of days) {
      const { data: planDay, error: dayErr } = await db
        .from("plan_days")
        .insert({ plan_id: plan.id, day_number: dayNum })
        .select("id")
        .single();

      if (dayErr || !planDay) { console.error("plan_days insert error:", dayErr); continue; }

      const dayPicks = picks.filter((p) => p.day_number === dayNum);
      for (const pick of dayPicks) {
        await db.from("plan_day_cards").insert({
          plan_day_id: planDay.id,
          card_id: pick.card_id,
          position: pick.position,
        });
      }
    }

    // Delete planning session
    await db.from("planning_sessions").delete().eq("id", session_token);

    return NextResponse.json({ plan_id: plan.id, title: finalTitle, diary_blurred });
  } catch (err) {
    console.error("plan/seal error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
