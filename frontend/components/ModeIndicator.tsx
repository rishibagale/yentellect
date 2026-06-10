"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";
import { MODE_PALETTES } from "@/lib/tokens";
import { ThinkingMode, getModeColor, getModeName } from "@/lib/api";

interface ModeIndicatorProps {
  mode: ThinkingMode;
  confidence: number;
}

export default function ModeIndicator({ mode, confidence }: ModeIndicatorProps) {
  const palette = MODE_PALETTES[mode];
  const color = getModeColor(mode);
  const name = getModeName(mode);
  const confidencePct = Math.round(confidence * 100);
  const confidenceLabel =
    confidencePct >= 80 ? "High" : confidencePct >= 50 ? "Medium" : "Low";

  // Calculate radial gauge parameters
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (confidencePct / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-5 space-y-4"
    >
      {/* Mode name + Radial gauge */}
      <div className="flex items-center gap-4">
        {/* SVG Radial Gauge */}
        <div className="relative flex-shrink-0 w-24 h-24">
          <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
            {/* Background track */}
            <circle
              cx="48"
              cy="48"
              r={radius}
              fill="none"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="6"
            />
            {/* Foreground arc */}
            <motion.circle
              cx="48"
              cy="48"
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </svg>
          {/* Center text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.span
              className="text-lg font-bold font-mono"
              style={{ color }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {confidencePct}%
            </motion.span>
          </div>
        </div>

        {/* Mode info */}
        <div className="flex-1 min-w-0">
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">
            Current mode
          </div>
          <div className="text-xl font-bold truncate" style={{ color }}>
            {name}
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-xs text-slate-500">
              <span className="text-slate-300 font-medium">{confidenceLabel}</span> confidence
            </span>
          </div>
        </div>
      </div>

      {/* Horizontal confidence bar (detail) */}
      <div>
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>Signal clarity</span>
          <span className="font-mono text-slate-400">{confidencePct}%</span>
        </div>
        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: color }}
            initial={{ width: "0%" }}
            animate={{ width: `${confidencePct}%` }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Mode emoji + description */}
      <div className="pt-2 border-t border-white/5 flex items-center gap-2">
        <span className="text-sm">{palette?.emoji || "🧠"}</span>
        <span className="text-xs text-slate-500">
          Detected from your language patterns
        </span>
      </div>
    </motion.div>
  );
}
