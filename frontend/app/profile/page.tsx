"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
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
import KnowledgeGraph from "@/components/KnowledgeGraph";
import ProgressChart from "@/components/ProgressChart";
import Header from "@/components/Header";
import LoadingState from "@/components/LoadingState";
import ErrorState from "@/components/ErrorState";

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId =
    searchParams.get("user_id") ||
    (typeof window !== "undefined"
      ? sessionStorage.getItem("yentellect_user_id")
      : null) ||
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

  useEffect(() => {
    load();
  }, [load, retryKey]);

  if (loading) {
    return <LoadingState message="Loading your profile..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Could not load profile"
        message={error}
        onRetry={() => setRetryKey((k) => k + 1)}
      />
    );
  }

  const stats = [
    {
      label: "Sessions",
      value: profile?.session_count ?? 0,
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      ),
    },
    {
      label: "Concepts",
      value: profile?.nodes.length ?? 0,
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
      ),
    },
    {
      label: "Connections",
      value: profile?.edges.length ?? 0,
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
          />
        </svg>
      ),
    },
    {
      label: "Domains",
      value: profile
        ? new Set(profile.nodes.map((n) => n.domain)).size
        : 0,
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      <Header userId={userId} />

      <main className="flex-1 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header section */}
          <div className="mb-6">
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              {profile?.name?.trim() || "Your Cognitive Profile"}
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              A snapshot of how you think and what you know.
            </p>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
            {stats.map((stat, idx) => (
              <div
                key={idx}
                className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-lg p-4 border border-slate-200/50 dark:border-slate-700/50 hover:shadow-xl transition animate-fade-in"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="flex items-center gap-1.5 text-xs text-slate-500 uppercase tracking-wider mb-1">
                  <span className="text-slate-400">{stat.icon}</span>
                  {stat.label}
                </div>
                <div className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">
                  {stat.value}
                </div>
              </div>
            ))}
          </div>

          {/* Mode indicators */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-slate-200/50 dark:border-slate-700/50">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-500 mb-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
                Dominant Mode
              </div>
              <div
                className="text-xl md:text-2xl font-bold"
                style={{
                  color: profile?.dominant_mode
                    ? getModeColor(profile.dominant_mode)
                    : "#94a3b8",
                }}
              >
                {profile?.dominant_mode
                  ? getModeName(profile.dominant_mode)
                  : "Not yet determined"}
              </div>
              <div className="text-xs text-slate-500 mt-2">
                Your strongest thinking mode based on session performance.
              </div>
            </div>
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-slate-200/50 dark:border-slate-700/50">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-500 mb-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
                  />
                </svg>
                Weakest Mode (Target)
              </div>
              <div
                className="text-xl md:text-2xl font-bold"
                style={{
                  color: profile?.weakest_mode
                    ? getModeColor(profile.weakest_mode)
                    : "#94a3b8",
                }}
              >
                {profile?.weakest_mode
                  ? getModeName(profile.weakest_mode)
                  : "Not yet determined"}
              </div>
              <div className="text-xs text-slate-500 mt-2">
                Yentellect will focus training on this mode.
              </div>
            </div>
          </div>

          {/* Knowledge Graph */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                Knowledge Graph
              </h2>
              <span className="text-xs text-slate-500">
                {graphData?.nodes.length ?? 0} concepts
              </span>
            </div>
            {graphData && (
              <KnowledgeGraph data={graphData} height={500} />
            )}
          </div>

          {/* Progress Chart */}
          {metrics.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-3 text-slate-900 dark:text-slate-100">
                Progress
              </h2>
              <ProgressChart metrics={metrics} />
            </div>
          )}

          {/* Empty state CTA */}
          {(!profile?.nodes || profile.nodes.length === 0) && (
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl p-8 text-center border border-indigo-100 dark:border-indigo-800/30 mb-6">
              <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center mx-auto mb-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-6 h-6 text-indigo-600 dark:text-indigo-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                Your knowledge graph is empty
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                Start a session to begin building your cognitive model.
              </p>
              <button
                onClick={() => router.push("/")}
                className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium text-sm hover:from-indigo-700 hover:to-purple-700 transition shadow-sm"
              >
                Start a Session
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<LoadingState message="Loading profile..." />}>
      <ProfileContent />
    </Suspense>
  );
}
