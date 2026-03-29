"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Shuffle, Loader2, ChevronRight, Volume2, VolumeX, RotateCcw } from "lucide-react";
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

const MOOD_EMOJI: Record<string, string> = {
  arte_storia: "🏛️",
  enogastronomia: "🍷",
  natura_outdoor: "🌿",
  acquisti: "🛍️",
  vita_notturna: "🌙",
};

const MOOD_LABEL: Record<string, string> = {
  arte_storia: "Arte & Storia",
  enogastronomia: "Enogastronomia",
  natura_outdoor: "Natura",
  acquisti: "Acquisti",
  vita_notturna: "Vita Notturna",
};

function MoodSuit({ tag }: { tag: string }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      className="relative flex items-center justify-center"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <span
        className="text-2xl leading-none select-none"
        style={{ opacity: 0.45, filter: "saturate(0.4) drop-shadow(0 1px 3px rgba(0,0,0,0.4))" }}
      >
        {MOOD_EMOJI[tag] ?? "✨"}
      </span>
      {hover && (
        <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg whitespace-nowrap pointer-events-none shadow-lg z-50">
          {MOOD_LABEL[tag] ?? tag.replace(/_/g, " ")}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-black/80" />
        </div>
      )}
    </div>
  );
}

const RARITY_CONFIG: Record<string, {
  bgFrom: string; bgTo: string;
  accentColor: string; accentGlow: string;
  borderColor: string; symbol: string; label: string;
  patternLines: string; patternSize: string; patternPos: string;
}> = {
  common: {
    bgFrom: "#1a1f5e", bgTo: "#0d1035",
    accentColor: "#818cf8", accentGlow: "rgba(129,140,248,0.5)",
    borderColor: "rgba(129,140,248,0.35)",
    symbol: "◈", label: "Comune",
    patternLines: [
      "repeating-linear-gradient(45deg,transparent,transparent 13px,rgba(255,255,255,0.055) 13px,rgba(255,255,255,0.055) 14px)",
      "repeating-linear-gradient(-45deg,transparent,transparent 13px,rgba(255,255,255,0.055) 13px,rgba(255,255,255,0.055) 14px)",
      "linear-gradient(135deg,#1a1f5e,#0d1035)",
    ].join(","),
    patternSize: "auto,auto,100% 100%",
    patternPos: "0 0,0 0,0 0",
  },
  rare: {
    bgFrom: "#3d2200", bgTo: "#1a0f00",
    accentColor: "#f59e0b", accentGlow: "rgba(245,158,11,0.5)",
    borderColor: "rgba(245,158,11,0.5)",
    symbol: "◆", label: "Rara",
    patternLines: [
      "repeating-linear-gradient(45deg,transparent,transparent 13px,rgba(245,158,11,0.09) 13px,rgba(245,158,11,0.09) 14px)",
      "repeating-linear-gradient(-45deg,transparent,transparent 13px,rgba(245,158,11,0.09) 13px,rgba(245,158,11,0.09) 14px)",
      "linear-gradient(135deg,#3d2200,#1a0f00)",
    ].join(","),
    patternSize: "auto,auto,100% 100%",
    patternPos: "0 0,0 0,0 0",
  },
  secret: {
    bgFrom: "#2d0a4e", bgTo: "#100520",
    accentColor: "#c084fc", accentGlow: "rgba(192,132,252,0.5)",
    borderColor: "rgba(192,132,252,0.5)",
    symbol: "✦", label: "Segreta",
    patternLines: [
      "radial-gradient(circle,rgba(192,132,252,0.25) 1px,transparent 1px)",
      "linear-gradient(135deg,#2d0a4e,#100520)",
    ].join(","),
    patternSize: "14px 14px,100% 100%",
    patternPos: "0 0,0 0",
  },
};

function CardBack({ rarity }: { rarity: string }) {
  const cfg = RARITY_CONFIG[rarity] ?? RARITY_CONFIG.common;
  return (
    <div
      className="w-full h-full rounded-[14px] relative overflow-hidden flex flex-col items-center justify-center select-none"
      style={{
        backgroundImage: cfg.patternLines,
        backgroundSize: cfg.patternSize,
        backgroundPosition: cfg.patternPos,
      }}
    >
      {/* Outer border frame */}
      <div
        className="absolute inset-2.5 rounded-xl pointer-events-none"
        style={{ border: `1px solid ${cfg.borderColor}`, opacity: 0.65 }}
      />
      {/* Inner border frame */}
      <div
        className="absolute inset-[15px] rounded-lg pointer-events-none"
        style={{ border: `1px solid ${cfg.borderColor}`, opacity: 0.3 }}
      />
      {/* Top-left corner pip */}
      <span
        className="absolute top-[10px] left-[11px] text-[12px] font-bold leading-none"
        style={{ color: cfg.accentColor, opacity: 0.6 }}
      >{cfg.symbol}</span>
      {/* Bottom-right corner pip (rotated) */}
      <span
        className="absolute bottom-[28px] right-[11px] text-[12px] font-bold leading-none rotate-180 inline-block"
        style={{ color: cfg.accentColor, opacity: 0.6 }}
      >{cfg.symbol}</span>
      {/* Center symbol */}
      <div className="relative z-10 flex flex-col items-center gap-1.5">
        <span
          className="text-[38px] leading-none"
          style={{ color: cfg.accentColor, filter: `drop-shadow(0 0 12px ${cfg.accentGlow})` }}
        >{cfg.symbol}</span>
        <span
          className="text-[9px] font-bold tracking-[0.25em] uppercase"
          style={{ color: cfg.accentColor, opacity: 0.72 }}
        >{cfg.label}</span>
      </div>
      {/* DeckTour watermark */}
      <span
        className="absolute bottom-2.5 text-[8px] tracking-[0.18em] uppercase font-semibold"
        style={{ color: "rgba(255,255,255,0.15)" }}
      >DeckTour</span>
    </div>
  );
}

// Fan positions for 3 cards
const FAN_POS = [
  { rotate: -22, x: -78, y: 30 },
  { rotate:   0, x:   0, y:  0 },
  { rotate:  22, x:  78, y: 30 },
];
const CARD_W = 185;
const CARD_H = 260;

function CardFan({
  trio, onPick, disabled, stopIndex,
}: {
  trio: TrioCard[];
  onPick: (card_id: string) => void;
  disabled: boolean;
  stopIndex: number;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, RevealedCard>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [pressing, setPressing] = useState<number | null>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fanRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setSelected(null); setFlipped(false); }, [stopIndex]);

  useEffect(() => {
    if (!flipped) return;
    function handleOutside(e: PointerEvent) {
      if (fanRef.current && !fanRef.current.contains(e.target as Node)) {
        setSelected(null);
        setFlipped(false);
      }
    }
    document.addEventListener("pointerdown", handleOutside);
    return () => document.removeEventListener("pointerdown", handleOutside);
  }, [flipped]);

  async function handleTap(idx: number) {
    if (disabled || loadingId) return;
    if (selected === idx) { setSelected(null); setFlipped(false); return; }
    setFlipped(false);
    setSelected(idx);
    const card = trio[idx];
    if (!revealed[card.card_id]) {
      setLoadingId(card.card_id);
      const res = await fetch(`/api/plan/card-preview?card_id=${card.card_id}`);
      if (res.ok) {
        const data: RevealedCard = await res.json();
        setRevealed(prev => ({ ...prev, [card.card_id]: data }));
      }
      setLoadingId(null);
    }
    setTimeout(() => setFlipped(true), 330);
  }

  function handlePointerDown(idx: number) {
    if (disabled) return;
    setPressing(idx);
    pressTimer.current = setTimeout(() => {
      onPick(trio[idx].card_id);
      setPressing(null);
    }, 600);
  }

  function handlePointerUp() {
    if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; }
    setPressing(null);
  }

  return (
    <div className="flex flex-col items-center">
      {/* Hint — above the fan */}
      <p className="text-center text-xs text-foreground/50 mb-3 min-h-[16px]">
        {pressing !== null
          ? "Lascia andare per annullare…"
          : selected === null
          ? "Tocca per scoprire · Tieni premuto per scegliere"
          : flipped
          ? "Tocca un'altra per cambiare"
          : "Scoprendo la carta…"}
      </p>

      {/* Fan container */}
      <div ref={fanRef} className="relative w-full flex justify-center" style={{ height: CARD_H + 36 }}>
        {trio.map((card, i) => {
          const pos = FAN_POS[i];
          const isSel = selected === i;
          const rev = revealed[card.card_id];
          const showFront = isSel && flipped;
          return (
            <motion.div
              key={`${card.card_id}-${stopIndex}`}
              style={{
                position: "absolute",
                bottom: 0,
                left: "50%",
                marginLeft: -(CARD_W / 2),
                width: CARD_W,
                height: CARD_H,
                cursor: "pointer",
                zIndex: isSel ? 10 : i + 1,
                userSelect: "none",
              }}
              initial={{ opacity: 0, y: 50 }}
              animate={{
                opacity: 1,
                rotate: isSel ? 0 : pos.rotate,
                x: isSel ? 0 : pos.x,
                y: isSel ? -18 : pos.y,
                scale: pressing === i ? 1.12 : (isSel ? 1.07 : (selected !== null ? 0.96 : 1)),
              }}
              transition={{ type: "spring", stiffness: 200, damping: 22 }}
              onClick={() => handleTap(i)}
              onPointerDown={() => handlePointerDown(i)}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            >
              {/* Perspective wrapper for 3-D flip */}
              <div style={{ width: "100%", height: "100%", perspective: "900px" }}>
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    transformStyle: "preserve-3d",
                    transition: "transform 0.55s cubic-bezier(0.4,0,0.2,1)",
                    transform: showFront ? "rotateY(180deg)" : "rotateY(0deg)",
                  }}
                >
                  {/* Back face */}
                  <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}>
                    <CardBack rarity={card.rarity} />
                    {selected !== null && !isSel && (
                      <div className="absolute inset-0 rounded-[14px] bg-black/50 backdrop-blur-[1px] transition-opacity" />
                    )}
                    {/* Long-press progress ring */}
                    {pressing === i && (
                      <div className="absolute inset-0 rounded-[14px] flex items-center justify-center bg-black/30">
                        <svg width="56" height="56" viewBox="0 0 56 56" className="animate-[spin_0.6s_linear]" style={{ animationDuration: "0.6s" }}>
                          <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="4" />
                          <circle cx="28" cy="28" r="22" fill="none" stroke="white" strokeWidth="4"
                            strokeDasharray="138" strokeDashoffset="138"
                            strokeLinecap="round" transform="rotate(-90 28 28)"
                            style={{ animation: "longpress-fill 0.6s linear forwards" }} />
                        </svg>
                      </div>
                    )}
                  </div>
                  {/* Front face */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      backfaceVisibility: "hidden",
                      WebkitBackfaceVisibility: "hidden",
                      transform: "rotateY(180deg)",
                    }}
                  >
                    {loadingId === card.card_id ? (
                      <div className="w-full h-full rounded-[14px] bg-[#1e1540] border border-primary/20 flex items-center justify-center">
                        <Loader2 size={22} className="animate-spin text-primary" />
                      </div>
                    ) : rev ? (
                      <div className="relative w-full h-full rounded-[14px] bg-gradient-to-br from-[#1e1540] to-[#0d0b20] border border-primary/25 flex flex-col justify-between p-3.5">
                        {/* Mood suits — absolute top-right, stacked vertically */}
                        <div className="absolute top-3 right-3 flex flex-col gap-1.5">
                          {rev.mood_tags.slice(0, 2).map(t => (
                            <MoodSuit key={t} tag={t} />
                          ))}
                        </div>
                        <div className="pt-2">
                          <p className="font-bold text-[13px] leading-snug pr-9">{rev.title}</p>
                          {rev.story && (
                            <p className="text-[11px] text-foreground/45 leading-relaxed mt-1.5 line-clamp-3">{rev.story}</p>
                          )}
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); onPick(card.card_id); }}
                          disabled={disabled}
                          className="w-full py-2 rounded-xl bg-primary text-white text-xs font-semibold flex items-center justify-center gap-1 hover:bg-primary-light transition-colors disabled:opacity-50"
                        >
                          Scelgo questa <ChevronRight size={12} />
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
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
  const [undoing, setUndoing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);
  const [hasAudio, setHasAudio] = useState(false);

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

  // Fetch city audio_url and play it
  useEffect(() => {
    if (!state?.city_id) return;
    async function startCityAudio() {
      const res = await fetch("/api/cities");
      if (!res.ok) return;
      const cities: Array<{ id: string; audio_url?: string | null }> = await res.json();
      const url = cities.find(c => c.id === state!.city_id)?.audio_url;
      if (!url) return;
      setHasAudio(true);
      if (!audioRef.current) {
        audioRef.current = new Audio(url);
        audioRef.current.loop = true;
        audioRef.current.volume = 0.35;
      } else if (audioRef.current.src !== url && audioRef.current.src !== new URL(url, window.location.href).href) {
        audioRef.current.pause();
        audioRef.current = new Audio(url);
        audioRef.current.loop = true;
        audioRef.current.volume = 0.35;
      }
      if (!mutedRef.current) {
        audioRef.current.play().catch(() => {});
      }
    }
    startCityAudio();
    return () => { /* keep playing across re-renders */ };
  }, [state?.city_id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { audioRef.current?.pause(); audioRef.current = null; };
  }, []);

  function toggleMute() {
    mutedRef.current = !mutedRef.current;
    setMuted(mutedRef.current);
    if (audioRef.current) {
      if (mutedRef.current) audioRef.current.pause();
      else audioRef.current.play().catch(() => {});
    }
  }

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
      const body = await res.json().catch(() => ({}));
      setError((body.error ?? "Errore nella selezione") + (body.detail ? ` (${body.detail})` : ""));
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

  async function handleUndoTo(pickIndex: number) {
    if (!state || undoing || picking) return;
    setUndoing(true);
    setError(null);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/"); return; }

    const res = await fetch("/api/plan/pick", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ session_token: state.session_token, undo_to_index: pickIndex }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Errore nell'annullamento");
      setUndoing(false);
      return;
    }

    const data = await res.json();
    const newPicks = state.picks.slice(0, pickIndex);
    const newState = { ...state, current_stop_index: pickIndex, picks: newPicks };
    setState(newState);
    localStorage.setItem("dt_planning", JSON.stringify(newState));
    setTrio(data.new_trio ?? []);
    setUndoing(false);
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
    <div className="min-h-screen flex flex-col max-w-lg mx-auto px-4">
      {/* Top section: progress + title */}
      <div className="pt-8 pb-4 flex flex-col gap-5">
        {/* Progress */}
        <div>
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="font-medium">Tappa {stopIndex + 1} di {totalStops}</span>
            <div className="flex items-center gap-3">
              <span className="text-foreground/40 text-xs">Giorno {dayNumber} · #{posInDay}</span>
              {hasAudio && (
                <button
                  type="button"
                  onClick={toggleMute}
                  className="flex items-center gap-1 text-xs text-foreground/40 hover:text-foreground/70 transition-colors"
                  title={muted ? "Riattiva musica" : "Silenzia musica"}
                >
                  {muted ? <VolumeX size={14} /> : <Volume2 size={14} className="text-primary/70" />}
                </button>
              )}
            </div>
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
            <p className="text-xs text-foreground/40 mb-2 uppercase tracking-wide">Piano in costruzione:</p>
            <div className="flex flex-col">
            {(() => {
              const groups: Record<number, typeof state.picks> = {};
              state.picks.forEach(p => { if (!groups[p.day_number]) groups[p.day_number] = []; groups[p.day_number].push(p); });
              return Object.entries(groups).map(([day, dayPicks]) => {
                const d = new Date(state.date_from);
                d.setDate(d.getDate() + Number(day) - 1);
                const dayLabel = d.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
                return (
                  <div key={day}>
                    <p className="text-[10px] text-foreground/30 uppercase tracking-wider mt-2 mb-1 px-1">Giorno {day} · {dayLabel}</p>
                    {dayPicks.map((p) => {
                      const globalIdx = state.picks.indexOf(p);
                      return (
                        <div key={globalIdx} className="glass rounded-xl px-3 py-2 flex items-center gap-3 mb-1">
                          <span className="text-xs text-foreground/40 shrink-0">#{p.position}</span>
                          <span className="text-sm font-medium flex-1 truncate">{p.title ?? "..."}</span>
                          <span className="flex items-center gap-1 text-xs shrink-0">
                            {(p.mood_tags ?? []).slice(0, 1).map(t => (
                              <span key={t} title={MOOD_LABEL[t] ?? t} className="opacity-60">{MOOD_EMOJI[t] ?? "✨"}</span>
                            ))}
                            <span className={`font-semibold ml-1 ${
                              p.rarity === "secret" ? "text-purple-400/70" :
                              p.rarity === "rare" ? "text-amber-400/70" : "text-foreground/30"
                            }`}>
                              {p.rarity === "secret" ? "✦" : p.rarity === "rare" ? "◆" : "◈"}
                            </span>
                          </span>
                          <button
                            onClick={() => handleUndoTo(globalIdx)}
                            disabled={undoing || picking}
                            className="shrink-0 p-1 rounded-lg text-foreground/20 hover:text-danger/70 hover:bg-white/5 transition-colors disabled:opacity-30"
                            title="Annulla fino a questa tappa"
                          >
                            <RotateCcw size={12} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              });
            })()}
            </div>
          </div>
        )}
      </div>

      {/* Spacer so top section doesn't overlap the fixed fan */}
      <div style={{ height: CARD_H + 60 }} />

      {/* Fan pinned to bottom */}
      <div className="fixed bottom-16 left-0 right-0 flex justify-center pointer-events-none">
        <div className="w-full max-w-lg pointer-events-auto">
          <CardFan trio={trio} onPick={handlePick} disabled={picking} stopIndex={stopIndex} />
        </div>
      </div>
    </div>
  );
}
