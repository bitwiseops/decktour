"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Compass, Loader2, Mail, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "email-login" | "email-signup">("idle");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const redirectingRef = useRef(false);

  // Listen for auth state changes — catches both existing sessions and implicit-flow
  // tokens delivered via URL hash (which getSession() misses if called too early).
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user && !redirectingRef.current) {
          redirectingRef.current = true;
          await redirectAfterLogin(session.user.id);
        } else if (event === "INITIAL_SESSION" && !session) {
          setChecking(false);
        }
      }
    );
    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function redirectAfterLogin(userId: string) {
    const { data: profile } = await supabase
      .from("player_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (profile) {
      router.replace("/home");
    } else {
      router.replace("/onboarding");
    }
  }

  async function handleGoogleLogin() {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) { setError(error.message); setLoading(false); }
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === "email-signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setError("Controlla la tua email per confermare la registrazione.");
        setLoading(false);
        return;
      }
      // login
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.session) await redirectAfterLogin(data.session.user.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Errore di autenticazione");
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] px-4 py-8 max-w-sm mx-auto">
      {/* Logo */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
        <div className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-5">
          <Compass size={40} className="text-primary" />
        </div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary-light to-accent bg-clip-text text-transparent mb-2">
          Deck Tour
        </h1>
        <p className="text-foreground/60 text-base">Trasforma il viaggio in un gioco a carte</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="flex flex-col gap-3 w-full">
        {/* Google */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl bg-white text-gray-800 font-semibold hover:bg-gray-100 transition-colors shadow"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : (
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2a10.34 10.34 0 0 0-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26A5.43 5.43 0 0 1 9 14.5a5.42 5.42 0 0 1-5.1-3.73H.94v2.33A9 9 0 0 0 9 18z"/>
              <path fill="#FBBC05" d="M3.9 10.77A5.45 5.45 0 0 1 3.6 9c0-.62.1-1.22.3-1.77V4.9H.94A9 9 0 0 0 0 9c0 1.45.35 2.82.94 4.1l2.96-2.33z"/>
              <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 9 0a9 9 0 0 0-8.06 4.9L3.9 7.23A5.42 5.42 0 0 1 9 3.58z"/>
            </svg>
          )}
          Accedi con Google
        </button>

        {/* Email */}
        <AnimatePresence mode="wait">
          {mode === "idle" && (
            <motion.button
              key="email-btn"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMode("email-login")}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl glass border border-glass-border text-foreground/80 font-medium hover:border-primary/50 transition-colors"
            >
              <Mail size={18} /> Accedi con Email
            </motion.button>
          )}

          {(mode === "email-login" || mode === "email-signup") && (
            <motion.form
              key="email-form"
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              onSubmit={handleEmailSubmit}
              className="flex flex-col gap-3"
            >
              <div className="flex gap-2 glass rounded-xl p-1">
                <button type="button" onClick={() => setMode("email-login")}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${mode === "email-login" ? "bg-primary text-white" : "text-foreground/50"}`}>
                  Accedi
                </button>
                <button type="button" onClick={() => setMode("email-signup")}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${mode === "email-signup" ? "bg-primary text-white" : "text-foreground/50"}`}>
                  Registrati
                </button>
              </div>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="Email" required
                className="w-full px-4 py-3 rounded-xl glass border border-glass-border text-foreground placeholder:text-foreground/30"
              />
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password" required minLength={6}
                  className="w-full px-4 py-3 pr-11 rounded-xl glass border border-glass-border text-foreground placeholder:text-foreground/30"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40">
                  {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3.5 rounded-xl bg-primary text-white font-semibold hover:bg-primary-light transition-colors flex items-center justify-center gap-2">
                {loading && <Loader2 size={16} className="animate-spin" />}
                {mode === "email-signup" ? "Crea account" : "Accedi"}
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        {error && (
          <p className={`text-sm text-center rounded-xl px-4 py-3 glass ${error.includes("email") ? "text-accent" : "text-danger"}`}>{error}</p>
        )}

      </motion.div>
    </div>
  );
}
