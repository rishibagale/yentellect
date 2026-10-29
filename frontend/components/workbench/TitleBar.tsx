/**
 * Yentellect workbench — Title bar (Stage 1).
 * 36px. Yentellect brand + workspace title left, user status, Lens Chat toggle + "Cmd+K" hint right.
 */
"use client";

import { useSupabase } from "@/utils/supabase/provider";

interface TitleBarProps {
  onOpenPalette: () => void;
  onToggleLens?: () => void;
  lensOpen?: boolean;
}

export default function TitleBar({ onOpenPalette, onToggleLens, lensOpen }: TitleBarProps) {
  const { user } = useSupabase();
  const userIdentifier = user?.user_metadata?.display_name || user?.email?.split("@")[0] || null;

  return (
    <header
      data-region="titlebar"
      className="h-9 shrink-0 flex items-center justify-between px-3 border-b border-[var(--border)] bg-[var(--bg-1)] select-none"
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs font-semibold text-[var(--accent)] tracking-tight">
          Yentellect
        </span>
        <span className="text-[var(--text-dim)]/40 text-xs">/</span>
        <span className="text-xs font-medium text-[var(--text)] truncate">
          Research Workspace
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {userIdentifier && (
          <span
            className="text-[11px] text-[var(--text-dim)] max-w-[140px] truncate hidden md:inline-block px-1"
            title={user?.email ?? undefined}
          >
            {userIdentifier}
          </span>
        )}

        {onToggleLens && (
          <button
            type="button"
            onClick={onToggleLens}
            aria-label="Toggle Lens Chat (Shift+L)"
            title="Toggle Lens Chat (Shift+L)"
            className={`flex items-center gap-1.5 rounded-[var(--radius)] border px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
              lensOpen
                ? "bg-[var(--bg-2)] border-[var(--accent)]/50 text-[var(--accent)] shadow-2xs"
                : "border-[var(--border)] bg-[var(--bg-0)] text-[var(--text-dim)] hover:text-[var(--text)] hover:border-[var(--text-dim)]"
            }`}
          >
            <span className="text-[11px] leading-none">◈</span>
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
          title="Command Palette (Cmd+K)"
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
