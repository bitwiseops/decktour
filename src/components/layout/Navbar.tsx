"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Compass, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

export function Navbar() {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setLoggedIn(!!session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, sess) => setLoggedIn(!!sess));
    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  return (
    <header className="sticky top-0 z-40 glass border-b border-glass-border">
      <div className="flex items-center justify-between h-14 px-4 max-w-2xl mx-auto">
        <Link href={loggedIn ? "/home" : "/"} className="flex items-center gap-2 font-bold text-lg">
          <Compass size={22} className="text-primary" />
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Deck Tour
          </span>
        </Link>
        {loggedIn && (
          <button onClick={handleLogout} className="text-foreground/40 hover:text-danger transition-colors p-1.5">
            <LogOut size={18} />
          </button>
        )}
      </div>
    </header>
  );
}

