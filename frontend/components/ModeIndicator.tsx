"use client";

import { ThinkingMode, getModeColor, getModeName } from "@/lib/api";

interface ModeIndicatorProps {
  mode: ThinkingMode;
  confidence: number;
}

export default function ModeIndicator({ mode, confidence }: ModeIndicatorProps) {
  const color = getModeColor(mode);
  const name = getModeName(mode);
  const confidencePct = Math.round(confidence * 100);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 space-y-4 animate-fade-in">
      <div>
        <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">
          Current Mode
        </div>
        <div
          className="text-2xl font-bold transition-all duration-300"
          style={{ color }}
        >
          {name}
        </div>
      </div>

      <div>
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>Confidence</span>
          <span>{confidencePct}%</span>
        </div>
        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-500 ease-out rounded-full"
            style={{
              width: `${confidencePct}%`,
              backgroundColor: color,
            }}
          />
        </div>
      </div>

      <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
        <div className="text-xs text-slate-500">
          Yentellect detected this thinking mode from your language patterns.
        </div>
      </div>
    </div>
  );
}