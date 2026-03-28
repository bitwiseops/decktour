"use client";

import { useState, useMemo } from "react";
import type { MoodType, MoodProfile, MoodComparison } from "@/lib/types";

const MOOD_IDS: MoodType[] = ["shopping", "food", "art", "nature", "nightlife"];

// Generate all C(5,2) = 10 pairs
function generatePairs(): [MoodType, MoodType][] {
  const pairs: [MoodType, MoodType][] = [];
  for (let i = 0; i < MOOD_IDS.length; i++) {
    for (let j = i + 1; j < MOOD_IDS.length; j++) {
      pairs.push([MOOD_IDS[i], MOOD_IDS[j]]);
    }
  }
  return pairs;
}

const PAIRS = generatePairs();

export function useMoodProfile() {
  const [comparisons, setComparisons] = useState<MoodComparison[]>(
    PAIRS.map(([moodA, moodB]) => ({ moodA, moodB, value: 50 }))
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completed, setCompleted] = useState(false);

  const currentComparison = comparisons[currentIndex] ?? null;
  const progress = currentIndex;
  const total = PAIRS.length;

  const setValue = (value: number) => {
    setComparisons((prev) => {
      const next = [...prev];
      next[currentIndex] = { ...next[currentIndex], value };
      return next;
    });
  };

  const next = () => {
    if (currentIndex < PAIRS.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setCompleted(true);
    }
  };

  const prev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    }
  };

  // Calculate mood profile from comparisons
  const moodProfile: MoodProfile = useMemo(() => {
    const scores: Record<MoodType, number[]> = {
      shopping: [],
      food: [],
      art: [],
      nature: [],
      nightlife: [],
    };

    for (const comp of comparisons) {
      // value 0 = all moodA, value 100 = all moodB
      scores[comp.moodA].push(100 - comp.value);
      scores[comp.moodB].push(comp.value);
    }

    const profile: MoodProfile = { shopping: 50, food: 50, art: 50, nature: 50, nightlife: 50 };
    for (const mood of MOOD_IDS) {
      const arr = scores[mood];
      if (arr.length > 0) {
        profile[mood] = Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
      }
    }
    return profile;
  }, [comparisons]);

  return {
    currentComparison,
    currentIndex,
    progress,
    total,
    completed,
    moodProfile,
    setValue,
    next,
    prev,
  };
}
