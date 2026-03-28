/**
 * Resetta il database Supabase: rimuove tutte le tabelle del progetto
 * e riapplica lo schema da zero (db/schema.sql).
 *
 * Usage:
 *   npm run setup:supabase
 *
 * Richiede DATABASE_URL in .env.local che punti a Supabase.
 */

import { Pool } from "pg";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

// Load .env.local se presente
if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^([^#=\s][^=]*)=(.*)$/);
    if (m) (process.env as Record<string, string>)[m[1].trim()] ??= m[2].trim();
  }
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("❌ DATABASE_URL non impostato. Controlla .env.local");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("supabase.co") ? { rejectUnauthorized: false } : false,
});

// ── Drop in ordine inverso rispetto alle dipendenze ──────────────────────────
const DROP_SQL = `
-- Views
DROP VIEW IF EXISTS leaderboard_plans CASCADE;
DROP VIEW IF EXISTS leaderboard_users CASCADE;
DROP VIEW IF EXISTS cities_view CASCADE;

-- Tabelle (CASCADE rimuove automaticamente trigger e vincoli)
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS checkins CASCADE;
DROP TABLE IF EXISTS game_sessions CASCADE;
DROP TABLE IF EXISTS cards CASCADE;
DROP TABLE IF EXISTS plans CASCADE;
DROP TABLE IF EXISTS pois CASCADE;
DROP TABLE IF EXISTS cities CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Funzioni standalone
DROP FUNCTION IF EXISTS nearby_pois(double precision, double precision, double precision, integer) CASCADE;
DROP FUNCTION IF EXISTS check_in_distance(double precision, double precision, uuid) CASCADE;
DROP FUNCTION IF EXISTS on_checkin_score() CASCADE;
DROP FUNCTION IF EXISTS on_card_power_level() CASCADE;
DROP FUNCTION IF EXISTS on_review_update_plan() CASCADE;

-- Tipi enum
DROP TYPE IF EXISTS session_status CASCADE;
DROP TYPE IF EXISTS card_rarity CASCADE;
DROP TYPE IF EXISTS mission_type CASCADE;
DROP TYPE IF EXISTS plan_status CASCADE;
DROP TYPE IF EXISTS event_kind CASCADE;
DROP TYPE IF EXISTS mood_type CASCADE;
`;

async function main() {
  console.log("\n🚀 Setup Supabase — Deck Tour\n");
  console.log(`   Database: ${connectionString!.replace(/:([^:@]+)@/, ":***@")}\n`);

  const client = await pool.connect();
  try {
    // 1. Drop schema esistente
    console.log("🗑️  Rimozione schema esistente...");
    await client.query(DROP_SQL);
    console.log("   ✓ Rimosso\n");

    // 2. Applica schema fresco
    console.log("🏗️  Applicazione schema (db/schema.sql)...");
    const schemaPath = resolve(process.cwd(), "db/schema.sql");
    if (!existsSync(schemaPath)) {
      throw new Error(`Schema non trovato: ${schemaPath}`);
    }
    const schemaSql = readFileSync(schemaPath, "utf8");
    await client.query(schemaSql);
    console.log("   ✓ Schema applicato\n");

    // Nota: la migrazione 001_progressive_hints.sql NON va eseguita su un DB nuovo
    // perché lo schema.sql include già quelle colonne.

    console.log("✅ Database Supabase inizializzato correttamente!\n");
    console.log("Prossimi passi facoltativi:");
    console.log("  npm run seed:pois              # genera ~20 POI permanenti per ogni città");
    console.log("  npm run seed:pois -- Roma       # solo Roma");
    console.log("  npm run seed:events             # cerca eventi prossimi 30 gg");
    console.log("  npm run dev                     # avvia l'app\n");
  } catch (err) {
    console.error("❌ Errore:", (err as Error).message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
