"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace("/"); return; }
      const { data: profile } = await supabase
        .from("player_profiles")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (profile) { router.replace("/home"); return; }
      setChecking(false);
    });
  }, [router]);

  async function handleStart() {
    setLoading(true);
    setError(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/"); return; }

    const res = await fetch("/api/profile/setup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({}),
    });

    if (!res.ok) {
      const { error: e } = await res.json().catch(() => ({}));
      setError(e ?? "Errore nel salvataggio del profilo");
      setLoading(false);
      return;
    }

    router.replace("/home");
  }

  if (checking) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin text-primary" size={32} /></div>;
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-6"
      >
        <div className="text-6xl">✨</div>
        <h1 className="text-3xl font-bold">Benvenuto in DeckTour</h1>
        <p className="text-foreground/60 max-w-xs">
          Esplora le città come un gioco. Ad ogni viaggio definirai il tuo mood e comporrai un mazzo unico di esperienze.
        </p>

        {error && <p className="text-danger text-sm">{error}</p>}

        <button
          onClick={handleStart}
          disabled={loading}
          className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-primary text-white font-semibold hover:bg-primary-light transition-colors"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
          Inizia
        </button>
      </motion.div>
    </div>
  );
}
