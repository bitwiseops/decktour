"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shuffle, Check } from "lucide-react";
import { GameCard } from "./GameCard";
import type { Card } from "@/lib/types";

interface CardDeckProps {
  cards: Card[];
  onAccept: (cards: Card[]) => void;
  onReshuffle?: () => void;
  loading?: boolean;
}

export function CardDeck({ cards, onAccept, onReshuffle, loading }: CardDeckProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      {/* Cards stack */}
      <div className="relative w-full max-w-sm h-[420px]">
        <AnimatePresence mode="popLayout">
          {cards.map((card, i) => (
            <motion.div
              key={card.id || i}
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{
                scale: i === activeIndex ? 1 : 0.95 - (Math.abs(i - activeIndex) * 0.03),
                y: i === activeIndex ? 0 : (i - activeIndex) * 8,
                opacity: i === activeIndex ? 1 : 0.5,
                zIndex: cards.length - Math.abs(i - activeIndex),
              }}
              exit={{ scale: 0.8, opacity: 0, x: -200 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="absolute inset-0"
              onClick={() => setActiveIndex(i)}
            >
              <GameCard card={card} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Card indicators */}
      <div className="flex gap-2">
        {cards.map((_, i) => (
          <button
            key={i}
            onClick={() => setActiveIndex(i)}
            className={`w-2.5 h-2.5 rounded-full transition-colors ${
              i === activeIndex ? "bg-primary" : "bg-white/20"
            }`}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        {onReshuffle && (
          <button
            onClick={onReshuffle}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-3 rounded-xl border border-glass-border text-foreground/70 hover:text-foreground hover:border-foreground/30 transition-all disabled:opacity-50"
          >
            <Shuffle size={18} className={loading ? "animate-spin" : ""} />
            Rimescola
          </button>
        )}
        <button
          onClick={() => onAccept(cards)}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary-light transition-colors"
        >
          <Check size={18} />
          Accetta
        </button>
      </div>
    </div>
  );
}
