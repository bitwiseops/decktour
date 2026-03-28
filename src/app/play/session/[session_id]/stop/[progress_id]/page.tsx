"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Loader2, Navigation, HelpCircle, CheckCircle, XCircle, Gift, ChevronRight, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";

type StopState = "clue" | "checkin" | "challenge" | "result";

const MOOD_EMOJI: Record<string, string> = {
  arte_storia: "🏛️", enogastronomia: "🍷", natura_outdoor: "🌿", acquisti: "🛍️", vita_notturna: "🌙",
};

interface CardClue {
  clue_primary: string; rarity: string; mood_tags: string[];
  day_number: number; position: number; stop_duration: string;
}

interface CheckinResult {
  success: boolean; distance_meters?: number; message?: string;
  bonus_intuition?: boolean; location_name?: string; story?: string;
  photo_url?: string | null; bonus_points?: number;
}

interface ChallengeData { question: string; options: string[]; }

interface AnswerResult {
  is_correct: boolean; correct_index: number; correct_text: string | null;
  fun_fact: string | null; points_earned: number; voucher_text: string | null;
  session_total_score: number; is_last_stop: boolean; next_progress_id: string | null;
}

export default function StopPage() {
  const { session_id, progress_id } = useParams<{ session_id: string; progress_id: string }>();
  const router = useRouter();

  const [state, setState] = useState<StopState>("clue");
  const [clue, setClue] = useState<CardClue | null>(null);
  const [clueExtra, setClueExtra] = useState<string | null>(null);
  const [checkinResult, setCheckinResult] = useState<CheckinResult | null>(null);
  const [challenge, setChallenge] = useState<ChallengeData | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stopIndex, setStopIndex] = useState(0);
  const [totalStops, setTotalStops] = useState(0);

  useEffect(() => {
    async function loadStop() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/"); return; }

      const res = await fetch(`/api/session/stop-info?progress_id=${progress_id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setClue(data);
      }

      const stored = JSON.parse(localStorage.getItem("dt_game") ?? "{}");
      setStopIndex(stored.current_stop_index ?? 0);
      setTotalStops(stored.total_stops ?? 1);
      setLoading(false);
    }
    loadStop();
  }, [progress_id, router]);

  async function withAuth<T>(fn: (token: string) => Promise<T>): Promise<T | null> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/"); return null; }
    return fn(session.access_token);
  }

  const handleHint = useCallback(async () => {
    setActionLoading(true);
    await withAuth(async (token) => {
      const res = await fetch("/api/session/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ progress_id }),
      });
      if (res.ok) setClueExtra((await res.json()).clue_extra);
    });
    setActionLoading(false);
  }, [progress_id]);

  const handleCheckin = useCallback(async () => {
    if (!navigator.geolocation) {
      setError("GPS non disponibile su questo dispositivo");
      return;
    }
    setActionLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const result = await withAuth(async (token) => {
          const res = await fetch("/api/session/checkin-attempt", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ progress_id, user_lat: pos.coords.latitude, user_lon: pos.coords.longitude }),
          });
          return res.json() as Promise<CheckinResult>;
        });
        if (result) {
          setCheckinResult(result);
          if (result.success) setState("checkin");
          else setError(result.message ?? null);
        }
        setActionLoading(false);
      },
      () => { setError("Impossibile ottenere la posizione GPS"); setActionLoading(false); }
    );
  }, [progress_id]);

  const handleOpenChallenge = useCallback(async () => {
    setActionLoading(true);
    const result = await withAuth(async (token) => {
      const res = await fetch(`/api/session/challenge?progress_id=${progress_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json() as Promise<ChallengeData>;
    });
    if (result) { setChallenge(result); setState("challenge"); }
    setActionLoading(false);
  }, [progress_id]);

  const handleAnswer = useCallback(async () => {
    if (selectedAnswer === null) return;
    setActionLoading(true);
    const result = await withAuth(async (token) => {
      const res = await fetch("/api/session/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ progress_id, answer_index: selectedAnswer }),
      });
      return res.json() as Promise<AnswerResult>;
    });
    if (result) {
      setAnswerResult(result);
      setState("result");
      // Update localStorage
      const stored = JSON.parse(localStorage.getItem("dt_game") ?? "{}");
      localStorage.setItem("dt_game", JSON.stringify({
        ...stored,
        current_stop_index: (stored.current_stop_index ?? 0) + 1,
        total_score: result.session_total_score,
        current_progress_id: result.next_progress_id,
      }));
    }
    setActionLoading(false);
  }, [progress_id, selectedAnswer]);

  function handleNext() {
    if (!answerResult) return;
    if (answerResult.is_last_stop) {
      router.push(`/play/session/${session_id}/end`);
    } else if (answerResult.next_progress_id) {
      router.push(`/play/session/${session_id}/stop/${answerResult.next_progress_id}`);
    }
  }

  async function handleSkip() {
    setActionLoading(true);
    const result = await withAuth(async (token) => {
      const res = await fetch("/api/session/skip", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ progress_id }),
      });
      return res.json() as Promise<{ next_progress_id: string | null; is_last_stop: boolean }>;
    });
    setActionLoading(false);
    if (result) {
      const stored = JSON.parse(localStorage.getItem("dt_game") ?? "{}");
      localStorage.setItem("dt_game", JSON.stringify({
        ...stored,
        current_stop_index: (stored.current_stop_index ?? 0) + 1,
        current_progress_id: result.next_progress_id,
      }));
      if (result.is_last_stop) {
        router.push(`/play/session/${session_id}/end`);
      } else if (result.next_progress_id) {
        router.push(`/play/session/${session_id}/stop/${result.next_progress_id}`);
      }
    }
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin text-primary" size={32} /></div>;

  return (
    <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-5 pb-28">
      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-sm mb-2">
          <span className="font-medium">Tappa {stopIndex + 1} di {totalStops}</span>
          {clue && <span className="text-foreground/40 text-xs">Giorno {clue.day_number} · #{clue.position}</span>}
        </div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${totalStops ? ((stopIndex) / totalStops) * 100 : 0}%` }} />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* ── STATE: CLUE ── */}
        {state === "clue" && clue && (
          <motion.div key="clue" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              {clue.mood_tags.map((t) => (
                <span key={t} className="text-sm glass px-3 py-1 rounded-full border border-glass-border">{MOOD_EMOJI[t] ?? "✨"} {t.replace("_", " ")}</span>
              ))}
              <span className={`ml-auto text-xs px-2 py-1 rounded-full glass border ${clue.rarity === "rare" ? "border-amber-400/60 text-amber-400" : clue.rarity === "secret" ? "border-purple-400/60 text-purple-400" : "border-gray-400/40 text-gray-400"}`}>
                {clue.rarity}
              </span>
            </div>

            <div className="glass rounded-2xl p-5 border border-glass-border">
              <p className="text-xs text-foreground/40 uppercase tracking-wide mb-3">Il tuo indizio</p>
              <p className="text-base leading-relaxed text-foreground/90 italic">&ldquo;{clue.clue_primary}&rdquo;</p>
            </div>

            {clueExtra && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                className="glass rounded-xl p-4 border border-accent/30">
                <p className="text-xs text-accent/70 mb-1">Indizio Extra</p>
                <p className="text-sm leading-relaxed italic">&ldquo;{clueExtra}&rdquo;</p>
              </motion.div>
            )}

            <div className="text-center text-xs text-foreground/30">{clue.stop_duration} stimati</div>

            <div className="flex flex-col gap-3">
              {!clueExtra && (
                <button onClick={handleHint} disabled={actionLoading}
                  className="w-full py-3 rounded-xl glass border border-accent/30 text-foreground/70 text-sm flex items-center justify-center gap-2 hover:border-accent/60 transition-colors disabled:opacity-50">
                  {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <HelpCircle size={14} />}
                  Sblocca Indizio Extra (-30 punti)
                </button>
              )}
              <button onClick={handleCheckin} disabled={actionLoading}
                className="w-full py-4 rounded-xl bg-primary text-white font-semibold flex items-center justify-center gap-2 hover:bg-primary-light transition-colors disabled:opacity-50">
                {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <Navigation size={18} />}
                Sono Qui — Verifica GPS
              </button>
              {error && (
                <div className="glass rounded-xl px-4 py-3 border border-danger/30 flex items-start gap-2">
                  <AlertTriangle size={14} className="text-danger mt-0.5 shrink-0" />
                  <p className="text-sm text-danger/80">{error}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── STATE: CHECK-IN ── */}
        {state === "checkin" && checkinResult?.success && (
          <motion.div key="checkin" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-success">
              <CheckCircle size={22} />
              <span className="font-semibold">Check-in effettuato!</span>
            </div>

            {checkinResult.photo_url && (
              <img src={checkinResult.photo_url} alt={checkinResult.location_name ?? ""} className="rounded-2xl w-full h-48 object-cover" />
            )}

            <div className="glass rounded-2xl p-4">
              <p className="text-xs text-foreground/40 mb-1 flex items-center gap-1"><MapPin size={11} /> Sei arrivato a</p>
              <h2 className="text-xl font-bold mb-3">{checkinResult.location_name}</h2>
              {checkinResult.story && (
                <p className="text-sm text-foreground/70 leading-relaxed">{checkinResult.story}</p>
              )}
            </div>

            {checkinResult.bonus_intuition && (
              <div className="glass rounded-xl px-4 py-3 border border-success/40 flex items-center gap-3">
                <span className="text-2xl">🎯</span>
                <div>
                  <p className="font-semibold text-success text-sm">Bonus Intuizione!</p>
                  <p className="text-xs text-foreground/50">+20 punti per non aver usato l&apos;indizio extra</p>
                </div>
              </div>
            )}

            <button onClick={handleOpenChallenge} disabled={actionLoading}
              className="w-full py-4 rounded-xl bg-primary text-white font-semibold flex items-center justify-center gap-2 hover:bg-primary-light transition-colors disabled:opacity-50">
              {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <ChevronRight size={18} />}
              Affronta la Sfida
            </button>
          </motion.div>
        )}

        {/* ── STATE: CHALLENGE ── */}
        {state === "challenge" && challenge && (
          <motion.div key="challenge" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex flex-col gap-4">
            <div className="glass rounded-2xl p-5">
              <p className="text-xs text-foreground/40 uppercase tracking-wide mb-3">La Sfida</p>
              <p className="font-semibold text-base leading-snug">{challenge.question}</p>
            </div>

            <div className="flex flex-col gap-2">
              {challenge.options.map((option, i) => (
                <button key={i} onClick={() => setSelectedAnswer(i)}
                  className={`w-full px-4 py-3.5 rounded-xl text-left text-sm transition-all border ${
                    selectedAnswer === i
                      ? "bg-primary/20 border-primary text-foreground"
                      : "glass border-glass-border hover:border-primary/40 text-foreground/80"
                  }`}
                >
                  <span className="font-medium text-foreground/50 mr-2">{String.fromCharCode(65 + i)}.</span>
                  {option}
                </button>
              ))}
            </div>

            <button onClick={handleAnswer} disabled={selectedAnswer === null || actionLoading}
              className="w-full py-4 rounded-xl bg-primary text-white font-semibold flex items-center justify-center gap-2 hover:bg-primary-light transition-colors disabled:opacity-50">
              {actionLoading ? <Loader2 size={18} className="animate-spin" /> : null}
              Conferma Risposta
            </button>
          </motion.div>
        )}

        {/* ── STATE: RESULT ── */}
        {state === "result" && answerResult && (
          <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-4">
            {answerResult.is_correct ? (
              <>
                <div className="text-center">
                  <div className="text-5xl mb-3">🎉</div>
                  <h2 className="text-2xl font-bold text-success mb-1">Tappa Completata!</h2>
                  <p className="text-3xl font-bold text-foreground">+{answerResult.points_earned}</p>
                  <p className="text-sm text-foreground/40">punti</p>
                </div>

                {checkinResult?.bonus_intuition && (
                  <div className="glass rounded-xl px-4 py-2 border border-success/30 text-center text-sm text-success">
                    🎯 +20 Bonus Intuizione incluso
                  </div>
                )}

                {answerResult.voucher_text && (
                  <div className="glass rounded-2xl p-4 border border-accent/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Gift size={16} className="text-accent" />
                      <span className="text-sm font-medium text-accent">Voucher Sbloccato!</span>
                    </div>
                    <p className="text-sm text-foreground/80">{answerResult.voucher_text}</p>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="text-center">
                  <div className="text-5xl mb-3">😔</div>
                  <h2 className="text-xl font-bold mb-1">Risposta Errata</h2>
                  <p className="text-sm text-foreground/50">La risposta corretta era:</p>
                  <p className="font-medium text-foreground/80 mt-1">{answerResult.correct_text}</p>
                </div>
                {answerResult.fun_fact && (
                  <div className="glass rounded-xl p-4 border border-primary/20">
                    <p className="text-xs text-primary/70 mb-1">Lo sapevi?</p>
                    <p className="text-sm text-foreground/70">{answerResult.fun_fact}</p>
                  </div>
                )}
                <p className="text-center text-foreground/40 text-sm">0 punti per questa tappa</p>
              </>
            )}

            <div className="glass rounded-xl px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-foreground/50">Punteggio totale</span>
              <span className="font-bold text-lg">{answerResult.session_total_score}</span>
            </div>

            <button onClick={handleNext}
              className="w-full py-4 rounded-xl bg-primary text-white font-semibold flex items-center justify-center gap-2 hover:bg-primary-light transition-colors">
              {answerResult.is_last_stop ? "Fine Avventura 🏁" : "Prossima Tappa →"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Skip button — always visible */}
      {state !== "result" && (
        <button onClick={handleSkip} disabled={actionLoading}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-2.5 rounded-full glass border border-glass-border text-sm text-foreground/40 hover:text-foreground/70 hover:border-foreground/30 transition-all disabled:opacity-40">
          Salta questa tappa
        </button>
      )}
    </div>
  );
}
