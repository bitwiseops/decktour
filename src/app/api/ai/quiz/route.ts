import { NextRequest, NextResponse } from "next/server";
import { generateQuiz } from "@/lib/ai/generateCards";
import type { GenerateQuizRequest } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GenerateQuizRequest;
    const quiz = await generateQuiz(
      body.poiName,
      body.poiDescription,
      body.city,
      body.language,
      body.difficulty,
      body.numQuestions
    );
    return NextResponse.json(quiz);
  } catch (error) {
    console.error("Error generating quiz:", error);
    return NextResponse.json({ error: "Failed to generate quiz" }, { status: 500 });
  }
}
