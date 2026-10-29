/**
 * Yentellect workbench — Floating selection toolbar (Stage 3).
 *
 * When a user highlights text in the document editor or preview pane,
 * this compact pill appears directly above the highlighted selection,
 * allowing instant Socratic probing with the Analogical or Systems lens.
 */
"use client";

import { useEffect, useRef } from "react";
import type { ThinkingMode } from "@/lib/modes";

interface FloatingSelectionToolbarProps {
  selectionText: string;
  coords: { x: number; y: number } | null;
  onAsk: (text: string, mode: ThinkingMode) => void;
  onDismiss: () => void;
}

export default function FloatingSelectionToolbar({
  selectionText,
  coords,
  onAsk,
  onDismiss,
}: FloatingSelectionToolbarProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onDismiss();
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [onDismiss]);

  if (!coords || !selectionText.trim()) return null;

  return (
    <div
      ref={ref}
      style={{
        top: `${Math.max(coords.y - 44, 12)}px`,
        left: `${coords.x}px`,
        transform: "translateX(-50%)",
      }}
      className="fixed z-50 flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--bg-0)] p-1 text-xs shadow-xl animate-in fade-in zoom-in-95 duration-100 select-none backdrop-blur-sm"
      role="toolbar"
      aria-label="Selection lenses"
    >
      <span className="px-2 text-[10px] uppercase tracking-wider text-[var(--text-dim)] font-medium">
        Probe
      </span>

      <button
        type="button"
        onClick={() => onAsk(selectionText, "ANALOGICAL")}
        className="flex items-center gap-1 rounded-full bg-[var(--accent)]/10 hover:bg-[var(--accent)]/25 text-[var(--accent)] border border-[var(--accent)]/30 px-2.5 py-1 text-[11px] font-medium transition-colors"
        title="Find structural analogies for this passage"
      >
        <span>◈</span>
        <span>Analogical</span>
      </button>

      <button
        type="button"
        onClick={() => onAsk(selectionText, "SYSTEMS")}
        className="flex items-center gap-1 rounded-full bg-[#9d7bff]/10 hover:bg-[#9d7bff]/25 text-[#9d7bff] border border-[#9d7bff]/30 px-2.5 py-1 text-[11px] font-medium transition-colors"
        title="Map systemic dynamics and feedback loops"
      >
        <span>⟳</span>
        <span>Systems</span>
      </button>

      <button
        type="button"
        onClick={onDismiss}
        className="p-1 text-[var(--text-dim)] hover:text-[var(--text)] text-xs ml-0.5 rounded-full"
        aria-label="Dismiss toolbar"
        title="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}

