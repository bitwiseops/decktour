# DECK TOUR — Documento di Progetto

> Hackathon "Play The City" — Codemotion Rome AI & Tech Week, 28-29 Marzo 2026
> Team: DeckTeam (Stefano Gitto, Fabrizio Rodono, Carmelo Sgobio, Flavio Cordari)

---

## 1. Visione del Progetto

Deck Tour è una PWA mobile-first che trasforma la pianificazione di un viaggio in un gioco a carte generato dall'AI. Il giocatore dichiara una città, un periodo e il proprio profilo "mood", e il sistema genera un mazzo di carte — ognuna rappresenta un luogo reale con quiz, micro-storie e missioni. Il gioco si divide in due fasi: **Pianificazione** (remota, strategica) ed **Esecuzione** (fisica, con check-in GPS).

---

## 2. Stack Tecnologico

| Layer | Tecnologia |
|---|---|
| Frontend | Next.js 14+ (App Router), React 18, TypeScript |
| Styling | Tailwind CSS |
| Animazioni | Framer Motion |
| Mappa | Mapbox GL JS via `react-map-gl` |
| Grafici | Recharts (radar chart del profilo mood) |
| Backend / API | Next.js API Routes (server-side) |
| Database | Supabase (PostgreSQL + Auth + Storage) |
| AI | Anthropic Claude API (`@anthropic-ai/sdk`, modello `claude-sonnet-4-20250514`) |
| Voice (opzionale) | ElevenLabs API (narrazione audio delle micro-storie) |
| PWA | `next-pwa` + manifest.json + service worker |

### Credenziali e connessioni

```
NEXT_PUBLIC_SUPABASE_URL=https://kfygxbrlikrwoidrwqpm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<inserire anon key da Supabase dashboard>
SUPABASE_DB_PASSWORD=gj3IOGn36K4tqyFe
ANTHROPIC_API_KEY=<inserire chiave API Claude>
NEXT_PUBLIC_MAPBOX_TOKEN=<inserire token Mapbox>
ELEVENLABS_API_KEY=<opzionale, inserire chiave ElevenLabs>
```

---

## 3. Struttura del Progetto

```
decktour/
├── public/
│   ├── manifest.json
│   ├── sw.js
│   └── icons/
│
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout, provider Supabase Auth, font, metadata
│   │   ├── page.tsx                # Landing page / Home
│   │   ├── globals.css
│   │   │
│   │   ├── onboarding/
│   │   │   └── page.tsx            # Profilazione mood (swipe + radar chart)
│   │   │
│   │   ├── plan/
│   │   │   ├── new/
│   │   │   │   └── page.tsx        # Wizard creazione piano (città, date, tappe)
│   │   │   ├── [id]/
│   │   │   │   ├── page.tsx        # Dettaglio piano con carte
│   │   │   │   └── play/
│   │   │   │       └── page.tsx    # Modalità gioco / esecuzione viaggio
│   │   │   └── page.tsx            # Lista "I miei piani"
│   │   │
│   │   ├── marketplace/
│   │   │   └── page.tsx            # Marketplace pubblico dei piani
│   │   │
│   │   ├── leaderboard/
│   │   │   └── page.tsx            # Classifiche utenti e piani
│   │   │
│   │   ├── profile/
│   │   │   └── page.tsx            # Profilo utente, radar, badge, storico
│   │   │
│   │   └── api/
│   │       └── ai/
│   │           ├── cards/route.ts  # POST: genera 3 carte per una tappa
│   │           ├── quiz/route.ts   # POST: genera quiz per un POI
│   │           └── plan/route.ts   # POST: genera piano completo (titolo + tutte le carte)
│   │
│   ├── components/
│   │   ├── ui/                     # Primitivi: Button, Modal, Slider, Input, Badge, Skeleton
│   │   ├── game/
│   │   │   ├── CardDeck.tsx        # Mazzo di 3 carte con swipe/flip
│   │   │   ├── GameCard.tsx        # Singola carta (fronte: immagine + mood tags, retro: descrizione + hint)
│   │   │   ├── MoodRadar.tsx       # Radar chart a 5 assi (Recharts)
│   │   │   ├── MoodSwiper.tsx      # Confronti binari stile Tinder con slider
│   │   │   ├── QuizModal.tsx       # Modal quiz con domande, opzioni, timer, feedback
│   │   │   ├── CheckInButton.tsx   # Bottone GPS check-in con validazione distanza
│   │   │   ├── VoucherCard.tsx     # Card voucher sbloccato
│   │   │   └── ScoreDisplay.tsx    # Punteggio animato con breakdown
│   │   ├── map/
│   │   │   ├── GameMap.tsx         # Mappa Mapbox con marker tappe + percorso
│   │   │   └── POIMarker.tsx       # Marker custom con icona mood
│   │   └── layout/
│   │       ├── Navbar.tsx
│   │       └── BottomNav.tsx       # Navigazione mobile bottom bar
│   │
│   ├── lib/
│   │   ├── supabase.ts            # Client Supabase + helper CRUD tipizzati
│   │   ├── ai/
│   │   │   ├── prompts.ts         # Template prompt per Claude API
│   │   │   └── generate-cards.ts  # Logica generazione (carte, quiz, titolo, narrativa, hint)
│   │   ├── scoring.ts             # Calcolo punteggi + haversine distance
│   │   └── types.ts               # TypeScript types per tutto il data model
│   │
│   └── hooks/
│       ├── useGeolocation.ts      # Hook GPS (getCurrentPosition + watchPosition)
│       ├── useGameSession.ts      # Hook stato partita (sessione attiva, carte completate, score)
│       └── useMoodProfile.ts      # Hook onboarding swipe (10 confronti binari → profilo radar)
│
├── supabase/
│   └── schema.sql                 # Schema DB completo, pronto per SQL Editor
│
├── .env.local
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 4. Database Schema (Supabase/PostgreSQL)

Il file `supabase/schema.sql` contiene lo schema completo pronto da eseguire nel SQL Editor di Supabase. Ecco il modello relazionale:

### Tabelle principali

**profiles** — Estende auth.users di Supabase.
Campi: `id` (FK auth.users), `display_name`, `avatar_url`, 5 campi mood (0-100: `mood_shopping`, `mood_food`, `mood_art`, `mood_nature`, `mood_nightlife`), `total_score`, `badges` (jsonb), timestamps.

**cities** — Città disponibili.
Campi: `id`, `name`, `country`, `lat`, `lon`, `image_url`.

**pois** — Punti di interesse (precaricati o generati dall'AI).
Campi: `id`, `city_id` (FK cities), `name`, `description`, `lat`, `lon`, `image_url`, `moods` (array di `mood_type` enum), `event_kind` (enum: permanent/temporary), `valid_from`, `valid_to`, `source_url`, `source_name`.

**plans** — Itinerari creati dagli utenti.
Campi: `id`, `creator_id` (FK profiles), `city_id` (FK cities), `title`, `description`, `image_url`, `status` (enum: draft/published/archived), `date_from`, `date_to`, `num_stages`, `avg_stage_duration_min`, stats denormalizzate (`avg_rating`, `total_reviews`, `total_executions`, `total_score`).

**cards** — Carte associate ai piani.
Campi: `id`, `plan_id` (FK plans), `poi_id` (FK pois, nullable), `day_number`, `stage_order`, `title`, `description`, `moods` (array), `image_url`, `lat`, `lon`, `duration_min`, `mission_type` (quiz/photo/both), `quiz_data` (jsonb array di `{question, options[], correctIndex, explanation}`), `location_hint`, `base_score`, `voucher_description`, `voucher_partner`, `is_temporary_event`.

**game_sessions** — Sessioni di gioco (esecuzione di un piano).
Campi: `id`, `player_id` (FK profiles), `plan_id` (FK plans), `status` (enum: active/completed/abandoned), `total_score`, `started_at`, `completed_at`.

**checkins** — Check-in GPS + completamento missioni.
Campi: `id`, `session_id` (FK game_sessions), `card_id` (FK cards), `player_id` (FK profiles), `player_lat`, `player_lon`, `distance_meters`, `location_valid` (entro 500m), `location_exact` (luogo indovinato), `quiz_answers` (jsonb), `quiz_correct`, `quiz_total`, `photo_url`, `score_earned`, `voucher_unlocked`.

**reviews** — Recensioni dei piani (1-5 stelle + commento).
Campi: `id`, `plan_id` (FK plans), `reviewer_id` (FK profiles), `stars` (1-5), `comment`. Constraint unique su (plan_id, reviewer_id).

### View

- `leaderboard_users`: classifica utenti per total_score con rank.
- `leaderboard_plans`: classifica piani pubblicati per total_executions con rank, join su cities e profiles.

### Trigger automatici

- `on_checkin_score`: quando si inserisce un checkin, aggiorna automaticamente `total_score` su profiles e game_sessions.
- `on_review_update_plan`: quando si inserisce/aggiorna una review, ricalcola `avg_rating` e `total_reviews` sul piano.

### Funzioni

- `haversine_distance(lat1, lon1, lat2, lon2)`: calcola distanza in metri tra due punti GPS.

### RLS (Row Level Security)

Tutte le tabelle hanno RLS abilitato. Le policy principali: profiles e reviews sono leggibili da tutti, scrivibili solo dal proprietario. Plans pubblicati sono pubblici, i draft solo del creatore. Cards visibili se il piano è accessibile. Sessions e checkins solo del player.

---

## 5. Game Design — Regole Complete

### 5.1 Mood System

I mood sono 5 categorie di attività:

| Emoji | ID | Label |
|---|---|---|
| 🛍️ | `shopping` | Acquisti & Souvenir |
| 🍕 | `food` | Enogastronomia |
| 🏛️ | `art` | Arte & Storia |
| 🌳 | `nature` | Natura & Outdoor |
| 💃 | `nightlife` | Vita Notturna & Eventi |

### 5.2 Onboarding — Profilazione Mood

L'utente completa 10 confronti binari (tutte le combinazioni C(5,2) dei 5 mood). Per ogni confronto, uno slider va da 0% (tutto mood A) a 100% (tutto mood B). Al completamento, il sistema genera un profilo radar a 5 assi (grafico a radar con Recharts). Il profilo viene salvato in `profiles` (campi `mood_*`, ciascuno 0-100).

### 5.3 Pianificazione

1. L'utente sceglie: **città**, **periodo** (date_from/date_to), **numero tappe per giorno**, **durata media per tappa**.
2. Per ogni tappa, l'AI genera **3 carte** basate sul profilo mood e sulla città. Le carte contengono un POI reale, descrizione, mood tags, hint criptico, coordinate GPS.
3. L'utente può accettare le 3 carte o fare **reshuffle** (l'AI rigenera).
4. Al completamento, l'AI genera un **titolo evocativo** per il piano (es. "L'Anima Barocca di Roma").
5. Il piano passa da `draft` a `published` e diventa visibile nel marketplace.

### 5.4 Esecuzione (Il Viaggio)

1. Il giocatore (creatore o chiunque dal marketplace) clicca "Gioca Ora" su un piano.
2. Si crea una `game_session`.
3. Per la prima carta, il sistema mostra un **hint** (indizio criptico sul luogo).
4. Il giocatore deve raggiungere fisicamente il luogo. Il sistema fa **check-in GPS**:
   - **Entro 500m**: check-in valido → si sblocca la missione (quiz).
   - **Entro 100m**: bonus "luogo esatto" → punti extra.
   - **Fuori 500m**: check-in fallito, punteggio zero, ma il quiz si sblocca comunque.
5. Il giocatore risponde al **quiz** (domande generate dall'AI sul luogo). Risposte corrette = punti bonus.
6. Al completamento della carta si sblocca un **voucher** (sconto/omaggio nei dintorni).
7. Si prosegue con la carta successiva fino al completamento del giorno/piano.

### 5.5 Sistema Punteggi

**Per singolo check-in:**
- Check-in valido (entro 500m): `base_score` della carta (default 100 punti)
- Luogo esatto indovinato (entro 100m): +50 punti bonus
- Quiz: +25 punti per ogni risposta corretta

**Distribuzione punti:**
- Creatore che esegue il proprio piano: 100% dei punti
- Creatore quando un terzo esegue il piano: 50% dei punti dell'esecutore
- Esecutore di un piano altrui: 50% dei punti

**Moltiplicatore review:**
- Media review > 3 stelle: +20% ai punti del creatore
- Media review ≤ 3 stelle: -20% ai punti del creatore

### 5.6 Marketplace

- Tutti i piani con status `published` sono visibili nel marketplace.
- Ordinamento di default: per popolarità (total_executions) decrescente.
- Filtri: città, periodo, rating.
- Ogni piano mostra: titolo, immagine AI, nome creatore, rating medio, numero esecuzioni.
- I piani devono avere metadati SEO per indicizzazione Google.

### 5.7 Leaderboard

Due classifiche pubbliche:
- **Utenti**: per `total_score` storico, con badge (es. "Top Explorer", "Quiz Master").
- **Piani**: mensile, per `total_executions`.

---

## 6. Logica AI — Prompt e Generazione

### 6.1 Generazione Carte

Endpoint: `POST /api/ai/cards`

Input:
```json
{
  "city": "Roma",
  "country": "Italia",
  "moodProfile": { "shopping": 30, "food": 80, "art": 60, "nature": 40, "nightlife": 70 },
  "dayNumber": 1,
  "stageOrder": 1,
  "durationMin": 90,
  "dateFrom": "2026-04-10",
  "dateTo": "2026-04-12",
  "language": "italiano",
  "excludePoiIds": []
}
```

Output: array di 3 carte con `title`, `description`, `moods[]`, `lat`, `lon`, `location_hint`, `is_temporary_event`, `source_url`, `source_name`, `suggested_voucher`.

Il prompt chiede a Claude di:
- Selezionare 3 luoghi REALI della città
- Privilegiare posti inaspettati (serendipity) mescolati con classici
- Assegnare 1-3 mood tags per carta
- Generare un hint criptico che suggerisca il luogo senza rivelarlo
- Includere coordinate GPS reali e accurate
- Considerare eventi temporanei nel periodo indicato

### 6.2 Generazione Quiz

Endpoint: `POST /api/ai/quiz`

Input:
```json
{
  "poiName": "Pantheon",
  "poiDescription": "Tempio romano dedicato a tutti gli dei...",
  "city": "Roma",
  "language": "italiano",
  "difficulty": "medium",
  "numQuestions": 3
}
```

Output: array di domande con `question`, `options[]` (4 opzioni), `correctIndex`, `explanation`.

Le domande devono essere risolvibili anche osservando il luogo dal vivo. Difficoltà: easy = cultura generale, medium = dettagli specifici, hard = da esperto.

### 6.3 Generazione Titolo Piano

Il prompt riceve città, profilo mood e numero giorni, e produce un titolo evocativo di max 6 parole (es. "L'Anima Barocca di Roma", "Napoli Sottopelle").

### 6.4 Micro-Storie (Narrative Mode)

Per ogni carta, l'AI può generare una micro-storia di max 150 parole in seconda persona ("Ti trovi di fronte a..."), con un fatto storico reale e un invito a esplorare un dettaglio specifico. Queste vengono mostrate durante l'esecuzione.

### 6.5 Hint Progressivi

Per ogni luogo, l'AI genera 3 indizi di difficoltà decrescente:
- `hint_hard`: molto criptico, quasi poetico
- `hint_medium`: dettaglio specifico riconoscibile
- `hint_easy`: riferimento quasi esplicito (quartiere, via)

---

## 7. Componenti UI — Specifiche

### 7.1 Design System

L'app è un gioco, quindi la grafica deve essere curata e coinvolgente. Usare:
- Palette scura con accenti vivaci (indigo/violet come primario, amber per azioni, emerald per successo)
- Bordi arrotondati, ombre morbide, glassmorphism leggero
- Animazioni fluide su carte, transizioni, feedback
- Font: uno display per titoli (es. "Outfit" o "Space Grotesk"), uno readable per corpo (es. "Inter")
- Icone: Lucide React

### 7.2 MoodSwiper (`components/game/MoodSwiper.tsx`)

10 schermate di confronto (una per coppia di mood). Ogni schermata mostra:
- Emoji e label dei due mood a confronto (sinistra e destra)
- Slider al centro (0-100), default 50
- Bottone "Avanti" per confermare
- Progress bar in alto (x/10)
- Possibilità di tornare indietro
- Al completamento → animazione transizione al radar chart

### 7.3 MoodRadar (`components/game/MoodRadar.tsx`)

Radar chart a 5 assi con Recharts (`<RadarChart>`). Mostra il profilo mood dopo l'onboarding. Deve essere animato (i punti si "espandono" dal centro). Colore di fill: semitrasparente con bordo pieno.

### 7.4 GameCard (`components/game/GameCard.tsx`)

Carta flip 3D (Framer Motion):
- **Fronte**: immagine di sfondo, titolo, mood tags (badge colorati), indicatore evento temporaneo (se applicabile)
- **Retro**: descrizione, hint location, durata, tipo missione (quiz/foto), voucher preview
- Tap/click per flip
- Swipe left per scartare (se reshuffle disponibile)

### 7.5 CardDeck (`components/game/CardDeck.tsx`)

Mostra 3 carte stack con leggero offset. L'utente sfoglia le carte e decide se accettare il set o fare reshuffle. Animazione: carte si "smazzano" entrando dalla destra.

### 7.6 QuizModal (`components/game/QuizModal.tsx`)

Modal a schermo intero (mobile) con:
- Domanda in alto
- 4 bottoni risposta
- Timer opzionale (countdown)
- Feedback immediato: verde = corretto, rosso = sbagliato, con spiegazione
- Punteggio accumulato in basso
- Al completamento: riepilogo + punteggio totale carta

### 7.7 CheckInButton (`components/game/CheckInButton.tsx`)

Bottone circolare prominente "CHECK IN". Al tap:
1. Richiede permesso geolocalizzazione
2. Mostra spinner durante la localizzazione
3. Calcola distanza dal POI della carta
4. Se ≤ 500m: animazione successo + sblocca quiz
5. Se > 500m: feedback "Sei troppo lontano" con distanza mostrata

### 7.8 GameMap (`components/map/GameMap.tsx`)

Mappa Mapbox con:
- Marker per ogni tappa del giorno corrente
- Marker attivo evidenziato (pulsante)
- Percorso tra le tappe (linea tratteggiata)
- Posizione attuale del giocatore (pallino blu)
- Popup al tap su marker con anteprima carta

### 7.9 Pagine principali

**Home/Landing** (`app/page.tsx`):
- Hero con titolo "Deck Tour" e CTA "Inizia l'avventura"
- Preview di 3 piani popolari dal marketplace
- Spiegazione rapida del gioco in 3 step

**Wizard Nuovo Piano** (`app/plan/new/page.tsx`):
Multi-step form:
1. Scegli città (autocomplete o lista)
2. Scegli date (date picker)
3. Configura tappe (quante per giorno, durata media)
4. Conferma → loading con animazione → AI genera le carte

**Dettaglio Piano** (`app/plan/[id]/page.tsx`):
- Header con titolo, immagine, città, date, creatore, rating
- Griglia delle carte organizzate per giorno
- Bottone "Gioca Ora" / "Pubblica" (se draft)
- Sezione reviews in basso

**Modalità Gioco** (`app/plan/[id]/play/page.tsx`):
- Vista a carta singola (la carta attuale)
- Mappa in basso con percorso
- Bottone check-in
- Progress: carta x di y del giorno
- Al completamento della giornata: riepilogo score + voucher sbloccati

---

## 8. Setup e Comandi

```bash
# 1. Crea il progetto
npx create-next-app@latest decktour --typescript --tailwind --app --src-dir --import-alias "@/*"
cd decktour

# 2. Installa dipendenze
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
npm install mapbox-gl react-map-gl @types/mapbox-gl
npm install recharts
npm install framer-motion
npm install @anthropic-ai/sdk
npm install next-pwa
npm install lucide-react

# 3. Configura .env.local (vedi sezione 2 per le chiavi)

# 4. Esegui lo schema SQL nel SQL Editor di Supabase (supabase/schema.sql)

# 5. Avvia
npm run dev
```

---

## 9. Priorità di Implementazione

Data la timeline dell'hackathon (consegna domenica 29 marzo ore 13:00), l'ordine di priorità è:

### Must-have (MVP per la demo)
1. Schema DB su Supabase (pronto, eseguire `schema.sql`)
2. Onboarding mood (MoodSwiper + MoodRadar) — è la profilazione del giocatore
3. Wizard creazione piano (scelta città/date → generazione carte via Claude API)
4. Visualizzazione carte con flip animation
5. Modalità gioco con almeno: visualizzazione carta, mappa, check-in GPS, quiz
6. Sistema punteggi base funzionante
7. PWA manifest + responsività mobile

### Should-have
8. Marketplace pubblico (lista piani con filtri)
9. Leaderboard (utenti e piani)
10. Auth con Supabase (Google/email sign-in)
11. Reshuffle delle carte
12. Voucher al completamento carta

### Nice-to-have
13. Micro-storie narrative per ogni POI
14. Hint progressivi (3 livelli)
15. Narrazione audio con ElevenLabs
16. Immagine piano generata dall'AI
17. Review system
18. Badge automatici
19. SEO / indicizzazione Google dei piani

---

## 10. Note Tecniche

### Geolocalizzazione
- Usare `navigator.geolocation.watchPosition` durante il gioco per tracking continuo
- `enableHighAccuracy: true` per massima precisione GPS
- Raggio check-in: 500m per validazione, 100m per bonus "luogo esatto"
- Formula Haversine sia client-side (per feedback immediato) sia server-side (per validazione)

### Performance
- Le chiamate Claude API vanno tutte server-side (API routes), mai dal client
- Generare le carte in parallelo dove possibile (Promise.all per i diversi giorni)
- Le stats denormalizzate (avg_rating, total_executions su plans) evitano join pesanti nelle query del marketplace
- Usare `loading.tsx` e `Suspense` di Next.js per skeleton durante le operazioni AI

### PWA
- manifest.json nella cartella public
- Service worker per caching risorse statiche
- `display: standalone`, orientamento portrait
- Icone 192x192 e 512x512
- Theme color: #6366f1 (indigo)

### Mapbox
- Stile mappa: `mapbox://styles/mapbox/dark-v11` (coerente con UI dark)
- Marker custom con icona mood corrispondente
- Linea percorso con `GeoJSON` source e `line` layer

---

## 11. Convenzioni Codice

- TypeScript strict mode
- Import alias: `@/` → `src/`
- Naming: componenti PascalCase, file camelCase, tipi PascalCase, costanti UPPER_SNAKE_CASE
- I tipi sono tutti in `src/lib/types.ts` — importare da lì, non ridefinire
- Le chiamate Supabase passano tutte da `src/lib/supabase.ts` — non creare client inline
- Le chiamate AI passano tutte da `src/lib/ai/` — non chiamare Claude direttamente dai componenti
- CSS: solo Tailwind utility classes, niente CSS modules tranne `globals.css`
- Commenti in italiano per il game design, in inglese per il codice tecnico