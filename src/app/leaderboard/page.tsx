// SSR page — no "use client"
import Link from "next/link";
import { Trophy, Users, MapPin } from "lucide-react";
import { getServerSupabase } from "@/lib/supabase";

async function getUsers(month: string) {
  const db = getServerSupabase();
  // Join leaderboard_users with player_profiles to get display_name (no admin API needed)
  const { data } = await db
    .from("leaderboard_users")
    .select("id,user_id,monthly_points,total_points,player_profiles!user_id(display_name,avatar_url)")
    .eq("month", month)
    .order("monthly_points", { ascending: false })
    .limit(20);
  const rows = data ?? [];
  return rows.map((r, i) => {
    const pp = (Array.isArray(r.player_profiles) ? r.player_profiles[0] : r.player_profiles) as { display_name: string | null; avatar_url: string | null } | null;
    return { rank: i+1, username: pp?.display_name ?? "Anonomo", avatar_url: pp?.avatar_url ?? null, monthly_points: r.monthly_points, total_points: r.total_points };
  });
}

async function getPlans(month: string) {
  const db = getServerSupabase();
  const { data } = await db.from("leaderboard_plans").select("id,plan_id,times_played,avg_score,plans!plan_id(title,cities!city_id(name))").eq("month", month).order("times_played", { ascending: false }).limit(20);
  return (data ?? []).map((r, i) => {
    const _pl = Array.isArray(r.plans) ? r.plans[0] : r.plans;
    const plan = _pl as { title: string; cities: { name: string } | { name: string }[] | null } | null;
    const citiesRaw = plan?.cities;
    const cityName = Array.isArray(citiesRaw) ? (citiesRaw as { name: string }[])[0]?.name : (citiesRaw as { name: string } | null)?.name;
    return { rank: i+1, plan_id: r.plan_id, title: plan?.title ?? "Piano", city_name: cityName ?? null, times_played: r.times_played, avg_score: Math.round(r.avg_score) };
  });
}

const MC = ["text-accent", "text-gray-300", "text-amber-700"];

interface Props { searchParams: Promise<{ month?: string; tab?: string }>; }

export default async function LeaderboardPage({ searchParams }: Props) {
  const params = await searchParams;
  const month = params.month ?? new Date().toISOString().slice(0, 7);
  const tab = params.tab ?? "users";
  const [users, plans] = await Promise.all([getUsers(month), getPlans(month)]);
  const monthLabel = new Date(month + "-01").toLocaleDateString("it-IT", { month: "long", year: "numeric" });

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1 flex items-center gap-2"><Trophy size={22} className="text-accent" /> Classifica</h1>
        <p className="text-foreground/50 text-sm capitalize">{monthLabel}</p>
      </div>
      <div className="flex gap-2 mb-6">
        <Link href={`/leaderboard?month=${month}&tab=users`} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === "users" ? "bg-primary text-white" : "glass text-foreground/50"}`}>
          <Users size={14} /> Top Giocatori
        </Link>
        <Link href={`/leaderboard?month=${month}&tab=plans`} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === "plans" ? "bg-primary text-white" : "glass text-foreground/50"}`}>
          <MapPin size={14} /> Top Piani
        </Link>
      </div>
      {tab === "users" && (
        <div className="flex flex-col gap-2">
          {users.length === 0 ? <p className="text-center py-16 text-foreground/40">Nessun dato per questo mese</p>
          : users.map((u) => (
            <div key={u.username} className="glass rounded-xl px-4 py-3.5 flex items-center gap-4 border border-glass-border">
              <span className={`w-7 text-center font-bold ${MC[u.rank - 1] ?? "text-foreground/50"}`}>{u.rank}</span>
              <div className="flex-1 min-w-0"><p className="font-semibold truncate">@{u.username}</p><p className="text-xs text-foreground/40">{u.total_points} totali</p></div>
              <span className="font-bold text-primary">{u.monthly_points}</span>
            </div>
          ))}
        </div>
      )}
      {tab === "plans" && (
        <div className="flex flex-col gap-2">
          {plans.length === 0 ? <p className="text-center py-16 text-foreground/40">Nessun dato per questo mese</p>
          : plans.map((p) => (
            <Link key={p.plan_id} href={`/play/${p.plan_id}`} className="glass rounded-xl px-4 py-3.5 flex items-center gap-4 border border-glass-border hover:border-primary/30 transition-colors">
              <span className={`w-7 text-center font-bold ${MC[p.rank - 1] ?? "text-foreground/50"}`}>{p.rank}</span>
              <div className="flex-1 min-w-0"><p className="font-semibold truncate">{p.title}</p><p className="text-xs text-foreground/40 flex items-center gap-1"><MapPin size={10} /> {p.city_name}</p></div>
              <div className="text-right"><p className="font-bold text-primary">{p.times_played}</p><p className="text-xs text-foreground/40">giocate</p></div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

