"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Map, Star } from "lucide-react";
import { MoodRadar } from "@/components/game/MoodRadar";
import type { MoodProfile } from "@/lib/types";

export default function ProfilePage() {
  const [moodProfile, setMoodProfile] = useState<MoodProfile | null>(null);
  const [planCount, setPlanCount] = useState(0);

  useEffect(() => {
    const stored = localStorage.getItem("deckTourMoodProfile");
    if (stored) setMoodProfile(JSON.parse(stored));

    const ids = JSON.parse(localStorage.getItem("deckTourPlanIds") || "[]") as string[];
    setPlanCount(ids.length);
  }, []);

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Profilo</h1>

      {/* Avatar + name */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-6 flex flex-col items-center gap-4 mb-6"
      >
        <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-3xl font-bold text-primary">
          D
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold">Deck Explorer</h2>
          <p className="text-sm text-foreground/40">Giocatore</p>
        </div>

        {/* Stats */}
        <div className="flex gap-6 mt-2">
          <div className="text-center">
            <p className="text-xl font-bold text-accent">0</p>
            <p className="text-xs text-foreground/40 flex items-center gap-1"><Trophy size={12} /> Punti</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-primary">{planCount}</p>
            <p className="text-xs text-foreground/40 flex items-center gap-1"><Map size={12} /> Piani</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-success">0</p>
            <p className="text-xs text-foreground/40 flex items-center gap-1"><Star size={12} /> Giocate</p>
          </div>
        </div>
      </motion.div>

      {/* Mood radar */}
      {moodProfile && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-6"
        >
          <h3 className="text-sm font-medium text-foreground/40 uppercase tracking-wider mb-4">Il tuo DNA da viaggiatore</h3>
          <MoodRadar profile={moodProfile} size={280} />
        </motion.div>
      )}

      {!moodProfile && (
        <div className="text-center py-8">
          <p className="text-foreground/40 mb-2">Profilo mood non creato</p>
          <a href="/onboarding" className="text-primary font-medium">Crea il tuo profilo</a>
        </div>
      )}
    </div>
  );
}
