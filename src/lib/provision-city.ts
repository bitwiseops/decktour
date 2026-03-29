/**
 * Provisioning automatico di una nuova città.
 * Crea la riga in cities, genera ~20 carte via Claude AI, e attiva la città.
 * Eseguito in background (fire-and-forget) dopo una richiesta utente.
 */
import Anthropic from "@anthropic-ai/sdk";
import { getServerSupabase } from "@/lib/supabase";

const anthropic = new Anthropic();

interface GeneratedCityCard {
  title: string;
  description: string;
  mood_tags: string[];
  rarity: "common" | "rare" | "secret";
  lat: number;
  lon: number;
  challenge_content: {
    question: string;
    options: string[];
    correct_index: number;
    fun_fact: string;
    clue_primary: string;
    clue_extra: string;
    location_name: string;
  };
  voucher_text: string | null;
  base_points: number;
}

interface CityGeoInfo {
  lat: number;
  lon: number;
  country_code: string;
}

function parseJson(text: string): unknown {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\[[\s\S]*\])/) || text.match(/(\{[\s\S]*\})/);
  if (!match) throw new Error("No JSON found in AI response");
  return JSON.parse(match[1].trim());
}

async function getCityGeoInfo(cityName: string, country: string): Promise<CityGeoInfo> {
  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 200,
    messages: [{
      role: "user",
      content: `Per la città "${cityName}", ${country}, fornisci le coordinate del centro città e il codice ISO 3166-1 alpha-2 del paese.
Rispondi SOLO con JSON: {"lat": 41.9028, "lon": 12.4964, "country_code": "IT"}`,
    }],
  });
  const text = msg.content[0].type === "text" ? msg.content[0].text : "";
  return parseJson(text) as CityGeoInfo;
}

async function generateCardsBatch(
  cityName: string,
  country: string,
  batchIndex: number,
  existingTitles: string[]
): Promise<GeneratedCityCard[]> {
  const excludeStr = existingTitles.length > 0
    ? `\nESCLUDI questi luoghi già generati: ${existingTitles.join(", ")}`
    : "";

  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [{
      role: "user",
      content: `Sei un esperto locale di ${cityName}, ${country}. Genera esattamente 5 carte per un gioco turistico.

BATCH: ${batchIndex + 1}/4 — ${batchIndex === 0 ? "Monumenti e luoghi iconici" : batchIndex === 1 ? "Cibo, mercati e ristoranti" : batchIndex === 2 ? "Natura, parchi e punti panoramici" : "Vita notturna, shopping e luoghi insoliti"}
${excludeStr}

REGOLE:
- Seleziona 5 luoghi REALI della città con coordinate GPS accurate
- Assegna 1-2 mood_tags per carta. IMPORTANTE: usa SOLO queste chiavi italiane: "arte_storia", "enogastronomia", "natura_outdoor", "acquisti", "vita_notturna"
- Genera indizi progressivi per ciascun luogo
- La maggior parte "common", massimo 1 "rare" per batch, 0 "secret"
- base_points: 100 per common, 150 per rare

RISPONDI SOLO con un JSON array di 5 oggetti:
[{
  "title": "Nome del luogo",
  "description": "Descrizione coinvolgente (2-3 frasi)",
  "mood_tags": ["arte_storia"],
  "rarity": "common",
  "lat": 41.8986,
  "lon": 12.4769,
  "challenge_content": {
    "question": "Domanda quiz sul luogo",
    "options": ["A", "B", "C", "D"],
    "correct_index": 0,
    "fun_fact": "Curiosità interessante sul luogo",
    "clue_primary": "Indizio criptico, poetico — NON rivela il luogo",
    "clue_extra": "Dettaglio specifico riconoscibile (elemento architettonico, materiale)",
    "location_name": "Riferimento quasi esplicito per chi conosce la città"
  },
  "voucher_text": "Sconto 10% al bar più vicino",
  "base_points": 100
}]`,
    }],
  });

  const text = msg.content[0].type === "text" ? msg.content[0].text : "";
  return parseJson(text) as GeneratedCityCard[];
}

export async function provisionCity(requestId: string): Promise<void> {
  const db = getServerSupabase();

  try {
    // 1. Update status → processing
    await db.from("city_requests").update({ status: "processing" }).eq("id", requestId);

    // 2. Load request
    const { data: req } = await db.from("city_requests").select("*").eq("id", requestId).single();
    if (!req) throw new Error("Request not found");

    // 3. Get geo info via AI
    const geo = await getCityGeoInfo(req.city_name, req.country);

    // 4. Create city (inactive)
    const { data: city, error: cityErr } = await db.from("cities").insert({
      name: req.city_name,
      country: req.country,
      country_code: geo.country_code,
      lat: geo.lat,
      lon: geo.lon,
      is_active: false,
    }).select("id").single();

    if (cityErr || !city) throw new Error(`City insert failed: ${cityErr?.message}`);

    // 5. Generate cards in 4 batches of 5
    const allCards: GeneratedCityCard[] = [];
    for (let batch = 0; batch < 4; batch++) {
      const existingTitles = allCards.map(c => c.title);
      const cards = await generateCardsBatch(req.city_name, req.country, batch, existingTitles);
      allCards.push(...cards);
    }

    // 6. Insert cards into DB (old schema: story, mood_tags, challenge_content)
    const cardRows = allCards.map(c => ({
      city_id: city.id,
      title: c.title,
      story: c.description,
      rarity: c.rarity,
      challenge_type: "scelta_multipla" as const,
      challenge_content: c.challenge_content,
      mood_tags: c.mood_tags,
      is_temporary: false,
      lat: c.lat,
      lon: c.lon,
      base_points: c.base_points,
      voucher_text: c.voucher_text,
      is_active: true,
    }));

    const { error: cardsErr } = await db.from("cards").insert(cardRows as never[]);
    if (cardsErr) throw new Error(`Cards insert failed: ${cardsErr.message}`);

    // 7. Activate city
    await db.from("cities").update({ is_active: true }).eq("id", city.id);

    // 8. Update request → completed
    await db.from("city_requests").update({
      status: "completed",
      city_id: city.id,
      processed_at: new Date().toISOString(),
    }).eq("id", requestId);

    console.log(`[provision] City "${req.city_name}" provisioned with ${allCards.length} cards`);
  } catch (err) {
    console.error(`[provision] Failed for request ${requestId}:`, err);
    await db.from("city_requests").update({
      status: "rejected",
      processed_at: new Date().toISOString(),
    }).eq("id", requestId);
  }
}
