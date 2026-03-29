import { NextRequest, NextResponse } from "next/server";
import { error as logError } from "@/lib/logger";

interface ClientErrorPayload {
  message: string;
  source?: string;
  stack?: string;
  url?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ClientErrorPayload;
    logError(`[browser] ${body.message}`, {
      source: body.source,
      stack: body.stack,
      url: body.url,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
