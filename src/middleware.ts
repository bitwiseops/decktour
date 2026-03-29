import { NextRequest, NextResponse } from "next/server";

// Auth is handled client-side (supabase-js v2 stores session in localStorage, not cookies).
// Each protected page redirects to "/" on its own if the session is missing.
// This middleware only skips processing for static assets and API routes.
export async function middleware(req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json).*)"],
};
