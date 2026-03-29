import { NextRequest, NextResponse } from "next/server";
import { listPlans, getCityByName, createPlan, insertCards, updatePlanImageUrl, updateCardImageUrl } from "@/lib/db-queries";
import { generateCardImage } from "@/lib/ai/generateImage";
import type { GeneratedCard } from "@/lib/types";

const DEMO_PLAYER = "00000000-0000-0000-0000-000000000001";

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status") ?? undefined;
  const plans = await listPlans(status);
  return NextResponse.json(plans);
}

interface SavePlanRequest {
  city: string;
  title: string;
  coverImageUrl?: string | null;
  dateFrom: string;
  dateTo: string;
  numStagesPerDay: number;
  avgStageDurationMin: number;
  cards: (GeneratedCard & { day_number: number; stage_order: number })[];
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SavePlanRequest;

    const city = await getCityByName(body.city);
    if (!city) {
      return NextResponse.json({ error: `City "${body.city}" not found` }, { status: 400 });
    }

    const plan = await createPlan(
      DEMO_PLAYER,
      city.id,
      body.title,
      body.dateFrom,
      body.dateTo,
      body.numStagesPerDay,
      body.avgStageDurationMin
    );

    const savedCards = await insertCards(plan!.id, city.id, body.cards, body.avgStageDurationMin);

    // Save cover image if provided by the draft phase
    if (body.coverImageUrl) {
      await updatePlanImageUrl(plan!.id, body.coverImageUrl);
    }

    // Generate card images asynchronously — fire and forget so save is not blocked
    if (process.env.FAL_KEY) {
      void Promise.allSettled(
        savedCards.map(async (card) => {
          try {
            const cardImageUrl = await generateCardImage(
              card.title,
              card.description,
              card.moods,
              body.city
            );
            if (cardImageUrl) await updateCardImageUrl(card.id, cardImageUrl);
          } catch (err) {
            console.error(`Failed to generate image for card ${card.id}:`, err);
          }
        })
      );
    }

    return NextResponse.json({
      plan: { ...plan, image_url: body.coverImageUrl, city_name: city.name, country: city.country },
      cards: savedCards,
    });
  } catch (error) {
    console.error("Error saving plan:", error);
    return NextResponse.json({ error: "Failed to save plan" }, { status: 500 });
  }
}
