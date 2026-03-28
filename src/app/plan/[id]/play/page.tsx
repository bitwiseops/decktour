"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Trophy } from "lucide-react";
import { GameCard } from "@/components/game/GameCard";
import { CheckInButton } from "@/components/game/CheckInButton";
import { QuizModal } from "@/components/game/QuizModal";
import { ScoreDisplay } from "@/components/game/ScoreDisplay";
import { VoucherCard } from "@/components/game/VoucherCard";
import { GameMap } from "@/components/map/GameMap";
import { useGeolocation } from "@/hooks/useGeolocation";
import { calculateCheckInScore } from "@/lib/scoring";
import type { Card, MoodProfile, GeneratedCard } from "@/lib/types";

interface StoredPlan {
  id: string;
  title: string;
  city: string;
  country: string;
  dateFrom: string;
  dateTo: string;
  cards: (GeneratedCard & { day_number: number; stage_order: number })[];
  numDays: number;
  stagesPerDay: number;
  durationMin: number;
  moodProfile: MoodProfile;
}

type PlayPhase = "hint" | "checkin" | "quiz" | "score" | "complete";

export default function PlayPage() {
  const params = useParams();
  const router = useRouter();
  const { position } = useGeolocation(true);
  const [plan, setPlan] = useState<StoredPlan | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<PlayPhase>("hint");
  const [totalScore, setTotalScore] = useState(0);
  const [lastScore, setLastScore] = useState<{ locationScore: number; exactBonus: number; quizScore: number; total: number } | null>(null);
  const [lastDistance, setLastDistance] = useState(0);

  useEffect(() => {
    const stored = localStorage.getItem(`deckTourPlan_${params.id}`);
    if (stored) setPlan(JSON.parse(stored));
  }, [params.id]);

  const cards: Card[] = useMemo(() => {
    if (!plan) return [];
    return plan.cards.map((c, i) => ({
      id: `${plan.id}-card-${i}`,
      plan_id: plan.id,
      poi_id: null,
      day_number: c.day_number,
      stage_order: c.stage_order,
      title: c.title,
      description: c.description,
      moods: c.moods,
      image_url: null,
      lat: c.lat,
      lon: c.lon,
      duration_min: plan.durationMin,
      mission_type: "quiz" as const,
      quiz_data: c.quiz_data || [],
      location_hint: c.location_hint,
      base_score: 100,
      voucher_description: c.suggested_voucher || null,
      voucher_partner: null,
      is_temporary_event: c.is_temporary_event,
    }));
  }, [plan]);

  const currentCard = cards[currentIndex] ?? null;
  const isLastCard = currentIndex >= cards.length - 1;

  const handleCheckIn = (_lat: number, _lon: number, distance: number) => {
    setLastDistance(distance);
    // Unlock quiz regardless
    setTimeout(() => setPhase("quiz"), 1500);
  };

  const handleQuizComplete = (answers: number[], correct: number) => {
    const score = calculateCheckInScore(lastDistance, currentCard?.base_score ?? 100, correct);
    setLastScore(score);
    setTotalScore((s) => s + score.total);
    setPhase("score");
  };

  const handleNextCard = () => {
    if (isLastCard) {
      setPhase("complete");
    } else {
      setCurrentIndex((i) => i + 1);
      setPhase("hint");
      setLastScore(null);
    }
  };

  if (!plan || !currentCard) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-foreground/50">Caricamento...</p>
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
        <p className="text-foreground/50 text-center">{plan.title}</p>
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
            <GameCard card={currentCard} />

            {/* Map */}
            <GameMap
              cards={cards}
              activeCardIndex={currentIndex}
              playerPosition={position}
              className="h-[200px]"
            />

            {/* Check-in */}
            <div className="flex justify-center py-4">
              <CheckInButton
                targetLat={currentCard.lat}
                targetLon={currentCard.lon}
                onCheckIn={handleCheckIn}
              />
            </div>
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
