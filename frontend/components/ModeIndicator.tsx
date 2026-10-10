"use client";

import { motion } from "framer-motion";
import { ThinkingMode, getModeColor, getModeName } from "@/lib/api";

interface ModeIndicatorProps {
  mode: ThinkingMode;
}

export default function ModeIndicator({ mode }: ModeIndicatorProps) {
  const color = getModeColor(mode);
  const name = getModeName(mode);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[var(--radius)] p-5 space-y-2"
    >
      <div className="text-xs uppercase tracking-wider text-slate-500">
        Current mode
      </div>
      <div className="text-xl font-bold truncate" style={{ color }}>
        {name}
      </div>
      <div className="flex items-center gap-1.5">
        <div
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="text-xs text-slate-500">Based on your messages.</span>
      </div>
    </motion.div>
  );
}
