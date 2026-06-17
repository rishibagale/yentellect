"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { motion } from "framer-motion";
import { useSearchParams, useRouter } from "next/navigation";
import { startSession, getModeColor, getModeName, ThinkingMode } from "@/lib/api";
import SessionChat from "@/components/SessionChat";
import ModeIndicator from "@/components/ModeIndicator";
import Header from "@/components/Header";
import LoadingState from "@/components/LoadingState";
import ErrorState from "@/components/ErrorState";
import { useSupabase } from "@/utils/supabase/provider";

function SessionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useSupabase();
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
    // Use Supabase auth user if available, fallback to sessionStorage for backward compat
    const finalUserId = user?.id || 
      searchParams.get("user_id") ||
      (typeof window !== "undefined" ? sessionStorage.getItem("yentellect_user_id") : null) ||
      `user-${Date.now()}`;
    const storedOpening = typeof window !== "undefined" ? sessionStorage.getItem("yentellect_opening") || "" : "";
    setUserId(finalUserId);
    setOpening(storedOpening);
  }, [searchParams, user]);

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
      <Header />
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

      {/* Summary Modal — Premium */}
      {showSummary && summary && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="bg-surface-raised border border-white/10 rounded-2xl shadow-2xl p-8 max-w-md w-full"
          >
            {/* Success icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4"
            >
              <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </motion.div>

            <h2 className="text-2xl font-bold mb-1 text-center">Session complete</h2>
            <p className="text-sm text-slate-500 text-center mb-6">
              Here's how you performed
            </p>

            {/* Stats */}
            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center py-2 px-3 rounded-lg bg-white/[0.02] border border-white/5">
                <span className="text-sm text-slate-400">Modes activated</span>
                <span className="text-sm font-medium text-right max-w-[55%]">
                  {summary.modes_activated?.join(", ") || "None"}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 px-3 rounded-lg bg-white/[0.02] border border-white/5">
                <span className="text-sm text-slate-400">Duration</span>
                <span className="text-sm font-medium font-mono">
                  {Math.round((summary.session_duration || 0) / 60)} min
                </span>
              </div>
              <div className="flex justify-between items-center py-2 px-3 rounded-lg bg-white/[0.02] border border-white/5">
                <span className="text-sm text-slate-400">Overall score</span>
                <motion.span
                  className="text-lg font-bold font-mono"
                  style={{
                    color:
                      (summary.summary?.overall_score || 0) >= 0.7
                        ? "#34D399"
                        : (summary.summary?.overall_score || 0) >= 0.4
                        ? "#FBBF24"
                        : "#F87171",
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  {summary.summary?.overall_score
                    ? Math.round(summary.summary.overall_score * 100)
                    : 0}
                  %
                </motion.span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <motion.button
                onClick={() => router.push("/dashboard")}
                className="flex-1 py-3 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold text-sm hover:opacity-90 transition shadow-lg shadow-indigo-500/20"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Go to dashboard
              </motion.button>
              <motion.button
                onClick={() => router.push("/profile")}
                className="flex-1 py-3 rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 transition text-sm font-medium"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                View profile
              </motion.button>
            </div>
          </motion.div>
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
