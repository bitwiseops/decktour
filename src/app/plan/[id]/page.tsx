"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Play, Calendar, Clock, MapPin, Star, Loader2, Zap, ImageIcon } from "lucide-react";
import { GameCard } from "@/components/game/GameCard";
import { supabase } from "@/lib/supabase";
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
  stops_per_day?: number;
  power_level: number;
  status: string;
  moods_summary?: Record<string, number> | null;
}

export default function PlanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingCover, setGeneratingCover] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
      Promise.all([
        fetch(`/api/plans/${params.id}`, { headers }).then((r) => r.json()),
        fetch(`/api/plans/${params.id}/cards`, { headers }).then((r) => r.json()),
      ])
        .then(([planData, cardsData]) => {
          setPlan(planData);
          setCards(Array.isArray(cardsData) ? cardsData : []);

          // Auto-generate cover if missing
          if (planData?.id && !planData.image_url && session?.access_token) {
            setGeneratingCover(true);
            const moodProfile = planData.moods_summary ?? {
              shopping: 50, food: 50, art: 50, nature: 50, nightlife: 50,
            };
            fetch("/api/ai/cover", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
              body: JSON.stringify({
                planId: planData.id,
                title: planData.title,
                city: planData.city_name ?? "",
                moodProfile,
              }),
            })
              .then((r) => r.json())
              .then((coverData) => {
                if (coverData?.image_url) {
                  setPlan((prev) => prev ? { ...prev, image_url: coverData.image_url } : prev);
                }
              })
              .catch(() => {})
              .finally(() => setGeneratingCover(false));
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
    load();
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

  // Fallback to plan metadata when cards haven't loaded yet
  const displayDays = numDays > 0 ? numDays : plan.num_stages;
  const displayCards = cards.length > 0 ? cards.length : plan.num_stages * (plan.stops_per_day ?? 1);

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
              {generatingCover
                ? <Loader2 size={32} className="text-primary/50 animate-spin" />
                : <ImageIcon size={48} className="text-foreground/20" />
              }
            </div>
          )}
          <div className="p-6">
            <h1 className="text-2xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {plan.title}
            </h1>
            <div className="flex flex-wrap gap-3 text-sm text-foreground/50">
              <span className="flex items-center gap-1"><MapPin size={14} /> {plan.city_name}</span>
              <span className="flex items-center gap-1"><Calendar size={14} /> {plan.date_from} → {plan.date_to}</span>
              <span className="flex items-center gap-1"><Clock size={14} /> {displayDays} giorni</span>
              <span className="flex items-center gap-1"><Star size={14} /> {displayCards} carte</span>
              {plan.power_level > 0 && (
                <span className="flex items-center gap-1 text-amber-400 font-semibold"><Zap size={14} /> {plan.power_level}</span>
              )}
            </div>
          </div>
        </div>
      </motion.div>

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
