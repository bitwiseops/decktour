"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Plus, AlertTriangle } from "lucide-react";

interface CountdownTimerProps {
  durationMin: number;
  onExpired: () => void;
  paused?: boolean;
}

const EXTEND_MINUTES = 15;

export function CountdownTimer({ durationMin, onExpired, paused = false }: CountdownTimerProps) {
  const totalSeconds = durationMin * 60;
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const [totalDuration, setTotalDuration] = useState(totalSeconds);
  const [expired, setExpired] = useState(false);
  const onExpiredRef = useRef(onExpired);
  onExpiredRef.current = onExpired;

  useEffect(() => {
    setSecondsLeft(durationMin * 60);
    setTotalDuration(durationMin * 60);
    setExpired(false);
  }, [durationMin]);

  useEffect(() => {
    if (paused || expired) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setExpired(true);
          onExpiredRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [paused, expired, durationMin]);

  const handleExtend = useCallback(() => {
    const extraSeconds = EXTEND_MINUTES * 60;
    setSecondsLeft((prev) => prev + extraSeconds);
    setTotalDuration((prev) => prev + extraSeconds);
    if (expired) {
      setExpired(false);
    }
  }, [expired]);

  const progress = totalDuration > 0 ? secondsLeft / totalDuration : 0;
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  const isWarning = secondsLeft <= 120 && secondsLeft > 0;
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className="flex items-center gap-3">
      {/* Circular timer */}
      <div className="relative w-16 h-16 shrink-0">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            className="text-white/10"
          />
          <motion.circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.5, ease: "linear" }}
            className={
              expired
                ? "text-danger"
                : isWarning
                  ? "text-amber-400"
                  : "text-primary-light"
            }
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          {expired ? (
            <AlertTriangle size={18} className="text-danger" />
          ) : (
            <Clock
              size={14}
              className={isWarning ? "text-amber-400" : "text-foreground/60"}
            />
          )}
        </div>
      </div>

      {/* Time display */}
      <div className="flex flex-col">
        <AnimatePresence mode="wait">
          <motion.span
            key={expired ? "expired" : "running"}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className={`text-lg font-mono font-bold tabular-nums ${
              expired
                ? "text-danger"
                : isWarning
                  ? "text-amber-400"
                  : "text-foreground"
            }`}
          >
            {expired ? "Tempo scaduto!" : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`}
          </motion.span>
        </AnimatePresence>
        {expired && (
          <span className="text-xs text-foreground/40">
            Puoi ancora completare la tappa
          </span>
        )}
      </div>

      {/* Extend button */}
      <button
        onClick={handleExtend}
        className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-foreground/60 hover:text-foreground transition-colors"
        title={`Aggiungi ${EXTEND_MINUTES} minuti`}
      >
        <Plus size={14} />
        {EXTEND_MINUTES}m
      </button>
    </div>
  );
}
