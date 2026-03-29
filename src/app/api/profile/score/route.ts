import { NextRequest, NextResponse } from "next/server";
import { addPlayerScore } from "@/lib/db-queries";

const DEMO_PLAYER = "00000000-0000-0000-0000-000000000001";

export async function POST(req: NextRequest) {
  const { score } = (await req.json()) as { score: number };
  if (typeof score !== "number" || score < 0) {
    return NextResponse.json({ error: "Invalid score" }, { status: 400 });
  }
  try {
    const profile = await addPlayerScore(DEMO_PLAYER, score);
    return NextResponse.json(profile);
  } catch {
    return NextResponse.json({ error: "Failed to update score" }, { status: 500 });
  }
}
