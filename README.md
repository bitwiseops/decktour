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

## Stack

| Layer | Tecnologia |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| Animazioni | Framer Motion |
| Mappa | Mapbox GL JS via `react-map-gl` |
| Grafici | Recharts (radar chart profilo mood) |
| Backend | Next.js API Routes |
| Database | PostgreSQL 16 + PostGIS 3.4 (Docker) |
| AI | Anthropic Claude API (`claude-sonnet-4-20250514`) |
| PWA | manifest.json + service worker |

---

## Struttura

```
decktour/
├── db/
│   └── schema.sql                 # Schema PostgreSQL + PostGIS
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
│   │   │   ├── new/page.tsx       # Wizard creazione piano
│   │   │   └── [id]/
│   │   │       ├── page.tsx       # Dettaglio piano
│   │   │       └── play/page.tsx  # Modalita gioco
│   │   ├── marketplace/page.tsx   # Piani pubblici
│   │   ├── leaderboard/page.tsx   # Classifiche
│   │   ├── profile/page.tsx       # Profilo utente
│   │   └── api/
│   │       ├── ai/{cards,quiz,plan}/  # Generazione AI
│   │       ├── cities/            # Lista citta
│   │       ├── plans/             # CRUD piani
│   │       └── profile/           # Profilo utente
│   ├── components/
│   │   ├── game/                  # MoodSwiper, MoodRadar, GameCard,
│   │   │                          # CardDeck, QuizModal, CheckInButton,
│   │   │                          # ScoreDisplay, VoucherCard
│   │   ├── map/GameMap.tsx        # Mappa Mapbox
│   │   └── layout/               # Navbar, BottomNav
│   ├── hooks/                     # useGeolocation, useMoodProfile, useGameSession
│   └── lib/
│       ├── ai/                    # Prompt e logica generazione Claude
│       ├── db.ts                  # Pool PostgreSQL
│       ├── db-queries.ts          # Query tipizzate
│       ├── scoring.ts             # Calcolo punteggi + haversine
│       └── types.ts               # TypeScript types
├── docker-compose.yml
└── package.json
```

---

## Database

PostgreSQL + PostGIS con indici spaziali. Le coordinate sono colonne `GEOGRAPHY(Point, 4326)` con indici GIST per query spaziali veloci.

### Tabelle principali

- **profiles** -- Giocatori con profilo mood (5 assi 0-100), punteggio totale, badge
- **cities** -- Citta con coordinate geografiche
- **pois** -- Punti di interesse permanenti ed effimeri (con `valid_from`/`valid_to`)
- **plans** -- Itinerari creati dagli utenti
- **cards** -- Carte associate ai piani con quiz, hint, coordinate
- **game_sessions** -- Sessioni di gioco attive/completate
- **checkins** -- Check-in GPS con punteggi
- **reviews** -- Recensioni 1-5 stelle

### Funzioni spaziali

- `nearby_pois(lat, lon, radius_m, limit)` -- Trova POI nel raggio
- `check_in_distance(lat, lon, card_id)` -- Distanza giocatore-carta

### Trigger

- `trg_checkin_score` -- Aggiorna punteggi su profilo e sessione al check-in
- `trg_review_update` -- Ricalcola media rating sul piano alla review

---

## Game Design

### Mood System

5 assi: Shopping, Food, Art, Nature, Nightlife. L'utente crea il profilo con 10 confronti binari (C(5,2)) tramite slider.

### Flusso di gioco

1. **Onboarding** -- 10 confronti mood -> profilo radar
2. **Crea piano** -- Citta, date, tappe -> AI genera carte con luoghi reali
3. **Gioca** -- Per ogni carta: leggi hint -> raggiungi il luogo -> check-in GPS -> quiz -> punteggio + voucher
4. **Punteggi** -- Check-in valido (500m): 100pt, luogo esatto (100m): +50pt, quiz: +25pt/risposta

---

## Convenzioni

- TypeScript strict, import alias `@/` -> `src/`
- Componenti PascalCase, file camelCase, tipi PascalCase
- Tipi centralizzati in `src/lib/types.ts`
- Chiamate DB via `src/lib/db-queries.ts`
- Chiamate AI via `src/lib/ai/`
- Solo Tailwind utility classes
