"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Compass, Sparkles, MapPin, Trophy } from "lucide-react";

const STEPS = [
  { icon: <Sparkles size={28} />, title: "Crea il tuo profilo", desc: "Dicci cosa ami: cibo, arte, shopping, natura o nightlife" },
  { icon: <MapPin size={28} />, title: "Genera il mazzo", desc: "L'AI crea carte con luoghi reali, quiz e missioni per la tua città" },
  { icon: <Trophy size={28} />, title: "Gioca la città", desc: "Esplora i luoghi, fai check-in GPS, rispondi ai quiz e guadagna punti" },
];

export default function HomePage() {
  return (
    <div className="flex flex-col items-center px-4 pt-12 pb-8 max-w-lg mx-auto">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.1 }}
          className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-6"
        >
          <Compass size={40} className="text-primary" />
        </motion.div>
        <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-primary via-primary-light to-accent bg-clip-text text-transparent">
          Deck Tour
        </h1>
        <p className="text-foreground/60 text-lg">
          Trasforma il tuo viaggio in un gioco a carte
        </p>
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col gap-3 w-full mb-12"
      >
        <Link
          href="/onboarding"
          className="w-full py-4 rounded-xl bg-primary text-white text-center font-semibold text-lg hover:bg-primary-light transition-colors shadow-lg shadow-primary/25"
        >
          Inizia l&apos;avventura
        </Link>
        <Link
          href="/marketplace"
          className="w-full py-3 rounded-xl border border-glass-border text-foreground/70 text-center hover:text-foreground hover:border-foreground/30 transition-all"
        >
          Esplora i piani
        </Link>
      </motion.div>

      {/* How it works */}
      <div className="w-full">
        <h2 className="text-sm font-medium text-foreground/40 uppercase tracking-wider mb-6">Come funziona</h2>
        <div className="flex flex-col gap-4">
          {STEPS.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="glass rounded-xl p-4 flex gap-4 items-start"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0 text-primary">
                {step.icon}
              </div>
              <div>
                <h3 className="font-semibold mb-1">{step.title}</h3>
                <p className="text-sm text-foreground/50">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
