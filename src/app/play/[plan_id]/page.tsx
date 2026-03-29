"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, PlayCircle, Star, Users, MapPin, BookOpen } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface PlanDetails {
  id: string; title: string; diary_blurred: string | null;
  avg_rating: number; times_played: number; city_name: string | null;
  cover_url: string | null; stop_duration: string; num_days: number;
  creator_email: string;
}

export default function PlayPlanPage() {
  const { plan_id } = useParams<{ plan_id: string }>();
  const router = useRouter();
  const [plan, setPlan] = useState<PlanDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notLoggedIn, setNotLoggedIn] = useState(false);

  useEffect(() => {
    async function loadPlan() {
      const res = await fetch(`/api/plan/${plan_id}/info`);
      if (res.ok) setPlan(await res.json());
      else setError("Piano non trovato");
      setLoading(false);
    }
    loadPlan();
  }, [plan_id]);

  async function handleStart() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setNotLoggedIn(true); return; }

    setStarting(true);
    setError(null);

    const res = await fetch("/api/session/start", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ plan_id }),
    });

    if (!res.ok) {
      const { error: e } = await res.json().catch(() => ({}));
      setError(e ?? "Errore nell'avvio della sessione");
      setStarting(false);
      return;
    }

    const data = await res.json();
    localStorage.setItem("dt_game", JSON.stringify({
      session_id: data.session_id,
      plan_id,
      plan_title: plan?.title ?? "",
      total_stops: data.total_stops,
      current_stop_index: 0,
      total_score: 0,
      current_progress_id: data.first_card?.progress_id ?? null,
      current_stop_state: "clue",
    }));

    router.push(`/play/session/${data.session_id}/stop/${data.first_card.progress_id}`);
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin text-primary" size={32} /></div>;
  if (!plan) return <div className="flex items-center justify-center min-h-screen text-foreground/40">{error ?? "Piano non trovato"}</div>;

  return (
    <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-6">
      {/* Cover */}
      <div className="rounded-2xl h-48 bg-primary/10 overflow-hidden relative">
        {plan.cover_url ? (
          <img src={plan.cover_url} alt={plan.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl opacity-20">🗺️</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        <div className="absolute bottom-4 left-4">
          <p className="text-xs text-foreground/60 flex items-center gap-1"><MapPin size={11} /> {plan.city_name}</p>
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-bold mb-1">{plan.title}</h1>
        <div className="flex items-center gap-3 text-sm text-foreground/50">
          <span className="flex items-center gap-1"><Star size={13} className="text-accent" /> {plan.avg_rating.toFixed(1)}</span>
          <span className="flex items-center gap-1"><Users size={13} /> {plan.times_played} giocatori</span>
          <span>@{plan.creator_email}</span>
        </div>
      </div>

      {/* Info pills */}
      <div className="flex gap-2">
        <span className="glass rounded-full px-3 py-1 text-xs text-foreground/60">{plan.num_days} {plan.num_days === 1 ? "giorno" : "giorni"}</span>
        <span className="glass rounded-full px-3 py-1 text-xs text-foreground/60">{plan.stop_duration} per tappa</span>
      </div>

      {/* Diary blurred */}
      {plan.diary_blurred && (
        <div className="glass rounded-2xl p-4 relative overflow-hidden">
          <div className="flex items-center gap-2 mb-2 text-xs text-foreground/40">
            <BookOpen size={13} /> Diario del Viaggiatore
          </div>
          <p className="text-sm text-foreground/70 leading-relaxed" style={{ filter: "blur(4px)", userSelect: "none" }}>
            {plan.diary_blurred}
          </p>
          <div className="absolute inset-0 flex items-end justify-center pb-4">
            <p className="text-xs text-foreground/60 glass px-3 py-1.5 rounded-full border border-glass-border">
              🔒 Si svela dopo il viaggio
            </p>
          </div>
        </div>
      )}

      {notLoggedIn && (
        <div className="glass rounded-xl p-4 border border-accent/40">
          <p className="text-sm text-foreground/80 mb-3">Accedi per giocare questo piano</p>
          <button onClick={() => router.push("/")}
            className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-light transition-colors">
            Accedi →
          </button>
        </div>
      )}

      {error && <p className="text-danger text-sm text-center">{error}</p>}

      {!notLoggedIn && (
        <button
          onClick={handleStart}
          disabled={starting}
          className="w-full py-4 rounded-xl bg-primary text-white font-semibold text-base hover:bg-primary-light transition-colors flex items-center justify-center gap-2 shadow-lg shadow-primary/25"
        >
          {starting ? <Loader2 size={18} className="animate-spin" /> : <PlayCircle size={22} />}
          Inizia l&apos;Avventura
        </button>
      )}
    </div>
  );
}
