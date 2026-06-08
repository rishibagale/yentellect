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
  const confidenceLabel =
    confidencePct >= 80 ? "High" : confidencePct >= 50 ? "Medium" : "Low";

  return (
    <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-5 space-y-3 animate-fade-in">
      <div>
        <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">
          Current mode
        </div>
        <div
          className="text-xl font-bold transition-all duration-300"
          style={{ color }}
        >
          {name}
        </div>
      </div>

      <div>
        <div className="flex justify-between text-xs text-slate-500 mb-1.5">
          <span>Confidence</span>
          <span className="font-medium text-slate-300">
            {confidencePct}%{" "}
            <span className="text-slate-500 font-normal">({confidenceLabel})</span>
          </span>
        </div>
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-700 ease-out rounded-full"
            style={{
              width: `${confidencePct}%`,
              backgroundColor: color,
            }}
          />
        </div>
      </div>

      <div className="pt-2 border-t border-white/5">
        <div className="text-xs text-slate-500">
          Detected from your language patterns.
        </div>
      </div>
    </div>
  );
}
