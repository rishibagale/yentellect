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
import { MODE_DESCRIPTIONS, SOCRATIC_QUESTIONS, staggerContainer, fadeInUp } from "@/lib/tokens";

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
  const q = dominant ? SOCRATIC_QUESTIONS[dominant] : "What question would change how you think about this?";
  const label = dominant ? getModeName(dominant) : "Thinking";
  const color = dominant ? getModeColor(dominant) : "#5A6480";
  return (
    <div className="bg-[#0F1420] border border-[#1E2535] rounded-[16px] p-5 shadow-card hover:shadow-cardHover hover:-translate-y-0.5 transition-all duration-200">
      <div className="text-[11px] uppercase tracking-[0.1em] text-[#5A6480] mb-2 font-mono">Your thinking today</div>
      <div className="text-sm text-[#5A6480] mb-3 leading-relaxed">
        {dominant ? (
          <><span className="font-semibold" style={{ color }}>{label}</span> — {q}</>
        ) : q}
      </div>
      <button
        onClick={onStart}
        className="px-4 py-2 rounded-[10px] bg-[#6C63FF] text-white text-xs font-medium hover:opacity-90 transition shadow-active"
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
    <div className="bg-[#0F1420] border border-[#1E2535] rounded-[16px] p-5 shadow-card">
      <div className="text-[11px] uppercase tracking-[0.1em] text-[#5A6480] mb-3 font-mono">Cognitive mode breakdown</div>
      <div className="flex h-4 rounded-full overflow-hidden bg-white/5">
        {modes.map((m) => {
          const s = scores?.find((x) => x.mode === m)?.score || 0;
          const pct = total > 0 ? Math.max((s / total) * 100, 4) : 0;
          const color = getModeColor(m as ThinkingMode);
          return (
            <div
              key={m}
              className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-300"
              style={{ width: `${pct}%`, backgroundColor: pct > 4 ? color : "rgba(255,255,255,0.05)" }}
              title={`${getModeName(m as ThinkingMode)}: ${s} sessions`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
        {modes.map((m) => {
          const s = scores?.find((x) => x.mode === m)?.score || 0;
          return (
            <span key={m} className="text-[11px] font-mono" style={{ color: s > 0 ? getModeColor(m as ThinkingMode) : "#5A6480" }}>
              {getModeName(m as ThinkingMode)} {s > 0 ? s : "—"}
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
      <div className="bg-[#0F1420] border border-[#1E2535] rounded-[16px] p-6 text-center shadow-card">
        <div className="text-sm text-[#5A6480] mb-3">Your first session will appear here.</div>
        <button onClick={() => router.push("/")} className="px-4 py-2 rounded-[10px] bg-[#6C63FF] text-white text-xs font-medium hover:opacity-90 transition shadow-active">
          Start one →
        </button>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {recent.map((s) => {
        const mode = (s.modes_activated && s.modes_activated[0]) || s.mode_target || "CONVERGENT";
        return (
          <div
            key={s.session_id}
            onClick={() => router.push(`/session?session_id=${s.session_id}`)}
            className="bg-[#0F1420] border border-[#1E2535] rounded-[16px] p-4 shadow-card hover:shadow-cardHover hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
          >
            <div className="flex items-center gap-2 mb-2">
              <span
                className="text-[10px] uppercase font-mono font-semibold px-2.5 py-0.5 rounded-full"
                style={{ backgroundColor: `${getModeColor(mode as ThinkingMode)}26`, color: getModeColor(mode as ThinkingMode) }}
              >
                {getModeName(mode as ThinkingMode)}
              </span>
            </div>
            <div className="text-sm font-medium text-[#F0F4FF] mb-1 truncate">{s.mode_target || "Session"}</div>
            <div className="flex items-center justify-between">
              <div className="text-xs font-mono text-[#00FFB2]">{s.overall_score ? Math.round(s.overall_score * 100) + "%" : "—"}</div>
              <div className="text-[10px] text-[#5A6480] font-mono">{timeAgo(s.created_at)}</div>
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
              <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.054 0 1.954-.84 1.954-1.87V7.87c0-1.03-.9-1.87-1.954-1.87H5.054C4 6 3.1 6.84 3.1 7.87v8.26c0 1.03.9 1.87 1.954 1.87z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-[#F0F4FF] mb-2">Could not load dashboard</h2>
            <p className="text-sm text-[#5A6480] mb-4">{error}</p>
            <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-[10px] bg-[#6C63FF] text-[#F0F4FF] text-sm font-medium hover:opacity-90 transition shadow-active">
              Retry
            </button>
          </div>
        </div>
      </AppShell>
    );

  const fp = data?.fingerprint;
  const hasData = !!fp && fp.total_sessions > 0;

  // Compute stats with zero-hiding
  const streakDays = data?.streak_days || 0;
  const avgScore = fp?.scores?.length
    ? Math.round((fp.scores || []).reduce((a, b) => a + b.score, 0) / (fp.scores || []).length)
    : null;
  const dominant = fp?.dominant as ThinkingMode | null;

  return (
    <AppShell>
      <div className="min-h-screen">
        <section className="relative border-b border-[#1E2535] bg-gradient-to-b from-[#6C63FF]/[0.03] to-transparent">
          <div className="max-w-7xl mx-auto px-4 md:px-6 pt-8 pb-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col lg:flex-row lg:items-center gap-8 lg:gap-12"
            >
              <div className="flex-1 space-y-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[#5A6480] font-medium mb-2 font-mono">Dashboard</p>
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#F0F4FF] tracking-tight">
                    {hasData ? "Your cognitive fingerprint" : "Welcome to Yentellect"}
                  </h1>
                  <p className="text-sm text-[#5A6480] mt-2 max-w-lg">
                    {hasData ? `${fp.total_sessions} sessions recorded across ${(fp.domains || []).length} domains` : "Begin training to visualize your thinking profile."}
                  </p>
                </div>

                {/* Metric cards — never show 0 */}
                <div className="flex flex-wrap gap-4">
                  {hasData && (
                    <>
                      {streakDays > 0 && (
                        <div className="px-4 py-3 rounded-[16px] bg-[#0F1420] border border-[#1E2535] shadow-card hover:shadow-cardHover hover:-translate-y-0.5 transition-all duration-200">
                          <div className="text-[11px] uppercase tracking-[0.1em] text-[#5A6480] mb-1 font-mono">Streak</div>
                          <div className="text-2xl font-bold font-mono text-[#F0F4FF]">{streakDays} <span className="text-sm text-[#5A6480] font-sans">days</span></div>
                          <div className="text-xs text-[#5A6480] mt-1">{streakDays >= 2 ? "🔥 Keep going" : "Start a new streak today"}</div>
                        </div>
                      )}
                      {dominant && (
                        <div className="px-4 py-3 rounded-[16px] bg-[#0F1420] border border-[#1E2535] shadow-card hover:shadow-cardHover hover:-translate-y-0.5 transition-all duration-200">
                          <div className="text-[11px] uppercase tracking-[0.1em] text-[#5A6480] mb-1 font-mono">Dominant</div>
                          <div className="text-2xl font-bold font-mono" style={{ color: getModeColor(dominant) }}>{getModeName(dominant)}</div>
                          <div className="text-xs text-[#5A6480] mt-1">{MODE_DESCRIPTIONS[dominant]?.split("—")[1]?.trim() || ""}</div>
                        </div>
                      )}
                      {avgScore !== null && (
                        <div className="px-4 py-3 rounded-[16px] bg-[#0F1420] border border-[#1E2535] shadow-card hover:shadow-cardHover hover:-translate-y-0.5 transition-all duration-200">
                          <div className="text-[11px] uppercase tracking-[0.1em] text-[#5A6480] mb-1 font-mono">Score</div>
                          <div className="text-2xl font-bold font-mono text-[#00FFB2]">{avgScore}%</div>
                          <div className="text-xs text-[#5A6480] mt-1">
                            {avgScore >= 80 ? "Strong session." : (fp.total_sessions || 0) <= 1 ? "Your baseline. It grows from here." : "Above average for now"}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {hasData ? (
          <motion.section
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-6"
          >
            <motion.div variants={fadeInUp}>
              <ModeBreakdown scores={fp.scores} />
            </motion.div>
            <motion.div variants={fadeInUp}>
              <ThinkingToday dominant={dominant} onStart={() => router.push("/")} />
            </motion.div>
            <motion.div variants={fadeInUp}>
              <div className="text-[11px] uppercase tracking-[0.1em] text-[#5A6480] mb-3 font-mono">Recent sessions</div>
              <RecentFeed sessions={data?.recent_sessions} />
            </motion.div>
          </motion.section>
        ) : (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-7xl mx-auto px-4 md:px-6 py-10"
          >
            <div className="bg-[#0F1420] border border-[#1E2535] rounded-[16px] p-8 text-center max-w-2xl mx-auto shadow-card">
              <div className="text-sm text-[#5A6480] mb-4">Begin training to visualize your thinking profile.</div>
              <button onClick={() => router.push("/")} className="px-5 py-2.5 rounded-[10px] bg-[#6C63FF] text-white text-sm font-medium hover:opacity-90 transition shadow-active">
                Start your first session
              </button>
            </div>
          </motion.section>
        )}
      </div>
    </AppShell>
  );
}