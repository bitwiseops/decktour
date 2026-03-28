"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Play, Calendar, Clock, MapPin, Star, Loader2, Zap, BookOpen, ImageIcon } from "lucide-react";
import { GameCard } from "@/components/game/GameCard";
import type { Card } from "@/lib/types";

interface PlanData {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  city_name: string;
  country: string;
  date_from: string;
  date_to: string;
  num_stages: number;
  power_level: number;
  status: string;
}

export default function PlanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/plans/${params.id}`).then((r) => r.json()),
      fetch(`/api/plans/${params.id}/cards`).then((r) => r.json()),
    ])
      .then(([planData, cardsData]) => {
        setPlan(planData);
        setCards(cardsData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 size={32} className="text-primary animate-spin" />
      </div>
    );
  }

  if (!plan || plan.id === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-foreground/50">Piano non trovato</p>
      </div>
    );
  }

  // Group cards by day
  const cardsByDay: Record<number, Card[]> = {};
  cards.forEach((c) => {
    const day = c.day_number;
    if (!cardsByDay[day]) cardsByDay[day] = [];
    cardsByDay[day].push(c);
  });

  const numDays = Object.keys(cardsByDay).length;

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="glass rounded-2xl overflow-hidden">
          {/* Cover image */}
          {plan.image_url ? (
            <div className="relative w-full aspect-video">
              <img
                src={plan.image_url}
                alt={plan.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </div>
          ) : (
            <div className="relative w-full aspect-video bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <ImageIcon size={48} className="text-foreground/20" />
            </div>
          )}
          <div className="p-6">
            <h1 className="text-2xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {plan.title}
            </h1>
            <div className="flex flex-wrap gap-3 text-sm text-foreground/50">
              <span className="flex items-center gap-1"><MapPin size={14} /> {plan.city_name}</span>
              <span className="flex items-center gap-1"><Calendar size={14} /> {plan.date_from} → {plan.date_to}</span>
              <span className="flex items-center gap-1"><Clock size={14} /> {numDays} giorni</span>
              <span className="flex items-center gap-1"><Star size={14} /> {cards.length} carte</span>
              {plan.power_level > 0 && (
                <span className="flex items-center gap-1 text-amber-400 font-semibold"><Zap size={14} /> {plan.power_level}</span>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Diary */}
      {plan.description && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-8"
        >
          <div className="glass rounded-xl p-5">
            <div className="flex items-center gap-2 text-sm text-foreground/40 mb-3">
              <BookOpen size={14} />
              <span>Diario del Futuro</span>
            </div>
            <p className="text-foreground/80 leading-relaxed italic text-sm">
              &ldquo;{plan.description}&rdquo;
            </p>
          </div>
        </motion.div>
      )}

      {/* Cards by day */}
      {Object.entries(cardsByDay)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([day, dayCards]) => (
          <div key={day} className="mb-8">
            <h2 className="text-sm font-medium text-foreground/40 uppercase tracking-wider mb-4">
              Giorno {day}
            </h2>
            <div className="flex flex-col gap-4">
              {dayCards.map((card, i) => (
                <GameCard key={card.id} card={card} index={i} />
              ))}
            </div>
          </div>
        ))}

      {/* Play button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="sticky bottom-20 z-30"
      >
        <button
          onClick={() => router.push(`/plan/${params.id}/play`)}
          className="w-full py-4 rounded-xl bg-primary text-white font-semibold text-lg flex items-center justify-center gap-2 shadow-lg shadow-primary/25 hover:bg-primary-light transition-colors"
        >
          <Play size={22} /> Gioca Ora
        </button>
      </motion.div>
    </div>
  );
}
