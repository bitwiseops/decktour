"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Trophy, Loader2, Eye, Star, BookOpen, Zap } from "lucide-react";
import { GameCard } from "@/components/game/GameCard";
import { CheckInButton } from "@/components/game/CheckInButton";
import { CountdownTimer } from "@/components/game/CountdownTimer";
import { QuizModal } from "@/components/game/QuizModal";
import { ScoreDisplay } from "@/components/game/ScoreDisplay";
import { VoucherCard } from "@/components/game/VoucherCard";
import { HistoricalInfo } from "@/components/game/HistoricalInfo";
import { GameMap } from "@/components/map/GameMap";
import { useGeolocation } from "@/hooks/useGeolocation";
import { supabase } from "@/lib/supabase";
import { calculateCheckInScore, CHECK_IN_RADIUS } from "@/lib/scoring";
import type { ScoreBreakdown } from "@/lib/scoring";
import type { Card } from "@/lib/types";
import type { HintLevel } from "@/components/game/GameCard";

type PlayPhase = "hint" | "checkin" | "quiz" | "score" | "complete";

const HINT_PROGRESSION: HintLevel[] = ["hard", "medium", "easy"];
const AUTO_ADVANCE_DELAY_MS = 4000;

function hintStepToRevealed(step: number): number {
  return step + 1;
}

function getPerformanceLabel(score: number, maxScore: number): { label: string; stars: number; color: string } {
  const pct = maxScore > 0 ? score / maxScore : 0;
  if (pct >= 0.75) return { label: "Esploratore Leggendario", stars: 3, color: "text-accent" };
  if (pct >= 0.45) return { label: "Avventuriero", stars: 2, color: "text-primary-light" };
  return { label: "Viaggiatore", stars: 1, color: "text-foreground/60" };
}

// Punteggio massimo teorico per carta: 100 base + 50 exact + 100 intuition + 75 quiz (3 domande)
const MAX_SCORE_PER_CARD = 325;

export default function PlayPage() {
  const params = useParams();
  const router = useRouter();
  const { position } = useGeolocation(true);
  const [cards, setCards] = useState<Card[]>([]);
  const [planDiary, setPlanDiary] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<PlayPhase>("hint");
  const [totalScore, setTotalScore] = useState(0);
  const [lastScore, setLastScore] = useState<ScoreBreakdown | null>(null);
  const [lastDistance, setLastDistance] = useState(0);
  const [timerExpired, setTimerExpired] = useState(false);
  const [hintStep, setHintStep] = useState(0);
  const [voucherUnlocked, setVoucherUnlocked] = useState(false);
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // track final score to avoid stale closure in complete phase
  const totalScoreRef = useRef(0);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      const authHeaders: Record<string, string> = {};
      if (session?.access_token) authHeaders["Authorization"] = `Bearer ${session.access_token}`;

      // Avvia la sessione e recupera le carte
      fetch(`/api/plans/${params.id}/play`, { method: "POST", headers: authHeaders })
        .then((r) => r.json())
        .then((data) => {
          if (data.cards?.length) setCards(data.cards);
        })
        .catch(() => {})
        .finally(() => setLoading(false));

      // Carica il diario del piano per il reveal finale
      fetch(`/api/plans/${params.id}`, { headers: authHeaders })
        .then((r) => r.json())
        .then((data) => {
          if (data.description) setPlanDiary(data.description);
        })
        .catch(() => {});
    }
    init();
  }, [params.id]);

  const currentCard = cards[currentIndex] ?? null;
  const isLastCard = currentIndex >= cards.length - 1;
  const currentHintLevel = HINT_PROGRESSION[hintStep] ?? "easy";
  const canRevealMore = hintStep < HINT_PROGRESSION.length - 1;

  // Auto-avanzamento quando il timer scade
  useEffect(() => {
    if (!timerExpired || phase !== "hint") return;
    if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    autoAdvanceRef.current = setTimeout(() => {
      if (isLastCard) {
        setPhase("complete");
      } else {
        setCurrentIndex((i) => i + 1);
        setPhase("hint");
        setLastScore(null);
        setTimerExpired(false);
        setHintStep(0);
        setVoucherUnlocked(false);
      }
    }, AUTO_ADVANCE_DELAY_MS);
    return () => {
      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    };
  }, [timerExpired, phase, isLastCard]);

  const revealNextHint = useCallback(() => {
    if (canRevealMore) setHintStep((s) => s + 1);
  }, [canRevealMore]);

  const handleRevealHint = useCallback(
    (level: HintLevel) => {
      const idx = HINT_PROGRESSION.indexOf(level);
      if (idx > hintStep) setHintStep(idx);
    },
    [hintStep]
  );

  const handleCheckIn = (_lat: number, _lon: number, distance: number) => {
    if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    setLastDistance(distance);
    if (currentCard?.quiz_data?.length) {
      setTimeout(() => setPhase("quiz"), 1500);
    } else {
      // Nessun quiz: passa direttamente al punteggio
      const score = calculateCheckInScore(distance, currentCard?.base_score ?? 100, 0, timerExpired, hintStepToRevealed(hintStep));
      setVoucherUnlocked(distance <= CHECK_IN_RADIUS);
      setLastScore(score);
      const newTotal = totalScoreRef.current + score.total;
      totalScoreRef.current = newTotal;
      setTotalScore(newTotal);
      setPhase("score");
    }
  };

  const handleQuizComplete = (answers: number[], correct: number) => {
    const score = calculateCheckInScore(
      lastDistance,
      currentCard?.base_score ?? 100,
      correct,
      timerExpired,
      hintStepToRevealed(hintStep)
    );
    const locationValid = lastDistance <= CHECK_IN_RADIUS;
    setVoucherUnlocked(locationValid && correct > 0);
    setLastScore(score);
    const newTotal = totalScoreRef.current + score.total;
    totalScoreRef.current = newTotal;
    setTotalScore(newTotal);
    setPhase("score");
  };

  const handleNextCard = useCallback(() => {
    if (isLastCard) {
      // Accredita punti al profilo
      const finalScore = totalScoreRef.current;
      fetch("/api/profile/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score: finalScore }),
      }).catch(() => {});
      setPhase("complete");
    } else {
      setCurrentIndex((i) => i + 1);
      setPhase("hint");
      setLastScore(null);
      setTimerExpired(false);
      setHintStep(0);
      setVoucherUnlocked(false);
    }
  }, [isLastCard]);

  const handleTimerExpired = useCallback(() => {
    setTimerExpired(true);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 size={32} className="text-primary animate-spin" />
      </div>
    );
  }

  if (!currentCard && phase !== "complete") {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-foreground/50">Nessuna carta trovata</p>
      </div>
    );
  }

  // â”€â”€ Schermata finale â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (phase === "complete") {
    const maxScore = cards.length * MAX_SCORE_PER_CARD;
    const perf = getPerformanceLabel(totalScore, maxScore);

    return (
      <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-3 text-center"
        >
          <Trophy size={56} className="text-accent" />
          <h1 className="text-3xl font-bold">Piano completato!</h1>
        </motion.div>

        {/* Performance Score */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-2xl p-6 flex flex-col items-center gap-4"
        >
          <div className="flex items-center gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Star
                key={i}
                size={28}
                className={i < perf.stars ? "text-accent fill-accent" : "text-white/15"}
              />
            ))}
          </div>
          <p className={`text-xl font-bold ${perf.color}`}>{perf.label}</p>
          <motion.p
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.4 }}
            className="text-5xl font-bold text-accent"
          >
            {totalScore}
          </motion.p>
          <p className="text-sm text-foreground/40">punti su {maxScore} possibili</p>
          <div className="w-full h-2 rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full bg-accent"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (totalScore / maxScore) * 100)}%` }}
              transition={{ delay: 0.5, duration: 0.8 }}
            />
          </div>
        </motion.div>

        {/* Diario Svelato */}
        {planDiary && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass rounded-2xl p-5"
          >
            <div className="flex items-center gap-2 text-sm text-accent mb-3">
              <BookOpen size={16} />
              <span className="font-semibold">Diario Svelato</span>
              <Zap size={14} className="ml-auto text-accent/60" />
            </div>
            <p className="text-foreground/90 leading-relaxed italic text-sm">
              &ldquo;{planDiary}&rdquo;
            </p>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="flex gap-3"
        >
          <button
            onClick={() => router.push("/leaderboard")}
            className="flex-1 py-3 rounded-xl glass border border-glass-border text-foreground/70 font-semibold hover:border-primary/30 transition-colors"
          >
            Classifica
          </button>
          <button
            onClick={() => router.push("/")}
            className="flex-1 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary-light transition-colors"
          >
            Home
          </button>
        </motion.div>
      </div>
    );
  }

  // â”€â”€ Gioco in corso â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <div className="max-w-lg mx-auto px-4 py-4 flex flex-col gap-4">
      {/* Progress */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground/50">
          Carta {currentIndex + 1} di {cards.length}
        </span>
        <span className="text-accent font-semibold">{totalScore} punti</span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full bg-primary"
          animate={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
        />
      </div>

      <AnimatePresence mode="wait">
        {/* Hint + Check-in phase */}
        {(phase === "hint" || phase === "checkin") && currentCard && (
          <motion.div key={`play-${currentIndex}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-4">
            <CountdownTimer
              key={currentCard.id}
              durationMin={currentCard.duration_min}
              onExpired={handleTimerExpired}
            />

            <GameCard card={currentCard} hintLevel={currentHintLevel} onRevealHint={handleRevealHint} />

            {canRevealMore && (
              <button
                onClick={revealNextHint}
                className="self-center flex items-center gap-2 px-4 py-2 rounded-xl glass border border-white/10 text-sm text-foreground/60 hover:text-foreground/80 transition-colors"
              >
                <Eye size={16} />
                Rivela indizio piÃ¹ facile
              </button>
            )}

            {currentCard.historical_info && (
              <HistoricalInfo info={currentCard.historical_info} />
            )}

            <GameMap
              cards={cards}
              activeCardIndex={currentIndex}
              playerPosition={position}
              className="h-[200px]"
            />

            <div className="flex justify-center py-4">
              <CheckInButton
                targetLat={currentCard.lat}
                targetLon={currentCard.lon}
                onCheckIn={handleCheckIn}
                hintsRevealed={hintStepToRevealed(hintStep)}
              />
            </div>

            {/* Timer scaduto: avanzamento automatico con countdown visivo */}
            {timerExpired && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full py-3 rounded-xl bg-white/5 border border-danger/30 text-danger/80 text-sm text-center"
              >
                Tempo scaduto â€” passaggio automatico alla prossima carta...
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Quiz phase */}
        {phase === "quiz" && currentCard?.quiz_data?.length > 0 && (
          <QuizModal
            key={`quiz-${currentIndex}`}
            questions={currentCard.quiz_data}
            onComplete={handleQuizComplete}
            onClose={() => handleQuizComplete([], 0)}
          />
        )}

        {/* Score phase */}
        {phase === "score" && lastScore && (
          <motion.div key={`score-${currentIndex}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-4">
            <ScoreDisplay {...lastScore} />

            {voucherUnlocked && currentCard?.voucher_description && (
              <VoucherCard
                description={currentCard.voucher_description}
                partner={currentCard.voucher_partner}
                code={currentCard.voucher_code}
                validityRadius={currentCard.voucher_validity_radius}
              />
            )}

            <button
              onClick={handleNextCard}
              className="w-full py-3 rounded-xl bg-primary text-white font-semibold flex items-center justify-center gap-2 hover:bg-primary-light transition-colors"
            >
              {isLastCard ? "Completa il piano" : "Prossima carta"}
              <ChevronRight size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
