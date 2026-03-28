# DECK TOUR

> Hackathon "Play The City" -- Codemotion Rome AI & Tech Week, 28-29 Marzo 2026
> Team: DeckTeam (Stefano Gitto, Fabrizio Rodono, Carmelo Sgobio, Flavio Cordari)

PWA mobile-first che trasforma la pianificazione di un viaggio in un gioco a carte generato dall'AI. Il giocatore dichiara una citta, un periodo e il proprio profilo "mood", e il sistema genera un mazzo di carte -- ognuna rappresenta un luogo reale con quiz, micro-storie e missioni.

---

## Quick Start

### Prerequisiti

- **Node.js** >= 18
- **Docker** (per PostgreSQL + PostGIS)
- **Chiave API Anthropic** ([console.anthropic.com](https://console.anthropic.com))
- **Token Mapbox** (opzionale, per la mappa) ([mapbox.com](https://www.mapbox.com))
- **Chiave fal.ai** (opzionale, per immagini generative) ([fal.ai](https://fal.ai))

### 1. Clona e installa

```bash
git clone https://github.com/bitwiseops/decktour.git
cd decktour
npm install
```

### 2. Configura le variabili d'ambiente

```bash
cp .env.local.example .env.local
```

Modifica `.env.local` con le tue chiavi:

```
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_MAPBOX_TOKEN=pk.ey...    # opzionale, per la mappa
FAL_KEY=...                          # opzionale, per immagini generative
DATABASE_URL=postgresql://decktour:decktour@localhost:5432/decktour
```

### 3. Avvia il database

```bash
npm run db:up
```

Questo avvia un container Docker con PostgreSQL 16 + PostGIS 3.4. Lo schema (`db/schema.sql`) viene eseguito automaticamente al primo avvio e include:

- Tabelle con colonne `GEOGRAPHY(Point, 4326)` e indici spaziali GIST
- Funzioni spaziali (`nearby_pois`, `check_in_distance`)
- Trigger per aggiornamento automatico punteggi e rating
- 12 citta seed + profilo demo

### 4. Popola i POI

I POI nel database sono la base per la generazione delle carte. Senza POI, il sistema ricade sulla generazione AI completa (piu lenta, meno affidabile).

```bash
# POI permanenti (monumenti, ristoranti, parchi...) -- ~20 per citta
npm run seed:pois

# Solo alcune citta
npm run seed:pois -- Roma Firenze

# Piu POI per citta
npm run seed:pois -- --count 30
```

```bash
# Eventi effimeri (mostre, concerti, festival...) -- prossimi 30 giorni
npm run seed:events

# Solo alcune citta, finestra diversa
npm run seed:events -- Roma --days 14
```

Lo script eventi usa Claude con web search per trovare eventi reali e va eseguito quotidianamente. Rimuove automaticamente gli eventi scaduti.

### 5. Avvia il dev server

```bash
npm run dev
```

Apri http://localhost:3000

Per accesso da mobile (stesso WiFi) o via tunnel:

```bash
ngrok http 3000
```

---

## Comandi

| Comando | Descrizione |
|---|---|
| `npm run dev` | Avvia il dev server Next.js |
| `npm run build` | Build di produzione |
| `npm run db:up` | Avvia PostgreSQL + PostGIS (Docker) |
| `npm run db:down` | Ferma il database |
| `npm run db:reset` | Cancella e ricrea il database da zero |
| `npm run seed:pois` | Genera POI permanenti via Claude AI |
| `npm run seed:events` | Cerca eventi effimeri via Claude + web search |

---

## Architettura

### Flusso di generazione carte

Il sistema usa un approccio **POI-first**: le carte vengono generate a partire dai POI gia presenti nel database, non inventate da zero dall'AI.

```
1. L'utente sceglie citta, date, tappe
2. Il server seleziona POI dal DB (filtro citta + mood affinity + periodo)
3. Per ogni POI, Claude genera: descrizione, 3 hint progressivi, quiz, curiosita storica, voucher
4. Il client riceve le carte in streaming (SSE) con progresso in tempo reale
5. L'utente fa il drafting (scarta/accetta carte, reshuffle limitato)
6. Le carte accettate vengono salvate nel DB con il piano
```

**Fallback**: se non ci sono abbastanza POI nel DB per una citta, il sistema ricade sulla generazione AI completa (Claude inventa i luoghi da zero).

### POI nel database

I POI sono la base dati dei luoghi. Vengono popolati in due modi:

- **`seed:pois`** -- Genera POI permanenti (monumenti, ristoranti, parchi) via Claude. Da eseguire una volta per citta.
- **`seed:events`** -- Cerca eventi temporanei (mostre, concerti, festival) via Claude + web search. Da eseguire quotidianamente.

I POI permanenti generano carte **Comuni**, gli eventi temporanei generano carte **Rare**. Le carte **Segrete** (Serendipity) sono luoghi nascosti selezionati dall'algoritmo di affinita mood.

### Card Rarity e Power Level

| Rarita | Sorgente | Power | Visuale |
|---|---|---|---|
| Common | POI permanenti | 1 | Bordo grigio |
| Rare | Eventi temporanei | 3 | Bordo blu + glow |
| Secret | Serendipity AI | 5 | Bordo dorato + glow |

Il **Power Level** di un piano e la somma dei power level delle sue carte. I piani con carte Rare/Segrete hanno un bordo dorato nel marketplace.

---

## Stack

| Layer | Tecnologia |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| Animazioni | Framer Motion |
| Mappa | Mapbox GL JS via `react-map-gl` |
| Grafici | Recharts (radar chart profilo mood) |
| Backend | Next.js API Routes (SSE per streaming) |
| Database | PostgreSQL 16 + PostGIS 3.4 (Docker) |
| AI | Anthropic Claude API (`claude-sonnet-4-20250514`) |
| Immagini | fal.ai FLUX (opzionale, con `FAL_KEY`) |
| PWA | manifest.json + service worker |

---

## Struttura

```
decktour/
├── db/
│   ├── schema.sql                 # Schema PostgreSQL + PostGIS
│   └── migrations/                # Migrazioni incrementali
├── scripts/
│   ├── seed-permanent-pois.ts     # Genera POI permanenti
│   └── seed-events.ts             # Cerca eventi effimeri
├── public/
│   ├── manifest.json
│   └── icons/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx               # Landing page
│   │   ├── onboarding/page.tsx    # Profilazione mood
│   │   ├── plan/
│   │   │   ├── page.tsx           # Lista piani
│   │   │   ├── new/page.tsx       # Wizard creazione piano (SSE streaming)
│   │   │   └── [id]/
│   │   │       ├── page.tsx       # Dettaglio piano + Diario del Futuro
│   │   │       └── play/page.tsx  # Modalita gioco con timer
│   │   ├── marketplace/page.tsx   # Piani pubblici (bordo dorato per rari)
│   │   ├── leaderboard/page.tsx   # Classifiche con power level
│   │   ├── profile/page.tsx       # Profilo utente
│   │   └── api/
│   │       ├── ai/
│   │       │   ├── plan/          # Generazione piano (SSE, POI-first)
│   │       │   ├── cards/         # Generazione carte singole
│   │       │   ├── quiz/          # Generazione quiz
│   │       │   ├── diary/         # Diario del Futuro (streaming)
│   │       │   ├── cover/         # Cover artistica piano
│   │       │   └── images/        # Immagini carte (fal.ai)
│   │       ├── cities/            # Lista citta
│   │       ├── plans/             # CRUD piani + salvataggio carte
│   │       └── profile/           # Profilo utente
│   ├── components/
│   │   ├── game/                  # MoodSwiper, MoodRadar, GameCard,
│   │   │                          # DraftingDeck, CardDeck, QuizModal,
│   │   │                          # CheckInButton, CountdownTimer,
│   │   │                          # ScoreDisplay, VoucherCard,
│   │   │                          # TravelDiary, HistoricalInfo
│   │   ├── map/GameMap.tsx        # Mappa Mapbox
│   │   └── layout/               # Navbar, BottomNav
│   ├── hooks/                     # useGeolocation, useMoodProfile, useGameSession
│   └── lib/
│       ├── ai/
│       │   ├── prompts.ts         # Prompt per Claude (enrichPoi + legacy)
│       │   ├── generateCards.ts   # Generazione + arricchimento POI
│       │   ├── generateCoverImage.ts  # Cover via fal.ai
│       │   └── generateImage.ts   # Immagini carte via fal.ai
│       ├── db.ts                  # Pool PostgreSQL
│       ├── db-queries.ts          # Query tipizzate + selectPoisForStage
│       ├── scoring.ts             # Punteggi + bonus intuizione + timer penalty
│       └── types.ts               # TypeScript types (rarita, power level, hint)
├── docker-compose.yml
├── agent-orchestrator.yaml        # Config Composio AO
└── package.json
```

---

## Database

PostgreSQL + PostGIS con indici spaziali. Le coordinate sono colonne `GEOGRAPHY(Point, 4326)` con indici GIST per query spaziali veloci.

### Tabelle principali

- **profiles** -- Giocatori con profilo mood (5 assi 0-100), punteggio totale, badge
- **cities** -- Citta con coordinate geografiche
- **pois** -- Punti di interesse permanenti ed effimeri (con `valid_from`/`valid_to`)
- **plans** -- Itinerari con titolo, cover, power level, stats
- **cards** -- Carte con rarita, power level, 3 hint progressivi, quiz, voucher con codice
- **game_sessions** -- Sessioni di gioco attive/completate
- **checkins** -- Check-in GPS con punteggi e hints_revealed
- **reviews** -- Recensioni 1-5 stelle

### Funzioni spaziali

- `nearby_pois(lat, lon, radius_m, limit)` -- Trova POI nel raggio
- `check_in_distance(lat, lon, card_id)` -- Distanza giocatore-carta
- `selectPoisForStage()` -- Seleziona POI per affinita mood con componente serendipity

### Trigger

- `trg_checkin_score` -- Aggiorna punteggi su profilo e sessione al check-in
- `trg_review_update` -- Ricalcola media rating sul piano alla review

---

## Game Design

### Mood System

5 assi: Shopping, Food, Art, Nature, Nightlife. L'utente crea il profilo con 10 confronti binari (C(5,2)) tramite slider. Il risultato e un radar chart a 5 punti.

### Flusso di gioco

1. **Onboarding** -- 10 confronti mood -> profilo radar
2. **Crea piano** -- Citta, date, tappe -> POI dal DB + AI arricchisce -> drafting con carte coperte
3. **Drafting** -- 3 carte per tappa, reveal con animazione, scarta/accetta, reshuffle limitato (max 2)
4. **Diario del Futuro** -- L'AI compone un trailer narrativo del viaggio
5. **Gioca** -- Per ogni carta: hint progressivi -> countdown timer -> check-in GPS -> quiz -> punteggio + voucher

### Sistema punteggi

| Azione | Punti |
|---|---|
| Check-in valido (500m) | base_score (100) |
| Luogo esatto (100m) | +50 |
| Bonus Intuizione (solo hint hard) | +100 |
| Bonus Intuizione (hint medium) | +40 |
| Quiz risposta corretta | +25/risposta |
| Penalita tempo scaduto | -25 |

### Hint progressivi

Ogni carta ha 3 livelli di indizio. Rivelare indizi piu facili riduce il Bonus Intuizione:

- **hint_hard** -- Criptico, poetico. Bonus Intuizione massimo (+100)
- **hint_medium** -- Dettaglio specifico. Bonus ridotto (+40)
- **hint_easy** -- Quasi esplicito. Nessun bonus extra

### Voucher

Al completamento di una tappa (check-in valido + quiz), si sblocca un voucher con:
- Codice univoco copiabile (es. `DT-A3F8B1C2`)
- Partner reale entro 500m dalla tappa
- Validita nel raggio della tappa

---

## Convenzioni

- TypeScript strict, import alias `@/` -> `src/`
- Componenti PascalCase, file camelCase, tipi PascalCase
- Tipi centralizzati in `src/lib/types.ts`
- Chiamate DB via `src/lib/db-queries.ts`
- Chiamate AI via `src/lib/ai/`
- Solo Tailwind utility classes
