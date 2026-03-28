import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { progress_id, answer_index } = await req.json() as { progress_id: string; answer_index: number };
    const db = getServerSupabase();

    // Load progress + session
    const { data: progress } = await db
      .from("session_card_progress")
      .select("id, card_id, session_id, navigator_hint_used, bonus_intuition, game_sessions!session_id(explorer_id, total_score, current_card_index, plans!plan_id(stop_duration))")
      .eq("id", progress_id)
      .maybeSingle();

    if (!progress) return NextResponse.json({ error: "Progress not found" }, { status: 404 });
    const _gs = Array.isArray(progress.game_sessions) ? progress.game_sessions[0] : progress.game_sessions;
    const gameSession = _gs as {
      explorer_id: string; total_score: number; current_card_index: number;
      plans: { stop_duration: string } | { stop_duration: string }[] | null;
    } | null;
    const stopDuration = Array.isArray(gameSession?.plans) ? (gameSession?.plans as { stop_duration: string }[])[0]?.stop_duration : (gameSession?.plans as { stop_duration: string } | null)?.stop_duration;
    if (gameSession?.explorer_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data: card } = await db
      .from("cards")
      .select("base_points, rarity, challenge_content, voucher_text")
      .eq("id", progress.card_id)
      .maybeSingle();

    if (!card) return NextResponse.json({ error: "Card not found" }, { status: 404 });

    const cc = card.challenge_content as Record<string, unknown> | null;
    const correct_index = cc?.correct_index as number;
    const options = cc?.options as string[] ?? [];
    const fun_fact = cc?.fun_fact as string | null ?? null;

    const is_correct = answer_index === correct_index;

    let base = card.base_points ?? 100;
    if (progress.navigator_hint_used) base = Math.floor(base * 0.70);
    const bonus = progress.bonus_intuition ? 20 : 0;
    const points_earned = is_correct ? base + bonus : 0;

    // Update progress
    await db.from("session_card_progress").update({
      status: "completed",
      challenge_answer: { index: answer_index },
      is_correct,
      points_earned,
    }).eq("id", progress_id);

    // Update game session
    const newScore = (gameSession?.total_score ?? 0) + points_earned;
    const newIndex = (gameSession?.current_card_index ?? 0) + 1;
    await db.from("game_sessions").update({
      total_score: newScore,
      current_card_index: newIndex,
    }).eq("id", progress.session_id);

    // Find next pending progress
    const { data: nextProgress } = await db
      .from("session_card_progress")
      .select("id")
      .eq("session_id", progress.session_id)
      .eq("status", "pending")
      .order("day_number")
      .order("position")
      .limit(1)
      .maybeSingle();

    const is_last_stop = !nextProgress;

    return NextResponse.json({
      is_correct,
      correct_index,
      correct_text: options[correct_index] ?? null,
      fun_fact,
      points_earned,
      voucher_text: is_correct ? (card.voucher_text ?? null) : null,
      session_total_score: newScore,
      is_last_stop,
      next_progress_id: nextProgress?.id ?? null,
    });
  } catch (err) {
    console.error("session/answer error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
