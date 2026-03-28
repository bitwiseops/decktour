import { NextRequest, NextResponse } from "next/server";
import { generateCards, generatePlanTitle } from "@/lib/ai/generateCards";
import { generateCardImage } from "@/lib/ai/generateImage";
import { getCityByName } from "@/lib/db-queries";
import { createPlan, insertCards, updateCardImageUrl } from "@/lib/db-queries";
import type { GenerateCardsRequest, GeneratedCard, MoodProfile } from "@/lib/types";

const DEMO_PLAYER = "00000000-0000-0000-0000-000000000001";

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

    // Flatten and annotate
    const cardsFlat = allCards.flatMap((result) =>
      result.cards.map((card) => ({
        ...card,
        day_number: result.day,
        stage_order: result.stage,
      }))
    );

    // Persist to DB
    const city = await getCityByName(body.city);
    if (!city) {
      return NextResponse.json({ error: `City "${body.city}" not found` }, { status: 400 });
    }

    const plan = await createPlan(
      DEMO_PLAYER,
      city.id,
      title,
      body.dateFrom,
      body.dateTo,
      body.numStagesPerDay,
      body.avgStageDurationMin
    );

    const savedCards = await insertCards(plan!.id, cardsFlat, body.avgStageDurationMin);

    // Generate images asynchronously — fire and forget so plan creation is not blocked
    if (process.env.FAL_KEY) {
      void Promise.allSettled(
        savedCards.map(async (card) => {
          try {
            const imageUrl = await generateCardImage(
              card.title,
              card.description,
              card.moods,
              body.city
            );
            await updateCardImageUrl(card.id, imageUrl);
          } catch (err) {
            console.error(`Failed to generate image for card ${card.id}:`, err);
          }
        })
      );
    }

    return NextResponse.json({
      plan: { ...plan, city_name: city.name, country: city.country },
      cards: savedCards,
      numDays,
    });
  } catch (error) {
    console.error("Error generating plan:", error);
    return NextResponse.json({ error: "Failed to generate plan" }, { status: 500 });
  }
}
