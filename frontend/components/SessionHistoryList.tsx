/**
 * Yentellect — session history list (reformed, Stage 1).
 *
 * Extracted from app/history/page.tsx so the /history route AND (at Stage 2)
 * the workbench Explorer tree render the same implementation. Fetches the
 * page of sessions itself; variant="panel" drops the page-sized heading and
 * padding for side-panel hosts.
 */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/utils/supabase/provider";
import { getSessionHistory, type SessionSummary } from "@/lib/api";
import SessionCard from "@/components/SessionCard";
import LoadingState from "@/components/LoadingState";

interface SessionHistoryListProps {
  variant?: "page" | "panel";
}

export default function SessionHistoryList({ variant = "page" }: SessionHistoryListProps) {
  const router = useRouter();
  const { user } = useSupabase();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const limit = 20;

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getSessionHistory(page, limit)
      .then((res) => {
        setSessions(res.sessions);
        setTotal(res.total);
        setHasMore(res.has_more);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, page]);

  const isPage = variant === "page";

  return (
    <div className={isPage ? "max-w-4xl mx-auto px-4 md:px-6 py-6" : "p-3"}>
      {isPage && (
        <div className="mb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-[var(--text)]">Training history</h1>
          <p className="text-sm text-slate-400 mt-1">
            {total > 0 ? `${total} session${total !== 1 ? "s" : ""} completed` : "No sessions yet"}
          </p>
        </div>
      )}

      {loading ? (
        <LoadingState message="Loading history…" fullScreen={false} />
      ) : sessions.length === 0 ? (
        <div className="glass-card p-6 text-center">
          <div className="w-10 h-10 rounded-full bg-[var(--bg-2)] flex items-center justify-center mx-auto mb-3">
            <svg className="w-5 h-5 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-[var(--text)] mb-1">No history yet</h3>
          <p className="text-xs text-slate-500 mb-4">Complete a session to see it here.</p>
          <button
            onClick={() => router.push("/session")}
            className="px-4 py-2 rounded-lg bg-[var(--accent)] text-[var(--bg-0)] text-xs font-medium hover:opacity-90 transition"
          >
            Start session
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-2 mb-6">
            {sessions.map((s, i) => (
              <SessionCard
                key={s.session_id}
                session={s}
                index={i}
                onClick={() => router.push(`/session?session_id=${s.session_id}`)}
              />
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-4 py-2 rounded-lg border border-white/10 text-xs text-slate-400 hover:text-[var(--text)] hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              Previous
            </button>
            <span className="text-xs text-slate-500">
              Page {page} of {Math.ceil(total / limit)}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasMore}
              className="px-4 py-2 rounded-lg border border-white/10 text-xs text-slate-400 hover:text-[var(--text)] hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
