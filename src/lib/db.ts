// Il layer DB usa ora @supabase/supabase-js (HTTPS) invece di pg (TCP).
// Tutte le query passano per db-queries.ts.
export { supabase as db } from "./supabase";

// Stub mantenuti per compatibilità — non vengono eseguiti nel flusso normale
export async function query<T = Record<string, unknown>>(): Promise<T[]> {
  throw new Error("Direct SQL not supported in Supabase mode. Use db-queries.ts.");
}
export async function queryOne<T = Record<string, unknown>>(): Promise<T | null> {
  throw new Error("Direct SQL not supported in Supabase mode. Use db-queries.ts.");
}
