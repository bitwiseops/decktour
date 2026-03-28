"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, Trophy, Star, CheckCircle, MapPin, Gift, BookOpen } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface SessionStats {
  total_score: number; max_possible_score: number; completion_rate: number;
  stops_without_hints: number; vouchers_unlocked: number; diary_revealed: string;
  plan_id: string; plan_title: string;
}

export default function EndPage() {
  const { session_id } = useParams<{ session_id: string }>();
  const router = useRouter();
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewStars, setReviewStars] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);

  useEffect(() => {
    async function finish() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/"); return; }

      const res = await fetch("/api/session/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ session_id }),
      });

      if (res.ok) {
        const data = await res.json();
        setStats(data);
        // Clear game localStorage
        localStorage.removeItem("dt_game");
      } else {
        const { error: e } = await res.json().catch(() => ({}));
        setError(e ?? "Errore nel completamento della sessione");
      }
      setLoading(false);
    }
    finish();
  }, [session_id, router]);

  async function handleReview(e: React.FormEvent) {
    e.preventDefault();
    if (!stats || reviewStars === 0) return;
    setReviewLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch("/api/plan/review", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ plan_id: stats.plan_id, session_id, stars: reviewStars, description: reviewText.trim() }),
    });

    if (res.ok) setReviewSubmitted(true);
    setReviewLoading(false);
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Loader2 className="animate-spin text-primary" size={36} />
        <p className="text-foreground/50 text-sm">Generazione del diario rivelato...</p>
      </div>
    );
  }

  if (error || !stats) {
    return <div className="flex items-center justify-center min-h-screen text-danger">{error ?? "Errore"}</div>;
  }

  const pct = stats.max_possible_score > 0 ? Math.round((stats.total_score / stats.max_possible_score) * 100) : 0;
  const grade = pct >= 75 ? { label: "Esploratore Leggendario", emoji: "🏆" } : pct >= 45 ? { label: "Avventuriero", emoji: "⚔️" } : { label: "Viaggiatore", emoji: "🚶" };

  return (
    <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-6 pb-20">
      {/* Score */}
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="glass rounded-2xl p-6 text-center border border-primary/30">
        <div className="text-5xl mb-3">{grade.emoji}</div>
        <h2 className="text-lg font-bold text-primary mb-1">{grade.label}</h2>
        <p className="text-4xl font-bold mb-1">{stats.total_score}</p>
        <p className="text-sm text-foreground/50">punti · {pct}% del massimo</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: <CheckCircle size={16} />, label: "Completate", value: `${Math.round(stats.completion_rate * 100)}%` },
          { icon: <MapPin size={16} />, label: "Senza indizi", value: stats.stops_without_hints },
          { icon: <Gift size={16} />, label: "Voucher", value: stats.vouchers_unlocked },
        ].map(({ icon, label, value }) => (
          <div key={label} className="glass rounded-xl p-3 text-center">
            <div className="flex justify-center text-primary mb-1">{icon}</div>
            <p className="text-xl font-bold">{value}</p>
            <p className="text-xs text-foreground/40">{label}</p>
          </div>
        ))}
      </div>

      {/* Diary Revealed */}
      {stats.diary_revealed && (
        <div className="glass rounded-2xl p-5 border border-primary/20">
          <div className="flex items-center gap-2 mb-3 text-primary">
            <BookOpen size={16} />
            <span className="font-semibold text-sm">Diario Svelato</span>
          </div>
          <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">{stats.diary_revealed}</p>
        </div>
      )}

      {/* Review */}
      {!reviewSubmitted ? (
        <form onSubmit={handleReview} className="glass rounded-2xl p-5 flex flex-col gap-4">
          <h3 className="font-semibold">Lascia una recensione</h3>
          <div className="flex gap-2 justify-center">
            {[1, 2, 3, 4, 5].map((s) => (
              <button key={s} type="button" onClick={() => setReviewStars(s)}
                className={`text-2xl transition-transform hover:scale-110 ${s <= reviewStars ? "text-accent" : "text-foreground/20"}`}>
                ★
              </button>
            ))}
          </div>
          <textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)}
            placeholder="Commento opzionale..."
            rows={2}
            className="w-full bg-transparent text-foreground placeholder:text-foreground/30 text-sm outline-none resize-none border-b border-glass-border pb-2"
          />
          <button type="submit" disabled={reviewStars === 0 || reviewLoading}
            className="w-full py-3 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-light transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {reviewLoading && <Loader2 size={14} className="animate-spin" />}
            Invia Recensione
          </button>
        </form>
      ) : (
        <div className="glass rounded-xl px-4 py-3 text-center text-sm text-success border border-success/30">
          ✓ Grazie per la recensione!
        </div>
      )}

      {/* CTA */}
      <div className="flex flex-col gap-3">
        <button onClick={() => router.push("/leaderboard")}
          className="w-full py-3.5 rounded-xl glass border border-glass-border text-foreground/70 font-medium hover:border-primary/40 transition-colors flex items-center justify-center gap-2">
          <Trophy size={16} /> Vai alla Classifica
        </button>
        <button onClick={() => router.push("/plan/new")}
          className="w-full py-3.5 rounded-xl bg-primary text-white font-semibold hover:bg-primary-light transition-colors">
          Pianifica un Nuovo Viaggio →
        </button>
      </div>
    </div>
  );
}
