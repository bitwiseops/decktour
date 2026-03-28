import { NextRequest } from "next/server";
import { generateCards, generatePlanTitle, enrichPoi, poiToGeneratedCard } from "@/lib/ai/generateCards";
import { generateCoverImage } from "@/lib/ai/generateCoverImage";
import { getCityByName, selectPoisForStage } from "@/lib/db-queries";
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
  const body = (await req.json()) as PlanRequest;
  const language = body.language || "italiano";

  const from = new Date(body.dateFrom);
  const to = new Date(body.dateTo);
  const numDays = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86_400_000) + 1);
  const totalStages = numDays * body.numStagesPerDay;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      }

      try {
        // Resolve city from DB
        const city = await getCityByName(body.city);
        const cityId = city?.id;

        send("progress", { step: "title", message: "Genero il titolo...", current: 0, total: totalStages });

        // Start title generation
        const titlePromise = generatePlanTitle(body.city, body.moodProfile, numDays);

        const allCards: (GeneratedCard & { day_number: number; stage_order: number })[] = [];
        const usedPoiIds: string[] = [];
        let stageCount = 0;

        for (let day = 1; day <= numDays; day++) {
          for (let stage = 1; stage <= body.numStagesPerDay; stage++) {
            stageCount++;
            send("progress", {
              step: "cards",
              message: `Genero tappa ${stageCount} di ${totalStages} (giorno ${day})...`,
              current: stageCount,
              total: totalStages,
            });

            let stageCards: GeneratedCard[];

            // Try POI-first approach if city is in DB
            if (cityId) {
              const pois = await selectPoisForStage(
                cityId,
                body.moodProfile,
                body.dateFrom,
                body.dateTo,
                usedPoiIds,
                3
              );

              if (pois.length >= 3) {
                // Enrich POIs with AI-generated content sequentially
                const enriched: GeneratedCard[] = [];
                for (const poi of pois) {
                  const data = await enrichPoi({
                    poi,
                    city: body.city,
                    country: body.country,
                    moodProfile: body.moodProfile,
                    dateFrom: body.dateFrom,
                    dateTo: body.dateTo,
                    language,
                  });
                  enriched.push(poiToGeneratedCard(poi, data));
                  usedPoiIds.push(poi.id);
                }
                stageCards = enriched;
              } else {
                // Not enough POIs in DB, fall back to full AI generation
                stageCards = await generateCards({
                  city: body.city,
                  country: body.country,
                  moodProfile: body.moodProfile,
                  dayNumber: day,
                  stageOrder: stage,
                  durationMin: body.avgStageDurationMin,
                  dateFrom: body.dateFrom,
                  dateTo: body.dateTo,
                  language,
                  excludePoiIds: usedPoiIds,
                });
              }
            } else {
              // City not in DB, full AI generation
              stageCards = await generateCards({
                city: body.city,
                country: body.country,
                moodProfile: body.moodProfile,
                dayNumber: day,
                stageOrder: stage,
                durationMin: body.avgStageDurationMin,
                dateFrom: body.dateFrom,
                dateTo: body.dateTo,
                language,
                excludePoiIds: usedPoiIds,
              });
            }

            // Add stage cards with day/stage info
            for (const card of stageCards) {
              allCards.push({ ...card, day_number: day, stage_order: stage });
            }

            // Send generated cards for this stage immediately
            send("stage_cards", {
              day,
              stage,
              cards: stageCards,
            });
          }
        }

        // Wait for title
        const title = await titlePromise;
        send("progress", { step: "cover", message: "Genero la copertina...", current: totalStages, total: totalStages });

        // Generate cover image
        let coverImageUrl: string | null = null;
        try {
          coverImageUrl = await generateCoverImage(title, body.city, body.moodProfile);
        } catch {
          // Cover generation is optional
        }

        // Send final result
        send("complete", {
          title,
          coverImageUrl,
          cards: allCards,
          numDays,
        });
      } catch (error) {
        console.error("Error generating plan:", error);
        send("error", { message: "Failed to generate plan" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
