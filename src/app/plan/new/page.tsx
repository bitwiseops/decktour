"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { MapPin, Calendar, Layers, Clock, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface City { id: string; name: string; country: string; }

const DURATIONS = [
  { value: "1h", label: "1 ora" },
  { value: "2h", label: "2 ore" },
  { value: "half_day", label: "Mezza giornata" },
];

export default function NewPlanPage() {
  const router = useRouter();
  const [cities, setCities] = useState<City[]>([]);
  const [cityId, setCityId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [stopsPerDay, setStopsPerDay] = useState(2);
  const [stopDuration, setStopDuration] = useState("2h");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingCities, setLoadingCities] = useState(true);

  useEffect(() => {
    fetch("/api/cities")
      .then((r) => r.json())
      .then((data: City[]) => {
        setCities(data);
        if (data.length > 0) setCityId(data[0].id);
      })
      .catch(() => {})
      .finally(() => setLoadingCities(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cityId || !dateFrom || !dateTo) { setError("Compila tutti i campi."); return; }
    if (dateFrom > dateTo) { setError("La data di fine deve essere successiva alla data di inizio."); return; }

    setLoading(true);
    setError(null);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/"); return; }

    const res = await fetch("/api/plan/init", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ city_id: cityId, date_from: dateFrom, date_to: dateTo, stops_per_day: stopsPerDay, stop_duration: stopDuration }),
    });

    if (!res.ok) {
      const { error: e } = await res.json().catch(() => ({}));
      setError(e ?? "Errore nella creazione del piano");
      setLoading(false);
      return;
    }

    const data = await res.json();
    localStorage.setItem("dt_planning", JSON.stringify({
      session_token: data.session_token,
      city_id: cityId,
      date_from: dateFrom,
      date_to: dateTo,
      stops_per_day: stopsPerDay,
      stop_duration: stopDuration,
      num_days: data.num_days,
      total_stops: data.total_stops,
      current_stop_index: 0,
      picks: [],
      reshuffle_count: 0,
    }));
    router.push("/plan/draft");
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Pianifica il viaggio</h1>
        <p className="text-foreground/50 text-sm">Scegli dove e quando. Poi componiamo il mazzo insieme.</p>
      </div>

      {loadingCities ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={28} /></div>
      ) : (
        <motion.form
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="flex flex-col gap-5"
        >
          <div className="glass rounded-xl p-4">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground/60 mb-3">
              <MapPin size={16} /> Città
            </label>
            <select
              value={cityId}
              onChange={(e) => setCityId(e.target.value)}
              className="w-full bg-transparent text-foreground text-base font-medium outline-none"
            >
              {cities.map((c) => (
                <option key={c.id} value={c.id} className="bg-[#1e1b32]">
                  {c.name}, {c.country}
                </option>
              ))}
            </select>
          </div>

          <div className="glass rounded-xl p-4">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground/60 mb-3">
              <Calendar size={16} /> Periodo
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-foreground/40 mb-1">Dal</p>
                <input type="date" value={dateFrom} min={today}
                  onChange={(e) => { setDateFrom(e.target.value); if (!dateTo || e.target.value > dateTo) setDateTo(e.target.value); }}
                  className="w-full bg-transparent text-foreground outline-none text-sm" />
              </div>
              <div>
                <p className="text-xs text-foreground/40 mb-1">Al</p>
                <input type="date" value={dateTo} min={dateFrom || today}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full bg-transparent text-foreground outline-none text-sm" />
              </div>
            </div>
          </div>

          <div className="glass rounded-xl p-4">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground/60 mb-3">
              <Layers size={16} /> Tappe al giorno
            </label>
            <div className="flex items-center gap-4">
              <button type="button" onClick={() => setStopsPerDay((s) => Math.max(1, s - 1))}
                className="w-10 h-10 rounded-xl glass border border-glass-border flex items-center justify-center hover:border-primary/50 transition-colors">
                <ChevronLeft size={20} />
              </button>
              <span className="text-2xl font-bold w-8 text-center">{stopsPerDay}</span>
              <button type="button" onClick={() => setStopsPerDay((s) => Math.min(4, s + 1))}
                className="w-10 h-10 rounded-xl glass border border-glass-border flex items-center justify-center hover:border-primary/50 transition-colors">
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          <div className="glass rounded-xl p-4">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground/60 mb-3">
              <Clock size={16} /> Durata per tappa
            </label>
            <div className="flex gap-2">
              {DURATIONS.map(({ value, label }) => (
                <button key={value} type="button" onClick={() => setStopDuration(value)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    stopDuration === value ? "bg-primary text-white" : "glass border border-glass-border text-foreground/60 hover:border-primary/40"
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {dateFrom && dateTo && (
            <div className="glass rounded-xl px-4 py-3 text-sm text-foreground/60">
              {(() => {
                const days = Math.max(1, Math.round((new Date(dateTo).getTime() - new Date(dateFrom).getTime()) / 86400000) + 1);
                return `${days} ${days === 1 ? "giorno" : "giorni"} · ${days * stopsPerDay} tappe totali`;
              })()}
            </div>
          )}

          {error && <p className="text-danger text-sm">{error}</p>}

          <button type="submit" disabled={loading || !cityId || !dateFrom || !dateTo}
            className="w-full py-4 rounded-xl bg-primary text-white font-semibold text-base hover:bg-primary-light transition-colors flex items-center justify-center gap-2 shadow-lg shadow-primary/25 disabled:opacity-50">
            {loading && <Loader2 size={18} className="animate-spin" />}
            Costruisci il Mazzo →
          </button>
        </motion.form>
      )}
    </div>
  );
}
