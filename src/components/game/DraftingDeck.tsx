"use client";

import { useState, useCallback } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  type PanInfo,
} from "framer-motion";
import { Shuffle, Check, X, Sparkles } from "lucide-react";
import { MOODS, RARITIES, RARITY_META } from "@/lib/types";
import type { GeneratedCard, MoodType } from "@/lib/types";

type DraftCard = GeneratedCard & { day_number: number; stage_order: number };

interface DraftingDeckProps {
  cards: DraftCard[];
  reshufflesLeft: number;
  maxReshuffles: number;
  onAccept: (card: DraftCard) => void;
  onReshuffle: () => void;
  loading?: boolean;
}

const SWIPE_THRESHOLD = 100;

function CoveredCard({ onReveal }: { onReveal: () => void }) {
  return (
    <motion.div
      className="w-full aspect-[3/4] rounded-2xl glass border border-glass-border cursor-pointer overflow-hidden relative"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onReveal}
    >
      {/* Card back pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-purple-900/30 to-primary/10" />
      <div className="absolute inset-0" style={{
        backgroundImage: `radial-gradient(circle at 25% 25%, rgba(99,102,241,0.15) 1px, transparent 1px),
                          radial-gradient(circle at 75% 75%, rgba(99,102,241,0.1) 1px, transparent 1px)`,
        backgroundSize: "24px 24px",
      }} />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
        <motion.div
          animate={{ rotateY: [0, 180, 360] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="w-16 h-16 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center"
        >
          <Sparkles size={28} className="text-primary-light" />
        </motion.div>
        <p className="text-sm text-foreground/40 font-medium">Tap per scoprire</p>
      </div>
    </motion.div>
  );
}

function RevealedCard({
  card,
  onSwipeAway,
}: {
  card: DraftCard;
  onSwipeAway: () => void;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 0.8, 1, 0.8, 0.5]);

  const rarityInfo = RARITIES.find((r) => r.id === card.rarity) ?? RARITIES[0];

  const RARITY_BORDER: Record<string, string> = {
    common: "border-gray-400/30",
    rare: "border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.3)]",
    secret: "border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.4)]",
  };
  const rarityBorder = RARITY_BORDER[card.rarity] ?? RARITY_BORDER.common;

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (Math.abs(info.offset.x) > SWIPE_THRESHOLD) {
      onSwipeAway();
    }
  }

  return (
    <motion.div
      style={{ x, rotate, opacity }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.8}
      onDragEnd={handleDragEnd}
      className="w-full aspect-[3/4] cursor-grab active:cursor-grabbing touch-none"
    >
      <div className={`h-full rounded-2xl overflow-hidden glass border ${rarityBorder}`}>
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"
          style={{
            backgroundImage: card.source_url ? `url(${card.source_url})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        {!card.source_url && (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-purple-900/30" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

        <div className="relative h-full flex flex-col justify-between p-5">
          {/* Top: rarity badge */}
          <div className="self-start flex items-center gap-2">
            {card.rarity !== "common" && (
              <span
                className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                style={{ backgroundColor: `${rarityInfo.color}20`, color: rarityInfo.color }}
              >
                {card.rarity === "secret" && <Sparkles size={12} />}
                {rarityInfo.label}
              </span>
            )}
            {card.is_temporary_event && card.rarity !== "rare" && (
              <span className="px-2 py-1 rounded-full bg-accent/20 text-accent text-xs font-medium">
                Evento
              </span>
            )}
          </div>

          {/* Bottom: card info */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xl font-bold text-white leading-tight">{card.title}</h3>
            <p className="text-sm text-white/70 line-clamp-2">{card.description}</p>
            <div className="flex flex-wrap gap-2">
              {card.moods.map((moodId: MoodType) => {
                const mood = MOODS.find((m) => m.id === moodId);
                if (!mood) return null;
                return (
                  <span
                    key={moodId}
                    className="px-2 py-1 rounded-full text-xs font-medium"
                    style={{ backgroundColor: `${mood.color}20`, color: mood.color }}
                  >
                    {mood.emoji} {mood.label.split("&")[0].trim()}
                  </span>
                );
              })}
            </div>
            <p className="text-xs text-white/40 text-center mt-1">
              <X size={12} className="inline mr-1" />
              Swipe per scartare
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function DraftingDeck({
  cards,
  reshufflesLeft,
  maxReshuffles,
  onAccept,
  onReshuffle,
  loading,
}: DraftingDeckProps) {
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());
  const [discardedIndices, setDiscardedIndices] = useState<Set<number>>(new Set());
  const [acceptedIndex, setAcceptedIndex] = useState<number | null>(null);

  const visibleCards = cards.filter((_, i) => !discardedIndices.has(i));
  const allRevealed = cards.every(
    (_, i) => revealedIndices.has(i) || discardedIndices.has(i)
  );
  const hasVisibleCards = visibleCards.length > 0;

  const handleReveal = useCallback((index: number) => {
    setRevealedIndices((prev) => new Set(prev).add(index));
  }, []);

  const handleDiscard = useCallback((index: number) => {
    setDiscardedIndices((prev) => new Set(prev).add(index));
  }, []);

  const handleAccept = useCallback(
    (index: number) => {
      setAcceptedIndex(index);
      onAccept(cards[index]);
    },
    [cards, onAccept]
  );

  return (
    <div className="flex flex-col items-center gap-5 w-full">
      {/* Reshuffle counter */}
      <div className="flex items-center gap-2 text-sm text-foreground/50">
        <Shuffle size={14} />
        <span>
          Reshuffle: {reshufflesLeft}/{maxReshuffles}
        </span>
        <div className="flex gap-1 ml-1">
          {Array.from({ length: maxReshuffles }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full ${
                i < reshufflesLeft ? "bg-primary" : "bg-white/10"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Cards area */}
      <div className="relative w-full max-w-sm h-[420px]">
        <AnimatePresence mode="popLayout">
          {cards.map((card, i) => {
            if (discardedIndices.has(i) || acceptedIndex === i) return null;

            const isRevealed = revealedIndices.has(i);
            const stackOffset = [...discardedIndices].filter((d) => d < i).length;
            const visualIndex = i - stackOffset;

            return (
              <motion.div
                key={`${card.title}-${i}`}
                layout
                initial={{ scale: 0.9, y: 20, opacity: 0, rotateY: 0 }}
                animate={{
                  scale: isRevealed ? 1 : 0.95 - visualIndex * 0.03,
                  y: isRevealed ? 0 : visualIndex * 8,
                  opacity: isRevealed ? 1 : 0.7,
                  zIndex: isRevealed ? 10 : cards.length - visualIndex,
                }}
                exit={{
                  x: -300,
                  opacity: 0,
                  scale: 0.8,
                  transition: { duration: 0.3 },
                }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="absolute inset-0"
              >
                {isRevealed ? (
                  <RevealedCard card={card} onSwipeAway={() => handleDiscard(i)} />
                ) : (
                  <CoveredCard onReveal={() => handleReveal(i)} />
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Empty state after all discarded */}
        {!hasVisibleCards && acceptedIndex === null && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-foreground/40">
            <p className="text-sm">Tutte le carte scartate</p>
            {reshufflesLeft > 0 && (
              <p className="text-xs">Usa un reshuffle per nuove carte</p>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 w-full max-w-sm">
        {reshufflesLeft > 0 && acceptedIndex === null && (
          <button
            onClick={onReshuffle}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-glass-border text-foreground/70 hover:text-foreground hover:border-foreground/30 transition-all disabled:opacity-50 flex-1"
          >
            <Shuffle size={16} className={loading ? "animate-spin" : ""} />
            Rimescola
          </button>
        )}
        {allRevealed && hasVisibleCards && acceptedIndex === null && (
          <>
            {visibleCards.map((card, vi) => {
              const originalIndex = cards.indexOf(card);
              return (
                <button
                  key={originalIndex}
                  onClick={() => handleAccept(originalIndex)}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary-light transition-colors flex-1"
                >
                  <Check size={16} />
                  {visibleCards.length > 1 ? `Carta ${vi + 1}` : "Accetta"}
                </button>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
