"use client";

import { motion } from "framer-motion";
import { getModeColor, getModeName, type SessionSummary, type ThinkingMode } from "@/lib/api";
import ModeBadge from "./ModeBadge";

interface SessionCardProps {
  session: SessionSummary;
  onClick?: () => void;
  index?: number;
}

export default function SessionCard({ session, onClick, index = 0 }: SessionCardProps) {
  const date = new Date(session.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const title = session.title && session.title !== "Research Session"
    ? session.title
    : `${getModeName(session.mode_target as ThinkingMode)} Exploration`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
      onClick={onClick}
      className="glass-card p-4.5 cursor-pointer hover:bg-white/[0.05] hover:border-[var(--border)] transition-all duration-200 rounded-xl"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-3 mb-1.5">
          <h3 className="text-sm font-semibold text-[var(--text)] truncate max-w-lg">
            {title}
          </h3>
          <span className="text-[11px] text-slate-500 shrink-0 font-mono">{date}</span>
        </div>

        {session.summary && session.summary !== title && (
          <p className="text-xs text-[var(--text-dim)] line-clamp-1 mb-2.5 font-serif italic">
            {session.summary}
          </p>
        )}

        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <ModeBadge mode={session.mode_target as ThinkingMode} size="sm" />
          <span className="text-slate-700">·</span>
          <span>{session.turn_count} {session.turn_count === 1 ? "turn" : "turns"}</span>
          <span className="text-slate-700">·</span>
          <span>{session.duration_minutes} min</span>
          {session.concepts_added > 0 && (
            <>
              <span className="text-slate-700">·</span>
              <span className="text-emerald-400 font-medium">+{session.concepts_added} concepts</span>
            </>
          )}
        </div>

        {session.modes_activated.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-2.5 border-t border-[var(--border)]/40">
            <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Modes:</span>
            {session.modes_activated.map((mode) => (
              <span
                key={mode}
                className="px-2 py-0.5 rounded text-[10px] font-mono font-medium"
                style={{
                  backgroundColor: `${getModeColor(mode as ThinkingMode)}18`,
                  color: getModeColor(mode as ThinkingMode),
                  border: `0.5px solid ${getModeColor(mode as ThinkingMode)}35`,
                }}
              >
                {getModeName(mode as ThinkingMode)}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
