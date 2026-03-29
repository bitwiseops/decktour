import { NextRequest, NextResponse } from "next/server";
import { getPlan, updatePlanDescription } from "@/lib/db-queries";
import { getAuthedSupabase, getServerSupabase } from "@/lib/supabase";
import { getAuthUser } from "@/lib/auth";

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

  if (typeof body.is_published === "boolean") {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const token = req.headers.get("authorization")!.slice(7);
    const db = getAuthedSupabase(token);

    // Verify ownership
    const { data: plan } = await db.from("plans").select("creator_id").eq("id", id).single();
    if (!plan || plan.creator_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await db.from("plans").update({ is_published: body.is_published }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, is_published: body.is_published });
  }

  return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
}
