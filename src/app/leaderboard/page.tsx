"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy, Users, Map, Zap, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Tab = "users" | "plans";

interface LeaderUser {
  id: string;
  display_name: string;
  avatar_url: string | null;
  total_score: number;
  rank: number;
}

interface LeaderPlan {
  id: string;
  title: string;
  power_level: number;
  total_executions: number;
  avg_rating: number;
  city_name: string;
  creator_name: string;
  rank: number;
}

export default function LeaderboardPage() {
  const [tab, setTab] = useState<Tab>("users");
  const [users, setUsers] = useState<LeaderUser[]>([]);
  const [plans, setPlans] = useState<LeaderPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [usersRes, plansRes] = await Promise.all([
        supabase.from("leaderboard_users").select("*").order("rank").limit(20),
        supabase.from("leaderboard_plans").select("*").order("rank").limit(20),
      ]);
      setUsers((usersRes.data as LeaderUser[]) ?? []);
      setPlans((plansRes.data as LeaderPlan[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Classifica</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab("users")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            tab === "users" ? "bg-primary text-white" : "glass text-foreground/50"
          }`}
        >
          <Users size={16} /> Esploratori
        </button>
        <button
          onClick={() => setTab("plans")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            tab === "plans" ? "bg-primary text-white" : "glass text-foreground/50"
          }`}
        >
          <Map size={16} /> Piani
        </button>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 size={32} className="text-primary animate-spin" />
        </div>
      )}

      {/* Users leaderboard */}
      {!loading && tab === "users" && (
        <div className="flex flex-col gap-3">
          {users.length === 0 && (
            <p className="text-center text-foreground/40 py-12">Nessun esploratore in classifica ancora</p>
          )}
          {users.map((user, i) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`glass rounded-xl p-4 flex items-center gap-4 ${
                user.rank <= 3 ? "border border-accent/30" : "border border-glass-border"
              }`}
            >
              <span className={`text-2xl font-bold w-8 text-center ${
                user.rank === 1 ? "text-accent" : user.rank === 2 ? "text-foreground/60" : user.rank === 3 ? "text-amber-700" : "text-foreground/30"
              }`}>
                {user.rank}
              </span>
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                {(user.display_name ?? "?")[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="font-semibold">{user.display_name ?? "Esploratore"}</p>
              </div>
              <div className="flex items-center gap-1 text-accent font-semibold">
                <Trophy size={14} /> {user.total_score}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Plans leaderboard */}
      {!loading && tab === "plans" && (
        <div className="flex flex-col gap-3">
          {plans.length === 0 && (
            <p className="text-center text-foreground/40 py-12">Nessun piano pubblicato ancora</p>
          )}
          {plans.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass rounded-xl p-4 flex items-center gap-4 border border-glass-border"
            >
              <span className={`text-2xl font-bold w-8 text-center ${
                plan.rank === 1 ? "text-accent" : "text-foreground/30"
              }`}>
                {plan.rank}
              </span>
              <div className="flex-1">
                <p className="font-semibold">{plan.title}</p>
                <p className="text-xs text-foreground/40">{plan.city_name}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="flex items-center gap-1 text-amber-400 font-semibold text-sm">
                  <Zap size={14} /> {plan.power_level ?? 0}
                </span>
                <span className="text-xs text-foreground/50">{plan.total_executions ?? 0} giocate</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
