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
- Genera un hint criptico che suggerisca il luogo senza rivelarlo
- Considera eventi temporanei nel periodo indicato
- Per ogni carta genera 3 domande quiz sul luogo (difficulty: medium)

RISPONDI SOLO con un JSON array di 3 oggetti con questa struttura:
[{
  "title": "Nome del luogo",
  "description": "Descrizione coinvolgente del luogo (2-3 frasi)",
  "moods": ["food", "art"],
  "lat": 41.8986,
  "lon": 12.4769,
  "location_hint": "Indizio criptico sul luogo",
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
