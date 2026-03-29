import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getAuthedSupabase } from "@/lib/supabase";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { session_id } = await req.json() as { session_id: string };
    const token = req.headers.get("authorization")!.slice(7);
    const db = getAuthedSupabase(token);

    // Load game session
    const { data: gameSession } = await db
      .from("game_sessions")
      .select("id, plan_id, explorer_id, total_score, status, plans!plan_id(id, title, diary_blurred, creator_id, stop_duration)")
      .eq("id", session_id)
      .maybeSingle();

    if (!gameSession) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    if (gameSession.explorer_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const _plan = Array.isArray(gameSession.plans) ? gameSession.plans[0] : gameSession.plans;
    const plan = _plan as unknown as { id: string; title: string; diary_blurred: string | null; creator_id: string; stop_duration: string } | null;

    // Mark session complete
    await db.from("game_sessions").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", session_id);

    // Load all progress rows with card info
    const { data: progressRows } = await db
      .from("session_card_progress")
      .select("id, card_id, status, points_earned, is_correct, navigator_hint_used, day_number, position, cards!card_id(base_points, rarity, challenge_content)")
      .eq("session_id", session_id);

    const rows = (progressRows ?? []).map((r) => ({
      ...r,
      cards: (Array.isArray(r.cards) ? r.cards[0] : r.cards) as unknown as { base_points: number; rarity: string; challenge_content: Record<string, unknown> } | null,
    })) as Array<{
      id: string; card_id: string; status: string; points_earned: number;
      is_correct: boolean | null; navigator_hint_used: boolean; day_number: number; position: number;
      cards: { base_points: number; rarity: string; challenge_content: Record<string, unknown> } | null;
    }>;

    const completed = rows.filter((r) => r.status === "completed");
    const skipped = rows.filter((r) => r.status === "skipped");
    const total_stops_count = rows.length;

    // max_possible_score = sum of base_points * 1.2
    const max_possible_score = rows.reduce((sum, r) => sum + (r.cards?.base_points ?? 100) * 1.2, 0);
    const completion_rate = total_stops_count > 0 ? completed.length / total_stops_count : 0;
    const stops_without_hints = completed.filter((r) => !r.navigator_hint_used).length;
    const vouchers_unlocked = completed.filter((r) => r.is_correct).length;
    const total_score = gameSession.total_score;

    // Build data for AI prompt
    const completed_cards = completed.map((r) => ({
      location_name: (r.cards?.challenge_content as Record<string, string> | null)?.location_name ?? "Luogo",
      points_earned: r.points_earned,
      is_correct: r.is_correct,
      day_number: r.day_number,
    }));
    const skipped_cards = skipped.map((r) => ({
      location_name: (r.cards?.challenge_content as Record<string, string> | null)?.location_name ?? "Luogo",
    }));

    // Second AI call — generate diary_revealed
    const aiPrompt = `
Sei il narratore poetico di DeckTour. Il viaggiatore ha completato il suo viaggio.

Diario del Futuro (versione sfocata, scritta prima del viaggio):
"${plan?.diary_blurred ?? ""}"

Tappe completate:
${JSON.stringify(completed_cards.map((c) => ({ luogo: c.location_name, punti: c.points_earned, risposta_corretta: c.is_correct, giorno: c.day_number })))}

Tappe saltate: ${JSON.stringify(skipped_cards.map((c) => c.location_name))}

Performance: ${total_score} punti su ${Math.round(max_possible_score)} possibili. ${stops_without_hints} luoghi trovati senza indizi.

Scrivi il Diario Svelato in prima persona passata.
Regole: nomina i luoghi reali, richiama le atmosfere del diario sfocato,
1 paragrafo per tappa completata, una frase di rimpianto per le saltate,
chiudi con una frase sul tono complessivo (trionfale / buona / da migliorare) senza numeri.
Tono caldo, italiano letterario. Circa 200 parole.

Rispondi SOLO con il testo del diario, nessun JSON, nessun titolo.
`.trim();

    let diary_revealed = "";
    try {
      const aiResponse = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        messages: [{ role: "user", content: aiPrompt }],
      });
      diary_revealed = aiResponse.content[0].type === "text" ? aiResponse.content[0].text : "";
    } catch (aiErr) {
      console.error("AI diary error (non-fatal):", aiErr);
      diary_revealed = "Il viaggio è finito. I luoghi visitati rimarranno impressi nel cuore.";
    }

    // Update plan with diary_revealed
    if (plan?.id) {
      await db.from("plans").update({ diary_revealed }).eq("id", plan.id);
    }

    // Upsert leaderboard for explorer
    const month = new Date().toISOString().slice(0, 7);
    const { data: existingUserLB } = await db.from("leaderboard_users").select("id,monthly_points,total_points").eq("user_id", user.id).eq("month", month).maybeSingle();
    if (existingUserLB) {
      await db.from("leaderboard_users").update({ monthly_points: existingUserLB.monthly_points + total_score, total_points: existingUserLB.total_points + total_score }).eq("id", existingUserLB.id);
    } else {
      await db.from("leaderboard_users").insert({ user_id: user.id, month, monthly_points: total_score, total_points: total_score });
    }

    // Upsert leaderboard for plan creator (50% of score if different user)
    if (plan?.creator_id && plan.creator_id !== user.id) {
      const creatorBonus = Math.floor(total_score * 0.5);
      const { data: existingCreatorLB } = await db.from("leaderboard_users").select("id,monthly_points,total_points").eq("user_id", plan.creator_id).eq("month", month).maybeSingle();
      if (existingCreatorLB) {
        await db.from("leaderboard_users").update({ monthly_points: existingCreatorLB.monthly_points + creatorBonus, total_points: existingCreatorLB.total_points + creatorBonus }).eq("id", existingCreatorLB.id);
      } else {
        await db.from("leaderboard_users").insert({ user_id: plan.creator_id, month, monthly_points: creatorBonus, total_points: creatorBonus });
      }
    }

    // Upsert leaderboard_plans
    const { data: existingLB } = await db
      .from("leaderboard_plans")
      .select("id, times_played, avg_score")
      .eq("plan_id", plan?.id)
      .eq("month", month)
      .maybeSingle();

    if (existingLB) {
      const newPlayed = existingLB.times_played + 1;
      const newAvg = (existingLB.avg_score * existingLB.times_played + total_score) / newPlayed;
      await db.from("leaderboard_plans").update({
        times_played: newPlayed,
        avg_score: newAvg,
      }).eq("id", existingLB.id);
    } else {
      await db.from("leaderboard_plans").insert({
        plan_id: plan?.id,
        month,
        times_played: 1,
        avg_score: total_score,
      });
    }

    // Update plans.times_played
    if (plan?.id) {
      const { data: planRow } = await db.from("plans").select("times_played").eq("id", plan.id).maybeSingle();
      await db.from("plans").update({ times_played: (planRow?.times_played ?? 0) + 1 }).eq("id", plan.id);
    }

    // Auto-publish if creator is playing own plan
    if (plan?.creator_id === user.id && plan.id) {
      await db.from("plans").update({ is_published: true }).eq("id", plan.id);
    }

    return NextResponse.json({
      total_score,
      max_possible_score: Math.round(max_possible_score),
      completion_rate,
      stops_without_hints,
      vouchers_unlocked,
      diary_revealed,
      plan_id: plan?.id ?? null,
      plan_title: plan?.title ?? null,
    });
  } catch (err) {
    console.error("session/complete error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
