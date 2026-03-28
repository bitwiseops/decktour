"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Loader2, CheckCircle, XCircle } from "lucide-react";
import { useGeolocation } from "@/hooks/useGeolocation";
import { haversineDistance, CHECK_IN_RADIUS, EXACT_RADIUS, calculateIntuitionBonus } from "@/lib/scoring";

interface CheckInButtonProps {
  targetLat: number;
  targetLon: number;
  onCheckIn: (lat: number, lon: number, distance: number) => void;
  disabled?: boolean;
  hintsRevealed?: number;
}

type CheckInState = "idle" | "loading" | "success" | "exact" | "far";

export function CheckInButton({ targetLat, targetLon, onCheckIn, disabled, hintsRevealed = 1 }: CheckInButtonProps) {
  const { getCurrentPosition } = useGeolocation();
  const [state, setState] = useState<CheckInState>("idle");
  const [distance, setDistance] = useState<number | null>(null);

  const handleCheckIn = async () => {
    setState("loading");
    try {
      const pos = await getCurrentPosition();
      const dist = haversineDistance(pos.lat, pos.lon, targetLat, targetLon);
      setDistance(dist);

      if (dist <= EXACT_RADIUS) setState("exact");
      else if (dist <= CHECK_IN_RADIUS) setState("success");
      else setState("far");

      onCheckIn(pos.lat, pos.lon, dist);
    } catch {
      setState("idle");
    }
  };

  const stateConfig = {
    idle: { icon: <MapPin size={28} />, bg: "bg-primary", text: "CHECK IN" },
    loading: { icon: <Loader2 size={28} className="animate-spin" />, bg: "bg-primary/50", text: "Localizzazione..." },
    success: { icon: <CheckCircle size={28} />, bg: "bg-success", text: "Check-in valido!" },
    exact: { icon: <CheckCircle size={28} />, bg: "bg-accent", text: "Luogo esatto!" },
    far: { icon: <XCircle size={28} />, bg: "bg-danger", text: "Troppo lontano" },
  };

  const config = stateConfig[state];

  return (
    <div className="flex flex-col items-center gap-3">
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={handleCheckIn}
        disabled={disabled || state === "loading"}
        className={`w-24 h-24 rounded-full ${config.bg} text-white flex flex-col items-center justify-center gap-1 shadow-lg shadow-primary/25 transition-colors disabled:opacity-50`}
      >
        {config.icon}
        <span className="text-[10px] font-bold tracking-wider">{state === "idle" ? "CHECK IN" : ""}</span>
      </motion.button>

      <AnimatePresence>
        {state !== "idle" && state !== "loading" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <p className={`text-sm font-semibold ${state === "far" ? "text-danger" : "text-success"}`}>
              {config.text}
            </p>
            {distance !== null && (
              <p className="text-xs text-foreground/50">
                {distance < 1000 ? `${Math.round(distance)}m` : `${(distance / 1000).toFixed(1)}km`} dal luogo
              </p>
            )}
            {state === "exact" && (
              <>
                <p className="text-xs text-accent font-medium">+50 punti bonus!</p>
                {calculateIntuitionBonus(hintsRevealed, true) > 0 && (
                  <p className="text-xs text-amber-400 font-medium">
                    +{calculateIntuitionBonus(hintsRevealed, true)} Bonus Intuizione!
                  </p>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
