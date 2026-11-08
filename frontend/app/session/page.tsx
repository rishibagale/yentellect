"use client";

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { startSession, ThinkingMode, getSession, type SessionDetailResponse } from "@/lib/api";
import SessionChat from "@/components/SessionChat";
import ModeIndicator from "@/components/ModeIndicator";
import Header from "@/components/Header";
import LoadingState from "@/components/LoadingState";
import ErrorState from "@/components/ErrorState";
import { useSupabase } from "@/utils/supabase/provider";
import { useSearchParams } from "next/navigation";

function SessionSkeleton() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-0)] text-slate-100">
      <Header />
      <main className="flex-1 flex flex-col">
        <div className="max-w-3xl w-full mx-auto px-4 py-6 flex-1">
          <div className="animate-pulse space-y-4">
            <div className="w-40 h-4 bg-white/5 rounded" />
            <div className="flex justify-end">
              <div className="w-64 h-16 bg-white/5 rounded-[var(--radius)]" />
            </div>
            <div className="flex justify-start">
              <div className="w-72 h-24 bg-white/5 rounded-[var(--radius)]" />
            </div>
            <div className="flex justify-end">
              <div className="w-56 h-12 bg-white/5 rounded-[var(--radius)]" />
            </div>
          </div>
        </div>
        <div className="border-t border-white/5 p-4">
          <div className="max-w-3xl w-full mx-auto">
            <div className="h-12 bg-white/5 rounded-xl animate-pulse" />
          </div>
        </div>
      </main>
    </div>
  );
}

function SessionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading } = useSupabase();
  const [userId, setUserId] = useState<string | null>(null);
  const [opening, setOpening] = useState("");
  const [promptInput, setPromptInput] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [sessionData, setSessionData] = useState<{
    session_id: string;
    response: string;
    predicted_mode: ThinkingMode;
    confidence: number;
  } | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [readOnly, setReadOnly] = useState(false);
  const [initialTurns, setInitialTurns] = useState<Array<{
    user_input: string;
    response: string;
    predicted_mode: string;
    confidence: number;
    created_at: string;
  }>>([]);
  const startInitiatedRef = useRef(false);
  const viewingSessionId = searchParams.get("session_id");

  // Load existing ended session if session_id is in URL
  useEffect(() => {
    if (!viewingSessionId || !user) return;
    let cancelled = false;
    setError(null);
    getSession(viewingSessionId)
      .then((data: SessionDetailResponse) => {
        if (cancelled) return;
        const s = data.session;
        const first = data.turns[0];
        setSessionData({
          session_id: s.session_id,
          response: first?.response || "",
          predicted_mode: s.predicted_mode,
          confidence: first?.confidence || 0,
        });
        setOpening(first?.user_input || "");
        setInitialTurns(data.turns);
        setUserId(user.id);
        setReadOnly(true);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message || "Could not load session");
      });
    return () => { cancelled = true; };
  }, [viewingSessionId, user]);

  const handleStart = useCallback(async (initialPrompt: string) => {
    if (!initialPrompt.trim() || isStarting) return;
    setIsStarting(true);
    setError(null);
    try {
      const data = await startSession(initialPrompt.trim());
      setOpening(initialPrompt.trim());
      setSessionData({
        session_id: data.session_id,
        response: data.response,
        predicted_mode: data.predicted_mode,
        confidence: data.confidence,
      });
      if (typeof window !== "undefined") {
        sessionStorage.setItem("yentellect_session_id", data.session_id);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to start session");
    } finally {
      setIsStarting(false);
    }
  }, [isStarting]);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace("/auth/login?redirect=/session");
      return;
    }
    setUserId(user.id);
    if (viewingSessionId) return;

    let pendingOpening = "";
    if (typeof window !== "undefined") {
      pendingOpening = sessionStorage.getItem("yentellect_opening") || "";
      sessionStorage.removeItem("yentellect_session_id");
      sessionStorage.removeItem("yentellect_opening");
    }
    // Only auto-start if an explicit opening prompt was queued (e.g. from workbench)
    if (pendingOpening.trim() && !startInitiatedRef.current) {
      startInitiatedRef.current = true;
      handleStart(pendingOpening.trim());
    }
  }, [isLoading, router, user, viewingSessionId, handleStart]);

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

  if (!userId) {
    return <LoadingState message="Connecting..." />;
  }

  if (viewingSessionId && !sessionData) {
    return <LoadingState message="Loading session transcript..." />;
  }

  if (!sessionData) {
    return (
      <div className="min-h-screen flex flex-col bg-[var(--bg-0)] text-slate-100">
        <Header />
        <main className="flex-1 px-4 py-8 max-w-3xl w-full mx-auto flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="glass-card p-6 md:p-8 rounded-2xl border border-[var(--border)] shadow-xl"
          >
            <div className="flex items-center gap-3.5 mb-5">
              <div className="w-11 h-11 rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center justify-center text-[var(--accent)] shrink-0">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-[var(--text)]">Start Cognitive Dialogue</h1>
                <p className="text-xs text-[var(--text-dim)] mt-0.5">Formulate a hypothesis or research topic to begin Socratic inquiry across cognitive modes.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-[var(--text-dim)] mb-2 font-medium">
                  What question or concept are you exploring today?
                </label>
                <textarea
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      if (promptInput.trim() && !isStarting) {
                        handleStart(promptInput.trim());
                      }
                    }
                  }}
                  placeholder="e.g., How can we combine sparse graph attention with thermodynamic free energy models to bound catastrophic forgetting?"
                  rows={4}
                  className="w-full bg-[var(--bg-1)] border border-[var(--border)] rounded-xl p-3.5 text-sm text-[var(--text)] placeholder:text-[var(--text-dim)]/50 focus:outline-none focus:border-[var(--accent)] transition resize-none leading-relaxed"
                />
              </div>

              <div>
                <span className="text-[11px] uppercase tracking-wider text-[var(--text-dim)] block mb-2 font-medium">
                  Suggested Explorations
                </span>
                <div className="flex flex-col gap-1.5">
                  {[
                    "Explore how transformer attention models relate to biological memory consolidation.",
                    "Analogical mapping: How does thermodynamic entropy compare to information loss in deep learning?",
                    "Critically audit my assumptions regarding sparse graph representation learning.",
                  ].map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPromptInput(s)}
                      className="text-left text-xs text-[var(--text-dim)] hover:text-[var(--text)] bg-[var(--bg-1)]/60 hover:bg-[var(--bg-2)] border border-[var(--border)]/60 rounded-lg px-3 py-2 transition"
                    >
                      💡 {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-[var(--text-dim)]">
                  Press <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-2)] border border-[var(--border)] text-[10px] font-mono">⌘/Ctrl</kbd> + <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-2)] border border-[var(--border)] text-[10px] font-mono">Enter</kbd> to begin
                </span>
                <button
                  type="button"
                  disabled={!promptInput.trim() || isStarting}
                  onClick={() => handleStart(promptInput.trim())}
                  className="px-5 py-2.5 rounded-xl bg-[var(--accent)] text-[var(--bg-0)] text-sm font-semibold hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isStarting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-[var(--bg-0)] border-t-transparent rounded-full animate-spin" />
                      <span>Initializing...</span>
                    </>
                  ) : (
                    <>
                      <span>Begin Dialogue</span>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-0)] text-slate-100">
      <Header />
      <main className="flex-1 px-3 md:px-6 py-3 md:py-4 max-w-7xl w-full mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-3 h-[calc(100vh-7rem)]">
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
            readOnly={readOnly}
            initialTurns={initialTurns}
          />
          {/* Mobile: collapsible sidebar */}
          <details className="lg:hidden">
            <summary className="text-xs text-[var(--text-dim)] cursor-pointer hover:text-[var(--text)] transition px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 mb-2">
              Session details ▾
            </summary>
            <aside className="space-y-3 overflow-y-auto scrollbar-thin pr-1">
              <ModeIndicator mode={sessionData.predicted_mode} />
              <button
                onClick={() => router.push("/profile")}
                className="w-full py-2.5 rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 transition text-sm font-medium"
              >
                View full profile →
              </button>
            </aside>
          </details>
          {/* Desktop sidebar */}
          <aside className="hidden lg:block space-y-3 overflow-y-auto scrollbar-thin pr-1">
            <ModeIndicator mode={sessionData.predicted_mode} />
            <button
              onClick={() => router.push("/profile")}
              className="w-full py-2.5 rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 transition text-sm font-medium"
            >
              View full profile →
            </button>
          </aside>
        </div>
      </main>

      {showSummary && summary && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="bg-surface-raised border border-white/10 rounded-[var(--radius)] shadow-2xl p-8 max-w-md w-full"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-14 h-14 rounded-full bg-[var(--bg-2)] flex items-center justify-center mx-auto mb-4"
            >
              <svg className="w-7 h-7 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </motion.div>

            <h2 className="text-2xl font-bold mb-1 text-center">Session complete</h2>
            <p className="text-sm text-slate-500 text-center mb-6">
              Your transcript is above.
            </p>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center py-2 px-3 rounded-lg bg-white/[0.02] border border-white/5">
                <span className="text-sm text-slate-400">Duration</span>
                <span className="text-sm font-medium font-mono">
                  {Math.round((summary.session_duration || 0) / 60)} min
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <motion.button
                onClick={() => router.push("/history")}
                className="flex-1 py-3 rounded-lg bg-[var(--accent)] text-[var(--bg-0)] font-semibold text-sm hover:opacity-90 transition"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Go to history
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