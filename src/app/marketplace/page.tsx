import Link from "next/link";
import { Star, Users, MapPin } from "lucide-react";
import { getServerSupabase } from "@/lib/supabase";
import MarketplaceFilters from "./MarketplaceFilters";
import MyPlansSection from "./MyPlansSection";

interface PlanCard {
  id: string; title: string; diary_blurred: string | null; avg_rating: number;
  times_played: number; valid_from: string | null; valid_until: string | null;
  city_name: string | null; cover_url: string | null; creator_email: string;
}

async function getPlans(cityId?: string, mood?: string): Promise<PlanCard[]> {
  const db = getServerSupabase();
  let query = db
    .from("plans")
    .select(`id, title, diary_blurred, avg_rating, times_played, valid_from, valid_until, moods_summary,
             cities!city_id(name, cover_url), creator:creator_id(email)`)
    .eq("is_published", true)
    .order("avg_rating", { ascending: false })
    .order("times_played", { ascending: false })
    .limit(12);

  if (cityId) query = query.eq("city_id", cityId);

  const { data } = await query;
  const results = (data ?? []) as Array<{
    id: string; title: string; diary_blurred: string | null; avg_rating: number;
    times_played: number; valid_from: string | null; valid_until: string | null;
    moods_summary: Record<string, number> | null;
    cities: { name: string; cover_url: string | null } | null;
    creator: { email: string } | null;
  }>;

  let filtered = results;
  if (mood) {
    const moodKey = `mood_${mood}`;
    filtered = results.filter((p) => (p.moods_summary?.[moodKey] ?? 0) >= 60);
  }

  return filtered.map((p) => ({
    id: p.id,
    title: p.title,
    diary_blurred: p.diary_blurred,
    avg_rating: p.avg_rating,
    times_played: p.times_played,
    valid_from: p.valid_from,
    valid_until: p.valid_until,
    city_name: p.cities?.name ?? null,
    cover_url: p.cities?.cover_url ?? null,
    creator_email: p.creator?.email ? p.creator.email.split("@")[0] : "Anonimo",
  }));
}

async function getCities() {
  const db = getServerSupabase();
  const { data } = await db.from("cities").select("id,name").eq("is_active", true).order("name");
  return data ?? [];
}

interface Props {
  searchParams: Promise<{ city_id?: string; mood?: string; mine?: string }>;
}

export default async function MarketplacePage({ searchParams }: Props) {
  const params = await searchParams;
  // Default to "my plans" view; switch to all plans only when mine=0 is explicit
  const isMine = params.mine !== "0";

  const [plans, cities] = await Promise.all([
    isMine ? Promise.resolve([]) : getPlans(params.city_id, params.mood),
    getCities(),
  ]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Esplora i Piani</h1>
        <p className="text-foreground/50 text-sm">Scopri viaggi creati dalla community. Nessun login richiesto per esplorare.</p>
      </div>

      <MarketplaceFilters cities={cities} currentCity={params.city_id} currentMood={params.mood} mine={isMine} />

      {isMine ? (
        <MyPlansSection />
      ) : plans.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-foreground/40 text-lg mb-2">Nessun piano trovato</p>
          <Link href="/plan/new" className="text-primary font-medium">Crea il primo →</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div key={plan.id} className="glass rounded-2xl overflow-hidden border border-glass-border hover:border-primary/30 transition-all flex flex-col">
              {/* Cover */}
              <div className="h-36 bg-primary/10 relative overflow-hidden">
                {plan.cover_url ? (
                  <img src={plan.cover_url} alt={plan.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl opacity-20">🗺️</div>
                )}
              </div>

              <div className="p-4 flex flex-col gap-3 flex-1">
                <div>
                  <h3 className="font-semibold leading-snug mb-1 line-clamp-2">{plan.title}</h3>
                  <div className="flex items-center gap-2 text-xs text-foreground/40">
                    <MapPin size={11} /> {plan.city_name}
                    {plan.valid_from && (
                      <span>· {new Date(plan.valid_from).toLocaleDateString("it-IT", { month: "short", day: "numeric" })}</span>
                    )}
                  </div>
                </div>

                {/* Diary blurred */}
                {plan.diary_blurred && (
                  <p className="text-xs text-foreground/60 line-clamp-3 leading-relaxed" style={{ filter: "blur(3px)", userSelect: "none" }}>
                    {plan.diary_blurred}
                  </p>
                )}

                <div className="flex items-center gap-3 text-xs text-foreground/50 mt-auto">
                  <span className="flex items-center gap-1"><Star size={11} className="text-accent" /> {plan.avg_rating.toFixed(1)}</span>
                  <span className="flex items-center gap-1"><Users size={11} /> {plan.times_played}</span>
                  <span className="flex-1 text-right truncate">@{plan.creator_email}</span>
                </div>

                <Link
                  href={`/play/${plan.id}`}
                  className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-medium text-center hover:bg-primary-light transition-colors"
                >
                  Gioca Ora →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
