import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase";
import crypto from "node:crypto";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { plan_id } = await req.json() as { plan_id: string };
    const db = getServerSupabase();

    // Verify plan is published or belongs to the user
    const { data: plan } = await db
      .from("plans")
      .select("id,creator_id,is_published,stop_duration")
      .eq("id", plan_id)
      .maybeSingle();

    if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    if (!plan.is_published && plan.creator_id !== user.id) {
      return NextResponse.json({ error: "Plan not available" }, { status: 403 });
    }

    const session_code = "DT-" + crypto.randomBytes(3).toString("hex").toUpperCase();

    // Create game session
    const { data: gameSession, error: gsErr } = await db
      .from("game_sessions")
      .insert({
        plan_id,
        explorer_id: user.id,
        session_code,
        mode: "solo",
        status: "active",
      })
      .select("id")
      .single();

    if (gsErr || !gameSession) {
      console.error("game_sessions insert error:", gsErr);
      return NextResponse.json({ error: "Could not create game session" }, { status: 500 });
    }

    // Fetch all plan_days for this plan, then fetch plan_day_cards
    const { data: planDays } = await db
      .from("plan_days")
      .select("id,day_number")
      .eq("plan_id", plan_id)
      .order("day_number");

    if (!planDays || planDays.length === 0) {
      return NextResponse.json({ error: "Plan has no days" }, { status: 400 });
    }

    const planDayIds = planDays.map((d) => d.id);
    const dayMap: Record<string, number> = Object.fromEntries(planDays.map((d) => [d.id, d.day_number]));

    const { data: planDayCards } = await db
      .from("plan_day_cards")
      .select("card_id, position, plan_day_id")
      .in("plan_day_id", planDayIds)
      .order("position");

    const allCards = (planDayCards ?? [])
      .map((pdc) => ({ card_id: pdc.card_id, position: pdc.position, day_number: dayMap[pdc.plan_day_id] ?? 1 }))
      .sort((a, b) => a.day_number !== b.day_number ? a.day_number - b.day_number : a.position - b.position);

    if (allCards.length === 0) {
      return NextResponse.json({ error: "Plan has no cards" }, { status: 400 });
    }

    // Insert session_card_progress for each card
    const progressInserts = allCards.map((pdc) => ({
      session_id: gameSession.id,
      card_id: pdc.card_id,
      day_number: pdc.day_number,
      position: pdc.position,
      status: "pending",
    }));

    const { data: progressRows, error: progErr } = await db
      .from("session_card_progress")
      .insert(progressInserts)
      .select("id, card_id, day_number, position")
      .order("day_number")
      .order("position");

    if (progErr || !progressRows || progressRows.length === 0) {
      console.error("session_card_progress insert error:", progErr);
      return NextResponse.json({ error: "Could not create progress records" }, { status: 500 });
    }

    // Get first card's clue (no lat/lon/location_name)
    const firstProgress = progressRows[0];
    const { data: firstCard } = await db
      .from("cards")
      .select("id, mood_tags, rarity, base_points, challenge_content")
      .eq("id", firstProgress.card_id)
      .maybeSingle();

    const clue_primary = (firstCard?.challenge_content as Record<string, string> | null)?.clue_primary ?? "Parti alla scoperta...";

    return NextResponse.json({
      session_id: gameSession.id,
      session_code,
      total_stops: progressRows.length,
      first_card: {
        progress_id: firstProgress.id,
        clue_primary,
        rarity: firstCard?.rarity ?? "common",
        mood_tags: firstCard?.mood_tags ?? [],
        day_number: firstProgress.day_number,
        position: firstProgress.position,
        stop_duration: plan.stop_duration,
      },
    });
  } catch (err) {
    console.error("session/start error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
