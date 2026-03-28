import { NextRequest, NextResponse } from "next/server";
import { getCardsByPlan } from "@/lib/db-queries";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cards = await getCardsByPlan(id);
  return NextResponse.json(cards);
}
