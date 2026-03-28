"use client";

import { motion, AnimatePresence } from "framer-motion";
import { MOODS } from "@/lib/types";
import type { MoodComparison } from "@/lib/types";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface MoodSwiperProps {
  comparison: MoodComparison;
  index: number;
  total: number;
  onValueChange: (value: number) => void;
  onNext: () => void;
  onPrev: () => void;
  canGoBack: boolean;
}

export function MoodSwiper({ comparison, index, total, onValueChange, onNext, onPrev, canGoBack }: MoodSwiperProps) {
  const moodA = MOODS.find((m) => m.id === comparison.moodA)!;
  const moodB = MOODS.find((m) => m.id === comparison.moodB)!;

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-md mx-auto px-4">
      {/* Progress */}
      <div className="w-full">
        <div className="flex justify-between text-sm text-foreground/60 mb-2">
          <span>{index + 1} di {total}</span>
        </div>
        <div className="w-full h-2 rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${((index + 1) / total) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Comparison */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${comparison.moodA}-${comparison.moodB}`}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.25 }}
          className="w-full"
        >
          <div className="glass rounded-2xl p-8 flex flex-col items-center gap-6">
            <p className="text-foreground/60 text-sm text-center">Cosa preferisci?</p>

            <div className="flex items-center justify-between w-full">
              <div className="flex flex-col items-center gap-2 w-24">
                <span className="text-4xl">{moodA.emoji}</span>
                <span className="text-xs text-center font-medium" style={{ color: moodA.color }}>{moodA.label}</span>
              </div>

              <div className="flex-1 px-4">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={comparison.value}
                  onChange={(e) => onValueChange(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer accent-primary bg-white/10"
                />
              </div>

              <div className="flex flex-col items-center gap-2 w-24">
                <span className="text-4xl">{moodB.emoji}</span>
                <span className="text-xs text-center font-medium" style={{ color: moodB.color }}>{moodB.label}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-foreground/40">
              <span>{100 - comparison.value}%</span>
              <span>—</span>
              <span>{comparison.value}%</span>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex gap-4">
        {canGoBack && (
          <button
            onClick={onPrev}
            className="flex items-center gap-1 px-4 py-2 rounded-xl text-foreground/60 hover:text-foreground transition-colors"
          >
            <ChevronLeft size={18} />
            Indietro
          </button>
        )}
        <button
          onClick={onNext}
          className="flex items-center gap-1 px-6 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary-light transition-colors"
        >
          {index < total - 1 ? "Avanti" : "Scopri il tuo profilo"}
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
