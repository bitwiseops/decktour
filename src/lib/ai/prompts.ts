import type { GenerateCardsRequest, GenerateQuizRequest, MoodProfile } from "@/lib/types";

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
  - "hint_medium": dettaglio specifico riconoscibile (es. un elemento architettonico, un materiale, un colore)
  - "hint_easy": riferimento quasi esplicito, chi conosce la città lo indovina subito
- Genera una curiosità storica sul luogo ("historical_info"): un fatto interessante, non-spoiler, da mostrare come "Lo sapevi che..."
- Considera eventi temporanei nel periodo indicato
- Per ogni carta genera 3 domande quiz sul luogo (difficulty: medium)
- Assegna una RARITÀ a ciascuna carta:
  - "common": luoghi permanenti, sempre visitabili (monumenti, ristoranti, parchi)
  - "rare": eventi temporanei (mostre, festival, concerti) attivi nel periodo di viaggio
  - "secret": carte Serendipity — luoghi nascosti, inaspettati, fuori dai percorsi turistici, scelti in base al profilo mood del giocatore. Massimo 1 carta secret per richiesta, e solo quando il luogo è davvero sorprendente

RISPONDI SOLO con un JSON array di 3 oggetti con questa struttura:
[{
  "title": "Nome del luogo",
  "description": "Descrizione coinvolgente del luogo (2-3 frasi)",
  "moods": ["food", "art"],
  "rarity": "common",
  "lat": 41.8986,
  "lon": 12.4769,
  "hint_hard": "Dove il tempo si piega e le ombre danzano in cerchio",
  "hint_medium": "Cerca la fontana con i quattro fiumi",
  "hint_easy": "La piazza più famosa del barocco romano, con l'obelisco al centro",
  "historical_info": "La fontana centrale fu commissionata da Papa Innocenzo X nel 1651 e Bernini la progettò senza mai visitare la piazza durante i lavori",
  "is_temporary_event": false,
  "source_url": null,
  "source_name": null,
  "suggested_voucher": "Sconto 10% al bar vicino",
  "quiz_data": [
    {
      "question": "Domanda sul luogo",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "explanation": "Spiegazione della risposta corretta"
    }
  ]
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
Esempio di tono: "Inizierai tra i profumi del mercato per finire a guardare le stelle dal molo..."

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
