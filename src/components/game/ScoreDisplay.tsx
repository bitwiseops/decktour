"use client";

import { motion } from "framer-motion";
import { Trophy, MapPin, Target, HelpCircle } from "lucide-react";

interface ScoreDisplayProps {
  locationScore: number;
  exactBonus: number;
  quizScore: number;
  total: number;
}

export function ScoreDisplay({ locationScore, exactBonus, quizScore, total }: ScoreDisplayProps) {
  const items = [
    { icon: <MapPin size={16} />, label: "Check-in", score: locationScore, color: "text-primary-light" },
    { icon: <Target size={16} />, label: "Luogo esatto", score: exactBonus, color: "text-accent" },
    { icon: <HelpCircle size={16} />, label: "Quiz", score: quizScore, color: "text-success" },
  ].filter((i) => i.score > 0);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass rounded-2xl p-6 flex flex-col items-center gap-4"
    >
      <Trophy size={32} className="text-accent" />
      <motion.p
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", delay: 0.2 }}
        className="text-4xl font-bold text-accent"
      >
        +{total}
      </motion.p>

      <div className="flex flex-col gap-2 w-full">
        {items.map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.1 }}
            className="flex items-center justify-between text-sm"
          >
            <span className="flex items-center gap-2 text-foreground/60">
              {item.icon} {item.label}
            </span>
            <span className={`font-semibold ${item.color}`}>+{item.score}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
