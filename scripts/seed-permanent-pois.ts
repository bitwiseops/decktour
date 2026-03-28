/**
 * Genera POI permanenti per tutte le città nel DB.
 * Questi POI generano carte con rarità "common" (sempre visitabili).
 *
 * Usage:
 *   npx tsx scripts/seed-permanent-pois.ts              # tutte le città
 *   npx tsx scripts/seed-permanent-pois.ts Roma Milano   # solo queste
 *   npx tsx scripts/seed-permanent-pois.ts --count 30    # 30 POI per città (default 20)
 */

import Anthropic from "@anthropic-ai/sdk";
import { Pool } from "pg";
import { existsSync, readFileSync } from "fs";

// Load .env.local se presente
if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^([^#=\s][^=]*)=(.*)$/);
    if (m) (process.env as Record<string, string>)[m[1].trim()] ??= m[2].trim();
  }
}

const connectionString = process.env.DATABASE_URL || "postgresql://decktour:decktour@localhost:5432/decktour";

const db = new Pool({
  connectionString,
  ssl: connectionString.includes("supabase.co") ? { rejectUnauthorized: false } : false,
});
const anthropic = new Anthropic();

interface RawPoi {
  name: string;
  description: string;
  lat: number;
  lon: number;
  moods: string[];
  source_url: string | null;
  source_name: string | null;
}

// ── CLI args ──

const args = process.argv.slice(2);
let count = 20;
const cityFilter: string[] = [];

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--count" && args[i + 1]) {
    count = parseInt(args[i + 1], 10);
    i++;
  } else {
    cityFilter.push(args[i]);
  }
}

// ── Prompt ──

function buildPrompt(cityName: string, country: string, existing: string[], batchSize: number): string {
  const excludeBlock =
    existing.length > 0
      ? `\nESCLUDI questi POI già presenti nel DB (non ripeterli):\n${existing.map((n) => `- ${n}`).join("\n")}\n`
      : "";

  return `Sei un esperto locale di ${cityName}, ${country}. Genera esattamente ${batchSize} punti di interesse PERMANENTI (non eventi temporanei) per un gioco turistico.
${excludeBlock}
REGOLE:
- Luoghi REALI, visitabili tutto l'anno
- Mix equilibrato: monumenti famosi, gemme nascoste, ristoranti storici, parchi, quartieri, mercati, botteghe artigiane, punti panoramici
- Coordinate GPS accurate (verifica che siano nel territorio della città)
- Per ogni luogo assegna 1-3 mood tra: shopping, food, art, nature, nightlife
- Descrizione coinvolgente di 2-3 frasi in italiano

RISPONDI SOLO con un JSON array:
[{
  "name": "Nome del luogo",
  "description": "Descrizione in italiano",
  "lat": 41.8986,
  "lon": 12.4769,
  "moods": ["art", "food"],
  "source_url": null,
  "source_name": null
}]`;
}

// ── Main ──

async function getCities() {
  const where = cityFilter.length > 0
    ? `WHERE LOWER(name) = ANY($1)`
    : "";
  const params = cityFilter.length > 0
    ? [cityFilter.map((c) => c.toLowerCase())]
    : [];
  const { rows } = await db.query(
    `SELECT id, name, country, ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lon FROM cities ${where} ORDER BY name`,
    params
  );
  return rows as { id: string; name: string; country: string; lat: number; lon: number }[];
}

async function getExistingPois(cityId: string): Promise<string[]> {
  const { rows } = await db.query(
    `SELECT name FROM pois WHERE city_id = $1 AND event_kind = 'permanent'`,
    [cityId]
  );
  return rows.map((r: { name: string }) => r.name);
}

async function generatePois(cityName: string, country: string, existing: string[], batchSize: number): Promise<RawPoi[]> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8192,
    messages: [{ role: "user", content: buildPrompt(cityName, country, existing, batchSize) }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\[[\s\S]*\])/);
  if (!match) throw new Error(`No JSON in response for ${cityName}`);
  return JSON.parse(match[1].trim()) as RawPoi[];
}

async function insertPois(cityId: string, pois: RawPoi[]) {
  let inserted = 0;
  for (const poi of pois) {
    try {
      await db.query(
        `INSERT INTO pois (city_id, name, description, location, moods, event_kind, source_url, source_name)
         VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326)::geography, $6::mood_type[], 'permanent', $7, $8)
         ON CONFLICT DO NOTHING`,
        [cityId, poi.name, poi.description, poi.lon, poi.lat, `{${poi.moods.join(",")}}`, poi.source_url, poi.source_name]
      );
      inserted++;
    } catch (err) {
      console.error(`  ✗ Errore inserendo "${poi.name}":`, (err as Error).message);
    }
  }
  return inserted;
}

async function main() {
  const cities = await getCities();

  if (cities.length === 0) {
    console.error("Nessuna città trovata. Controlla il DB o i nomi passati come argomenti.");
    process.exit(1);
  }

  console.log(`\n🏙️  Generazione POI permanenti per ${cities.length} città (${count} per città)\n`);

  for (const city of cities) {
    const existing = await getExistingPois(city.id);
    const toGenerate = Math.max(0, count - existing.length);

    if (toGenerate === 0) {
      console.log(`  ✓ ${city.name}: già ${existing.length} POI, skip`);
      continue;
    }

    console.log(`  ⏳ ${city.name}: ${existing.length} esistenti, genero ${toGenerate}...`);

    // Generate in batches of 10 to stay within token limits
    let totalInserted = 0;
    let allExisting = [...existing];

    for (let offset = 0; offset < toGenerate; offset += 10) {
      const batchSize = Math.min(10, toGenerate - offset);
      try {
        const pois = await generatePois(city.name, city.country, allExisting, batchSize);
        const inserted = await insertPois(city.id, pois);
        totalInserted += inserted;
        allExisting.push(...pois.map((p) => p.name));
        process.stdout.write(`    batch ${Math.floor(offset / 10) + 1}: +${inserted} POI\n`);
      } catch (err) {
        console.error(`    ✗ Errore batch:`, (err as Error).message);
      }
    }

    console.log(`  ✓ ${city.name}: +${totalInserted} nuovi POI (totale: ${existing.length + totalInserted})`);
  }

  console.log("\n✅ Fatto!\n");
  await db.end();
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
