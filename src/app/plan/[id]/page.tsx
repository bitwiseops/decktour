"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Play, Calendar, Clock, MapPin, Star, Loader2, Zap, ImageIcon, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { MOODS, RARITIES } from "@/lib/types";
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

const RARITY_BORDER: Record<string, string> = {
  common: "border-white/10",
  rare: "border-blue-500/40",
  secret: "border-amber-500/40",
};

function CardRow({ card, index }: { card: Card; index: number }) {
  const [open, setOpen] = useState(false);
  const rarityInfo = RARITIES.find((r) => r.id === card.rarity) ?? RARITIES[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`glass rounded-xl border ${RARITY_BORDER[card.rarity] ?? RARITY_BORDER.common} overflow-hidden`}
    >
      <button
        className="w-full flex items-center gap-3 p-3 text-left"
        onClick={() => setOpen((o) => !o)}
      >
        {/* Thumbnail */}
        <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-primary/10 flex items-center justify-center">
          {card.image_url
            ? <img src={card.image_url} alt={card.title} className="w-full h-full object-cover" />
            : <ImageIcon size={20} className="text-foreground/20" />
          }
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm leading-snug truncate">{card.title}</span>
            {card.rarity !== "common" && (
              <span className="text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0"
                style={{ backgroundColor: `${rarityInfo.color}20`, color: rarityInfo.color }}>
                {rarityInfo.label}
              </span>
            )}
          </div>
          <div className="flex gap-1.5 mt-1 flex-wrap">
            {card.moods.slice(0, 3).map((moodId) => {
              const mood = MOODS.find((m) => m.id === moodId);
              return mood ? (
                <span key={moodId} className="text-xs text-foreground/40">{mood.emoji}</span>
              ) : null;
            })}
            <span className="text-xs text-foreground/30">{card.duration_min} min</span>
          </div>
        </div>

        {open ? <ChevronUp size={16} className="text-foreground/30 shrink-0" /> : <ChevronDown size={16} className="text-foreground/30 shrink-0" />}
      </button>

      {open && (
        <div className="px-3 pb-3 flex flex-wrap gap-2 text-xs text-foreground/50 border-t border-white/5 pt-2">
          {card.moods.map((moodId) => {
            const mood = MOODS.find((m) => m.id === moodId);
            return mood ? (
              <span key={moodId} className="px-2 py-0.5 rounded-full"
                style={{ backgroundColor: `${mood.color}15`, color: mood.color }}>
                {mood.emoji} {mood.label}
              </span>
            ) : null;
          })}
          {card.base_score > 0 && (
            <span className="flex items-center gap-1 text-accent/70">
              <Zap size={11} /> {card.base_score} pt base
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}

function DaySection({ day, cards }: { day: number; cards: Card[] }) {
  return (
    <div className="mb-6">
      <h2 className="text-xs font-semibold text-foreground/40 uppercase tracking-widest mb-3 px-1">
        Giorno {day} · {cards.length} {cards.length === 1 ? "tappa" : "tappe"}
      </h2>
      <div className="flex flex-col gap-2">
        {cards.map((card, i) => (
          <CardRow key={card.id} card={card} index={i} />
        ))}
      </div>
    </div>
  );
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
          <DaySection key={day} day={Number(day)} cards={dayCards} />
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
