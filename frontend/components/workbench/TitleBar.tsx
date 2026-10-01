/**
 * Yentellect workbench — Title bar (Stage 1).
 * 36px. Workspace name left, "Cmd+K" hint right.
 */
"use client";

interface TitleBarProps {
  onOpenPalette: () => void;
}

export default function TitleBar({ onOpenPalette }: TitleBarProps) {
  return (
    <header
      data-region="titlebar"
      className="h-9 shrink-0 flex items-center justify-between px-3 border-b border-[var(--border)] bg-[var(--bg-1)]"
    >
      <span className="text-xs font-medium text-[var(--text)] truncate">
        Untitled workspace
      </span>
      <button
        type="button"
        onClick={onOpenPalette}
        aria-label="Open command palette (Cmd+K)"
        className="flex items-center gap-1.5 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-0)] px-2 py-0.5 text-[11px] text-[var(--text-dim)] hover:text-[var(--text)] hover:border-[var(--text-dim)] transition-colors"
      >
        <kbd aria-hidden="true" className="font-[inherit]">
          ⌘K
        </kbd>
      </button>
    </header>
  );
}
