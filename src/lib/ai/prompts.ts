import type { GenerateCardsRequest, GenerateQuizRequest, MoodProfile } from "@/lib/types";
import type { SelectedPoi } from "@/lib/db-queries";

// ── NEW: enrich POIs from DB ──

export interface EnrichPoiRequest {
  poi: SelectedPoi;
  city: string;
  country: string;
  moodProfile: MoodProfile;
  dateFrom: string;
  dateTo: string;
  language: string;
}

export function buildEnrichPoiPrompt(req: EnrichPoiRequest): string {
  return `Sei un esperto locale di ${req.city}, ${req.country}. Arricchisci questo punto di interesse per un gioco turistico.

LUOGO: ${req.poi.name}
DESCRIZIONE ESISTENTE: ${req.poi.description || "Nessuna"}
COORDINATE: ${req.poi.lat}, ${req.poi.lon}
MOOD: ${Array.isArray(req.poi.moods) ? req.poi.moods.join(", ") : String(req.poi.moods)}
TIPO: ${req.poi.event_kind === "temporary" ? "Evento temporaneo" : "Luogo permanente"}
${req.poi.valid_from ? `PERIODO EVENTO: ${req.poi.valid_from} — ${req.poi.valid_to}` : ""}
LINGUA: ${req.language}

GENERA per questo luogo:
1. "description": Descrizione coinvolgente di 2-3 frasi (in ${req.language})
2. "hint_hard": Indizio molto criptico, quasi poetico — NON rivelare il luogo
3. "hint_medium": Dettaglio specifico riconoscibile (elemento architettonico, materiale, colore)
4. "hint_easy": Riferimento quasi esplicito, chi conosce la città lo indovina
5. "historical_info": Curiosità storica interessante ("Lo sapevi che...")
6. "quiz_data": 3 domande quiz di media difficoltà, risolvibili osservando il luogo dal vivo
7. "suggested_voucher": Premio realistico (es. "Sconto 10% su tutti i gelati artigianali")
8. "suggested_voucher_partner": Nome di un'attività REALE entro 500m dal luogo

RISPONDI SOLO con un JSON object:
{
  "description": "...",
  "hint_hard": "...",
  "hint_medium": "...",
  "hint_easy": "...",
  "historical_info": "...",
  "suggested_voucher": "...",
  "suggested_voucher_partner": "...",
  "quiz_data": [
    {"question": "...", "options": ["A","B","C","D"], "correctIndex": 0, "explanation": "..."}
  ]
}`;
}

// ── LEGACY: full generation (fallback when DB has no POIs) ──

export function buildCardsPrompt(req: GenerateCardsRequest): string {
  const moodStr = Object.entries(req.moodProfile)
    .sort(([, a], [, b]) => b - a)
    .map(([k, v]) => `${k}: ${v}/100`)
    .join(", ");

  return `Sei un esperto locale di ${req.city}, ${req.country}. Genera esattamente 3 carte per un gioco turistico.

PROFILO MOOD del giocatore: ${moodStr}
GIORNO: ${req.dayNumber}, TAPPA: ${req.stageOrder}
DURATA MEDIA TAPPA: ${req.durationMin} minuti
PERIODO VIAGGIO: dal ${req.dateFrom} al ${req.dateTo}
LINGUA: ${req.language}
${req.excludePoiIds.length > 0 ? `ESCLUDI questi POI già usati: ${req.excludePoiIds.join(", ")}` : ""}

REGOLE:
- Seleziona 3 luoghi REALI della città, con coordinate GPS accurate
- Privilegia posti inaspettati mescolati con classici (serendipity)
- Assegna 1-3 mood tags per carta tra: shopping, food, art, nature, nightlife
- Genera 3 indizi progressivi per ciascun luogo:
  - "hint_hard": molto criptico, quasi poetico, evocativo — non deve rivelare il luogo
  - "hint_medium": dettaglio specifico riconoscibile
  - "hint_easy": riferimento quasi esplicito
- Genera una curiosità storica sul luogo ("historical_info")
- Per ogni carta genera 3 domande quiz sul luogo (difficulty: medium)
- Assegna una RARITÀ: "common" (permanenti), "rare" (eventi temporanei), "secret" (serendipity, max 1)
- VOUCHER: Per ogni carta, genera un voucher realistico con un partner REALE entro 500m

RISPONDI SOLO con un JSON array di 3 oggetti con questa struttura:
[{
  "title": "Nome del luogo",
  "description": "Descrizione coinvolgente (2-3 frasi)",
  "moods": ["food", "art"],
  "rarity": "common",
  "lat": 41.8986,
  "lon": 12.4769,
  "hint_hard": "Indizio criptico",
  "hint_medium": "Indizio medio",
  "hint_easy": "Indizio facile",
  "historical_info": "Curiosità storica",
  "is_temporary_event": false,
  "source_url": null,
  "source_name": null,
  "suggested_voucher": "Sconto 10%",
  "suggested_voucher_partner": "Nome locale",
  "quiz_data": [{"question": "?", "options": ["A","B","C","D"], "correctIndex": 0, "explanation": "..."}]
}]`;
}

export function buildQuizPrompt(req: GenerateQuizRequest): string {
  const difficultyDesc = {
    easy: "cultura generale, risolvibili da chiunque",
    medium: "dettagli specifici, risolvibili osservando il luogo",
    hard: "da esperto, richiedono conoscenza approfondita",
  };

  return `Genera ${req.numQuestions} domande quiz su "${req.poiName}" a ${req.city}.

DESCRIZIONE: ${req.poiDescription}
DIFFICOLTÀ: ${req.difficulty} — ${difficultyDesc[req.difficulty]}
LINGUA: ${req.language}

Le domande devono essere risolvibili anche osservando il luogo dal vivo.

RISPONDI SOLO con un JSON array:
[{
  "question": "Domanda",
  "options": ["A", "B", "C", "D"],
  "correctIndex": 0,
  "explanation": "Spiegazione"
}]`;
}

export function buildDiaryPrompt(
  cards: { title: string; description: string }[],
  city: string,
  numDays: number
): string {
  const cardList = cards
    .map((c, i) => `${i + 1}. ${c.title}: ${c.description}`)
    .join("\n");

  return `Sei un narratore di viaggi. Il giocatore sta pianificando un viaggio di ${numDays} giorni a ${city}.
Ecco le tappe scelte finora:

${cardList}

Componi un breve "trailer testuale" del viaggio: un paragrafo narrativo (3-5 frasi) che intrecci le tappe in un racconto evocativo.
Lo stile deve essere poetico, coinvolgente, in seconda persona ("Inizierai...", "Ti perderai tra...").
NON elencare i luoghi, ma crea un flusso narrativo che li colleghi.

RISPONDI SOLO con il testo narrativo, senza virgolette né prefissi.`;
}

export function buildTitlePrompt(city: string, moodProfile: MoodProfile, numDays: number): string {
  const topMoods = Object.entries(moodProfile)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2)
    .map(([k]) => k)
    .join(", ");

  return `Genera un titolo evocativo per un itinerario di ${numDays} giorni a ${city}.
Il viaggiatore preferisce: ${topMoods}.
Il titolo deve essere di massimo 6 parole, poetico e memorabile.
Esempi: "L'Anima Barocca di Roma", "Napoli Sottopelle", "Firenze tra Luci e Ombre".
RISPONDI SOLO con il titolo, senza virgolette.`;
}
