import { NextResponse } from "next/server";
import { getCities } from "@/lib/db-queries";

export async function GET() {
  const cities = await getCities();
  return NextResponse.json(cities);
}
