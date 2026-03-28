import Anthropic from "@anthropic-ai/sdk";
import type { GeneratedCard, GenerateCardsRequest, QuizQuestion, MoodProfile, CardRarity } from "@/lib/types";
import type { SelectedPoi } from "@/lib/db-queries";
import { buildCardsPrompt, buildDiaryPrompt, buildQuizPrompt, buildTitlePrompt, buildEnrichPoiPrompt } from "./prompts";
import type { EnrichPoiRequest } from "./prompts";

const anthropic = new Anthropic();

function parseJsonFromResponse(text: string): unknown {
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/) || text.match(/(\[[\s\S]*\])/);
  if (!jsonMatch) throw new Error("No JSON found in response");
  return JSON.parse(jsonMatch[1].trim());
}

// ── NEW: enrich a POI from DB with AI-generated content ──

interface EnrichedPoiData {
  description: string;
  hint_hard: string;
  hint_medium: string;
  hint_easy: string;
  historical_info: string;
  suggested_voucher: string | null;
  suggested_voucher_partner: string | null;
  quiz_data: QuizQuestion[];
}

export async function enrichPoi(req: EnrichPoiRequest): Promise<EnrichedPoiData> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    messages: [{ role: "user", content: buildEnrichPoiPrompt(req) }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  return parseJsonFromResponse(text) as EnrichedPoiData;
}

/**
 * Convert a DB POI + AI enrichment into a GeneratedCard.
 */
export function poiToGeneratedCard(poi: SelectedPoi, enriched: EnrichedPoiData): GeneratedCard {
  const rarity: CardRarity = poi.event_kind === "temporary" ? "rare" : "common";

  return {
    title: poi.name,
    description: enriched.description,
    moods: poi.moods,
    rarity,
    lat: poi.lat,
    lon: poi.lon,
    hint_hard: enriched.hint_hard,
    hint_medium: enriched.hint_medium,
    hint_easy: enriched.hint_easy,
    historical_info: enriched.historical_info,
    is_temporary_event: poi.event_kind === "temporary",
    source_url: poi.source_url,
    source_name: poi.source_name,
    suggested_voucher: enriched.suggested_voucher,
    suggested_voucher_partner: enriched.suggested_voucher_partner,
    quiz_data: enriched.quiz_data,
  };
}

// ── LEGACY: full generation (fallback when DB has no POIs) ──

export async function generateCards(req: GenerateCardsRequest): Promise<GeneratedCard[]> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [{ role: "user", content: buildCardsPrompt(req) }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  const cards = parseJsonFromResponse(text) as GeneratedCard[];

  const validRarities: CardRarity[] = ["common", "rare", "secret"];
  for (const card of cards) {
    if (!validRarities.includes(card.rarity)) {
      card.rarity = "common";
    }
  }

  return cards;
}

export async function generateQuiz(
  poiName: string,
  poiDescription: string,
  city: string,
  language: string = "italiano",
  difficulty: "easy" | "medium" | "hard" = "medium",
  numQuestions: number = 3
): Promise<QuizQuestion[]> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: buildQuizPrompt({ poiName, poiDescription, city, language, difficulty, numQuestions }),
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  return parseJsonFromResponse(text) as QuizQuestion[];
}

export async function generateDiaryStream(
  cards: { title: string; description: string }[],
  city: string,
  numDays: number
): Promise<ReadableStream<Uint8Array>> {
  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 512,
    messages: [{ role: "user", content: buildDiaryPrompt(cards, city, numDays) }],
  });

  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      for await (const event of stream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          controller.enqueue(encoder.encode(event.delta.text));
        }
      }
      controller.close();
    },
  });
}

export async function generatePlanTitle(
  city: string,
  moodProfile: MoodProfile,
  numDays: number
): Promise<string> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 100,
    messages: [{ role: "user", content: buildTitlePrompt(city, moodProfile, numDays) }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  return text.trim().replace(/^["']|["']$/g, "");
}
