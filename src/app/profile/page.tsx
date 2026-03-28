"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { Trophy, Map, Star, Loader2 } from "lucide-react";
import { MoodRadar } from "@/components/game/MoodRadar";
import { supabase } from "@/lib/supabase";
import type { MoodProfile } from "@/lib/types";

interface Stats {
  total_score: number;
  plan_count: number;
  sessions_count: number;
}

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState<string>("Esploratore");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [moodProfile, setMoodProfile] = useState<MoodProfile | null>(null);
  const [stats, setStats] = useState<Stats>({ total_score: 0, plan_count: 0, sessions_count: 0 });

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/"); return; }

      const user = session.user;
      const meta = user.user_metadata as Record<string, string> | null;

      setEmail(user.email ?? null);
      setDisplayName(meta?.full_name ?? meta?.name ?? user.email?.split("@")[0] ?? "Esploratore");
      setAvatarUrl(meta?.avatar_url ?? meta?.picture ?? null);

      // Load mood profile from DB
      const { data: pp } = await supabase
        .from("player_profiles")
        .select("mood_art,mood_food,mood_nature,mood_shopping,mood_nightlife")
        .eq("user_id", user.id)
        .maybeSingle();

      if (pp) {
        setMoodProfile({
          art: pp.mood_art,
          food: pp.mood_food,
          nature: pp.mood_nature,
          shopping: pp.mood_shopping,
          nightlife: pp.mood_nightlife,
        });
      }

      // Load stats in parallel
      const [plansRes, sessionsRes, lbRes] = await Promise.all([
        supabase.from("plans").select("id", { count: "exact", head: true }).eq("creator_id", user.id),
        supabase.from("game_sessions").select("id", { count: "exact", head: true }).eq("explorer_id", user.id).eq("status", "completed"),
        supabase.from("leaderboard_users").select("total_points").eq("user_id", user.id).order("total_points", { ascending: false }).limit(1).maybeSingle(),
      ]);

      setStats({
        plan_count: plansRes.count ?? 0,
        sessions_count: sessionsRes.count ?? 0,
        total_score: lbRes.data?.total_points ?? 0,
      });

      setLoading(false);
    }
    load();
  }, [router]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin text-primary" size={32} /></div>;
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Profilo</h1>

      {/* Avatar + name */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-6 flex flex-col items-center gap-4 mb-6"
      >
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={displayName}
            width={80}
            height={80}
            className="rounded-full object-cover ring-2 ring-primary/30"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-3xl font-bold text-primary">
            {displayName[0].toUpperCase()}
          </div>
        )}
        <div className="text-center">
          <h2 className="text-xl font-bold">{displayName}</h2>
          {email && <p className="text-sm text-foreground/40">{email}</p>}
        </div>

        {/* Stats */}
        <div className="flex gap-6 mt-2">
          <div className="text-center">
            <p className="text-xl font-bold text-accent">{stats.total_score}</p>
            <p className="text-xs text-foreground/40 flex items-center gap-1"><Trophy size={12} /> Punti</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-primary">{stats.plan_count}</p>
            <p className="text-xs text-foreground/40 flex items-center gap-1"><Map size={12} /> Piani</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-success">{stats.sessions_count}</p>
            <p className="text-xs text-foreground/40 flex items-center gap-1"><Star size={12} /> Giocate</p>
          </div>
        </div>
      </motion.div>

      {/* Mood radar */}
      {moodProfile ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-6"
        >
          <h3 className="text-sm font-medium text-foreground/40 uppercase tracking-wider mb-4">Il tuo DNA da viaggiatore</h3>
          <MoodRadar profile={moodProfile} size={280} />
        </motion.div>
      ) : (
        <div className="text-center py-8">
          <p className="text-foreground/40 mb-2">Profilo mood non creato</p>
          <a href="/onboarding" className="text-primary font-medium">Crea il tuo profilo</a>
        </div>
      )}
    </div>
  );
}

