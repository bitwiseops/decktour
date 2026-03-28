import { NextRequest, NextResponse } from "next/server";
import { generateCardImage } from "@/lib/ai/generateImage";
import { updateCardImageUrl } from "@/lib/db-queries";

interface ImageRequest {
  cardId: string;
  title: string;
  description: string;
  moods: string[];
  city: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ImageRequest;

    const imageUrl = await generateCardImage(
      body.title,
      body.description,
      body.moods,
      body.city
    );

    if (imageUrl) await updateCardImageUrl(body.cardId, imageUrl);

    return NextResponse.json({ imageUrl });
  } catch (error) {
    console.error("Error generating card image:", error);
    return NextResponse.json({ error: "Failed to generate image" }, { status: 500 });
  }
}
