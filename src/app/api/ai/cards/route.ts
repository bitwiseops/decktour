import { NextRequest, NextResponse } from "next/server";
import { generateCards } from "@/lib/ai/generateCards";
import type { GenerateCardsRequest } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GenerateCardsRequest;
    const cards = await generateCards(body);
    return NextResponse.json(cards);
  } catch (error) {
    console.error("Error generating cards:", error);
    return NextResponse.json({ error: "Failed to generate cards" }, { status: 500 });
  }
}
