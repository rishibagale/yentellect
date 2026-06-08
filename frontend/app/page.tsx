"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ThinkingMode, getModeColor, getModeName } from "@/lib/api";

const MODES: { mode: ThinkingMode; tagline: string }[] = [
  { mode: "CONVERGENT", tagline: "Focus & precision" },
  { mode: "DIVERGENT", tagline: "Creative generation" },
  { mode: "ANALOGICAL", tagline: "Cross-domain mapping" },
  { mode: "METACOGNITIVE", tagline: "Think about thinking" },
  { mode: "SYSTEMS", tagline: "Causal chains" },
  { mode: "DMN", tagline: "Open insight" },
];

const PROMPTS = [
  "What assumption am I making that might not hold?",
  "How would someone from a totally different field solve this?",
  "What's the weakest link in my reasoning?",
  "Why might I be wrong about this?",
  "What pattern connects this to something else I know?",
  "If I had to teach this to a child, what's the core idea?",
];

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [opening, setOpening] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promptIdx, setPromptIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setPromptIdx((i) => (i + 1) % PROMPTS.length), 4000);
    return () => clearInterval(t);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!opening.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const userId = name.trim() || `user-${Date.now()}`;
      sessionStorage.setItem("yentellect_user_id", userId);
      sessionStorage.setItem("yentellect_user_name", name.trim());
      sessionStorage.setItem("yentellect_opening", opening.trim());
      router.push(`/session?user_id=${encodeURIComponent(userId)}`);
    } catch (err: any) {
      setError(err?.message || "Failed to start session");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col bg-[#0a0a0b] text-slate-100">
      {/* Animated background */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: "1.5s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-pink-600/10 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.1),transparent_50%)]" />
      </div>

      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-white/5 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <span className="font-bold text-lg">Yentellect</span>
        </div>
        <div className="text-xs text-slate-500 hidden sm:block">
          A cognitive development system
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-3xl w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-4">
              Think{" "}
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                better
              </span>
              ,<br />
              not just smarter.
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Yentellect detects how you think, identifies your weakest cognitive mode, and runs adaptive Socratic sessions that train it.
              <span className="text-slate-500"> Not a chat wrapper. A thinking gym.</span>
            </p>
          </motion.div>

          {/* Rotating prompt chips */}
          <div className="text-center mb-6 h-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={promptIdx}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="text-sm text-slate-500 italic"
              >
                Try asking: "{PROMPTS[promptIdx]}"
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Form */}
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-6 space-y-5"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <label className="block text-xs font-medium text-slate-400 mb-2">
                  Name <span className="text-slate-600">(optional)</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex"
                  maxLength={100}
                  className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-400 mb-2">
                  What are you trying to think through?
                </label>
                <textarea
                  value={opening}
                  onChange={(e) => setOpening(e.target.value.slice(0, 2000))}
                  placeholder="A problem, idea, or question on your mind…"
                  rows={3}
                  required
                  className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition resize-none text-sm"
                />
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !opening.trim()}
              className="w-full py-3 px-6 rounded-lg bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-semibold hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
            </button>
          </motion.form>

          {/* Six thinking modes */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-12"
          >
            <div className="text-center text-xs uppercase tracking-wider text-slate-500 mb-4">
              The six thinking modes we train
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {MODES.map((m, i) => (
                <motion.div
                  key={m.mode}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.5 + i * 0.05 }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-white/10 transition"
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: getModeColor(m.mode) }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-200">{getModeName(m.mode)}</div>
                    <div className="text-xs text-slate-500 truncate">{m.tagline}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
