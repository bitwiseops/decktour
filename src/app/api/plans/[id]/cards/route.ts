import { NextRequest, NextResponse } from "next/server";
import { getCardsByPlan } from "@/lib/db-queries";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const cards = await getCardsByPlan(id, token ?? undefined);
  return NextResponse.json(cards);
}
