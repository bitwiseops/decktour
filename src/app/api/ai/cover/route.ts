import { NextRequest, NextResponse } from "next/server";
import { generateCoverImage } from "@/lib/ai/generateCoverImage";
import { updatePlanImageUrl } from "@/lib/db-queries";
import type { MoodProfile } from "@/lib/types";

interface CoverRequest {
  planId: string;
  title: string;
  city: string;
  moodProfile: MoodProfile;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CoverRequest;

    if (!body.planId || !body.title || !body.city || !body.moodProfile) {
      return NextResponse.json(
        { error: "Missing required fields: planId, title, city, moodProfile" },
        { status: 400 }
      );
    }

    const imageUrl = await generateCoverImage(body.title, body.city, body.moodProfile);

    if (!imageUrl) {
      return NextResponse.json({ image_url: null });
    }

    await updatePlanImageUrl(body.planId, imageUrl);

    return NextResponse.json({ image_url: imageUrl });
  } catch (error) {
    console.error("Error generating cover image:", error);
    return NextResponse.json({ error: "Failed to generate cover image" }, { status: 500 });
  }
}
