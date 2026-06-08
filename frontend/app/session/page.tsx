"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { startSession, getModeColor, getModeName, ThinkingMode } from "@/lib/api";
import SessionChat from "@/components/SessionChat";
import ModeIndicator from "@/components/ModeIndicator";
import Header from "@/components/Header";
import LoadingState from "@/components/LoadingState";
import ErrorState from "@/components/ErrorState";

function SessionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [userId, setUserId] = useState<string | null>(null);
  const [opening, setOpening] = useState("");
  const [sessionData, setSessionData] = useState<{
    session_id: string;
    response: string;
    mode_target: ThinkingMode;
    predicted_mode: ThinkingMode;
    confidence: number;
  } | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const startInitiatedRef = useRef(false);

  // Resolve userId & opening from URL or sessionStorage (one-time)
  useEffect(() => {
    const paramUserId = searchParams.get("user_id");
    const storedUserId =
      typeof window !== "undefined"
        ? sessionStorage.getItem("yentellect_user_id")
        : null;
    const finalUserId = paramUserId || storedUserId || `user-${Date.now()}`;
    const storedOpening =
      typeof window !== "undefined"
        ? sessionStorage.getItem("yentellect_opening") || ""
        : "";

    setUserId(finalUserId);
    setOpening(storedOpening);
  }, [searchParams]);

  // Start session exactly once per userId (or retry)
  useEffect(() => {
    if (!userId) return;
    if (startInitiatedRef.current) return;

    startInitiatedRef.current = true;
    setError(null);

    startSession(userId, opening)
      .then((data) => {
        setSessionData({
          session_id: data.session_id,
          response: data.response,
          mode_target: data.mode_target,
          predicted_mode: data.predicted_mode,
          confidence: data.confidence,
        });
        if (typeof window !== "undefined") {
          sessionStorage.setItem("yentellect_session_id", data.session_id);
        }
        // Only update URL if it differs to avoid unnecessary re-renders
        const desiredUrl = `/session?session_id=${data.session_id}&user_id=${encodeURIComponent(userId)}`;
        if (typeof window !== "undefined" && window.location.search !== `?${new URLSearchParams({
          session_id: data.session_id,
          user_id: userId,
        }).toString()}`) {
          router.replace(desiredUrl);
        }
      })
      .catch((err) => {
        startInitiatedRef.current = false; // allow retry
        setError(err?.message || "Failed to start session");
      });
  }, [userId, opening, retryKey, router]);

  if (error) {
    return (
      <ErrorState
        title="Could not start session"
        message={error}
        onRetry={() => {
          startInitiatedRef.current = false;
          setError(null);
          setRetryKey((k) => k + 1);
        }}
      />
    );
  }

  if (!userId || !sessionData) {
    return <LoadingState message="Initializing your session..." />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      <Header userId={userId} />

      <main className="flex-1 p-4 md:p-6">
        <div className="max-w-7xl mx-auto h-[calc(100vh-7rem)]">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Session{" "}
              <span className="font-mono text-slate-700 dark:text-slate-300">
                {sessionData.session_id.slice(0, 8)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span>Live</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 h-[calc(100%-2rem)]">
            <div className="lg:col-span-2 h-full min-h-[500px]">
              <SessionChat
                sessionId={sessionData.session_id}
                userId={userId}
                initialMessage={opening}
                initialResponse={sessionData.response}
                initialMode={sessionData.predicted_mode}
                initialConfidence={sessionData.confidence}
                onEndSession={(s) => {
                  setSummary(s);
                  setShowSummary(true);
                }}
              />
            </div>

            <div className="space-y-4 h-full overflow-y-auto scrollbar-thin pr-1">
              <ModeIndicator
                mode={sessionData.predicted_mode}
                confidence={sessionData.confidence}
              />
              <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-slate-200/50 dark:border-slate-700/50">
                <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">
                  Training Target
                </div>
                <div
                  className="text-lg font-semibold"
                  style={{ color: getModeColor(sessionData.mode_target) }}
                >
                  {getModeName(sessionData.mode_target)}
                </div>
                <div className="text-xs text-slate-500 mt-2">
                  Yentellect selected this mode based on your knowledge graph
                  and weakest areas.
                </div>
              </div>
              <button
                onClick={() =>
                  router.push(`/profile?user_id=${encodeURIComponent(userId)}`)
                }
                className="w-full py-3 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition text-sm font-medium"
              >
                View Full Profile
              </button>
            </div>
          </div>
        </div>
      </main>

      {showSummary && summary && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 max-w-md w-full border border-slate-200/50 dark:border-slate-700/50 animate-slide-up">
            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-6 h-6 text-green-600 dark:text-green-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-4 text-center">
              Session Complete
            </h2>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Modes Activated</span>
                <span className="font-medium text-right max-w-[60%]">
                  {summary.modes_activated?.join(", ") || "None"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Duration</span>
                <span className="font-medium">
                  {Math.round((summary.session_duration || 0) / 60)} min
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Overall Score</span>
                <span className="font-medium">
                  {summary.summary?.overall_score
                    ? Math.round(summary.summary.overall_score * 100)
                    : 0}
                  %
                </span>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() =>
                  router.push(`/profile?user_id=${encodeURIComponent(userId)}`)
                }
                className="flex-1 py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm hover:from-indigo-700 hover:to-purple-700 transition shadow-sm"
              >
                View Profile
              </button>
              <button
                onClick={() => router.push("/")}
                className="flex-1 py-3 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition text-sm font-medium"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SessionPage() {
  return (
    <Suspense fallback={<LoadingState message="Loading session..." />}>
      <SessionContent />
    </Suspense>
  );
}
