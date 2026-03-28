"use client";

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";
import { MOODS } from "@/lib/types";
import type { MoodProfile } from "@/lib/types";

interface MoodRadarProps {
  profile: MoodProfile;
  size?: number;
}

export function MoodRadar({ profile, size = 300 }: MoodRadarProps) {
  const data = MOODS.map((m) => ({
    mood: `${m.emoji} ${m.label.split(" ")[0]}`,
    value: profile[m.id],
    fullMark: 100,
  }));

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", duration: 0.8, bounce: 0.3 }}
      className="flex justify-center"
    >
      <ResponsiveContainer width={size} height={size}>
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke="rgba(255,255,255,0.1)" />
          <PolarAngleAxis
            dataKey="mood"
            tick={{ fill: "#ededed", fontSize: 11 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={false}
            axisLine={false}
          />
          <Radar
            name="Mood"
            dataKey="value"
            stroke="#6366f1"
            fill="#6366f1"
            fillOpacity={0.3}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
