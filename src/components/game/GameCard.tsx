"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Clock, MapPin, HelpCircle, Gift, Sparkles, Zap, ImageIcon } from "lucide-react";
import { MOODS, RARITIES, RARITY_META } from "@/lib/types";
import type { Card } from "@/lib/types";

interface GameCardProps {
  card: Card;
  index?: number;
}

const RARITY_BORDER_CLASSES: Record<string, string> = {
  common: "border-gray-400/30",
  rare: "border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.3)]",
  secret: "border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.4)]",
};

export function GameCard({ card, index = 0 }: GameCardProps) {
  const [flipped, setFlipped] = useState(false);
  const rarityInfo = RARITIES.find((r) => r.id === card.rarity) ?? RARITIES[0];
  const rarityBorder = RARITY_BORDER_CLASSES[card.rarity] ?? RARITY_BORDER_CLASSES.common;

  return (
    <motion.div
      initial={{ opacity: 0, x: 100, rotate: 5 }}
      animate={{ opacity: 1, x: 0, rotate: 0 }}
      transition={{ delay: index * 0.1, type: "spring", stiffness: 200 }}
      className="perspective cursor-pointer w-full max-w-sm mx-auto"
      onClick={() => setFlipped(!flipped)}
    >
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.6, type: "spring", stiffness: 200 }}
        className="preserve-3d relative w-full aspect-[3/4]"
      >
        {/* Front */}
        <div className={`backface-hidden absolute inset-0 rounded-2xl overflow-hidden glass border ${rarityBorder}`}>
          {card.image_url ? (
            <img
              src={card.image_url}
              alt={card.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-purple-900/30 flex items-center justify-center">
              <ImageIcon size={48} className="text-foreground/10" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          <div className="relative h-full flex flex-col justify-end p-5 gap-3">
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
                  Evento Temporaneo
                </span>
              )}
            </div>
            <h3 className="text-xl font-bold text-white leading-tight">{card.title}</h3>
            <div className="flex flex-wrap gap-2">
              {card.moods.map((moodId) => {
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
          </div>
        </div>

        {/* Back */}
        <div className={`backface-hidden rotate-y-180 absolute inset-0 rounded-2xl overflow-hidden glass border ${rarityBorder} p-5 flex flex-col gap-4`}>
          <h3 className="text-lg font-bold text-primary-light">{card.title}</h3>
          <p className="text-sm text-foreground/80 flex-1">{card.description}</p>

          <div className="flex items-start gap-2 text-sm">
            <MapPin size={16} className="text-accent mt-0.5 shrink-0" />
            <p className="text-foreground/60 italic">&ldquo;{card.location_hint}&rdquo;</p>
          </div>

          <div className="flex items-center gap-4 text-xs text-foreground/50">
            <span className="flex items-center gap-1">
              <Clock size={14} /> {card.duration_min} min
            </span>
            <span className="flex items-center gap-1">
              <HelpCircle size={14} /> {card.mission_type === "quiz" ? "Quiz" : card.mission_type === "photo" ? "Foto" : "Quiz + Foto"}
            </span>
            {card.power_level > 0 && (
              <span
                className="flex items-center gap-1 font-semibold"
                style={{ color: RARITY_META[card.rarity ?? "common"].color }}
              >
                <Zap size={14} /> {card.power_level}
              </span>
            )}
          </div>

          {card.voucher_description && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-accent/10 border border-accent/20">
              <Gift size={16} className="text-accent mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-accent">Voucher</p>
                <p className="text-xs text-foreground/60">{card.voucher_description}</p>
              </div>
            </div>
          )}

          <p className="text-xs text-center text-foreground/30">Tap per girare</p>
        </div>
      </motion.div>
    </motion.div>
  );
}
