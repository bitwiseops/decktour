import { NextRequest, NextResponse } from "next/server";
import { generateCardImage } from "@/lib/ai/generateImage";
import { getCardsByPlan, updateCardImageUrl } from "@/lib/db-queries";

interface PlanImagesRequest {
  planId: string;
  city: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as PlanImagesRequest;
    const cards = await getCardsByPlan(body.planId);

    // Generate images in parallel (batch of 3 to avoid rate limits)
    const results: { cardId: string; imageUrl: string | null }[] = [];
    const batchSize = 3;

    for (let i = 0; i < cards.length; i += batchSize) {
      const batch = cards.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map(async (card) => {
          const imageUrl = await generateCardImage(
            card.title,
            card.description,
            card.moods,
            body.city
          );
          if (imageUrl) await updateCardImageUrl(card.id, imageUrl);
          return { cardId: card.id, imageUrl };
        })
      );

      for (const result of batchResults) {
        if (result.status === "fulfilled") {
          results.push(result.value);
        } else {
          console.error("Failed to generate image for card:", result.reason);
          results.push({ cardId: "unknown", imageUrl: null });
        }
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Error generating plan images:", error);
    return NextResponse.json({ error: "Failed to generate plan images" }, { status: 500 });
  }
}
