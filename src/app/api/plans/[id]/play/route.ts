import { NextRequest, NextResponse } from "next/server";
import { createSession, getCardsByPlan } from "@/lib/db-queries";

const DEMO_PLAYER = "00000000-0000-0000-0000-000000000001";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await createSession(DEMO_PLAYER, id);
  const cards = await getCardsByPlan(id);
  return NextResponse.json({ session, cards });
}
