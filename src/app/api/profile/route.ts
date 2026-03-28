import { NextRequest, NextResponse } from "next/server";
import { getProfile, upsertMoodProfile } from "@/lib/db-queries";
import type { MoodProfile } from "@/lib/types";

const DEMO_PLAYER = "00000000-0000-0000-0000-000000000001";

export async function GET() {
  const profile = await getProfile(DEMO_PLAYER);
  return NextResponse.json(profile);
}

export async function PUT(req: NextRequest) {
  const body = (await req.json()) as { moodProfile: MoodProfile };
  const profile = await upsertMoodProfile(DEMO_PLAYER, body.moodProfile);
  return NextResponse.json(profile);
}
