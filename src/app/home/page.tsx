"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { MapPin, Plus, Trophy, Compass, Loader2, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface PlayerProfile {
  mood_art: number;
  mood_food: number;
  mood_nature: number;
  mood_shopping: number;
  mood_nightlife: number;
}

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/"); return; }
      setEmail(session.user.email ?? null);

      const { data: pp } = await supabase
        .from("player_profiles")
        .select("mood_art,mood_food,mood_nature,mood_shopping,mood_nightlife")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!pp) { router.replace("/onboarding"); return; }
      setProfile(pp);
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin text-primary" size={32} /></div>;
  }

  const topMood = profile
    ? Object.entries({
        "Arte & Storia": profile.mood_art,
        "Enogastronomia": profile.mood_food,
        "Natura": profile.mood_nature,
        "Acquisti": profile.mood_shopping,
        "Nightlife": profile.mood_nightlife,
      }).sort((a, b) => b[1] - a[1])[0][0]
    : null;

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs text-foreground/40 mb-0.5">Benvenuto</p>
          <h1 className="text-xl font-bold truncate max-w-48">{email?.split("@")[0]}</h1>
          {topMood && <p className="text-xs text-primary/80 mt-0.5">Top mood: {topMood}</p>}
        </div>
        <button onClick={handleLogout} className="glass rounded-xl p-2.5 text-foreground/40 hover:text-danger transition-colors">
          <LogOut size={18} />
        </button>
      </motion.div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.05 }}>
          <Link href="/plan/new"
            className="glass rounded-2xl p-5 flex flex-col items-center gap-3 border border-primary/30 hover:border-primary/60 transition-all text-center">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Plus size={24} className="text-primary" />
            </div>
            <span className="font-semibold text-sm">Nuovo Piano</span>
            <span className="text-xs text-foreground/40">Pianifica il tuo prossimo viaggio</span>
          </Link>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
          <Link href="/marketplace"
            className="glass rounded-2xl p-5 flex flex-col items-center gap-3 border border-glass-border hover:border-accent/40 transition-all text-center">
            <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
              <MapPin size={24} className="text-accent" />
            </div>
            <span className="font-semibold text-sm">Esplora</span>
            <span className="text-xs text-foreground/40">Gioca i piani della community</span>
          </Link>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 }}>
          <Link href="/leaderboard"
            className="glass rounded-2xl p-5 flex flex-col items-center gap-3 border border-glass-border hover:border-success/40 transition-all text-center">
            <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center">
              <Trophy size={24} className="text-success" />
            </div>
            <span className="font-semibold text-sm">Classifica</span>
            <span className="text-xs text-foreground/40">Top giocatori e top piani</span>
          </Link>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
          <Link href="/profile"
            className="glass rounded-2xl p-5 flex flex-col items-center gap-3 border border-glass-border hover:border-primary-light/40 transition-all text-center">
            <div className="w-12 h-12 rounded-xl bg-primary-light/20 flex items-center justify-center">
              <Compass size={24} className="text-primary-light" />
            </div>
            <span className="font-semibold text-sm">Profilo</span>
            <span className="text-xs text-foreground/40">Il tuo DNA da viaggiatore</span>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
