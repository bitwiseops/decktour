"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { MapPin, Calendar, Layers, Loader2, Sparkles } from "lucide-react";
import type { MoodProfile, City } from "@/lib/types";

type Step = "city" | "dates" | "config" | "generating";

export default function NewPlanPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("city");
  const [cities, setCities] = useState<City[]>([]);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
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
      setMoodProfile({ shopping: 50, food: 50, art: 50, nature: 50, nightlife: 50 });
    }

    fetch("/api/cities")
      .then((r) => r.json())
      .then(setCities)
      .catch(() => {});
  }, []);

  const handleGenerate = async () => {
    if (!moodProfile || !selectedCity) return;
    setStep("generating");
    setError(null);

    try {
      const res = await fetch("/api/ai/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: selectedCity.name,
          country: selectedCity.country,
          moodProfile,
          dateFrom,
          dateTo,
          numStagesPerDay: stagesPerDay,
          avgStageDurationMin: durationMin,
        }),
      });

      if (!res.ok) throw new Error("Errore nella generazione");
      const data = await res.json();
      router.push(`/plan/${data.plan.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto");
      setStep("config");
    }
  };

  // Fallback cities if DB is not available
  const cityList = cities.length > 0 ? cities : [
    { id: "1", name: "Roma", country: "Italia", lat: 41.9, lon: 12.5, image_url: null },
    { id: "2", name: "Milano", country: "Italia", lat: 45.5, lon: 9.2, image_url: null },
    { id: "3", name: "Napoli", country: "Italia", lat: 40.9, lon: 14.3, image_url: null },
    { id: "4", name: "Firenze", country: "Italia", lat: 43.8, lon: 11.3, image_url: null },
    { id: "5", name: "Venezia", country: "Italia", lat: 45.4, lon: 12.3, image_url: null },
    { id: "6", name: "Torino", country: "Italia", lat: 45.1, lon: 7.7, image_url: null },
    { id: "7", name: "Bologna", country: "Italia", lat: 44.5, lon: 11.3, image_url: null },
    { id: "8", name: "Palermo", country: "Italia", lat: 38.1, lon: 13.4, image_url: null },
    { id: "9", name: "Barcellona", country: "Spagna", lat: 41.4, lon: 2.2, image_url: null },
    { id: "10", name: "Parigi", country: "Francia", lat: 48.9, lon: 2.4, image_url: null },
    { id: "11", name: "Londra", country: "Regno Unito", lat: 51.5, lon: -0.1, image_url: null },
    { id: "12", name: "Amsterdam", country: "Paesi Bassi", lat: 52.4, lon: 4.9, image_url: null },
  ];

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
              {cityList.map((c) => (
                <button
                  key={c.name}
                  onClick={() => { setSelectedCity(c); setStep("dates"); }}
                  className={`p-4 rounded-xl glass border text-left transition-all hover:border-primary/50 ${
                    selectedCity?.name === c.name ? "border-primary bg-primary/10" : "border-glass-border"
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
                Stiamo selezionando i luoghi migliori di {selectedCity?.name} per te
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
