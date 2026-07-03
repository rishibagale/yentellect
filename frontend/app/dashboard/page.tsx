"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/utils/supabase/provider";
import {
  getDashboard,
  getModeColor,
  getModeName,
  type DashboardData,
  type ThinkingMode,
} from "@/lib/api";
import AppShell from "@/components/AppShell";
import CognitiveFingerprint from "@/components/CognitiveFingerprint";
import SessionCard from "@/components/SessionCard";
import ModeBadge from "@/components/ModeBadge";
import { MODE_DESCRIPTIONS, SOCRATIC_QUESTIONS } from "@/lib/tokens";

function timeAgo(dateStr?: string | null) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return "Just now";
  const mins = Math.floor(sec / 60);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hours ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return d.toLocaleDateString();
}

function DashboardSkeleton() {
  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-8 pb-10 animate-pulse">
        <div className="w-20 h-3 bg-white/5 rounded mb-4" />
        <div className="w-64 h-8 bg-white/5 rounded mb-3" />
        <div className="w-48 h-4 bg-white/5 rounded mb-6" />
        <div className="flex gap-4">
          <div className="w-28 h-16 bg-white/5 rounded-xl" />
          <div className="w-28 h-16 bg-white/5 rounded-xl" />
          <div className="w-28 h-16 bg-white/5 rounded-xl" />
        </div>
      </div>
    </AppShell>
  );
}

function ThinkingToday({ dominant, onStart }: { dominant?: ThinkingMode | null; onStart: () => void }) {
  const q = dominant ? SOCRATIC_QUESTIONS[dominant] : undefined;
  const label = dominant ? getModeName(dominant) : "Thinking";
  const color = dominant ? getModeColor(dominant) : "#94a3b8";
  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
      <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Your thinking today</div>
      <div className="text-xs text-slate-500 mb-2">
        {dominant ? (
          <>
            <span className="font-semibold" style={{ color }}>{label}</span> — {SOCRATIC_QUESTIONS[dominant]}
          </>
        ) : (
          "What question would change how you think about this?"
        )}
      </div>
      <button
        onClick={onStart}
        className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-slate-200 hover:bg-white/5 transition"
      >
        Start a session →
      </button>
    </div>
  );
}

function ModeBreakdown({ scores }: { scores: { mode: string; score: number }[] | undefined }) {
  const modes = ["CONVERGENT", "DIVERGENT", "ANALOGICAL", "METACOGNITIVE", "SYSTEMS", "DMN"];
  const total = scores?.length ? scores.reduce((a, b) => a + b.score, 0) : 0;
  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
      <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-3">Cognitive mode breakdown</div>
      <div className="flex h-3 rounded-full overflow-hidden bg-white/5">
        {modes.map((m) => {
          const s = scores?.find((x) => x.mode === m)?.score || 0;
          const pct = total > 0 ? Math.max((s / total) * 100, 2) : 0;
          const color = getModeColor(m as ThinkingMode);
          return (
            <div
              key={m}
              className="h-full first:rounded-l-full last:rounded-r-full"
              style={{ width: `${pct}%`, backgroundColor: pct > 0 ? color : "rgba(255,255,255,0.05)" }}
              title={`${m}: ${s}`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
        {modes.map((m) => {
          const s = scores?.find((x) => x.mode === m)?.score || 0;
          return (
            <span key={m} className="text-[10px] font-mono" style={{ color: s > 0 ? getModeColor(m as ThinkingMode) : "#64748b" }}>
              {m} {s > 0 ? s : "—"}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function RecentFeed({ sessions }: { sessions: any[] | undefined }) {
  const recent = sessions?.slice(0, 3) || [];
  const router = useRouter();
  if (recent.length === 0) {
    return (
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 text-center">
        <div className="text-xs text-slate-500">Your sessions will appear here. Start your first session.</div>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {recent.map((s) => {
        const mode = (s.modes_activated && s.modes_activated[0]) || s.mode_target || "CONVERGENT";
        return (
          <div key={s.session_id} onClick={() => router.push(`/session?session_id=${s.session_id}`)} className="bg-white/[0.03] border border-white/10 rounded-xl p-3 flex items-center justify-between cursor-pointer hover:bg-white/[0.05] transition">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-md" style={{ backgroundColor: getModeColor(mode as ThinkingMode), color: "#0a0a0b" }}>
                {getModeName(mode as ThinkingMode)}
              </span>
              <span className="text-xs text-slate-300">{s.mode_target || "Session"}</span>
            </div>
            <div className="text-right">
              <div className="text-xs font-mono text-emerald-400">{s.overall_score ? Math.round(s.overall_score * 100) + "%" : "—"}</div>
              <div className="text-[10px] text-slate-500">{timeAgo(s.created_at)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

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

  if (loading) return <DashboardSkeleton />;

  if (error)
    return (
      <AppShell>
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center max-w-sm">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.054 0 1.954-.84 1.954-1.87V7.87c0-1.03-.9-1.87-1.954-1.87H5.054C4 6 3.1 6.84 3.1 7.87v8.26c0 1.03.9 1.87 1.954 1.87z"
                />
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
  const hasData = !!fp && fp.total_sessions > 0;

  return (
    <AppShell>
      <div className="min-h-screen">
        <section className="relative border-b border-white/5 bg-gradient-to-b from-indigo-500/[0.03] to-transparent">
          <div className="max-w-7xl mx-auto px-4 md:px-6 pt-8 pb-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col lg:flex-row lg:items-center gap-8 lg:gap-12"
            >
              <div className="flex-1 space-y-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-medium mb-2">Dashboard</p>
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight">
                    {hasData ? "Your cognitive fingerprint" : "Welcome to Yentellect"}
                  </h1>
                  <p className="text-sm text-slate-400 mt-2 max-w-lg">
                    {hasData ? `${fp.total_sessions} sessions recorded across ${(fp.domains || []).length} domains` : "Begin training to visualize your thinking profile."}
                  </p>
                </div>

                <div className="flex flex-wrap gap-4">
                  {hasData && (
                    <>
                      <div className="px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10">
                        <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">Streak</div>
                        <div className="text-xl font-bold font-mono text-white">{data?.streak_days || 0} <span className="text-sm text-slate-500 font-sans">days</span></div>
                        <div className="text-[11px] text-slate-500 mt-1">{(data?.streak_days || 0) >= 2 ? "🔥 Keep going" : "Start a new streak today"}</div>
                      </div>
                      <div className="px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10">
                        <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">Dominant</div>
                        <div className="text-xl font-bold font-mono" style={{ color: getModeColor((fp.dominant || "CONVERGENT") as ThinkingMode) }}>
                          {getModeName((fp.dominant || "CONVERGENT") as ThinkingMode)}
                        </div>
                      </div>
                      <div className="px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10">
                        <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">Score</div>
                        <div className="text-xl font-bold font-mono text-emerald-400">
                          {fp.scores?.length ? `${Math.round((fp.scores || []).reduce((a, b) => a + b.score, 0) / (fp.scores || []).length)}%` : "—"}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">
                          {fp.scores?.length ? (fp.total_sessions || 0) <= 1 ? "Your baseline. It grows from here." : "Above average for now" : "Complete a session to see your score"}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {hasData && (
          <section className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-6">
            <ModeBreakdown scores={fp.scores} />
            <ThinkingToday dominant={fp.dominant as ThinkingMode | null} onStart={() => router.push("/")} />
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Recent sessions</div>
              <RecentFeed sessions={data?.recent_sessions} />
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}