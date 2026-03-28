"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Map, Trophy, User, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function BottomNav() {
  const pathname = usePathname();
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setLoggedIn(!!session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, sess) => setLoggedIn(!!sess));
    return () => subscription.unsubscribe();
  }, []);

  // Hide during game play and auth/onboarding
  if (pathname.includes("/play/session") || pathname === "/" || pathname === "/onboarding") return null;

  const NAV_ITEMS = [
    { href: loggedIn ? "/home" : "/", icon: Home, label: "Home" },
    { href: "/marketplace", icon: Map, label: "Esplora" },
    { href: "/plan/new", icon: Plus, label: "Crea", isCreate: true },
    { href: "/leaderboard", icon: Trophy, label: "Classifica" },
    { href: "/profile", icon: User, label: "Profilo" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 glass border-t border-glass-border safe-area-pb">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {NAV_ITEMS.map(({ href, icon: Icon, label, isCreate }) => {
          const isActive = pathname === href || (href === "/home" && pathname === "/");

          if (isCreate) {
            return (
              <Link key={href} href={href}
                className="-mt-6 w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/30">
                <Icon size={24} />
              </Link>
            );
          }

          return (
            <Link key={href} href={href}
              className={`flex flex-col items-center gap-0.5 text-xs transition-colors ${isActive ? "text-primary" : "text-foreground/40 hover:text-foreground/60"}`}>
              <Icon size={20} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
