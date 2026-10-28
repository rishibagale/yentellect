/**
 * Yentellect workbench — Title bar (Stage 1).
 * 36px. Workspace name left, Lens Chat toggle + "Cmd+K" hint right.
 */
"use client";

interface TitleBarProps {
  onOpenPalette: () => void;
  onToggleLens?: () => void;
  lensOpen?: boolean;
}

export default function TitleBar({ onOpenPalette, onToggleLens, lensOpen }: TitleBarProps) {
  return (
    <header
      data-region="titlebar"
      className="h-9 shrink-0 flex items-center justify-between px-3 border-b border-[var(--border)] bg-[var(--bg-1)]"
    >
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-[var(--text)] truncate">
          Untitled workspace
        </span>
      </div>
      <div className="flex items-center gap-2">
        {onToggleLens && (
          <button
            type="button"
            onClick={onToggleLens}
            aria-label="Toggle Lens Chat (Shift+L)"
            title="Toggle Lens Chat (Shift+L)"
            className={`flex items-center gap-1.5 rounded-[var(--radius)] border px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
              lensOpen
                ? "bg-[var(--bg-2)] border-[var(--accent)]/50 text-[var(--accent)] shadow-sm"
                : "border-[var(--border)] bg-[var(--bg-0)] text-[var(--text-dim)] hover:text-[var(--text)] hover:border-[var(--text-dim)]"
            }`}
          >
            <span className="text-[12px] leading-none">◈</span>
            <span>Lens Chat</span>
            <kbd aria-hidden="true" className="font-[inherit] text-[9px] opacity-70 border border-[var(--border)] px-1 rounded-[2px]">
              ⇧L
            </kbd>
          </button>
        )}
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
      </div>
    </header>
  );
}
