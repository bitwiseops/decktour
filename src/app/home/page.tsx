"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { MapPin, Plus, Trophy, Compass, Loader2, LogOut, Play, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface PlayerProfile {
  mood_art: number;
  mood_food: number;
  mood_nature: number;
  mood_shopping: number;
  mood_nightlife: number;
}

interface MyPlan {
  id: string;
  title: string;
  city_name: string | null;
  valid_from: string | null;
  num_days: number;
  times_played: number;
}

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [myPlans, setMyPlans] = useState<MyPlan[]>([]);

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

      const plansRes = await fetch("/api/plans/mine", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (plansRes.ok) setMyPlans(await plansRes.json());

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

  const CARDS = [
    {
      href: "/plan/new",
      label: "Nuovo Piano",
      sub: "Pianifica il tuo prossimo viaggio",
      icon: <Plus size={20} className="text-white" />,
      accent: "from-primary/80",
      photo: "https://images.unsplash.com/photo-1488085061387-422e29b40080?w=600&q=80",
    },
    {
      href: "/marketplace",
      label: "Esplora",
      sub: "Gioca i piani della community",
      icon: <MapPin size={20} className="text-white" />,
      accent: "from-accent/80",
      photo: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=600&q=80",
    },
    {
      href: "/leaderboard",
      label: "Classifica",
      sub: "Top giocatori e top piani",
      icon: <Trophy size={20} className="text-white" />,
      accent: "from-success/80",
      photo: "https://images.unsplash.com/photo-1533294455009-a77b7557d2d1?w=600&q=80",
    },
    {
      href: "/profile",
      label: "Profilo",
      sub: "Il tuo DNA da viaggiatore",
      icon: <Compass size={20} className="text-white" />,
      accent: "from-primary-light/80",
      photo: "https://images.unsplash.com/photo-1539635278303-d4002c07eae3?w=600&q=80",
    },
  ];

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
        {CARDS.map((card, i) => (
          <motion.div
            key={card.href}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.05 * (i + 1) }}
          >
            <Link href={card.href} className="relative rounded-2xl overflow-hidden block group h-44">
              <Image
                src={card.photo}
                alt={card.label}
                fill
                sizes="(max-width: 640px) 50vw, 240px"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              {/* gradient overlay */}
              <div className={`absolute inset-0 bg-gradient-to-t ${card.accent} via-black/30 to-transparent opacity-90`} />
              {/* content */}
              <div className="absolute bottom-0 left-0 right-0 p-3.5">
                <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-2 border border-white/20">
                  {card.icon}
                </div>
                <p className="font-bold text-sm text-white leading-tight">{card.label}</p>
                <p className="text-xs text-white/60 mt-0.5 leading-tight">{card.sub}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* I miei piani */}
      {myPlans.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold">I miei piani</h2>
            <Link href="/marketplace?tab=mine" className="text-xs text-primary/70 flex items-center gap-1">
              Vedi tutti <ChevronRight size={12} />
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {myPlans.slice(0, 3).map((plan) => (
              <Link
                key={plan.id}
                href={`/plan/${plan.id}`}
                className="glass rounded-xl px-4 py-3 flex items-center gap-3 hover:border-primary/30 transition-colors border border-transparent"
              >
                <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                  <Play size={14} className="text-primary ml-0.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{plan.title}</p>
                  <p className="text-xs text-foreground/40 truncate">
                    {plan.city_name && <span className="flex items-center gap-1 inline-flex"><MapPin size={10} /> {plan.city_name}</span>}
                    {plan.valid_from && <span> · {new Date(plan.valid_from).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}</span>}
                  </p>
                </div>
                <ChevronRight size={14} className="text-foreground/30 shrink-0" />
              </Link>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
