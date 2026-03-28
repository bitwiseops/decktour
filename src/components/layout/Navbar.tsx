"use client";

import Link from "next/link";
import { Compass } from "lucide-react";

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 glass border-b border-glass-border">
      <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <Compass size={22} className="text-primary" />
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Deck Tour
          </span>
        </Link>
      </div>
    </header>
  );
}
