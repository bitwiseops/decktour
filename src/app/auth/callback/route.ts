import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const code = searchParams.get("code");

  if (code) {
    const db = getServerSupabase();
    const { data, error } = await db.auth.exchangeCodeForSession(code);
    if (!error && data.session) {
      // Check if player_profile exists
      const { data: profile } = await db
        .from("player_profiles")
        .select("id")
        .eq("user_id", data.session.user.id)
        .maybeSingle();

      const redirectTo = profile ? "/home" : "/onboarding";
      const response = NextResponse.redirect(`${origin}${redirectTo}`);
      // Set auth cookie for the middleware
      return response;
    }
  }

  // No code = implicit flow: the access_token is in the URL hash (client-side only).
  // Redirect to root so the browser supabase client can detect and process it.
  return NextResponse.redirect(`${origin}/`);
}
