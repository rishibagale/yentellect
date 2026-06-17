"use client";

import { getModeColor, getModeName, type ThinkingMode } from "@/lib/api";

interface ModeBadgeProps {
  mode: ThinkingMode;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export default function ModeBadge({ mode, size = "md", showLabel = true }: ModeBadgeProps) {
  const color = getModeColor(mode);
  const label = getModeName(mode);

  const sizeMap = {
    sm: { dot: "w-1.5 h-1.5", text: "text-[10px]", px: "px-1.5 py-0.5" },
    md: { dot: "w-2 h-2", text: "text-xs", px: "px-2 py-1" },
    lg: { dot: "w-2.5 h-2.5", text: "text-sm", px: "px-2.5 py-1.5" },
  };

  const s = sizeMap[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${s.px} ${s.text}`}
      style={{
        backgroundColor: `${color}15`,
        color: color,
        border: `0.5px solid ${color}30`,
      }}
    >
      <span className={`${s.dot} rounded-full`} style={{ backgroundColor: color }} />
      {showLabel && label}
    </span>
  );
}