"use client";

import { motion } from "framer-motion";
import { BookOpen } from "lucide-react";

interface HistoricalInfoProps {
  info: string;
}

export function HistoricalInfo({ info }: HistoricalInfoProps) {
  if (!info) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="rounded-2xl glass border border-purple-500/20 p-4 flex items-start gap-3"
    >
      <BookOpen size={20} className="text-purple-400 mt-0.5 shrink-0" />
      <div>
        <p className="text-xs font-semibold text-purple-400 mb-1">Lo sapevi che...</p>
        <p className="text-sm text-foreground/70">{info}</p>
      </div>
    </motion.div>
  );
}
