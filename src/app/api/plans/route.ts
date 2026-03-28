import { NextRequest, NextResponse } from "next/server";
import { listPlans } from "@/lib/db-queries";

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status") ?? undefined;
  const plans = await listPlans(status);
  return NextResponse.json(plans);
}
