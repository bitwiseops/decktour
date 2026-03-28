"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Trophy, Loader2, Eye } from "lucide-react";
import { GameCard } from "@/components/game/GameCard";
import { CheckInButton } from "@/components/game/CheckInButton";
import { CountdownTimer } from "@/components/game/CountdownTimer";
import { QuizModal } from "@/components/game/QuizModal";
import { ScoreDisplay } from "@/components/game/ScoreDisplay";
import { VoucherCard } from "@/components/game/VoucherCard";
import { HistoricalInfo } from "@/components/game/HistoricalInfo";
import { GameMap } from "@/components/map/GameMap";
import { useGeolocation } from "@/hooks/useGeolocation";
import { calculateCheckInScore } from "@/lib/scoring";
import type { Card } from "@/lib/types";
import type { HintLevel } from "@/components/game/GameCard";

type PlayPhase = "hint" | "checkin" | "quiz" | "score" | "complete";

const HINT_PROGRESSION: HintLevel[] = ["hard", "medium", "easy"];

export default function PlayPage() {
  const params = useParams();
  const router = useRouter();
  const { position } = useGeolocation(true);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<PlayPhase>("hint");
  const [totalScore, setTotalScore] = useState(0);
  const [lastScore, setLastScore] = useState<{ locationScore: number; exactBonus: number; quizScore: number; timePenalty: number; total: number } | null>(null);
  const [lastDistance, setLastDistance] = useState(0);
  const [timerExpired, setTimerExpired] = useState(false);
  const [hintStep, setHintStep] = useState(0);

  useEffect(() => {
    fetch(`/api/plans/${params.id}/cards`)
      .then((r) => r.json())
      .then((data) => setCards(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params.id]);

  const currentCard = cards[currentIndex] ?? null;
  const isLastCard = currentIndex >= cards.length - 1;
  const currentHintLevel = HINT_PROGRESSION[hintStep] ?? "easy";
  const canRevealMore = hintStep < HINT_PROGRESSION.length - 1;

  const revealNextHint = useCallback(() => {
    if (canRevealMore) {
      setHintStep((s) => s + 1);
    }
  }, [canRevealMore]);

  const handleCheckIn = (_lat: number, _lon: number, distance: number) => {
    setLastDistance(distance);
    setTimeout(() => setPhase("quiz"), 1500);
  };

  const handleQuizComplete = (answers: number[], correct: number) => {
    const score = calculateCheckInScore(lastDistance, currentCard?.base_score ?? 100, correct, timerExpired);
    setLastScore(score);
    setTotalScore((s) => s + score.total);
    setPhase("score");
  };

  const handleNextCard = useCallback(() => {
    if (isLastCard) {
      setPhase("complete");
    } else {
      setCurrentIndex((i) => i + 1);
      setPhase("hint");
      setLastScore(null);
      setTimerExpired(false);
      setHintStep(0);
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

  if (!currentCard) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-foreground/50">Nessuna carta trovata</p>
      </div>
    );
  }

  // Game complete screen
  if (phase === "complete") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] px-4 py-8 max-w-lg mx-auto gap-6">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
          <Trophy size={64} className="text-accent" />
        </motion.div>
        <h1 className="text-3xl font-bold text-center">Piano completato!</h1>
        <motion.p
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3 }}
          className="text-5xl font-bold text-accent"
        >
          {totalScore}
        </motion.p>
        <p className="text-foreground/40">punti totali</p>
        <button
          onClick={() => router.push("/")}
          className="mt-4 px-6 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary-light transition-colors"
        >
          Torna alla home
        </button>
      </div>
    );
  }

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
        {(phase === "hint" || phase === "checkin") && (
          <motion.div key="play" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-4">
            <CountdownTimer
              key={currentCard.id}
              durationMin={currentCard.duration_min}
              onExpired={handleTimerExpired}
            />

            <GameCard card={currentCard} hintLevel={currentHintLevel} />

            {canRevealMore && (
              <button
                onClick={revealNextHint}
                className="self-center flex items-center gap-2 px-4 py-2 rounded-xl glass border border-white/10 text-sm text-foreground/60 hover:text-foreground/80 transition-colors"
              >
                <Eye size={16} />
                Rivela indizio più facile
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
              />
            </div>

            {timerExpired && !isLastCard && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={handleNextCard}
                className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-foreground/60 font-semibold flex items-center justify-center gap-2 hover:bg-white/10 transition-colors"
              >
                Salta alla prossima carta
                <ChevronRight size={18} />
              </motion.button>
            )}
          </motion.div>
        )}

        {/* Quiz phase */}
        {phase === "quiz" && currentCard.quiz_data.length > 0 && (
          <QuizModal
            key="quiz"
            questions={currentCard.quiz_data}
            onComplete={handleQuizComplete}
            onClose={() => handleQuizComplete([], 0)}
          />
        )}

        {/* Score phase */}
        {phase === "score" && lastScore && (
          <motion.div key="score" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-4">
            <ScoreDisplay {...lastScore} />

            {currentCard.voucher_description && (
              <VoucherCard description={currentCard.voucher_description} partner={currentCard.voucher_partner} />
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
