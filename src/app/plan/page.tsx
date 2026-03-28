"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { MapPin, Calendar, Plus } from "lucide-react";

interface PlanSummary {
  id: string;
  title: string;
  city: string;
  dateFrom: string;
  dateTo: string;
  numCards: number;
}

export default function PlansListPage() {
  const [plans, setPlans] = useState<PlanSummary[]>([]);

  useEffect(() => {
    const ids = JSON.parse(localStorage.getItem("deckTourPlanIds") || "[]") as string[];
    const loaded: PlanSummary[] = [];
    for (const id of ids) {
      const stored = localStorage.getItem(`deckTourPlan_${id}`);
      if (stored) {
        const p = JSON.parse(stored);
        loaded.push({ id: p.id, title: p.title, city: p.city, dateFrom: p.dateFrom, dateTo: p.dateTo, numCards: p.cards?.length ?? 0 });
      }
    }
    setPlans(loaded.reverse());
  }, []);

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">I miei piani</h1>
        <Link
          href="/plan/new"
          className="flex items-center gap-1 px-3 py-2 rounded-lg bg-primary text-white text-sm font-medium"
        >
          <Plus size={16} /> Nuovo
        </Link>
      </div>

      {plans.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-foreground/40 mb-4">Nessun piano creato</p>
          <Link
            href="/plan/new"
            className="px-6 py-3 rounded-xl bg-primary text-white font-semibold inline-block"
          >
            Crea il primo piano
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                href={`/plan/${plan.id}`}
                className="block glass rounded-xl p-4 hover:border-primary/30 border border-glass-border transition-all"
              >
                <h3 className="font-semibold mb-2">{plan.title}</h3>
                <div className="flex flex-wrap gap-3 text-xs text-foreground/50">
                  <span className="flex items-center gap-1"><MapPin size={12} /> {plan.city}</span>
                  <span className="flex items-center gap-1"><Calendar size={12} /> {plan.dateFrom}</span>
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
