"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { MapPin, Calendar, Layers, Clock, Loader2, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface City { id: string; name: string; country: string; cover_url?: string | null; }



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
  const [calOpen, setCalOpen] = useState<"from" | "to" | null>(null);

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
    localStorage.removeItem(DRAFT_KEY);
    router.push("/plan/draft");
  }

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
          {/* ── City selector ── */}
          <div className="glass rounded-xl p-4">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground/60 mb-3">
              <MapPin size={16} /> Città
            </label>

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
              {filteredCities.length === 0 && (
                <p className="col-span-2 text-center text-sm text-foreground/30 py-4">Nessuna città trovata</p>
              )}
            </div>
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
            {loading && <Loader2 size={18} className="animate-spin" />}
            Costruisci il Mazzo →
          </button>
        </motion.form>
      )}
    </div>
  );
}
