"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getProfile, getGraph, getProfileMetrics, CognitiveProfile, D3GraphData, getModeColor, getModeName } from "@/lib/api";
import KnowledgeGraph from "@/components/KnowledgeGraph";
import ProgressChart from "@/components/ProgressChart";

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get("user_id") || "demo-user";

  const [profile, setProfile] = useState<CognitiveProfile | null>(null);
  const [graphData, setGraphData] = useState<D3GraphData | null>(null);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [p, g, m] = await Promise.all([
          getProfile(userId),
          getGraph(userId),
          getProfileMetrics(userId, 20),
        ]);
        setProfile(p);
        setGraphData(g);
        setMetrics(m.metrics);
      } catch (err: any) {
        setError(err?.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4" />
          <p className="text-slate-600 dark:text-slate-300">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 max-w-md">
          <h2 className="text-xl font-bold text-red-500 mb-2">Error</h2>
          <p className="text-slate-600 dark:text-slate-300 mb-4">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white"
          >
            Start Over
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <button
              onClick={() => router.push("/")}
              className="text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition text-sm"
            >
              ← Home
            </button>
            <h1 className="text-3xl font-bold mt-2">
              {profile?.name || "Your Profile"}
            </h1>
          </div>
          <button
            onClick={() => router.push("/session")}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium"
          >
            New Session
          </button>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-4">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">
              Sessions
            </div>
            <div className="text-3xl font-bold">{profile?.session_count || 0}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-4">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">
              Concepts
            </div>
            <div className="text-3xl font-bold">{profile?.nodes.length || 0}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-4">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">
              Connections
            </div>
            <div className="text-3xl font-bold">{profile?.edges.length || 0}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-4">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">
              Domains
            </div>
            <div className="text-3xl font-bold">
              {new Set(profile?.nodes.map((n) => n.domain)).size || 0}
            </div>
          </div>
        </div>

        {/* Mode indicators */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6">
            <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">
              Dominant Mode
            </div>
            <div
              className="text-2xl font-bold"
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
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6">
            <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">
              Weakest Mode (Target)
            </div>
            <div
              className="text-2xl font-bold"
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
          <h2 className="text-xl font-semibold mb-3">Knowledge Graph</h2>
          {graphData && <KnowledgeGraph data={graphData} height={500} />}
        </div>

        {/* Progress Chart */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-3">Progress</h2>
          <ProgressChart metrics={metrics} />
        </div>
      </div>
    </main>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}