"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { MoodSwiper } from "@/components/game/MoodSwiper";
import { MoodRadar } from "@/components/game/MoodRadar";
import { useMoodProfile } from "@/hooks/useMoodProfile";
import { ArrowRight } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const { currentComparison, currentIndex, progress, total, completed, moodProfile, setValue, next, prev } = useMoodProfile();
  const [showRadar, setShowRadar] = useState(false);

  const handleNext = () => {
    next();
    if (currentIndex === total - 1) {
      setTimeout(() => setShowRadar(true), 300);
    }
  };

  const handleContinue = () => {
    // Store mood profile in localStorage for now (will use Supabase with auth)
    localStorage.setItem("deckTourMoodProfile", JSON.stringify(moodProfile));
    router.push("/plan/new");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] px-4 py-8 max-w-lg mx-auto">
      <AnimatePresence mode="wait">
        {!completed && !showRadar && currentComparison && (
          <motion.div key="swiper" exit={{ opacity: 0, scale: 0.9 }} className="w-full">
            <h1 className="text-2xl font-bold text-center mb-2">Il tuo profilo mood</h1>
            <p className="text-foreground/50 text-center mb-8">Muovi lo slider verso ciò che preferisci</p>
            <MoodSwiper
              comparison={currentComparison}
              index={currentIndex}
              total={total}
              onValueChange={setValue}
              onNext={handleNext}
              onPrev={prev}
              canGoBack={currentIndex > 0}
            />
          </motion.div>
        )}

        {(completed || showRadar) && (
          <motion.div
            key="radar"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full flex flex-col items-center gap-6"
          >
            <h1 className="text-2xl font-bold text-center">Ecco il tuo profilo!</h1>
            <p className="text-foreground/50 text-center">Questo è il tuo DNA da viaggiatore</p>
            <MoodRadar profile={moodProfile} size={320} />
            <button
              onClick={handleContinue}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary-light transition-colors"
            >
              Crea il tuo piano
              <ArrowRight size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
