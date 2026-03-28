"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { MapPin, Star, Users, Search } from "lucide-react";

interface PlanSummary {
  id: string;
  title: string;
  city: string;
  dateFrom: string;
  numCards: number;
}

export default function MarketplacePage() {
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    // Load from localStorage (will use Supabase with auth)
    const ids = JSON.parse(localStorage.getItem("deckTourPlanIds") || "[]") as string[];
    const loaded: PlanSummary[] = [];
    for (const id of ids) {
      const stored = localStorage.getItem(`deckTourPlan_${id}`);
      if (stored) {
        const p = JSON.parse(stored);
        loaded.push({ id: p.id, title: p.title, city: p.city, dateFrom: p.dateFrom, numCards: p.cards?.length ?? 0 });
      }
    }
    setPlans(loaded.reverse());
  }, []);

  const filtered = plans.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.city.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">Esplora</h1>
      <p className="text-foreground/50 mb-6">Scopri piani di viaggio creati dalla community</p>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/30" />
        <input
          type="text"
          placeholder="Cerca per città o titolo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-glass-border text-foreground placeholder:text-foreground/30"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-foreground/40">Nessun piano trovato</p>
          <p className="text-sm text-foreground/30 mt-1">Crea il primo piano per vederlo qui</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                href={`/plan/${plan.id}`}
                className="block glass rounded-xl p-5 hover:border-primary/30 border border-glass-border transition-all"
              >
                <h3 className="font-semibold text-lg mb-2">{plan.title}</h3>
                <div className="flex flex-wrap gap-4 text-sm text-foreground/50">
                  <span className="flex items-center gap-1"><MapPin size={14} /> {plan.city}</span>
                  <span className="flex items-center gap-1"><Star size={14} /> —</span>
                  <span className="flex items-center gap-1"><Users size={14} /> 0</span>
                  <span>{plan.numCards} carte</span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
