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

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
      onClick={onClick}
      className="glass-card p-4 cursor-pointer hover:bg-white/[0.05] transition-all duration-200"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <ModeBadge mode={session.mode_target as ThinkingMode} size="sm" />
          <span className="text-[11px] text-slate-500">{date}</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <span>{session.turn_count} turns</span>
          <span className="text-slate-700">·</span>
          <span>{session.duration_minutes} min</span>
          {session.concepts_added > 0 && (
            <>
              <span className="text-slate-700">·</span>
              <span>+{session.concepts_added} concepts</span>
            </>
          )}
        </div>
        {session.modes_activated.length > 0 && (
          <div className="flex items-center gap-1 mt-2">
            {session.modes_activated.slice(0, 4).map((mode) => (
              <span
                key={mode}
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: getModeColor(mode as ThinkingMode) }}
                title={getModeName(mode as ThinkingMode)}
              />
            ))}
            {session.modes_activated.length > 4 && (
              <span className="text-[10px] text-slate-600">
                +{session.modes_activated.length - 4}
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}