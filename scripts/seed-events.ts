/**
 * Cerca eventi nelle prossime 4 settimane per tutte le città e li salva come POI effimeri.
 * Questi POI generano carte con rarità "rare" (eventi temporanei).
 * Da eseguire quotidianamente (cron o manuale).
 *
 * Usage:
 *   npx tsx scripts/seed-events.ts                # tutte le città
 *   npx tsx scripts/seed-events.ts Roma Napoli     # solo queste
 *   npx tsx scripts/seed-events.ts --days 14       # finestra di 14 giorni (default 30)
 */

import Anthropic from "@anthropic-ai/sdk";
import { Pool } from "pg";

const db = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://decktour:decktour@localhost:5432/decktour",
});
const anthropic = new Anthropic();

interface RawEvent {
  name: string;
  description: string;
  lat: number;
  lon: number;
  moods: string[];
  valid_from: string; // YYYY-MM-DD
  valid_to: string;   // YYYY-MM-DD
  source_url: string | null;
  source_name: string | null;
}

// ── CLI args ──

const args = process.argv.slice(2);
let windowDays = 30;
const cityFilter: string[] = [];

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--days" && args[i + 1]) {
    windowDays = parseInt(args[i + 1], 10);
    i++;
  } else {
    cityFilter.push(args[i]);
  }
}

const today = new Date();
const todayStr = today.toISOString().split("T")[0];
const endDate = new Date(today.getTime() + windowDays * 86_400_000);
const endStr = endDate.toISOString().split("T")[0];

// ── Web search + structuring ──

function buildSearchPrompt(cityName: string, country: string, from: string, to: string, existing: string[]): string {
  const excludeBlock =
    existing.length > 0
      ? `\nESCLUDI questi eventi già nel DB:\n${existing.map((n) => `- ${n}`).join("\n")}\n`
      : "";

  return `Cerca eventi in programma a ${cityName}, ${country} dal ${from} al ${to}.

Cerca mostre, festival, concerti, fiere, eventi sportivi, inaugurazioni, mercatini, sagre, eventi culturali, spettacoli, proiezioni, degustazioni, eventi notturni.
${excludeBlock}
ISTRUZIONI:
- Cerca SOLO eventi REALI e VERIFICABILI che si svolgono in quel periodo
- Includi le date precise (inizio e fine) di ogni evento
- Includi il luogo esatto con coordinate GPS accurate
- Includi la fonte (URL e nome del sito) dove hai trovato l'informazione
- Assegna 1-3 mood tra: shopping, food, art, nature, nightlife
- Descrizione in italiano di 2-3 frasi
- Se non trovi eventi reali per quella data, restituisci un array vuoto []

RISPONDI SOLO con un JSON array:
[{
  "name": "Nome dell'evento",
  "description": "Descrizione in italiano dell'evento",
  "lat": 41.8986,
  "lon": 12.4769,
  "moods": ["art", "nightlife"],
  "valid_from": "2026-04-01",
  "valid_to": "2026-04-03",
  "source_url": "https://...",
  "source_name": "Sito ufficiale"
}]`;
}

// ── Main logic ──

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

async function getExistingEvents(cityId: string): Promise<string[]> {
  const { rows } = await db.query(
    `SELECT name FROM pois
     WHERE city_id = $1 AND event_kind = 'temporary'
       AND valid_to >= $2::date`,
    [cityId, todayStr]
  );
  return rows.map((r: { name: string }) => r.name);
}

async function searchEvents(cityName: string, country: string, existing: string[]): Promise<RawEvent[]> {
  // Use Claude with web search tool to find real events
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8192,
    tools: [
      {
        type: "web_search_20250305",
        name: "web_search",
        max_uses: 5,
      },
    ],
    messages: [
      {
        role: "user",
        content: buildSearchPrompt(cityName, country, todayStr, endStr, existing),
      },
    ],
  });

  // Extract text from response (may contain tool use blocks interleaved)
  const textBlocks = message.content.filter((b) => b.type === "text");
  const text = textBlocks.map((b) => b.type === "text" ? b.text : "").join("\n");

  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\[[\s\S]*\])/);
  if (!match) {
    // May be empty — no events found
    if (text.includes("[]")) return [];
    console.warn(`    ⚠ Nessun JSON trovato per ${cityName}, skip`);
    return [];
  }

  try {
    return JSON.parse(match[1].trim()) as RawEvent[];
  } catch {
    console.warn(`    ⚠ JSON non valido per ${cityName}, skip`);
    return [];
  }
}

async function cleanExpiredEvents() {
  const { rowCount } = await db.query(
    `DELETE FROM pois WHERE event_kind = 'temporary' AND valid_to < $1::date`,
    [todayStr]
  );
  if (rowCount && rowCount > 0) {
    console.log(`🧹 Rimossi ${rowCount} eventi scaduti`);
  }
}

async function insertEvents(cityId: string, events: RawEvent[]) {
  let inserted = 0;
  for (const evt of events) {
    // Validate dates
    if (!evt.valid_from || !evt.valid_to) continue;
    if (evt.valid_to < todayStr) continue;

    try {
      await db.query(
        `INSERT INTO pois (city_id, name, description, location, moods, event_kind, valid_from, valid_to, source_url, source_name)
         VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326)::geography, $6::mood_type[], 'temporary', $7, $8, $9, $10)
         ON CONFLICT DO NOTHING`,
        [
          cityId, evt.name, evt.description,
          evt.lon, evt.lat,
          `{${evt.moods.join(",")}}`,
          evt.valid_from, evt.valid_to,
          evt.source_url, evt.source_name,
        ]
      );
      inserted++;
    } catch (err) {
      console.error(`    ✗ Errore inserendo "${evt.name}":`, (err as Error).message);
    }
  }
  return inserted;
}

async function main() {
  console.log(`\n📅 Ricerca eventi dal ${todayStr} al ${endStr} (${windowDays} giorni)\n`);

  // Clean expired events first
  await cleanExpiredEvents();

  const cities = await getCities();

  if (cities.length === 0) {
    console.error("Nessuna città trovata.");
    process.exit(1);
  }

  console.log(`🔍 Cerco eventi per ${cities.length} città...\n`);

  let totalEvents = 0;

  for (const city of cities) {
    const existing = await getExistingEvents(city.id);
    console.log(`  ⏳ ${city.name}: ${existing.length} eventi attivi, cerco nuovi...`);

    try {
      const events = await searchEvents(city.name, city.country, existing);

      if (events.length === 0) {
        console.log(`  ○ ${city.name}: nessun nuovo evento trovato`);
        continue;
      }

      const inserted = await insertEvents(city.id, events);
      totalEvents += inserted;
      console.log(`  ✓ ${city.name}: +${inserted} eventi (${events.length} trovati, ${existing.length + inserted} totali)`);
    } catch (err) {
      console.error(`  ✗ ${city.name}: errore —`, (err as Error).message);
    }
  }

  console.log(`\n✅ Completato: ${totalEvents} nuovi eventi inseriti\n`);
  await db.end();
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
