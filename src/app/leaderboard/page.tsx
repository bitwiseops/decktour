"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Users, Map, Zap } from "lucide-react";

type Tab = "users" | "plans";

// Placeholder data for demo
const MOCK_USERS = [
  { rank: 1, name: "Marco R.", score: 2450, avatar: null },
  { rank: 2, name: "Sara L.", score: 1890, avatar: null },
  { rank: 3, name: "Luca F.", score: 1650, avatar: null },
  { rank: 4, name: "Giulia M.", score: 1200, avatar: null },
  { rank: 5, name: "Andrea P.", score: 980, avatar: null },
];

const MOCK_PLANS = [
  { rank: 1, title: "L'Anima Barocca di Roma", city: "Roma", executions: 42, power_level: 23 },
  { rank: 2, title: "Napoli Sottopelle", city: "Napoli", executions: 31, power_level: 19 },
  { rank: 3, title: "Firenze tra Luci e Ombre", city: "Firenze", executions: 28, power_level: 15 },
];

export default function LeaderboardPage() {
  const [tab, setTab] = useState<Tab>("users");

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

      {/* Users leaderboard */}
      {tab === "users" && (
        <div className="flex flex-col gap-3">
          {MOCK_USERS.map((user, i) => (
            <motion.div
              key={user.rank}
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
                {user.name[0]}
              </div>
              <div className="flex-1">
                <p className="font-semibold">{user.name}</p>
              </div>
              <div className="flex items-center gap-1 text-accent font-semibold">
                <Trophy size={14} /> {user.score}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Plans leaderboard */}
      {tab === "plans" && (
        <div className="flex flex-col gap-3">
          {MOCK_PLANS.map((plan, i) => (
            <motion.div
              key={plan.rank}
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
                <p className="text-xs text-foreground/40">{plan.city}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="flex items-center gap-1 text-amber-400 font-semibold text-sm">
                  <Zap size={14} /> {plan.power_level}
                </span>
                <span className="text-xs text-foreground/50">{plan.executions} giocate</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
