import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getAuthedSupabase } from "@/lib/supabase";
import { provisionCity } from "@/lib/provision-city";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { city_name, country } = (await req.json()) as { city_name: string; country: string };
    if (!city_name?.trim() || !country?.trim()) {
      return NextResponse.json({ error: "city_name and country are required" }, { status: 400 });
    }

    const token = req.headers.get("authorization")!.slice(7);
    const db = getAuthedSupabase(token);
    const name = city_name.trim();
    const countryTrimmed = country.trim();

    // Check if city already exists and is active
    const { data: existing } = await db
      .from("cities")
      .select("id, name, is_active")
      .ilike("name", name)
      .maybeSingle();

    if (existing?.is_active) {
      return NextResponse.json({ status: "already_exists", city_id: existing.id });
    }

    // Check if a pending/processing request already exists
    const { data: pendingReq } = await db
      .from("city_requests")
      .select("id, status")
      .ilike("city_name", name)
      .ilike("country", countryTrimmed)
      .in("status", ["pending", "processing"])
      .maybeSingle();

    if (pendingReq) {
      return NextResponse.json({ status: "already_requested", request_id: pendingReq.id });
    }

    // Insert new request
    const { data: request, error: insertErr } = await db
      .from("city_requests")
      .insert({
        user_id: user.id,
        city_name: name,
        country: countryTrimmed,
        status: "pending",
      })
      .select("id")
      .single();

    if (insertErr || !request) {
      return NextResponse.json({ error: "Failed to create request" }, { status: 500 });
    }

    // Fire-and-forget provisioning
    void provisionCity(request.id);

    return NextResponse.json({ status: "requested", request_id: request.id });
  } catch (err) {
    console.error("cities/request POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const token = req.headers.get("authorization")!.slice(7);
    const db = getAuthedSupabase(token);
    const { data } = await db
      .from("city_requests")
      .select("id, city_name, country, status, city_id, created_at, processed_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error("cities/request GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
