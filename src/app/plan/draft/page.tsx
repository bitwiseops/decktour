"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Shuffle, Loader2, ChevronRight, MapPin, Lock } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface TrioCard { card_id: string; rarity: "common" | "rare" | "secret"; }
interface RevealedCard {
  card_id: string;
  title: string;
  mood_tags: string[];
  rarity: string;
  story: string;
  estimated_duration: string;
}

const RARITY_STYLE: Record<string, string> = {
  common: "border-gray-400/40",
  rare: "border-amber-400/70 shadow-[0_0_14px_rgba(245,158,11,0.3)]",
  secret: "border-purple-400/70 shadow-[0_0_14px_rgba(168,85,247,0.35)]",
};
const RARITY_SYMBOL: Record<string, string> = {
  common: "⬤",
  rare: "◆",
  secret: "?",
};
const RARITY_LABEL: Record<string, string> = {
  common: "Comune",
  rare: "Rara",
  secret: "Segreta",
};
const MOOD_EMOJI: Record<string, string> = {
  arte_storia: "🏛️",
  enogastronomia: "🍷",
  natura_outdoor: "🌿",
  acquisti: "🛍️",
  vita_notturna: "🌙",
};

function FlipCard({
  card,
  onPick,
  disabled,
}: {
  card: TrioCard;
  onPick: (card_id: string) => void;
  disabled: boolean;
}) {
  const [flipped, setFlipped] = useState(false);
  const [revealed, setRevealed] = useState<RevealedCard | null>(null);
  const [loading, setLoading] = useState(false);

  const handleHover = useCallback(async () => {
    if (flipped || loading) return;
    setFlipped(true);
    if (!revealed) {
      setLoading(true);
      // Reveal card info (title + mood_tags only) via lightweight inline fetch
      const res = await fetch(`/api/plan/card-preview?card_id=${card.card_id}`);
      if (res.ok) setRevealed(await res.json());
      setLoading(false);
    }
  }, [flipped, loading, revealed, card.card_id]);

  return (
    <div
      className="perspective w-full"
      onMouseEnter={handleHover}
      onTouchStart={handleHover}
    >
      <div
        className={`relative preserve-3d transition-transform duration-[600ms] ${flipped ? "rotate-y-180" : ""}`}
        style={{ height: "14rem" }}
      >
        {/* Front (hidden face — rarity symbol) */}
        <div
          className={`absolute inset-0 backface-hidden rounded-2xl glass border-2 flex flex-col items-center justify-center gap-3 cursor-pointer select-none ${RARITY_STYLE[card.rarity]}`}
        >
          <span
            className={`text-3xl font-bold ${
              card.rarity === "common" ? "text-gray-400" : card.rarity === "rare" ? "text-amber-400" : "text-purple-400"
            }`}
          >
            {RARITY_SYMBOL[card.rarity]}
          </span>
          <span className="text-xs text-foreground/40">{RARITY_LABEL[card.rarity]}</span>
          <span className="text-xs text-foreground/30">Tocca per scoprire</span>
        </div>

        {/* Back (revealed face — mood + title) */}
        <div
          className={`absolute inset-0 backface-hidden rotate-y-180 rounded-2xl glass border-2 flex flex-col justify-between p-4 ${RARITY_STYLE[card.rarity]}`}
        >
          {loading || !revealed ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 size={24} className="animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div>
                <div className="flex items-center gap-1.5 flex-wrap mb-2">
                  {revealed.mood_tags.slice(0, 2).map((t) => (
                    <span key={t} className="text-xs glass px-2 py-0.5 rounded-full flex items-center gap-1">
                      {MOOD_EMOJI[t] ?? "✨"} {t.replace("_", " ")}
                    </span>
                  ))}
                </div>
                <p className="font-semibold text-sm leading-snug">{revealed.title}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onPick(card.card_id); }}
                disabled={disabled}
                className="w-full py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-light transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
              >
                Scelgo questa <ChevronRight size={14} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface PlanningState {
  session_token: string;
  city_id: string;
  date_from: string;
  date_to: string;
  stops_per_day: number;
  stop_duration: string;
  num_days: number;
  total_stops: number;
  current_stop_index: number;
  picks: Array<{ card_id: string; day_number: number; position: number; mood_tags: string[]; rarity: string; title: string }>;
  reshuffle_count: number;
}

export default function DraftPage() {
  const router = useRouter();
  const [state, setState] = useState<PlanningState | null>(null);
  const [trio, setTrio] = useState<TrioCard[]>([]);
  const [reshuffling, setReshuffling] = useState(false);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("dt_planning");
    if (!raw) { router.replace("/plan/new"); return; }
    const parsed = JSON.parse(raw) as PlanningState;
    setState(parsed);

    // Get stored trio from init response via session
    async function loadTrio() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/"); return; }
      // Fetch current trio from server
      const res = await fetch(`/api/plan/trio?session_token=${parsed.session_token}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const { trio: t } = await res.json();
        setTrio(t ?? []);
      }
    }
    loadTrio();
  }, [router]);

  async function handlePick(card_id: string) {
    if (!state || picking) return;
    setPicking(true);
    setError(null);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/"); return; }

    const stop_index = state.current_stop_index;
    const day_number = Math.floor(stop_index / state.stops_per_day) + 1;
    const position = (stop_index % state.stops_per_day) + 1;

    const res = await fetch("/api/plan/pick", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({
        session_token: state.session_token,
        stop_index,
        day_number,
        position,
        picked_card_id: card_id,
      }),
    });

    if (!res.ok) {
      const { error: e } = await res.json().catch(() => ({}));
      setError(e ?? "Errore nella selezione");
      setPicking(false);
      return;
    }

    const data = await res.json();
    const newPicks = [...state.picks, { card_id, day_number, position, ...data.card_reveal }];
    const newIndex = stop_index + 1;
    const newState = { ...state, current_stop_index: newIndex, picks: newPicks };
    setState(newState);
    localStorage.setItem("dt_planning", JSON.stringify(newState));

    if (data.is_last_stop) {
      router.push("/plan/seal");
    } else {
      setTrio(data.next_trio ?? []);
    }
    setPicking(false);
  }

  async function handleReshuffle() {
    if (!state || reshuffling || state.reshuffle_count >= 2) return;
    setReshuffling(true);
    setError(null);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/"); return; }

    const res = await fetch("/api/plan/reshuffle", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ session_token: state.session_token, stop_index: state.current_stop_index }),
    });

    if (!res.ok) {
      const { error: e } = await res.json().catch(() => ({}));
      setError(e ?? "Errore nel rimescolamento");
      setReshuffling(false);
      return;
    }

    const data = await res.json();
    const newState = { ...state, reshuffle_count: data.reshuffle_count };
    setState(newState);
    localStorage.setItem("dt_planning", JSON.stringify(newState));
    setTrio(data.next_trio ?? []);
    setReshuffling(false);
  }

  if (!state) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin text-primary" size={32} /></div>;
  }

  const stopIndex = state.current_stop_index;
  const totalStops = state.total_stops;
  const dayNumber = Math.floor(stopIndex / state.stops_per_day) + 1;
  const posInDay = (stopIndex % state.stops_per_day) + 1;
  const reshufflesLeft = 2 - state.reshuffle_count;

  return (
    <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-6">
      {/* Progress */}
      <div>
        <div className="flex items-center justify-between mb-2 text-sm">
          <span className="font-medium">Tappa {stopIndex + 1} di {totalStops}</span>
          <span className="text-foreground/40 text-xs">Giorno {dayNumber} · #{posInDay}</span>
        </div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={false}
            animate={{ width: `${((stopIndex) / totalStops) * 100}%` }}
            transition={{ type: "spring", stiffness: 80 }}
          />
        </div>
      </div>

      <div className="text-center">
        <h2 className="font-bold text-xl mb-1">Scegli la tua tappa</h2>
        <p className="text-foreground/40 text-sm">Tocca una carta per scoprirla, poi scegli</p>
      </div>

      {/* Trio */}
      <div className="flex flex-col gap-4">
        <AnimatePresence mode="wait">
          {trio.map((card, i) => (
            <motion.div
              key={`${card.card_id}-${stopIndex}`}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ delay: i * 0.06 }}
            >
              <FlipCard card={card} onPick={handlePick} disabled={picking} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Reshuffle */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleReshuffle}
          disabled={reshufflesLeft <= 0 || reshuffling || picking}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass border border-glass-border text-sm text-foreground/60 hover:text-foreground hover:border-foreground/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {reshuffling ? <Loader2 size={14} className="animate-spin" /> : <Shuffle size={14} />}
          Rimescola
        </button>
        <span className="text-xs text-foreground/30">
          {reshufflesLeft} rimescolat{reshufflesLeft === 1 ? "a" : "e"} rimast{reshufflesLeft === 1 ? "a" : "e"}
        </span>
      </div>

      {error && <p className="text-danger text-sm text-center">{error}</p>}

      {/* Already picked cards preview */}
      {state.picks.length > 0 && (
        <div>
          <p className="text-xs text-foreground/40 mb-2">Piano in costruzione:</p>
          <div className="flex flex-col gap-2">
            {state.picks.map((p, i) => (
              <div key={i} className="glass rounded-xl px-3 py-2 flex items-center gap-3">
                <span className="text-xs text-foreground/40">G{p.day_number}·{p.position}</span>
                <span className="text-sm font-medium flex-1 truncate">{p.title ?? "..."}</span>
                <span className="flex items-center gap-1 text-xs text-foreground/30">
                  <MapPin size={10} /> <Lock size={10} /> ???
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
