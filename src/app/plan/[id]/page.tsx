"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Play, Calendar, Clock, MapPin, Star } from "lucide-react";
import { GameCard } from "@/components/game/GameCard";
import type { Card, MoodProfile, GeneratedCard } from "@/lib/types";

interface StoredPlan {
  id: string;
  title: string;
  city: string;
  country: string;
  dateFrom: string;
  dateTo: string;
  cards: (GeneratedCard & { day_number: number; stage_order: number })[];
  numDays: number;
  stagesPerDay: number;
  durationMin: number;
  moodProfile: MoodProfile;
}

export default function PlanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [plan, setPlan] = useState<StoredPlan | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(`deckTourPlan_${params.id}`);
    if (stored) setPlan(JSON.parse(stored));
  }, [params.id]);

  if (!plan) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-foreground/50">Piano non trovato</p>
      </div>
    );
  }

  // Convert GeneratedCards to Card-like objects for display
  const cardsByDay: Record<number, Card[]> = {};
  plan.cards.forEach((c, i) => {
    const day = c.day_number;
    if (!cardsByDay[day]) cardsByDay[day] = [];
    cardsByDay[day].push({
      id: `${plan.id}-card-${i}`,
      plan_id: plan.id,
      poi_id: null,
      day_number: day,
      stage_order: c.stage_order,
      title: c.title,
      description: c.description,
      moods: c.moods,
      image_url: null,
      lat: c.lat,
      lon: c.lon,
      duration_min: plan.durationMin,
      mission_type: "quiz",
      quiz_data: c.quiz_data || [],
      location_hint: c.location_hint,
      base_score: 100,
      voucher_description: c.suggested_voucher || null,
      voucher_partner: null,
      is_temporary_event: c.is_temporary_event,
    });
  });

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="glass rounded-2xl p-6">
          <h1 className="text-2xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {plan.title}
          </h1>
          <div className="flex flex-wrap gap-3 text-sm text-foreground/50">
            <span className="flex items-center gap-1"><MapPin size={14} /> {plan.city}</span>
            <span className="flex items-center gap-1"><Calendar size={14} /> {plan.dateFrom} → {plan.dateTo}</span>
            <span className="flex items-center gap-1"><Clock size={14} /> {plan.numDays} giorni</span>
            <span className="flex items-center gap-1"><Star size={14} /> {plan.cards.length} carte</span>
          </div>
        </div>
      </motion.div>

      {/* Cards by day */}
      {Object.entries(cardsByDay)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([day, cards]) => (
          <div key={day} className="mb-8">
            <h2 className="text-sm font-medium text-foreground/40 uppercase tracking-wider mb-4">
              Giorno {day}
            </h2>
            <div className="flex flex-col gap-4">
              {cards.map((card, i) => (
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
