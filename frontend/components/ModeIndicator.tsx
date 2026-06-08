"use client";

import { ThinkingMode, getModeColor, getModeName } from "@/lib/api";

interface ModeIndicatorProps {
  mode: ThinkingMode;
  confidence: number;
}

export default function ModeIndicator({
  mode,
  confidence,
}: ModeIndicatorProps) {
  const color = getModeColor(mode);
  const name = getModeName(mode);
  const confidencePct = Math.round(confidence * 100);
  const confidenceLabel =
    confidencePct >= 80
      ? "High"
      : confidencePct >= 50
        ? "Medium"
        : "Low";

  return (
    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 space-y-4 border border-slate-200/50 dark:border-slate-700/50 animate-fade-in">
      <div>
        <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">
          Current Mode
        </div>
        <div
          className="text-xl md:text-2xl font-bold transition-all duration-300"
          style={{ color }}
        >
          {name}
        </div>
      </div>

      <div>
        <div className="flex justify-between text-xs text-slate-500 mb-1.5">
          <span>Confidence</span>
          <span className="font-medium text-slate-700 dark:text-slate-200">
            {confidencePct}%{" "}
            <span className="text-slate-400 dark:text-slate-500 font-normal">
              ({confidenceLabel})
            </span>
          </span>
        </div>
        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-700 ease-out rounded-full"
            style={{
              width: `${confidencePct}%`,
              backgroundColor: color,
            }}
          />
        </div>
      </div>

      <div className="pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
        <div className="text-xs text-slate-500 dark:text-slate-400">
          Yentellect detected this thinking mode from your language patterns.
        </div>
      </div>
    </div>
  );
}
