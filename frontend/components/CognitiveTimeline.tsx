"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { getModeColor, getModeName, type SessionSummary } from "@/lib/api";

interface CognitiveTimelineProps {
  sessions: SessionSummary[];
}

export default function CognitiveTimeline({ sessions }: CognitiveTimelineProps) {
  if (!sessions || sessions.length === 0) {
    return (
      <div className="glass-card p-6 text-center">
        <div className="text-sm text-slate-500">Complete sessions to see your cognitive timeline.</div>
      </div>
    );
  }

  // Sort sessions by date (oldest first)
  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [sessions]
  );

  // Get the dominant mode for each session
  const sessionModes = useMemo(
    () =>
      sortedSessions.map((s) => {
        const mode = s.modes_activated?.[0] || s.mode_target || "CONVERGENT";
        return {
          ...s,
          dominantMode: mode,
          color: getModeColor(mode as any),
        };
      }),
    [sortedSessions]
  );

  return (
    <div className="glass-card p-6">
      <h3 className="text-sm font-semibold text-slate-300 mb-4">Cognitive Timeline</h3>
      <div className="relative">
        {/* Central line */}
        <div className="absolute left-10 top-0 bottom-0 w-0.5 bg-white/10" />
        
        <div className="space-y-4 pl-14">
          {sessionModes.map((session, index) => (
            <motion.div
              key={session.session_id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="relative"
            >
              {/* Dot on timeline */}
              <div
                className="absolute -left-14 w-3 h-3 rounded-full border-2 border-[#080B11] flex-shrink-0"
                style={{
                  backgroundColor: session.color,
                  boxShadow: `0 0 8px ${session.color}80`,
                }}
              />
              
              {/* Session card */}
              <div className="bg-white/[0.02] backdrop-blur-xl border border-white/5 rounded-xl p-3 hover:border-white/10 transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: `${session.color}26`,
                      color: session.color,
                    }}
                  >
                    {getModeName(session.dominantMode as any)}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(session.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                
                <div className="text-sm font-medium text-white truncate">
                  {session.mode_target || "Session"}
                </div>
                
                <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500">
                  <span>{session.turn_count} turns</span>
                  <span className="text-slate-700">·</span>
                  <span>{session.duration_minutes} min</span>
                  {session.concepts_added > 0 && (
                    <>
                      <span className="text-slate-700">·</span>
                      <span>+{session.concepts_added} concepts</span>
                    </>
                  )}
                  <span className="text-slate-700">·</span>
                  <span
                    className="font-mono"
                    style={{ color: session.overall_score >= 0.7 ? "#34D399" : session.overall_score >= 0.4 ? "#FBBF24" : "#F87171" }}
                  >
                    {Math.round(session.overall_score * 100)}%
                  </span>
                </div>
                
                {/* Mode dots */}
                {session.modes_activated && session.modes_activated.length > 0 && (
                  <div className="flex items-center gap-1 mt-2">
                    {session.modes_activated.slice(0, 5).map((mode) => (
                      <span
                        key={mode}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: getModeColor(mode as any) }}
                        title={getModeName(mode as any)}
                      />
                    ))}
                    {session.modes_activated.length > 5 && (
                      <span className="text-[9px] text-slate-600">
                        +{session.modes_activated.length - 5}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}