"use client";

import { useState, useCallback } from "react";
import type { Card, CheckIn, QuizQuestion } from "@/lib/types";
import { haversineDistance, calculateCheckInScore } from "@/lib/scoring";

interface GameState {
  sessionId: string | null;
  cards: Card[];
  currentCardIndex: number;
  completedCards: string[];
  checkIns: Map<string, CheckIn>;
  totalScore: number;
  isComplete: boolean;
}

export function useGameSession(cards: Card[]) {
  const [state, setState] = useState<GameState>({
    sessionId: null,
    cards,
    currentCardIndex: 0,
    completedCards: [],
    checkIns: new Map(),
    totalScore: 0,
    isComplete: false,
  });

  const currentCard = state.cards[state.currentCardIndex] ?? null;

  const startSession = useCallback((sessionId: string) => {
    setState((s) => ({ ...s, sessionId }));
  }, []);

  const performCheckIn = useCallback(
    (playerLat: number, playerLon: number, quizAnswers: number[], quizData: QuizQuestion[]) => {
      if (!currentCard) return null;

      const distance = haversineDistance(playerLat, playerLon, currentCard.lat, currentCard.lon);
      const quizCorrect = quizAnswers.filter((a, i) => a === quizData[i]?.correctIndex).length;
      const score = calculateCheckInScore(distance, currentCard.base_score, quizCorrect);

      const checkIn: CheckIn = {
        id: crypto.randomUUID(),
        session_id: state.sessionId ?? "",
        card_id: currentCard.id,
        player_id: "",
        player_lat: playerLat,
        player_lon: playerLon,
        distance_meters: distance,
        location_valid: distance <= 500,
        location_exact: distance <= 100,
        quiz_answers: quizAnswers,
        quiz_correct: quizCorrect,
        quiz_total: quizData.length,
        photo_url: null,
        score_earned: score.total,
        voucher_unlocked: distance <= 500,
      };

      setState((s) => {
        const newCheckIns = new Map(s.checkIns);
        newCheckIns.set(currentCard.id, checkIn);
        const newCompleted = [...s.completedCards, currentCard.id];
        const newTotal = s.totalScore + score.total;
        const nextIndex = s.currentCardIndex + 1;
        const isComplete = nextIndex >= s.cards.length;

        return {
          ...s,
          checkIns: newCheckIns,
          completedCards: newCompleted,
          totalScore: newTotal,
          currentCardIndex: isComplete ? s.currentCardIndex : nextIndex,
          isComplete,
        };
      });

      return { checkIn, score };
    },
    [currentCard, state.sessionId]
  );

  const goToCard = useCallback((index: number) => {
    setState((s) => ({ ...s, currentCardIndex: Math.max(0, Math.min(index, s.cards.length - 1)) }));
  }, []);

  return {
    ...state,
    currentCard,
    startSession,
    performCheckIn,
    goToCard,
  };
}
