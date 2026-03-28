/**
 * Generate an artistic cover image for a card.
 * Currently returns null (placeholder) — image generation via fal.ai is planned.
 */
export async function generateCardImage(
  _title: string,
  _description: string,
  _moods: string[],
  _city: string
): Promise<string | null> {
  const falKey = process.env.FAL_KEY;
  if (!falKey) return null;

  const moodKeywords = _moods.join(", ");
  const prompt = `Artistic travel illustration of "${_title}" in ${_city}. ${_description}. Mood: ${moodKeywords}. Vibrant colors, painterly style, atmospheric lighting, no text, no watermarks.`;

  try {
    const response = await fetch("https://fal.run/fal-ai/flux/schnell", {
      method: "POST",
      headers: {
        Authorization: `Key ${falKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        image_size: "portrait_4_3",
        num_images: 1,
      }),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as { images: { url: string }[] };
    return data.images?.[0]?.url ?? null;
  } catch {
    return null;
  }
}
