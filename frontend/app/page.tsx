"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
} from "framer-motion";
import { useSupabase } from "@/utils/supabase/provider";
import { MODES, ANIMATION } from "@/lib/tokens";
import Link from "next/link";

const PROMPTS = [
  "What assumption am I making that might not hold?",
  "How would someone from a totally different field solve this?",
  "What's the weakest link in my reasoning?",
  "Why might I be wrong about this?",
  "What pattern connects this to something else I know?",
  "If I had to teach this to a child, what's the core idea?",
];

const ROTATING_PROMPTS = [
  "Solve harder problems.",
  "Uncover blind spots.",
  "Strengthen weak modes.",
  "Think across domains.",
  "See the system.",
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.15 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { ...ANIMATION.ease } },
};

const heroText = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.03, delayChildren: 0.2 },
  },
};

const letterVariant = {
  hidden: { opacity: 0, y: 40, rotateX: -40 },
  show: { opacity: 1, y: 0, rotateX: 0, transition: { ...ANIMATION.ease } },
};

export default function Home() {
  const router = useRouter();
  const { user, isLoading } = useSupabase();
  const [name, setName] = useState("");
  const [opening, setOpening] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promptIdx, setPromptIdx] = useState(0);
  const [rotatingIdx, setRotatingIdx] = useState(0);
  const [hoveredMode, setHoveredMode] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 100]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  // Redirect logged-in users to dashboard
  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/dashboard");
    }
  }, [user, isLoading, router]);

  // Rotating prompt interval
  useEffect(() => {
    const t = setInterval(() => setPromptIdx((i) => (i + 1) % PROMPTS.length), 4000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setRotatingIdx((i) => (i + 1) % ROTATING_PROMPTS.length), 3000);
    return () => clearInterval(t);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!opening.trim()) return;
    if (!user) {
      router.push(`/auth/login?redirect=${encodeURIComponent("/session")}`);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      sessionStorage.setItem("yentellect_opening", opening.trim());
      router.push("/session");
    } catch (err: any) {
      setError(err?.message || "Failed to start session");
      setLoading(false);
    }
  };

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render the hero if redirecting (user is logged in)
  if (user) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Taking you to your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex flex-col bg-surface text-slate-100 overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/4 -left-48 w-[500px] h-[500px] rounded-full blur-3xl"
          style={{ backgroundColor: "rgba(99, 102, 241, 0.12)" }}
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-1/4 -right-48 w-[500px] h-[500px] rounded-full blur-3xl"
          style={{ backgroundColor: "rgba(139, 92, 246, 0.12)" }}
          animate={{ x: [0, -30, 0], y: [0, 20, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_80%,rgba(99,102,241,0.08),transparent_60%)]" />
      </div>

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="sticky top-0 z-40 bg-surface/70 backdrop-blur-xl border-b border-white/5"
      >
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
          <motion.div className="flex items-center gap-2.5" whileHover={{ scale: 1.02 }}>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <span className="font-semibold text-base tracking-tight">Yentellect</span>
          </motion.div>

          <div className="flex items-center gap-2">
            <Link
              href="/auth/login"
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition"
            >
              Sign in
            </Link>
            <Link
              href="/auth/signup"
              className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-medium hover:opacity-90 transition shadow-lg shadow-indigo-500/20"
            >
              Sign up
            </Link>
          </div>
        </div>
      </motion.header>

      {/* Hero section */}
      <section ref={heroRef} className="relative flex-1 flex items-center justify-center px-4 py-8 md:py-12">
        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="max-w-4xl w-full">
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="text-center mb-8 md:mb-10"
          >
            <motion.div variants={item} className="flex items-center justify-center gap-2 mb-4">
              <div className="h-px w-8 bg-gradient-to-r from-transparent to-slate-600" />
              <span className="text-[10px] uppercase tracking-[0.15em] text-slate-500 font-medium">
                Cognitive Development System
              </span>
              <div className="h-px w-8 bg-gradient-to-l from-transparent to-slate-600" />
            </motion.div>

            <motion.h1
              variants={item}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-4"
            >
              <motion.span
                variants={heroText}
                initial="hidden"
                animate="show"
                className="inline-flex flex-wrap justify-center gap-x-3"
              >
                {"Think better".split(" ").map((word, wi) => (
                  <span key={wi} className="inline-flex">
                    {word.split("").map((letter, li) => (
                      <motion.span
                        key={`${wi}-${li}`}
                        variants={letterVariant}
                        className="inline-block"
                      >
                        {letter}
                      </motion.span>
                    ))}
                  </span>
                ))}
                {",".split("").map((letter, li) => (
                  <motion.span
                    key={`comma-${li}`}
                    variants={letterVariant}
                    className="inline-block text-slate-400"
                  >
                    {letter}
                  </motion.span>
                ))}
              </motion.span>
              <br />
              <span className="gradient-text">not just smarter.</span>
            </motion.h1>

            <motion.p
              variants={item}
              className="text-base md:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed"
            >
              Yentellect detects how you think, identifies your weakest cognitive mode,
              and runs adaptive Socratic sessions that train it.
            </motion.p>

            <motion.div variants={item} className="mt-3 h-6">
              <AnimatePresence mode="wait">
                <motion.span
                  key={rotatingIdx}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                  className="text-sm text-slate-500 italic font-mono"
                >
                  Not a chat wrapper. {ROTATING_PROMPTS[rotatingIdx]}
                </motion.span>
              </AnimatePresence>
            </motion.div>
          </motion.div>

          {/* Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
          >
            <form
              ref={formRef}
              onSubmit={handleSubmit}
              className="glass-card-strong p-5 md:p-6 space-y-4 mx-auto max-w-2xl"
            >
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="sm:w-1/3">
                    <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                      Name
                      <span className="text-slate-600 font-normal normal-case"> (optional)</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      maxLength={100}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-white/5 border border-white/10 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition text-sm"
                    />
                  </div>
                  <div className="sm:flex-1">
                    <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                      What are you thinking through?
                    </label>
                    <textarea
                      value={opening}
                      onChange={(e) => setOpening(e.target.value.slice(0, 2000))}
                      placeholder="A problem, idea, or question on your mind…"
                      rows={2}
                      required
                      className="w-full px-3.5 py-2.5 rounded-lg bg-white/5 border border-white/10 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition resize-none text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="text-center h-5">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={promptIdx}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.25 }}
                    className="text-xs text-slate-500 italic"
                  >
                    Try: &ldquo;{PROMPTS[promptIdx]}&rdquo;
                  </motion.div>
                </AnimatePresence>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-lg"
                >
                  {error}
                </motion.div>
              )}

              <motion.button
                type="submit"
                disabled={loading || !opening.trim()}
                className="w-full py-3 px-6 rounded-lg bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-semibold hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 text-sm"
                whileHover={!loading && opening.trim() ? { scale: 1.01 } : {}}
                whileTap={!loading && opening.trim() ? { scale: 0.99 } : {}}
              >
                {loading ? (
                  <>
                    <motion.div
                      className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                    Starting session…
                  </>
                ) : (
                  <>
                    Begin Training
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </motion.button>
            </form>
          </motion.div>

          {/* Mode explorer */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5, ease: "easeOut" }}
            className="mt-10 md:mt-12 max-w-3xl mx-auto"
          >
            <div className="text-center mb-4">
              <span className="text-[10px] uppercase tracking-[0.15em] text-slate-500 font-medium">
                The six thinking modes we train
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {MODES.map((mode, i) => (
                <motion.div
                  key={mode.mode}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.6 + i * 0.06 }}
                  onMouseEnter={() => setHoveredMode(mode.mode)}
                  onMouseLeave={() => setHoveredMode(null)}
                  className={`relative group flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all duration-200 cursor-default ${
                    hoveredMode === mode.mode
                      ? "border-white/15 bg-white/[0.06]"
                      : "border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10"
                  }`}
                  style={
                    hoveredMode === mode.mode
                      ? { boxShadow: `0 0 20px ${mode.color}15` }
                      : {}
                  }
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0 transition-transform duration-200"
                    style={{
                      backgroundColor: mode.color,
                      transform: hoveredMode === mode.mode ? "scale(1.3)" : "scale(1)",
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-sm font-medium transition-colors"
                      style={{
                        color: hoveredMode === mode.mode ? mode.color : "rgb(226 232 240)",
                      }}
                    >
                      {mode.name}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {mode.tagline}
                    </div>
                  </div>
                  <motion.span
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{
                      opacity: hoveredMode === mode.mode ? 1 : 0,
                      scale: hoveredMode === mode.mode ? 1 : 0.5,
                    }}
                    transition={{ duration: 0.15 }}
                    className="text-sm"
                  >
                    {mode.emoji}
                  </motion.span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </section>
    </main>
  );
}