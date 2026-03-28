"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { MapPin, Calendar, Layers, Loader2, Sparkles } from "lucide-react";
import type { MoodProfile, GeneratedCard } from "@/lib/types";

const CITIES = [
  { name: "Roma", country: "Italia" },
  { name: "Milano", country: "Italia" },
  { name: "Napoli", country: "Italia" },
  { name: "Firenze", country: "Italia" },
  { name: "Venezia", country: "Italia" },
  { name: "Torino", country: "Italia" },
  { name: "Bologna", country: "Italia" },
  { name: "Palermo", country: "Italia" },
  { name: "Barcellona", country: "Spagna" },
  { name: "Parigi", country: "Francia" },
  { name: "Londra", country: "Regno Unito" },
  { name: "Amsterdam", country: "Paesi Bassi" },
];

type Step = "city" | "dates" | "config" | "generating";

export default function NewPlanPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("city");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [stagesPerDay, setStagesPerDay] = useState(3);
  const [durationMin, setDurationMin] = useState(90);
  const [moodProfile, setMoodProfile] = useState<MoodProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("deckTourMoodProfile");
    if (stored) {
      setMoodProfile(JSON.parse(stored));
    } else {
      // Default profile if not onboarded
      setMoodProfile({ shopping: 50, food: 50, art: 50, nature: 50, nightlife: 50 });
    }
  }, []);

  const handleGenerate = async () => {
    if (!moodProfile) return;
    setStep("generating");
    setError(null);

    try {
      const res = await fetch("/api/ai/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city,
          country,
          moodProfile,
          dateFrom,
          dateTo,
          numStagesPerDay: stagesPerDay,
          avgStageDurationMin: durationMin,
        }),
      });

      if (!res.ok) throw new Error("Errore nella generazione");

      const data = await res.json();
      // Store generated plan in localStorage (will use Supabase with auth)
      const planId = crypto.randomUUID();
      const plan = {
        id: planId,
        title: data.title,
        city,
        country,
        dateFrom,
        dateTo,
        cards: data.cards as GeneratedCard[],
        numDays: data.numDays,
        stagesPerDay,
        durationMin,
        moodProfile,
      };
      localStorage.setItem(`deckTourPlan_${planId}`, JSON.stringify(plan));

      // Also maintain a list of plan IDs
      const planIds = JSON.parse(localStorage.getItem("deckTourPlanIds") || "[]");
      planIds.push(planId);
      localStorage.setItem("deckTourPlanIds", JSON.stringify(planIds));

      router.push(`/plan/${planId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto");
      setStep("config");
    }
  };

  return (
    <div className="flex flex-col items-center min-h-[calc(100vh-8rem)] px-4 py-8 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-2">Crea un nuovo piano</h1>
      <p className="text-foreground/50 mb-8 text-center">L&apos;AI genererà un mazzo di carte personalizzato</p>

      <AnimatePresence mode="wait">
        {/* Step 1: City */}
        {step === "city" && (
          <motion.div key="city" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="w-full">
            <div className="flex items-center gap-2 text-sm text-foreground/50 mb-4">
              <MapPin size={16} /> Scegli la città
            </div>
            <div className="grid grid-cols-2 gap-3">
              {CITIES.map((c) => (
                <button
                  key={c.name}
                  onClick={() => { setCity(c.name); setCountry(c.country); setStep("dates"); }}
                  className={`p-4 rounded-xl glass border text-left transition-all hover:border-primary/50 ${
                    city === c.name ? "border-primary bg-primary/10" : "border-glass-border"
                  }`}
                >
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-xs text-foreground/40">{c.country}</p>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Step 2: Dates */}
        {step === "dates" && (
          <motion.div key="dates" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="w-full">
            <div className="flex items-center gap-2 text-sm text-foreground/50 mb-4">
              <Calendar size={16} /> Periodo del viaggio
            </div>
            <div className="glass rounded-xl p-6 flex flex-col gap-4">
              <div>
                <label className="text-sm text-foreground/60 mb-1 block">Da</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full p-3 rounded-lg bg-white/5 border border-glass-border text-foreground"
                />
              </div>
              <div>
                <label className="text-sm text-foreground/60 mb-1 block">A</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full p-3 rounded-lg bg-white/5 border border-glass-border text-foreground"
                />
              </div>
              <div className="flex gap-3 mt-2">
                <button onClick={() => setStep("city")} className="px-4 py-2 rounded-xl text-foreground/50 hover:text-foreground">
                  Indietro
                </button>
                <button
                  onClick={() => setStep("config")}
                  disabled={!dateFrom || !dateTo}
                  className="flex-1 py-3 rounded-xl bg-primary text-white font-semibold disabled:opacity-50 hover:bg-primary-light transition-colors"
                >
                  Avanti
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 3: Config */}
        {step === "config" && (
          <motion.div key="config" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="w-full">
            <div className="flex items-center gap-2 text-sm text-foreground/50 mb-4">
              <Layers size={16} /> Configura le tappe
            </div>
            <div className="glass rounded-xl p-6 flex flex-col gap-5">
              <div>
                <label className="text-sm text-foreground/60 mb-2 block">
                  Tappe per giorno: <span className="text-primary font-semibold">{stagesPerDay}</span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={6}
                  value={stagesPerDay}
                  onChange={(e) => setStagesPerDay(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs text-foreground/30 mt-1">
                  <span>1</span><span>6</span>
                </div>
              </div>
              <div>
                <label className="text-sm text-foreground/60 mb-2 block">
                  Durata media tappa: <span className="text-primary font-semibold">{durationMin} min</span>
                </label>
                <input
                  type="range"
                  min={30}
                  max={180}
                  step={15}
                  value={durationMin}
                  onChange={(e) => setDurationMin(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs text-foreground/30 mt-1">
                  <span>30 min</span><span>3 ore</span>
                </div>
              </div>

              {error && <p className="text-sm text-danger">{error}</p>}

              <div className="flex gap-3 mt-2">
                <button onClick={() => setStep("dates")} className="px-4 py-2 rounded-xl text-foreground/50 hover:text-foreground">
                  Indietro
                </button>
                <button
                  onClick={handleGenerate}
                  className="flex-1 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary-light transition-colors flex items-center justify-center gap-2"
                >
                  <Sparkles size={18} />
                  Genera il mazzo
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Generating */}
        {step === "generating" && (
          <motion.div key="gen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-6 py-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Loader2 size={48} className="text-primary" />
            </motion.div>
            <div className="text-center">
              <p className="text-lg font-semibold mb-1">L&apos;AI sta creando il tuo mazzo...</p>
              <p className="text-sm text-foreground/50">
                Stiamo selezionando i luoghi migliori di {city} per te
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
