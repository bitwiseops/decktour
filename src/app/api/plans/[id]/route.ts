import { NextRequest, NextResponse } from "next/server";
import { getPlan, updatePlanDescription } from "@/lib/db-queries";
import { getAuthedSupabase } from "@/lib/supabase";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const plan = await getPlan(id, token ?? undefined);
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
