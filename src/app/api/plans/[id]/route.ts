import { NextRequest, NextResponse } from "next/server";
import { getPlan, updatePlanDescription } from "@/lib/db-queries";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const plan = await getPlan(id);
  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(plan);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  if (typeof body.description === "string") {
    const updated = await updatePlanDescription(id, body.description);
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
}
