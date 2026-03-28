import { NextRequest } from "next/server";
import { generateDiaryStream } from "@/lib/ai/generateCards";

interface DiaryRequest {
  cards: { title: string; description: string }[];
  city: string;
  numDays: number;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as DiaryRequest;

    if (!body.cards?.length || !body.city || !body.numDays) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const stream = await generateDiaryStream(body.cards, body.city, body.numDays);

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("Error generating diary:", error);
    return new Response(JSON.stringify({ error: "Failed to generate diary" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
