import Anthropic from "@anthropic-ai/sdk";
import type { MoodProfile, MoodType } from "@/lib/types";

const anthropic = new Anthropic();

const MOOD_AESTHETICS: Record<MoodType, string> = {
  shopping: "vibrant market stalls, colorful boutiques, elegant storefronts",
  food: "rustic trattorias, steaming dishes, warm candlelit ambiance",
  art: "ornate frescoes, marble sculptures, grand museum halls",
  nature: "lush gardens, rolling hills, sunlit countryside",
  nightlife: "neon lights, bustling piazzas at dusk, lively street scenes",
};

async function generateCoverPrompt(
  title: string,
  city: string,
  moodProfile: MoodProfile
): Promise<string> {
  const topMoods = Object.entries(moodProfile)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2)
    .map(([k]) => k as MoodType);

  const aesthetics = topMoods.map((m) => MOOD_AESTHETICS[m]).join("; ");

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: `Genera un prompt per un'immagine artistica in stile illustrazione digitale per la cover di un piano di viaggio.

TITOLO: "${title}"
CITTÀ: ${city}
MOOD DOMINANTI: ${topMoods.join(", ")}
ESTETICA: ${aesthetics}

Il prompt deve descrivere una scena evocativa della città che catturi lo spirito del titolo.
Stile: illustrazione digitale artistica, colori vivaci, atmosfera cinematografica, senza testo né scritte.
Formato: landscape 16:9.

RISPONDI SOLO con il prompt in inglese, massimo 2 frasi.`,
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  return text.trim().replace(/^["']|["']$/g, "");
}

export async function generateCoverImage(
  title: string,
  city: string,
  moodProfile: MoodProfile
): Promise<string | null> {
  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    console.warn("FAL_KEY not set — skipping cover image generation");
    return null;
  }

  const prompt = await generateCoverPrompt(title, city, moodProfile);

  const response = await fetch("https://fal.run/fal-ai/flux/schnell", {
    method: "POST",
    headers: {
      Authorization: `Key ${falKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      image_size: "landscape_16_9",
      num_images: 1,
    }),
  });

  if (!response.ok) {
    console.error("fal.ai image generation failed:", response.status, await response.text());
    return null;
  }

  const data = (await response.json()) as { images: { url: string }[] };
  return data.images?.[0]?.url ?? null;
}
