"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, Sparkles, Edit2, ChevronRight, Volume2, VolumeX } from "lucide-react";
import { supabase } from "@/lib/supabase";

const MOOD_EMOJI: Record<string, string> = {
  arte_storia: "🏛️", enogastronomia: "🍷", natura_outdoor: "🌿", acquisti: "🛍️", vita_notturna: "🌙",
};

interface PickedCard {
  card_id: string; day_number: number; position: number;
  title: string; mood_tags: string[]; rarity: string; estimated_duration: string;
}

interface PlanningState {
  session_token: string; city_id: string; date_from: string; date_to: string;
  stops_per_day: number; stop_duration: string; num_days: number; total_stops: number;
  picks: PickedCard[];
}

export default function SealPage() {
  const router = useRouter();
  const [state, setState] = useState<PlanningState | null>(null);
  const [customTitle, setCustomTitle] = useState("");
  const [diaryBlurred, setDiaryBlurred] = useState<string | null>(null);
  const [aiTitle, setAiTitle] = useState<string | null>(null);
  const [sealing, setSealing] = useState(false);
  const [planId, setPlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);
  const [hasAudio, setHasAudio] = useState(false);
  const [cityName, setCityName] = useState<string | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("dt_planning");
    if (!raw) { router.replace("/plan/new"); return; }
    setState(JSON.parse(raw));
  }, [router]);

  useEffect(() => {
    if (!state?.city_id) return;
    async function startCityAudio() {
      const res = await fetch("/api/cities");
      if (!res.ok) return;
      const cities: Array<{ id: string; name?: string; audio_url?: string | null }> = await res.json();
      const city = cities.find(c => c.id === state!.city_id);
      if (city?.name) setCityName(city.name);
      const url = city?.audio_url;
      if (!url) return;
      setHasAudio(true);
      if (!audioRef.current) {
        audioRef.current = new Audio(url);
        audioRef.current.loop = true;
        audioRef.current.volume = 0.35;
      }
      if (!mutedRef.current) audioRef.current.play().catch(() => {});
    }
    startCityAudio();
  }, [state?.city_id]);

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

  async function handleSeal() {
    if (!state) return;
    setSealing(true);
    setError(null);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/"); return; }

    const res = await fetch("/api/plan/seal", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ session_token: state.session_token, custom_title: customTitle.trim() }),
    });

    if (!res.ok) {
      const { error: e, detail } = await res.json().catch(() => ({}));
      setError((e ?? "Errore nel sigillare il piano") + (detail ? `: ${detail}` : ""));
      setSealing(false);
      return;
    }

    const data = await res.json();
    setAiTitle(data.title);
    setDiaryBlurred(data.diary_blurred);
    setPlanId(data.plan_id);
    localStorage.removeItem("dt_planning");
    setSealing(false);
  }

  if (!state) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin text-primary" size={32} /></div>;
  }

  // Group picks by day
  const byDay: Record<number, PickedCard[]> = {};
  state.picks.forEach((p) => {
    if (!byDay[p.day_number]) byDay[p.day_number] = [];
    byDay[p.day_number].push(p);
  });

  if (planId) {
    return (
      <div className="max-w-lg mx-auto px-4 py-10 flex flex-col items-center gap-6">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0.4 }}
          className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-4xl">
          ✨
        </motion.div>
        <h1 className="text-2xl font-bold text-center">{aiTitle ?? "Il tuo piano è pronto!"}</h1>

        {diaryBlurred && (
          <div className="glass rounded-2xl p-5 w-full relative">
            <p className="text-xs text-foreground/40 mb-3 uppercase tracking-wide">Diario del Viaggiatore</p>
            <div className="relative">
              {/* First 3 lines — clear */}
              <p className="text-sm text-foreground/80 leading-relaxed line-clamp-3 italic" style={{ fontFamily: "var(--font-lora)", lineHeight: "1.75rem" }}>{diaryBlurred}</p>
              {/* Rest of text — blurred */}
              <p
                className="text-sm text-foreground/80 leading-relaxed select-none italic"
                style={{ fontFamily: "var(--font-lora)", lineHeight: "1.75rem", filter: "blur(5px)", marginTop: "0.1rem" }}
              >
                {diaryBlurred}
              </p>
            </div>
            <div className="flex justify-center mt-3">
              <p className="text-xs text-foreground/60 glass px-3 py-1.5 rounded-full border border-glass-border">
                🔒 Si svela dopo il viaggio
              </p>
            </div>
          </div>
        )}

        <button
          onClick={() => router.push(`/plan/${planId}`)}
          className="w-full py-4 rounded-xl bg-primary text-white font-semibold flex items-center justify-center gap-2 hover:bg-primary-light transition-colors"
        >
          Vai al tuo piano <ChevronRight size={18} />
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">
            Sigillo del Piano{cityName ? ` di ${cityName}` : ""}
          </h1>
          <p className="text-foreground/50 text-sm">Riepilogo visivo — le posizioni restano segrete fino al viaggio</p>
        </div>
        {hasAudio && (
          <button
            type="button"
            onClick={toggleMute}
            className="mt-1 flex items-center gap-1 text-xs text-foreground/40 hover:text-foreground/70 transition-colors"
            title={muted ? "Riattiva musica" : "Silenzia musica"}
          >
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} className="text-primary/70" />}
          </button>
        )}
      </div>

      {/* Cards by day */}
      {Object.entries(byDay).map(([day, cards]) => {
        const d = new Date(state.date_from);
        d.setDate(d.getDate() + Number(day) - 1);
        const dayLabel = d.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
        return (
        <div key={day}>
          <p className="text-xs text-foreground/40 uppercase tracking-wider mb-2">Giorno {day} · {dayLabel}</p>
          <div className="flex flex-col gap-2">
            {cards.sort((a, b) => a.position - b.position).map((card, i) => (
              <div key={i} className="glass rounded-xl px-4 py-3 flex items-center gap-3">
                <span className={`text-sm w-5 text-center ${card.rarity === "rare" ? "text-amber-400" : card.rarity === "secret" ? "text-purple-400" : "text-gray-400"}`}>
                  {card.rarity === "rare" ? "◆" : card.rarity === "secret" ? "?" : "⬤"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{card.title}</p>
                  <div className="flex gap-1 mt-0.5">
                    {(card.mood_tags ?? []).slice(0, 2).map((t) => (
                      <span key={t} className="text-xs text-foreground/40">{MOOD_EMOJI[t] ?? "✨"}</span>
                    ))}
                    <span className="text-xs text-foreground/30">{card.estimated_duration}</span>
                  </div>
                </div>
                <span className="text-xs text-foreground/30">Tappa {card.position}</span>
              </div>
            ))}
          </div>
        </div>
        );
      })}

      {/* Optional custom title */}
      <div className="glass rounded-xl p-4">
        <label className="flex items-center gap-2 text-sm font-medium text-foreground/60 mb-2">
          <Edit2 size={14} /> Titolo personalizzato (opzionale)
        </label>
        <input
          type="text"
          value={customTitle}
          onChange={(e) => setCustomTitle(e.target.value)}
          placeholder="Lascia vuoto per un titolo generato dall'AI..."
          className="w-full bg-transparent text-foreground placeholder:text-foreground/30 outline-none text-sm"
          maxLength={80}
        />
      </div>

      {/* Diary placeholder */}
      <div className="glass rounded-xl p-4">
        <p className="text-xs text-foreground/40 uppercase tracking-wide mb-2">Diario del Viaggiatore</p>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-3 bg-white/10 rounded-full" style={{ width: `${80 - i * 12}%` }} />
          ))}
        </div>
        <p className="text-xs text-foreground/30 mt-3">Generato dall&apos;AI dopo il sigillo</p>
      </div>

      {error && <p className="text-danger text-sm text-center">{error}</p>}

      <button
        onClick={handleSeal}
        disabled={sealing}
        className="w-full py-4 rounded-xl bg-primary text-white font-semibold text-base hover:bg-primary-light transition-colors flex items-center justify-center gap-2 shadow-lg shadow-primary/25"
      >
        {sealing ? <><Loader2 size={18} className="animate-spin" /> Sigillando il piano...</> : <><Sparkles size={18} /> Sigilla il Piano</>}
      </button>
    </div>
  );
}
