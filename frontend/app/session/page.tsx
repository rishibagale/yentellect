"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { startSession, getModeColor, getModeName, ThinkingMode } from "@/lib/api";
import SessionChat from "@/components/SessionChat";
import ModeIndicator from "@/components/ModeIndicator";

function SessionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const userId = searchParams.get("user_id");
  const opening = searchParams.get("opening");

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

  useEffect(() => {
    if (!sessionId && opening && userId) {
      // If we just came from home page, start the session
      startSession(userId, opening)
        .then((data) => {
          setSessionData({
            session_id: data.session_id,
            response: data.response,
            mode_target: data.mode_target,
            predicted_mode: data.predicted_mode,
            confidence: data.confidence,
          });
          // Update URL with session_id
          router.replace(`/session?session_id=${data.session_id}&user_id=${userId}`);
        })
        .catch((err) => setError(err.message || "Failed to start session"));
    } else if (sessionId && userId) {
      // Existing session - try to recover or just show what we have
      setSessionData({
        session_id: sessionId,
        response: "[Session resumed. Send a message to continue.]",
        mode_target: "CONVERGENT",
        predicted_mode: "CONVERGENT",
        confidence: 0.5,
      });
    }
  }, [sessionId, userId, opening, router]);

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

  if (!sessionData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4" />
          <p className="text-slate-600 dark:text-slate-300">
            Initializing your session...
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-6">
      <div className="max-w-7xl mx-auto h-[calc(100vh-2rem)]">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => router.push("/")}
            className="text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition text-sm"
          >
            ← New Session
          </button>
          <div className="text-xs text-slate-400">
            Session: {sessionData.session_id.slice(0, 8)}...
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100%-3rem)]">
          <div className="lg:col-span-2 h-full">
            <SessionChat
              sessionId={sessionData.session_id}
              userId={userId || "anonymous"}
              initialMessage={opening || ""}
              initialResponse={sessionData.response}
              initialMode={sessionData.predicted_mode}
              initialConfidence={sessionData.confidence}
              onEndSession={(s) => {
                setSummary(s);
                setShowSummary(true);
              }}
            />
          </div>

          <div className="space-y-4 h-full overflow-y-auto scrollbar-thin">
            <ModeIndicator
              mode={sessionData.predicted_mode}
              confidence={sessionData.confidence}
            />
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6">
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
              onClick={() => router.push(`/profile?user_id=${userId}`)}
              className="w-full py-3 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            >
              View Full Profile
            </button>
          </div>
        </div>
      </div>

      {showSummary && summary && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 max-w-md w-full animate-slide-up">
            <h2 className="text-2xl font-bold mb-4">Session Complete</h2>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-slate-500">Modes Activated</span>
                <span className="font-medium">
                  {summary.modes_activated?.join(", ") || "None"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Duration</span>
                <span className="font-medium">
                  {Math.round((summary.session_duration || 0) / 60)} min
                </span>
              </div>
              <div className="flex justify-between">
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
                onClick={() => router.push(`/profile?user_id=${userId}`)}
                className="flex-1 py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold"
              >
                View Profile
              </button>
              <button
                onClick={() => router.push("/")}
                className="flex-1 py-3 rounded-lg border border-slate-300 dark:border-slate-600"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function SessionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      }
    >
      <SessionContent />
    </Suspense>
  );
}