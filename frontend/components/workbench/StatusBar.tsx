/**
 * Yentellect workbench — Status bar (Stage 1, C8).
 * 24px. Active lens, word count, connection count, save state.
 * These are artifact-state readouts (C8), not metrics: zero is honest state.
 */
"use client";

import type { ThinkingMode } from "@/lib/modes";
import { MODES } from "@/lib/modes";

interface StatusBarProps {
  activeLens: ThinkingMode;
  words: number;
  kept: number;
  saved: boolean;
}

export default function StatusBar({ activeLens, words, kept, saved }: StatusBarProps) {
  const lens = MODES[activeLens];
  return (
    <footer
      data-region="statusbar"
      aria-label="Status"
      className="h-6 shrink-0 flex items-center gap-4 px-3 border-t border-[var(--border)] bg-[var(--bg-1)] text-[11px] text-[var(--text-dim)]"
    >
      <span aria-label={`Active lens: ${lens.label}`} className="text-[var(--text)]">
        ◈ {lens.label}
      </span>
      <span aria-label={`${words} words`}>{words} words</span>
      <span aria-label={`${kept} kept connections`}>{kept} kept</span>
      <span className="ml-auto" role="status" aria-live="polite">
        {saved ? "saved" : "unsaved"}
      </span>
    </footer>
  );
}
