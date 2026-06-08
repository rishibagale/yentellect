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

  useEffect(() => {
    const paramUserId = searchParams.get("user_id");
    const storedUserId = typeof window !== "undefined" ? sessionStorage.getItem("yentellect_user_id") : null;
    const finalUserId = paramUserId || storedUserId || `user-${Date.now()}`;
    const storedOpening = typeof window !== "undefined" ? sessionStorage.getItem("yentellect_opening") || "" : "";
    setUserId(finalUserId);
    setOpening(storedOpening);
  }, [searchParams]);

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
      })
      .catch((err) => {
        startInitiatedRef.current = false;
        setError(err?.message || "Failed to start session");
      });
  }, [userId, opening, retryKey]);

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
    <div className="min-h-screen flex flex-col bg-[#0a0a0b] text-slate-100">
      <Header userId={userId} />
      <main className="flex-1 px-4 md:px-6 py-4 max-w-7xl w-full mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 h-[calc(100vh-7rem)]">
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
          <aside className="space-y-3 overflow-y-auto scrollbar-thin pr-1">
            <ModeIndicator
              mode={sessionData.predicted_mode}
              confidence={sessionData.confidence}
            />
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-5">
              <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">Training target</div>
              <div className="text-lg font-semibold" style={{ color: getModeColor(sessionData.mode_target) }}>
                {getModeName(sessionData.mode_target)}
              </div>
              <div className="text-xs text-slate-500 mt-2 leading-relaxed">
                Selected by your knowledge graph + weakest-area analysis.
              </div>
            </div>
            <button
              onClick={() => router.push(`/profile?user_id=${encodeURIComponent(userId)}`)}
              className="w-full py-2.5 rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 transition text-sm font-medium"
            >
              View full profile →
            </button>
          </aside>
        </div>
      </main>

      {showSummary && summary && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#131316] border border-white/10 rounded-2xl shadow-2xl p-8 max-w-md w-full animate-slide-up">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-4 text-center">Session complete</h2>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Modes activated</span>
                <span className="font-medium text-right max-w-[60%]">
                  {summary.modes_activated?.join(", ") || "None"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Duration</span>
                <span className="font-medium">{Math.round((summary.session_duration || 0) / 60)} min</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Overall score</span>
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
                onClick={() => router.push(`/profile?user_id=${encodeURIComponent(userId)}`)}
                className="flex-1 py-3 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold text-sm hover:opacity-90 transition"
              >
                View profile
              </button>
              <button
                onClick={() => router.push("/")}
                className="flex-1 py-3 rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 transition text-sm font-medium"
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
