import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Browser / client-side client — uses anon key, persists auth session
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side client — uses anon key with session disabled.
// Works because RLS is disabled on all project tables (see supabase-extra.sql).
export function getServerSupabase() {
  return createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
}

// Server-side client authenticated as a specific user (passes their JWT).
// Use when the table has RLS enabled and policies check auth.uid().
export function getAuthedSupabase(accessToken: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

// Verify a user JWT server-side and return the user (or null)
export async function verifyToken(token: string) {
  const db = getServerSupabase();
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}
