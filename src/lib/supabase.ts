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

// Verify a user JWT server-side and return the user (or null)
export async function verifyToken(token: string) {
  const db = getServerSupabase();
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}
