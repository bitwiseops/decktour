import { NextRequest, NextResponse } from "next/server";
import { generateCards, generatePlanTitle } from "@/lib/ai/generateCards";
import { generateCoverImage } from "@/lib/ai/generateCoverImage";
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

    // Generate cards sequentially to avoid rate limits, title in parallel with first batch
    const allCards: { day: number; stage: number; cards: GeneratedCard[] }[] = [];
    const excludePoiIds: string[] = [];
    let titlePromise: Promise<string> | null = null;

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

        // Start title generation in parallel with the first card request
        if (!titlePromise) {
          titlePromise = generatePlanTitle(body.city, body.moodProfile, numDays);
        }

        const cards = await generateCards(cardReq);
        allCards.push({ day, stage, cards });
      }
    }

    const title = await (titlePromise ?? generatePlanTitle(body.city, body.moodProfile, numDays));

    // Start cover image generation in parallel
    const coverImageUrl = await generateCoverImage(title, body.city, body.moodProfile);

    // Flatten and annotate with day/stage info
    const cardsFlat = allCards.flatMap((result) =>
      result.cards.map((card) => ({
        ...card,
        day_number: result.day,
        stage_order: result.stage,
      }))
    );

    // Return draft data without persisting — the client will send accepted
    // cards to POST /api/plans after the drafting phase.
    return NextResponse.json({
      title,
      coverImageUrl,
      cards: cardsFlat,
      numDays,
    });
  } catch (error) {
    console.error("Error generating plan:", error);
    return NextResponse.json({ error: "Failed to generate plan" }, { status: 500 });
  }
}
