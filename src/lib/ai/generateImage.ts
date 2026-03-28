import { fal } from "@fal-ai/client";

fal.config({
  credentials: process.env.FAL_KEY,
});

/**
 * Generate an artistic cover image for a card using FLUX.
 * Returns the image URL from fal.ai CDN.
 */
export async function generateCardImage(
  title: string,
  description: string,
  moods: string[],
  city: string
): Promise<string> {
  const moodKeywords = moods.join(", ");
  const prompt = `Artistic travel illustration of "${title}" in ${city}. ${description}. Mood: ${moodKeywords}. Vibrant colors, painterly style, atmospheric lighting, no text, no watermarks.`;

  const result = await fal.subscribe("fal-ai/flux/schnell", {
    input: {
      prompt,
      image_size: "portrait_4_3" as const,
      num_images: 1,
    },
  });

  return result.data.images[0].url;
}
