"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { motion } from "framer-motion";
import { useSearchParams, useRouter } from "next/navigation";
import {
  getProfile,
  getGraph,
  getProfileMetrics,
  CognitiveProfile,
  D3GraphData,
  getModeColor,
  getModeName,
} from "@/lib/api";
import { MODE_PALETTES, ANIMATION } from "@/lib/tokens";
import KnowledgeGraph from "@/components/KnowledgeGraph";
import ProgressChart from "@/components/ProgressChart";
import Header from "@/components/Header";
import ErrorState from "@/components/ErrorState";
import { useSupabase } from "@/utils/supabase/provider";

function ProfileSkeleton() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0b] text-slate-100">
      <Header />
      <main className="flex-1 px-4 md:px-6 py-6 max-w-7xl w-full mx-auto">
        <div className="animate-pulse">
          <div className="w-64 h-8 bg-white/5 rounded mb-2" />
          <div className="w-40 h-4 bg-white/5 rounded mb-6" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[1,2,3,4].map(i => (
              <div key={i} className="bg-white/5 rounded-2xl p-4 h-24" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white/5 rounded-2xl h-80" />
            <div className="bg-white/5 rounded-2xl h-80" />
          </div>
        </div>
      </main>
    </div>
  );
}

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useSupabase();
  const userId =
    user?.id ||
    searchParams.get("user_id") ||
    (typeof window !== "undefined" ? sessionStorage.getItem("yentellect_user_id") : null) ||
    "demo-user";

  const [profile, setProfile] = useState<CognitiveProfile | null>(null);
  const [graphData, setGraphData] = useState<D3GraphData | null>(null);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, g, m] = await Promise.all([
        getProfile(userId),
        getGraph(userId),
        getProfileMetrics(userId, 20),
      ]);
      setProfile(p);
      setGraphData(g);
      setMetrics(m.metrics || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load, retryKey]);

  if (loading) return <ProfileSkeleton />;
  if (error)
    return (
      <ErrorState
        title="Could not load profile"
        message={error}
        onRetry={() => setRetryKey((k) => k + 1)}
      />
    );

  const stats = [
    { label: "Sessions", value: profile?.session_count ?? 0, icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" },
    { label: "Concepts", value: profile?.nodes?.length ?? 0, icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" },
    { label: "Connections", value: profile?.edges?.length ?? 0, icon: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" },
    { label: "Domains", value: profile ? new Set((profile.nodes||[]).map((n) => n.domain)).size : 0, icon: "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0b] text-slate-100">
      <Header />
      <main className="flex-1 px-4 md:px-6 py-6 max-w-7xl w-full mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            {profile?.name?.trim() || "Your cognitive profile"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">A snapshot of how you think and what you
            know.
          </p>
        </div>

        {/* Stats grid with animated counters */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6"
        >
          {stats.map((s, i) => (
            <motion.div
              key={i}
              variants={{
                hidden: { opacity: 0, y: 15 },
                show: { opacity: 1, y: 0, transition: { ...ANIMATION.ease } },
              }}
              className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-4 hover:bg-white/[0.05] hover:border-white/15 transition-all duration-200"
            >
              <div className="flex items-center gap-1.5 text-xs text-slate-500 uppercase tracking-wider mb-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
                </svg>
                {s.label}
              </div>
              <motion.div
                className="text-2xl md:text-3xl font-bold text-white"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1, duration: 0.4, ease: "easeOut" }}
              >
                {s.value}
              </motion.div>
            </motion.div>
          ))}
        </motion.div>

        {/* Mode cards with animated entrance */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } } }}
          className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6"
        >
          <motion.div
            variants={{
              hidden: { opacity: 0, x: -20 },
              show: { opacity: 1, x: 0, transition: { ...ANIMATION.ease } },
            }}
            className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-5"
          >
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-500 mb-2">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Dominant mode
            </div>
            <div
              className="text-xl md:text-2xl font-bold"
              style={{ color: profile?.dominant_mode ? getModeColor(profile.dominant_mode) : "#94a3b8" }}
            >
              {profile?.dominant_mode ? getModeName(profile.dominant_mode) : "Not yet determined"}
            </div>
            <div className="text-xs text-slate-500 mt-2">Your strongest thinking mode.</div>
          </motion.div>
          <motion.div
            variants={{
              hidden: { opacity: 0, x: 20 },
              show: { opacity: 1, x: 0, transition: { ...ANIMATION.ease } },
            }}
            className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-5"
          >
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-500 mb-2">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              </svg>
              Weakest mode (target)
            </div>
            <div
              className="text-xl md:text-2xl font-bold"
              style={{ color: profile?.weakest_mode ? getModeColor(profile.weakest_mode) : "#94a3b8" }}
            >
              {profile?.weakest_mode ? getModeName(profile.weakest_mode) : "Not yet determined"}
            </div>
            <div className="text-xs text-slate-500 mt-2">Yentellect will focus training here.</div>
          </motion.div>
        </motion.div>

        {/* Knowledge Graph */}
        {graphData && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-white">Knowledge graph</h2>
              <span className="text-xs text-slate-500">{graphData.nodes.length} concepts</span>
            </div>
            <KnowledgeGraph data={graphData} height={500} />
          </div>
        )}

        {/* Progress Chart */}
        {metrics.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3 text-white">Progress</h2>
            <ProgressChart metrics={metrics} />
          </div>
        )}

        {/* Empty state */}
        {(!profile?.nodes || profile.nodes.length === 0) && (
          <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-white/10 rounded-2xl p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="font-semibold text-white mb-1">No data yet</h3>
            <p className="text-sm text-slate-400 mb-4">Start a session to begin training your weakest mode.</p>
            <button
              onClick={() => router.push("/")}
              className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium text-sm hover:opacity-90 transition shadow-lg shadow-indigo-500/25"
            >
              Start a session
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <ProfileContent />
    </Suspense>
  );
}
