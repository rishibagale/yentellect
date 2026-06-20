"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/utils/supabase/provider";
import { getDashboard, getModeColor, getModeName, type DashboardData, type ThinkingMode } from "@/lib/api";
import AppShell from "@/components/AppShell";
import CognitiveFingerprint from "@/components/CognitiveFingerprint";
import SessionCard from "@/components/SessionCard";
import LoadingState from "@/components/LoadingState";
import ModeBadge from "@/components/ModeBadge";

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useSupabase();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getDashboard(user.id)
      .then(setData)
      .catch((err) => setError(err?.message || "Failed to load dashboard"))
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) return <AppShell><LoadingState message="Loading your cognitive dashboard…" /></AppShell>;

  if (error) return (
    <AppShell>
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.054 0 1.954-.84 1.954-1.87V7.87c0-1.03-.9-1.87-1.954-1.87H5.054C4 6 3.1 6.84 3.1 7.87v8.26c0 1.03.9 1.87 1.954 1.87z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">Could not load dashboard</h2>
          <p className="text-sm text-slate-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-400 transition"
          >
            Retry
          </button>
        </div>
      </div>
    </AppShell>
  );

  const fp = data?.fingerprint;
  const suggestion = data?.daily_suggestion;
  const hasData = fp && fp.total_sessions > 0;

  return (
    <AppShell>
      <div className="min-h-screen">
        {/* Hero: Cognitive Fingerprint */}
        <section className="relative border-b border-white/5 bg-gradient-to-b from-indigo-500/[0.03] to-transparent">
          <div className="max-w-7xl mx-auto px-4 md:px-6 pt-8 pb-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col lg:flex-row lg:items-center gap-8 lg:gap-12"
            >
              {/* Left: Title + key metrics */}
              <div className="flex-1 space-y-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-medium mb-2">Dashboard</p>
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight">
                    {hasData ? "Your cognitive fingerprint" : "Welcome to Yentellect"}
                  </h1>
                  <p className="text-sm text-slate-400 mt-2 max-w-lg">
                    {hasData
                      ? `${fp.total_sessions} sessions recorded across ${fp.domains.length} domains`
                      : "Begin training to visualize your thinking profile."}
                  </p>
                </div>

                <div className="flex flex-wrap gap-4">
                  {fp && fp.scores.length > 0 && (
                    <>
                      <div className="px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10">
                        <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">Streak</div>
                        <div className="text-xl font-bold font-mono text-white">
                          {data?.streak_days || 0} <span className="text-sm text-slate-500 font-sans">days</span>
                        </div>
                      </div>
                      <div className="px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10">
                        <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">Dominant</div>
                        <div className="text-xl font-bold font-mono" style={{ color: getModeColor((fp.dominant || "CONVERGENT") as ThinkingMode) }}>
                          {getModeName((fp.dominant || "CONVERGENT") as ThinkingMode)}
                        </div>
                      </div>
                      <div className="px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10">
                        <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">Score</div>
                        <div className="text-xl font-bold font-mono text-emerald-400">
                          {fp.scores.length > 0 ? Math.round(fp.scores.reduce((a, b) => a + b.score, 0) / fp.scores.length) + '%' : '—'}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {suggestion && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="inline-flex items-start gap-3 px-4 py-3 rounded-xl border border-white/10 bg-white/[0.02]"
                    style={{
                      borderColor: `${getModeColor(suggestion.suggested_mode as ThinkingMode)}30`,
                    }}
                  >
                    <div className="flex-1">
                      <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Today’s training</div>
                      <p className="text-xs text-slate-400 leading-relaxed">{suggestion.reason}</p>
                    </div>
                    <ModeBadge mode={suggestion.suggested_mode as ThinkingMode} size="sm" />
                  </motion.div>
                )}
              </div>

              {/* Right: Radar chart - dominant focal point */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                className="flex-shrink-0 mx-auto lg:mx-0"
              >
                {fp && fp.scores.length > 0 ? (
                  <div className="relative">
                    <div className="absolute inset-0 bg-indigo-500/10 blur-3xl rounded-full" />
                    <CognitiveFingerprint scores={fp.scores} size={380} />
                  </div>
                ) : (
                  <div className="w-[380px] h-[380px] rounded-full border border-white/5 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-xs text-slate-600 mb-1">No data yet</div>
                      <button
                        onClick={() => router.push("/session")}
                        className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-medium hover:opacity-90 transition"
                      >
                        Start first session
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Recent sessions */}
        <section className="max-w-7xl mx-auto px-4 md:px-6 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-semibold text-white">Recent sessions</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {hasData ? `${fp.total_sessions} total` : "No sessions yet"}
                </p>
              </div>
              {data?.recent_sessions && data.recent_sessions.length > 0 && (
                <button
                  onClick={() => router.push("/history")}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition font-medium"
                >
                  View all →
                </button>
              )}
            </div>

            {(!data?.recent_sessions || data.recent_sessions.length === 0) ? (
              <div className="glass-card p-10 text-center">
                <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-white mb-1">No sessions yet</h3>
                <p className="text-xs text-slate-500 mb-5">Start your first cognitive training session to see your progress.</p>
                <button
                  onClick={() => router.push("/session")}
                  className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-medium hover:opacity-90 transition shadow-lg shadow-indigo-500/20"
                >
                  Begin training
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.recent_sessions.slice(0, 6).map((s, i) => (
                  <SessionCard key={s.session_id} session={s} index={i} />
                ))}
              </div>
            )}
          </motion.div>
        </section>
      </div>
    </AppShell>
  );
}