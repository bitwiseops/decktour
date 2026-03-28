"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";

const MOODS = [
  { value: "", label: "Tutti i mood" },
  { value: "art", label: "🏛️ Arte" },
  { value: "food", label: "🍷 Enogastronomia" },
  { value: "nature", label: "🌿 Natura" },
  { value: "shopping", label: "🛍️ Acquisti" },
  { value: "nightlife", label: "🌙 Nightlife" },
];

interface City { id: string; name: string; }

function FiltersInner({ cities, currentCity, currentMood }: {
  cities: City[]; currentCity?: string; currentMood?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  function update(key: string, value: string) {
    const params = new URLSearchParams();
    if (key !== "city_id" && currentCity) params.set("city_id", currentCity);
    if (key !== "mood" && currentMood) params.set("mood", currentMood);
    if (value) params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex gap-2 flex-wrap mb-6">
      <select
        value={currentCity ?? ""}
        onChange={(e) => update("city_id", e.target.value)}
        className="glass rounded-xl px-3 py-2 text-sm text-foreground outline-none border border-glass-border"
      >
        <option value="">Tutte le città</option>
        {cities.map((c) => (
          <option key={c.id} value={c.id} className="bg-[#1e1b32]">{c.name}</option>
        ))}
      </select>

      <select
        value={currentMood ?? ""}
        onChange={(e) => update("mood", e.target.value)}
        className="glass rounded-xl px-3 py-2 text-sm text-foreground outline-none border border-glass-border"
      >
        {MOODS.map((m) => (
          <option key={m.value} value={m.value} className="bg-[#1e1b32]">{m.label}</option>
        ))}
      </select>
    </div>
  );
}

export default function MarketplaceFilters(props: { cities: City[]; currentCity?: string; currentMood?: string }) {
  return (
    <Suspense fallback={<div className="h-12 mb-6" />}>
      <FiltersInner {...props} />
    </Suspense>
  );
}
