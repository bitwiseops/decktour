"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Star, Users, MapPin, Lock, Globe } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface MyPlan {
  id: string; title: string; diary_blurred: string | null; avg_rating: number;
  times_played: number; valid_from: string | null; valid_until: string | null;
  city_name: string | null; cover_url: string | null; is_published: boolean;
}

export default function MyPlansSection() {
  const [plans, setPlans] = useState<MyPlan[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError("Devi essere loggato per vedere i tuoi piani."); return; }

      const res = await fetch("/api/plans/mine", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) { setError("Errore nel caricamento dei tuoi piani."); return; }
      setPlans(await res.json());
    }
    load();
  }, []);

  if (error) return (
    <div className="text-center py-20">
      <p className="text-foreground/40 text-lg mb-2">{error}</p>
      <Link href="/auth/callback" className="text-primary font-medium">Accedi →</Link>
    </div>
  );

  if (plans === null) return (
    <div className="text-center py-20 text-foreground/40">Caricamento...</div>
  );

  if (plans.length === 0) return (
    <div className="text-center py-20">
      <p className="text-foreground/40 text-lg mb-2">Non hai ancora creato piani</p>
      <Link href="/plan/new" className="text-primary font-medium">Crea il primo →</Link>
    </div>
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {plans.map((plan) => (
        <div key={plan.id} className="glass rounded-2xl overflow-hidden border border-glass-border hover:border-primary/30 transition-all flex flex-col">
          {/* Cover */}
          <div className="h-36 bg-primary/10 relative overflow-hidden">
            {plan.cover_url ? (
              <img src={plan.cover_url} alt={plan.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl opacity-20">🗺️</div>
            )}
            {/* Published badge */}
            <span className={`absolute top-2 right-2 flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${plan.is_published ? "bg-green-500/20 text-green-400" : "bg-foreground/10 text-foreground/50"}`}>
              {plan.is_published ? <><Globe size={10} /> Pubblicato</> : <><Lock size={10} /> Bozza</>}
            </span>
          </div>

          <div className="p-4 flex flex-col gap-3 flex-1">
            <div>
              <h3 className="font-semibold leading-snug mb-1 line-clamp-2">{plan.title}</h3>
              <div className="flex items-center gap-2 text-xs text-foreground/40">
                <MapPin size={11} /> {plan.city_name}
                {plan.valid_from && (
                  <span>· {new Date(plan.valid_from).toLocaleDateString("it-IT", { month: "short", day: "numeric" })}</span>
                )}
              </div>
            </div>

            {plan.diary_blurred && (
              <p className="text-xs text-foreground/60 line-clamp-3 leading-relaxed" style={{ filter: "blur(3px)", userSelect: "none" }}>
                {plan.diary_blurred}
              </p>
            )}

            <div className="flex items-center gap-3 text-xs text-foreground/50 mt-auto">
              <span className="flex items-center gap-1"><Star size={11} className="text-accent" /> {(plan.avg_rating ?? 0).toFixed(1)}</span>
              <span className="flex items-center gap-1"><Users size={11} /> {plan.times_played}</span>
            </div>

            <Link
              href={`/plan/${plan.id}`}
              className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-medium text-center hover:bg-primary-light transition-colors"
            >
              Modifica →
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
