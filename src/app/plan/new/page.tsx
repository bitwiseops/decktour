"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { MapPin, Calendar, Layers, Clock, Loader2, ChevronLeft, ChevronRight, Search, Volume2, VolumeX, ArrowRight, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { MoodRadar } from "@/components/game/MoodRadar";

interface City { id: string; name: string; country: string; cover_url?: string | null; audio_url?: string | null; }

const MOOD_SLIDERS = [
  { key: "mood_art", label: "Arte & Storia", emoji: "🏛️" },
  { key: "mood_food", label: "Enogastronomia", emoji: "🍷" },
  { key: "mood_nature", label: "Natura & Outdoor", emoji: "🌿" },
  { key: "mood_shopping", label: "Acquisti", emoji: "🛍️" },
  { key: "mood_nightlife", label: "Vita Notturna", emoji: "🌙" },
] as const;

type MoodKey = (typeof MOOD_SLIDERS)[number]["key"];
type MoodValues = Record<MoodKey, number>;

const MOOD_DEFAULTS: MoodValues = {
  mood_art: 50, mood_food: 50, mood_nature: 50, mood_shopping: 50, mood_nightlife: 50,
};

function toRadarProfile(v: MoodValues) {
  return { art: v.mood_art, food: v.mood_food, nature: v.mood_nature, shopping: v.mood_shopping, nightlife: v.mood_nightlife };
}

const DURATIONS = [
  { value: "1h", label: "1 ora" },
  { value: "2h", label: "2 ore" },
  { value: "half_day", label: "Mezza giornata" },
];

const MONTHS_IT = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
const DAYS_IT = ["Lu","Ma","Me","Gi","Ve","Sa","Do"];

function toDateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function CalendarPicker({
  value,
  minStr,
  rangeStart,
  rangeEnd,
  onSelect,
}: {
  value: string;
  minStr: string;
  rangeStart: string;
  rangeEnd: string;
  onSelect: (val: string) => void;
}) {
  const todayStr = toDateStr(new Date());
  const init = value || minStr || todayStr;
  const [viewYear, setViewYear] = useState(() => parseInt(init.slice(0, 4)));
  const [viewMonth, setViewMonth] = useState(() => parseInt(init.slice(5, 7)) - 1);

  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const offset = firstDow === 0 ? 6 : firstDow - 1;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function dayStr(d: number) {
    return `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  // Disable prev if prev month is entirely before minStr
  const lastOfPrevMonth = toDateStr(new Date(viewYear, viewMonth, 0));
  const canGoPrev = lastOfPrevMonth >= minStr;

  return (
    <div className="rounded-2xl bg-white/5 border border-glass-border p-4 shadow-xl">
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={prevMonth} disabled={!canGoPrev}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors disabled:opacity-20">
          <ChevronLeft size={16} />
        </button>
        <span className="font-semibold text-sm">{MONTHS_IT[viewMonth]} {viewYear}</span>
        <button type="button" onClick={nextMonth}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors">
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {DAYS_IT.map(d => (
          <div key={d} className="text-center text-xs text-foreground/30 py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;
          const ds = dayStr(d);
          const disabled = ds < minStr;
          const isSelected = ds === value;
          const inRange = rangeStart && rangeEnd && ds > rangeStart && ds < rangeEnd;
          const isStart = rangeStart && ds === rangeStart;
          const isEnd = rangeEnd && ds === rangeEnd;
          const isToday = ds === todayStr;

          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(ds)}
              className={[
                "relative h-9 flex items-center justify-center text-sm font-medium transition-all",
                disabled ? "opacity-20 cursor-not-allowed" : "cursor-pointer",
                isSelected ? "bg-primary text-white rounded-lg shadow-lg shadow-primary/30 z-10" : "",
                !isSelected && inRange ? "bg-primary/20" : "",
                !isSelected && isStart ? "bg-primary/20 rounded-l-lg" : "",
                !isSelected && isEnd ? "bg-primary/20 rounded-r-lg" : "",
                !isSelected && !inRange && !isStart && !isEnd && !disabled ? "hover:bg-white/10 rounded-lg" : "",
                isToday && !isSelected ? "text-primary font-bold" : "",
              ].filter(Boolean).join(" ")}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function NewPlanPage() {
  const router = useRouter();
  const [cities, setCities] = useState<City[]>([]);
  const [cityId, setCityId] = useState("");
  const [citySearch, setCitySearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [stopsPerDay, setStopsPerDay] = useState(2);
  const [stopDuration, setStopDuration] = useState("2h");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingCities, setLoadingCities] = useState(true);
  const [step, setStep] = useState<"mood" | "plan">("mood");
  const [moodValues, setMoodValues] = useState<MoodValues>({ ...MOOD_DEFAULTS });
  const [radarProfile, setRadarProfile] = useState(toRadarProfile(MOOD_DEFAULTS));
  const [calOpen, setCalOpen] = useState<"from" | "to" | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);
  // City request
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestCountry, setRequestCountry] = useState("");
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestMessage, setRequestMessage] = useState<string | null>(null);
  const [completedRequests, setCompletedRequests] = useState<{ city_name: string; city_id: string }[]>([]);

  // Play city audio when city changes
  useEffect(() => {
    const city = cities.find(c => c.id === cityId);
    const url = city?.audio_url;
    if (!url) {
      audioRef.current?.pause();
      return;
    }
    if (!audioRef.current) {
      audioRef.current = new Audio(url);
      audioRef.current.loop = true;
      audioRef.current.volume = 0.35;
    } else if (audioRef.current.src !== url && audioRef.current.src !== new URL(url, window.location.href).href) {
      audioRef.current.pause();
      audioRef.current = new Audio(url);
      audioRef.current.loop = true;
      audioRef.current.volume = 0.35;
    }
    if (!mutedRef.current) {
      audioRef.current.play().catch(() => {});
    }
    return () => { /* keep playing across renders */ };
  }, [cityId, cities]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { audioRef.current?.pause(); audioRef.current = null; };
  }, []);

  function toggleMute() {
    mutedRef.current = !mutedRef.current;
    setMuted(mutedRef.current);
    if (audioRef.current) {
      if (mutedRef.current) audioRef.current.pause();
      else audioRef.current.play().catch(() => {});
    }
  }

  const today = toDateStr(new Date());

  const DRAFT_KEY = "dt_new_plan_draft";

  // Restore saved draft on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const d = JSON.parse(saved) as {
          cityId?: string; dateFrom?: string; dateTo?: string;
          stopsPerDay?: number; stopDuration?: string;
        };
        if (d.cityId)      setCityId(d.cityId);
        // Only restore dates that are still in the future
        if (d.dateFrom && d.dateFrom >= today) setDateFrom(d.dateFrom);
        if (d.dateTo   && d.dateTo   >= today) setDateTo(d.dateTo);
        if (d.stopsPerDay)  setStopsPerDay(d.stopsPerDay);
        if (d.stopDuration) setStopDuration(d.stopDuration);
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetch("/api/cities")
      .then((r) => r.json())
      .then((data: City[]) => {
        setCities(data);
        // Only set default city if nothing was restored from draft
        setCityId(prev => prev || (data.length > 0 ? data[0].id : ""));
      })
      .catch(() => {})
      .finally(() => setLoadingCities(false));
  }, []);

  // Persist draft whenever any field changes
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ cityId, dateFrom, dateTo, stopsPerDay, stopDuration }));
    } catch { /* ignore */ }
  }, [cityId, dateFrom, dateTo, stopsPerDay, stopDuration]);

  // Load completed city requests on mount
  useEffect(() => {
    async function loadRequests() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch("/api/cities/request", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return;
      const reqs = await res.json() as { city_name: string; city_id: string | null; status: string }[];
      setCompletedRequests(
        reqs.filter(r => r.status === "completed" && r.city_id)
          .map(r => ({ city_name: r.city_name, city_id: r.city_id! }))
      );
    }
    loadRequests();
  }, []);

  async function handleCityRequest() {
    if (!citySearch.trim() || !requestCountry.trim()) return;
    setRequestLoading(true);
    setRequestMessage(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/"); return; }

    const res = await fetch("/api/cities/request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ city_name: citySearch.trim(), country: requestCountry.trim() }),
    });

    const data = await res.json();
    if (data.status === "already_exists") {
      setRequestMessage("Questa città è già disponibile!");
      // Reload cities
      const citiesRes = await fetch("/api/cities");
      if (citiesRes.ok) {
        const newCities = await citiesRes.json() as City[];
        setCities(newCities);
        setCityId(data.city_id);
      }
    } else if (data.status === "already_requested") {
      setRequestMessage("Questa città è già stata richiesta ed è in preparazione.");
    } else if (data.status === "requested") {
      setRequestMessage("Richiesta inviata! La città sarà disponibile a breve (~2 min).");
    } else {
      setRequestMessage(data.error ?? "Errore nella richiesta.");
    }
    setRequestLoading(false);
    setShowRequestForm(false);
  }

  const filteredCities = cities.filter(c =>
    citySearch === "" ||
    c.name.toLowerCase().includes(citySearch.toLowerCase()) ||
    c.country.toLowerCase().includes(citySearch.toLowerCase())
  );

  function formatDate(s: string) {
    if (!s) return "";
    const [y, m, d] = s.split("-");
    return `${d} ${MONTHS_IT[parseInt(m) - 1].slice(0, 3)} ${y}`;
  }

  function handleMoodChange(key: MoodKey, val: number) {
    const next = { ...moodValues, [key]: val };
    setMoodValues(next);
    setRadarProfile(toRadarProfile(next));
  }

  function handleGoToPlan() {
    setError(null);
    setStep("plan");
  }

  function handleSubmitPlan(e: React.FormEvent) {
    e.preventDefault();
    if (!cityId || !dateFrom || !dateTo) { setError("Compila tutti i campi."); return; }
    if (dateFrom > dateTo) { setError("La data di fine deve essere successiva alla data di inizio."); return; }
    setError(null);
    handleSubmitWithMood();
  }

  async function handleSubmitWithMood() {
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
      body: JSON.stringify({
        city_id: cityId, date_from: dateFrom, date_to: dateTo,
        stops_per_day: stopsPerDay, stop_duration: stopDuration,
        ...moodValues,
      }),
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
    localStorage.removeItem(DRAFT_KEY);
    router.push("/plan/draft");
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <AnimatePresence mode="wait">
      {step === "mood" ? (
        <motion.div
          key="mood"
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 40 }}
          className="flex flex-col gap-5"
        >
          <div className="mb-2">
            <h1 className="text-2xl font-bold mb-1">Il tuo DNA da viaggiatore</h1>
            <p className="text-foreground/50 text-sm">Definisci il mood per questo viaggio. Guiderà la selezione delle tappe.</p>
          </div>

          <MoodRadar profile={radarProfile} size={260} />

          <div className="flex flex-col gap-5">
            {MOOD_SLIDERS.map(({ key, label, emoji }) => (
              <div key={key}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium">{emoji} {label}</span>
                  <span className="text-sm font-bold text-primary">{moodValues[key]}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={moodValues[key]}
                  onChange={(e) => handleMoodChange(key, Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer accent-primary bg-white/10"
                />
                <div className="flex justify-between text-xs text-foreground/30 mt-1">
                  <span>Non mi interessa</span>
                  <span>Mi appassiona</span>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleGoToPlan}
            className="w-full py-4 rounded-xl bg-primary text-white font-semibold text-base hover:bg-primary-light transition-colors flex items-center justify-center gap-2 shadow-lg shadow-primary/25"
          >
            <ArrowRight size={18} />
            Pianifica il viaggio
          </button>
        </motion.div>
      ) : (
      <motion.div key="plan" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}>
      <div className="mb-6">
        <button type="button" onClick={() => setStep("mood")} className="flex items-center gap-1 text-sm text-foreground/50 hover:text-foreground transition-colors mb-3">
          <ArrowLeft size={14} /> Modifica mood
        </button>
        <h1 className="text-2xl font-bold mb-1">Pianifica il viaggio</h1>
        <p className="text-foreground/50 text-sm">Scegli dove e quando. Poi componiamo il mazzo insieme.</p>
      </div>

      {loadingCities ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={28} /></div>
      ) : (
        <motion.form
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmitPlan}
          className="flex flex-col gap-5"
        >
          {/* ── City selector ── */}
          <div className="glass rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground/60">
                <MapPin size={16} /> Città
              </label>
              {cities.find(c => c.id === cityId)?.audio_url && (
                <button
                  type="button"
                  onClick={toggleMute}
                  className="flex items-center gap-1.5 text-xs text-foreground/40 hover:text-foreground/70 transition-colors"
                  title={muted ? "Riattiva musica" : "Silenzia musica"}
                >
                  {muted ? <VolumeX size={14} /> : <Volume2 size={14} className="text-primary/70" />}
                  <span className="hidden sm:inline">{muted ? "Audio off" : "Audio on"}</span>
                </button>
              )}
            </div>

            {cities.length > 4 && (
              <div className="relative mb-3">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/30" />
                <input
                  type="text"
                  placeholder="Cerca città…"
                  value={citySearch}
                  onChange={e => setCitySearch(e.target.value)}
                  className="w-full bg-white/5 border border-glass-border rounded-lg pl-8 pr-3 py-2 text-sm outline-none focus:border-primary/50 transition-colors"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-0.5">
              {filteredCities.map(c => {
                const photo = c.cover_url ?? null;
                const selected = cityId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCityId(c.id)}
                    className={`relative rounded-xl overflow-hidden h-28 text-left transition-all border-2 ${
                      selected ? "border-primary shadow-lg shadow-primary/30" : "border-transparent hover:border-primary/40"
                    }`}
                  >
                    {photo ? (
                      <Image src={photo} alt={c.name} fill sizes="180px" className="object-cover" />
                    ) : (
                      <div className="absolute inset-0 bg-white/5" />
                    )}
                    {/* gradient overlay */}
                    <div className={`absolute inset-0 bg-gradient-to-t ${
                      selected ? "from-primary/90 via-black/40" : "from-black/70 via-black/20"
                    } to-transparent`} />
                    {/* name */}
                    <div className="absolute bottom-0 left-0 right-0 p-2.5">
                      <p className="text-xs font-bold text-white leading-tight truncate">{c.name}</p>
                      <p className="text-[10px] text-white/60 leading-tight truncate">{c.country}</p>
                    </div>
                    {selected && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                    )}
                  </button>
                );
              })}
              {filteredCities.length === 0 && citySearch && (
                <div className="col-span-2 text-center py-4">
                  <p className="text-sm text-foreground/40 mb-2">Non abbiamo ancora &quot;{citySearch}&quot;</p>
                  {!showRequestForm ? (
                    <button type="button" onClick={() => setShowRequestForm(true)}
                      className="text-primary text-sm font-medium hover:underline">
                      Richiedi questa città
                    </button>
                  ) : (
                    <div className="flex gap-2 items-center justify-center">
                      <input
                        type="text"
                        placeholder="Paese (es. Italia)"
                        value={requestCountry}
                        onChange={e => setRequestCountry(e.target.value)}
                        className="bg-white/5 border border-glass-border rounded-lg px-3 py-2 text-sm w-36 outline-none focus:border-primary/50"
                      />
                      <button type="button" onClick={handleCityRequest} disabled={requestLoading || !requestCountry.trim()}
                        className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium disabled:opacity-50">
                        {requestLoading ? <Loader2 size={14} className="animate-spin" /> : "Richiedi"}
                      </button>
                    </div>
                  )}
                </div>
              )}
              {filteredCities.length === 0 && !citySearch && (
                <p className="col-span-2 text-center text-sm text-foreground/30 py-4">Nessuna città trovata</p>
              )}
            </div>

            {/* Request message */}
            {requestMessage && (
              <p className="text-sm text-accent mt-2 text-center">{requestMessage}</p>
            )}

            {/* Completed requests notification */}
            {completedRequests.length > 0 && (
              <div className="mt-2 space-y-1">
                {completedRequests.map(r => (
                  <button key={r.city_id} type="button"
                    onClick={() => {
                      setCityId(r.city_id);
                      setCitySearch("");
                      // Reload cities to include the new one
                      fetch("/api/cities").then(res => res.json()).then((data: City[]) => setCities(data)).catch(() => {});
                    }}
                    className="w-full text-sm text-left px-3 py-2 rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors">
                    {r.city_name} è ora disponibile!
                  </button>
                ))}
              </div>
            )}

            {/* Always visible link */}
            {filteredCities.length > 0 && !showRequestForm && (
              <button type="button" onClick={() => setShowRequestForm(true)}
                className="text-xs text-foreground/30 hover:text-primary transition-colors mt-2">
                Non trovi la tua città? Richiedila
              </button>
            )}
            {showRequestForm && filteredCities.length > 0 && (
              <div className="flex gap-2 items-center mt-2">
                <input type="text" placeholder="Nome città" value={citySearch}
                  onChange={e => setCitySearch(e.target.value)}
                  className="bg-white/5 border border-glass-border rounded-lg px-3 py-2 text-sm flex-1 outline-none focus:border-primary/50" />
                <input type="text" placeholder="Paese" value={requestCountry}
                  onChange={e => setRequestCountry(e.target.value)}
                  className="bg-white/5 border border-glass-border rounded-lg px-3 py-2 text-sm w-28 outline-none focus:border-primary/50" />
                <button type="button" onClick={handleCityRequest} disabled={requestLoading || !citySearch.trim() || !requestCountry.trim()}
                  className="px-3 py-2 rounded-lg bg-primary text-white text-sm font-medium disabled:opacity-50 shrink-0">
                  {requestLoading ? <Loader2 size={14} className="animate-spin" /> : "Richiedi"}
                </button>
              </div>
            )}
          </div>

          {/* ── Date range picker ── */}
          <div className="glass rounded-xl p-4">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground/60 mb-3">
              <Calendar size={16} /> Periodo
            </label>

            <div className="grid grid-cols-2 gap-3 mb-0">
              {(["from", "to"] as const).map(field => {
                const isOpen = calOpen === field;
                const val = field === "from" ? dateFrom : dateTo;
                return (
                  <button
                    key={field}
                    type="button"
                    onClick={() => setCalOpen(isOpen ? null : field)}
                    className={`flex flex-col items-start px-3 py-2.5 rounded-xl border transition-all text-left ${
                      isOpen
                        ? "border-primary/70 bg-primary/10"
                        : val
                        ? "border-glass-border hover:border-primary/40 bg-white/5"
                        : "border-glass-border border-dashed hover:border-primary/40"
                    }`}
                  >
                    <span className="text-xs text-foreground/40 mb-0.5">{field === "from" ? "Dal" : "Al"}</span>
                    <span className={`text-sm font-semibold ${val ? "text-foreground" : "text-foreground/25"}`}>
                      {val ? formatDate(val) : "— —"}
                    </span>
                  </button>
                );
              })}
            </div>

            <AnimatePresence>
              {calOpen && (
                <motion.div
                  key={calOpen}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  className="mt-3"
                >
                  <CalendarPicker
                    value={calOpen === "from" ? dateFrom : dateTo}
                    minStr={calOpen === "from" ? today : (dateFrom || today)}
                    rangeStart={dateFrom}
                    rangeEnd={dateTo}
                    onSelect={(val) => {
                      if (calOpen === "from") {
                        setDateFrom(val);
                        if (!dateTo || val > dateTo) setDateTo(val);
                        setCalOpen("to");
                      } else {
                        setDateTo(val);
                        setCalOpen(null);
                      }
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Stops per day ── */}
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

          {/* ── Stop duration ── */}
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
            {loading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
            Componi il mazzo
          </button>
        </motion.form>
      )}
      </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}
