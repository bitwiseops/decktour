"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { BookOpen } from "lucide-react";

interface TravelDiaryProps {
  planId: string;
  cards: { title: string; description: string }[];
  city: string;
  numDays: number;
  onComplete: (diary: string) => void;
}

export default function TravelDiary({ planId, cards, city, numDays, onComplete }: TravelDiaryProps) {
  const [text, setText] = useState("");
  const [done, setDone] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function streamDiary() {
      try {
        const res = await fetch("/api/ai/diary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cards, city, numDays }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          throw new Error("Stream failed");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullText = "";

        while (true) {
          const { done: readerDone, value } = await reader.read();
          if (readerDone) break;

          const chunk = decoder.decode(value, { stream: true });
          fullText += chunk;
          setText(fullText);
        }

        setDone(true);

        // Save diary as plan description
        await fetch(`/api/plans/${planId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description: fullText }),
        });

        onComplete(fullText);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("Diary stream error:", err);
          setDone(true);
          onComplete("");
        }
      }
    }

    streamDiary();
    return () => controller.abort();
  }, [planId, cards, city, numDays, onComplete]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [text]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <div className="flex items-center gap-2 text-sm text-foreground/50 mb-3">
        <BookOpen size={16} />
        <span>Diario del Futuro</span>
      </div>

      <div
        ref={containerRef}
        className="glass rounded-xl p-5 min-h-[120px] relative overflow-hidden"
      >
        {text ? (
          <p className="text-foreground/90 leading-relaxed italic text-sm">
            &ldquo;{text}
            {!done && (
              <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, repeatType: "reverse" }}
                className="inline-block w-0.5 h-4 bg-primary ml-0.5 align-text-bottom"
              />
            )}
            {done && <>&rdquo;</>}
          </p>
        ) : (
          <div className="flex items-center gap-2 text-foreground/30 text-sm">
            <motion.span
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              L&apos;AI sta scrivendo il tuo diario di viaggio...
            </motion.span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
