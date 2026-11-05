/**
 * Yentellect workbench — Status bar (Stage 1, C8).
 * 24px. Active lens, word count, connection count, quick command launcher, save state.
 */
"use client";

import type { ThinkingMode } from "@/lib/modes";
import { MODES } from "@/lib/modes";
import { isMacOS } from "@/lib/workbench/commands";
import { useEffect, useState } from "react";

interface StatusBarProps {
  activeLens: ThinkingMode;
  words: number;
  kept: number;
  saved: boolean;
  onOpenPalette?: () => void;
}

export default function StatusBar({
  activeLens,
  words,
  kept,
  saved,
  onOpenPalette,
}: StatusBarProps) {
  const lens = MODES[activeLens];
  const [modLabel, setModLabel] = useState("Ctrl+");

  useEffect(() => {
    setModLabel(isMacOS() ? "⌘" : "Ctrl+");
  }, []);

  return (
    <footer
      data-region="statusbar"
      aria-label="Status"
      className="h-6 w-full shrink-0 flex items-center gap-3 px-3 border-t border-[var(--border)] bg-[var(--bg-1)] text-[11px] text-[var(--text-dim)] select-none z-20"
    >
      <span
        aria-label={`Active lens: ${lens.label}`}
        title={`Active lens: ${lens.label}`}
        className="text-[var(--text)] flex items-center gap-1 font-medium"
      >
        <span className="text-[var(--accent)]">◈</span> {lens.label}
      </span>
      <span className="text-[var(--border)]">|</span>
      <span aria-label={`${words} words`} title={`${words} words`}>
        {words} words
      </span>
      <span aria-label={`${kept} kept connections`} title={`${kept} kept connections`}>
        {kept} kept
      </span>

      <div className="ml-auto flex items-center gap-3">
        {onOpenPalette && (
          <button
            type="button"
            onClick={onOpenPalette}
            className="hover:text-[var(--text)] transition-colors flex items-center gap-1.5 cursor-pointer px-1.5 py-0.5 rounded hover:bg-[var(--bg-2)]"
            title={`Open Command Palette (${modLabel}K)`}
          >
            <span>Commands</span>
            <kbd className="text-[9px] px-1 rounded bg-[var(--bg-0)] border border-[var(--border)] font-mono">
              {modLabel}K
            </kbd>
          </button>
        )}
        <span className="text-[var(--border)]">|</span>
        <span
          role="status"
          aria-live="polite"
          className={saved ? "text-[var(--text-dim)]" : "text-amber-400 font-medium"}
        >
          {saved ? "saved" : "unsaved"}
        </span>
      </div>
    </footer>
  );
}
