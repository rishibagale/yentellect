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
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        {/* Header area */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            {hasData ? "Your cognitive dashboard" : "Welcome to Yentellect"}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {hasData
              ? `${fp.total_sessions} sessions · ${fp.domains.length} domains explored`
              : "Start your first session to begin training."}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          {/* Left column: Fingerprint + Recent sessions */}
          <div className="space-y-6">
            {/* Cognitive Fingerprint */}
            {fp && fp.scores.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass-card-strong p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-white">Cognitive fingerprint</h2>
                  {fp.improvement_rate !== 0 && (
                    <span
                      className={`text-xs font-mono ${
                        fp.improvement_rate > 0 ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {fp.improvement_rate > 0 ? "+" : ""}
                      {Math.round(fp.improvement_rate * 100)}% improvement
                    </span>
                  )}
                </div>
                <CognitiveFingerprint scores={fp.scores} size={340} />

                {/* Mode score legend */}
                <div className="grid grid-cols-3 gap-2 mt-4">
                  {fp.scores.map((s) => (
                    <div key={s.mode} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="text-[11px] text-slate-400">{s.label}</span>
                      <span className="text-[11px] font-mono text-slate-300 ml-auto">
                        {s.score}%
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Recent sessions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-white">Recent sessions</h2>
                {data?.recent_sessions && data.recent_sessions.length > 0 && (
                  <button
                    onClick={() => router.push("/history")}
                    className="text-xs text-indigo-400 hover:text-indigo-300 transition"
                  >
                    View all
                  </button>
                )}
              </div>

              {(!data?.recent_sessions || data.recent_sessions.length === 0) ? (
                <div className="glass-card p-8 text-center">
                  <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-medium text-white mb-1">No sessions yet</h3>
                  <p className="text-xs text-slate-500 mb-4">Start your first cognitive training session.</p>
                  <button
                    onClick={() => router.push("/session")}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-medium hover:opacity-90 transition shadow-lg shadow-indigo-500/20"
                  >
                    Start session
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {data.recent_sessions.slice(0, 5).map((s, i) => (
                    <SessionCard key={s.session_id} session={s} index={i} />
                  ))}
                </div>
              )}
            </motion.div>
          </div>

          {/* Right column: Stats + Suggestion */}
          <div className="space-y-4">
            {/* Streak card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className="glass-card-strong p-5"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full ${data?.streak_days && data.streak_days > 0 ? "bg-amber-500/20" : "bg-slate-500/10"} flex items-center justify-center`}>
                  <svg className={`w-5 h-5 ${data?.streak_days && data.streak_days > 0 ? "text-amber-400" : "text-slate-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                  </svg>
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono text-white">
                    {data?.streak_days || 0}
                  </div>
                  <div className="text-[11px] text-slate-500">day streak</div>
                </div>
              </div>
            </motion.div>

            {/* Training suggestion */}
            {suggestion && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="glass-card-strong p-5"
                style={{
                  borderColor: `${getModeColor(suggestion.suggested_mode as ThinkingMode)}30`,
                }}
              >
                <div className="text-xs uppercase tracking-wider text-slate-500 mb-3">
                  Today's training
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <ModeBadge mode={suggestion.suggested_mode as ThinkingMode} size="lg" />
                </div>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  {suggestion.reason}
                </p>
                <button
                  onClick={() => router.push("/session")}
                  className="w-full py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-medium hover:opacity-90 transition shadow-lg shadow-indigo-500/20"
                >
                  Start training
                </button>
              </motion.div>
            )}

            {/* Stats summary */}
            {hasData && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 }}
                className="glass-card-strong p-5 space-y-3"
              >
                <div className="text-xs uppercase tracking-wider text-slate-500">Stats</div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Dominant</span>
                    <span className="text-xs font-medium" style={{ color: fp ? getModeColor(fp.dominant as ThinkingMode) : "#94a3b8" }}>
                      {fp ? getModeName(fp.dominant as ThinkingMode) : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Weakest</span>
                    <span className="text-xs font-medium" style={{ color: fp ? getModeColor(fp.weakest as ThinkingMode) : "#94a3b8" }}>
                      {fp ? getModeName(fp.weakest as ThinkingMode) : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Concepts</span>
                    <span className="text-xs font-mono text-slate-300">{fp?.total_concepts || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Connections</span>
                    <span className="text-xs font-mono text-slate-300">{fp?.total_connections || 0}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}