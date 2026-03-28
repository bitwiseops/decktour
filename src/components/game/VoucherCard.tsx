"use client";

import { motion } from "framer-motion";
import { Gift, ExternalLink, MapPin, Copy, Check } from "lucide-react";
import { useState } from "react";

interface VoucherCardProps {
  description: string;
  partner: string | null;
  code: string | null;
  validityRadius: number;
}

export function VoucherCard({ description, partner, code, validityRadius }: VoucherCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  };

  const radiusLabel = validityRadius >= 1000
    ? `${(validityRadius / 1000).toFixed(1)} km`
    : `${validityRadius} m`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/10 to-accent/5 p-5 flex flex-col gap-4"
    >
      <div className="flex gap-4 items-start">
        <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center shrink-0">
          <Gift size={24} className="text-accent" />
        </div>
        <div className="flex-1">
          <p className="text-xs font-medium text-accent mb-1">Voucher sbloccato!</p>
          <p className="text-sm text-foreground/80">{description}</p>
          {partner && (
            <p className="text-xs text-foreground/50 mt-1 flex items-center gap-1">
              <ExternalLink size={12} /> {partner}
            </p>
          )}
        </div>
      </div>

      {code && (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-white/5 border border-white/10 px-4 py-3">
          <span className="font-mono text-lg font-bold tracking-widest text-accent">{code}</span>
          <button
            onClick={handleCopyCode}
            className="p-2 rounded-lg bg-accent/10 hover:bg-accent/20 transition-colors"
            aria-label="Copia codice"
          >
            {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} className="text-accent" />}
          </button>
        </div>
      )}

      <p className="text-xs text-foreground/40 flex items-center gap-1">
        <MapPin size={12} /> Valido entro {radiusLabel} dalla tappa
      </p>
    </motion.div>
  );
}
