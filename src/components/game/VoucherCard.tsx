"use client";

import { motion } from "framer-motion";
import { Gift, ExternalLink } from "lucide-react";

interface VoucherCardProps {
  description: string;
  partner: string | null;
}

export function VoucherCard({ description, partner }: VoucherCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/10 to-accent/5 p-5 flex gap-4 items-start"
    >
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
    </motion.div>
  );
}
