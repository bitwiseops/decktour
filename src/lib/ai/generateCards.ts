import Anthropic from "@anthropic-ai/sdk";
import type { GeneratedCard, GenerateCardsRequest, QuizQuestion, MoodProfile, CardRarity } from "@/lib/types";
import { buildCardsPrompt, buildQuizPrompt, buildTitlePrompt } from "./prompts";

const anthropic = new Anthropic();

function parseJsonFromResponse(text: string): unknown {
  // Extract JSON from potential markdown code blocks
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\[[\s\S]*\])/);
  if (!jsonMatch) throw new Error("No JSON found in response");
  return JSON.parse(jsonMatch[1].trim());
}

export async function generateCards(req: GenerateCardsRequest): Promise<GeneratedCard[]> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [{ role: "user", content: buildCardsPrompt(req) }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  const cards = parseJsonFromResponse(text) as GeneratedCard[];

  // Validate rarity, default to "common" if invalid
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
