"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { MoodRadar } from "@/components/game/MoodRadar";

const MOODS = [
  { key: "mood_art", label: "Arte & Storia", emoji: "🏛️" },
  { key: "mood_food", label: "Enogastronomia", emoji: "🍷" },
  { key: "mood_nature", label: "Natura & Outdoor", emoji: "🌿" },
  { key: "mood_shopping", label: "Acquisti", emoji: "🛍️" },
  { key: "mood_nightlife", label: "Vita Notturna", emoji: "🌙" },
] as const;

type MoodKey = (typeof MOODS)[number]["key"];

type MoodValues = Record<MoodKey, number>;

const DEFAULTS: MoodValues = {
  mood_art: 50, mood_food: 50, mood_nature: 50, mood_shopping: 50, mood_nightlife: 50,
};

// Convert mood_* keys to the MoodProfile shape used by MoodRadar
function toRadarProfile(v: MoodValues) {
  return { art: v.mood_art, food: v.mood_food, nature: v.mood_nature, shopping: v.mood_shopping, nightlife: v.mood_nightlife };
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<"welcome" | "sliders">("welcome");
  const [values, setValues] = useState<MoodValues>({ ...DEFAULTS });
  const [radarProfile, setRadarProfile] = useState(toRadarProfile(DEFAULTS));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Redirect to /home if profile already exists
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

  const handleSliderChange = useCallback((key: MoodKey, val: number) => {
    const next = { ...values, [key]: val };
    setValues(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setRadarProfile(toRadarProfile(next)), 100);
  }, [values]);

  async function handleSubmit() {
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
      body: JSON.stringify(values),
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
      <AnimatePresence mode="wait">
        {step === "welcome" && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-6"
          >
            <div className="text-6xl">✨</div>
            <h1 className="text-3xl font-bold">Il Rituale del Viaggiatore</h1>
            <p className="text-foreground/60 max-w-xs">
              Definisci il tuo profilo emotivo. Sarà la bussola che guiderà la selezione delle tappe.
            </p>
            <button
              onClick={() => setStep("sliders")}
              className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-primary text-white font-semibold hover:bg-primary-light transition-colors"
            >
              Inizia <ArrowRight size={18} />
            </button>
          </motion.div>
        )}

        {step === "sliders" && (
          <motion.div
            key="sliders"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col gap-6"
          >
            <div className="text-center mb-2">
              <h2 className="text-2xl font-bold mb-1">Il tuo profilo mood</h2>
              <p className="text-foreground/50 text-sm">Sposta gli slider per rispecchiare le tue passioni</p>
            </div>

            {/* Radar Chart */}
            <MoodRadar profile={radarProfile} size={280} />

            {/* Sliders */}
            <div className="flex flex-col gap-5">
              {MOODS.map(({ key, label, emoji }) => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium">{emoji} {label}</span>
                    <span className="text-sm font-bold text-primary">{values[key]}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={values[key]}
                    onChange={(e) => handleSliderChange(key, Number(e.target.value))}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer accent-primary bg-white/10"
                  />
                  <div className="flex justify-between text-xs text-foreground/30 mt-1">
                    <span>Non mi interessa</span>
                    <span>Mi appassiona</span>
                  </div>
                </div>
              ))}
            </div>

            {error && <p className="text-danger text-sm text-center">{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-4 rounded-xl bg-primary text-white font-semibold text-lg hover:bg-primary-light transition-colors flex items-center justify-center gap-2 shadow-lg shadow-primary/25"
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              Questo sono io ✨
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const { currentComparison, currentIndex, progress, total, completed, moodProfile, setValue, next, prev } = useMoodProfile();
  const [showRadar, setShowRadar] = useState(false);

  const handleNext = () => {
    next();
    if (currentIndex === total - 1) {
      setTimeout(() => setShowRadar(true), 300);
    }
  };

  const handleContinue = () => {
    localStorage.setItem("deckTourMoodProfile", JSON.stringify(moodProfile));
    router.push("/plan/new");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] px-4 py-8 max-w-lg mx-auto">
      <AnimatePresence mode="wait">
        {!completed && !showRadar && currentComparison && (
          <motion.div key="swiper" exit={{ opacity: 0, scale: 0.9 }} className="w-full">
            <h1 className="text-2xl font-bold text-center mb-2">Il tuo profilo mood</h1>
            <p className="text-foreground/50 text-center mb-8">Muovi lo slider verso ciò che preferisci</p>
            <MoodSwiper
              comparison={currentComparison}
              index={currentIndex}
              total={total}
              onValueChange={setValue}
              onNext={handleNext}
              onPrev={prev}
              canGoBack={currentIndex > 0}
            />
          </motion.div>
        )}

        {(completed || showRadar) && (
          <motion.div
            key="radar"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full flex flex-col items-center gap-6"
          >
            <h1 className="text-2xl font-bold text-center">Ecco il tuo profilo!</h1>
            <p className="text-foreground/50 text-center">Questo è il tuo DNA da viaggiatore</p>
            <MoodRadar profile={moodProfile} size={320} />
            <button
              onClick={handleContinue}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary-light transition-colors"
            >
              Crea il tuo piano
              <ArrowRight size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
