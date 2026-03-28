import { NextRequest, NextResponse } from "next/server";
import { generateCards, generatePlanTitle } from "@/lib/ai/generateCards";
import type { GenerateCardsRequest, GeneratedCard, MoodProfile } from "@/lib/types";

interface PlanRequest {
  city: string;
  country: string;
  moodProfile: MoodProfile;
  dateFrom: string;
  dateTo: string;
  numStagesPerDay: number;
  avgStageDurationMin: number;
  language?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as PlanRequest;
    const language = body.language || "italiano";

    // Calculate number of days
    const from = new Date(body.dateFrom);
    const to = new Date(body.dateTo);
    const numDays = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86_400_000) + 1);

    // Generate cards for each day in parallel
    const dayPromises: Promise<{ day: number; stage: number; cards: GeneratedCard[] }>[] = [];
    const excludePoiIds: string[] = [];

    for (let day = 1; day <= numDays; day++) {
      for (let stage = 1; stage <= body.numStagesPerDay; stage++) {
        const cardReq: GenerateCardsRequest = {
          city: body.city,
          country: body.country,
          moodProfile: body.moodProfile,
          dayNumber: day,
          stageOrder: stage,
          durationMin: body.avgStageDurationMin,
          dateFrom: body.dateFrom,
          dateTo: body.dateTo,
          language,
          excludePoiIds,
        };
        dayPromises.push(
          generateCards(cardReq).then((cards) => ({ day, stage, cards }))
        );
      }
    }

    const [allCards, title] = await Promise.all([
      Promise.all(dayPromises),
      generatePlanTitle(body.city, body.moodProfile, numDays),
    ]);

    // Flatten and annotate
    const cards = allCards.flatMap((result) =>
      result.cards.map((card, i) => ({
        ...card,
        day_number: result.day,
        stage_order: result.stage,
        card_index: i,
      }))
    );

    return NextResponse.json({ title, cards, numDays });
  } catch (error) {
    console.error("Error generating plan:", error);
    return NextResponse.json({ error: "Failed to generate plan" }, { status: 500 });
  }
}
