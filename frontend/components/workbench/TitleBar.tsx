/**
 * Yentellect workbench — Title bar (Stage 1).
 * 40px height. Workbench branding, prominent central command search bar,
 * user status, Lens Chat toggle, and quick Command Palette button.
 */
"use client";

import { useSupabase } from "@/utils/supabase/provider";
import { isMacOS } from "@/lib/workbench/commands";
import { useState, useEffect } from "react";

interface TitleBarProps {
  onOpenPalette: () => void;
  onToggleLens?: () => void;
  lensOpen?: boolean;
}

export default function TitleBar({ onOpenPalette, onToggleLens, lensOpen }: TitleBarProps) {
  const { user } = useSupabase();
  const [modLabel, setModLabel] = useState("Ctrl+");

  useEffect(() => {
    setModLabel(isMacOS() ? "⌘" : "Ctrl+");
  }, []);

  const userIdentifier =
    user?.user_metadata?.display_name || user?.email?.split("@")[0] || null;

  return (
    <header
      data-region="titlebar"
      className="h-10 shrink-0 flex items-center justify-between px-3 border-b border-[var(--border)] bg-[var(--bg-1)] select-none gap-2 z-20"
    >
      {/* Left: Workbench Brand / Path */}
      <div className="flex items-center gap-2 min-w-0 shrink-0">
        <span className="text-xs font-semibold text-[var(--accent)] tracking-tight flex items-center gap-1.5">
          <span className="text-sm">◈</span>
          <span>Workbench</span>
        </span>
        <span className="text-[var(--text-dim)]/40 text-xs">/</span>
        <span className="text-xs font-medium text-[var(--text)] truncate hidden sm:inline">
          Research Workspace
        </span>
      </div>

      {/* Center: Prominent Command Search Bar */}
      <div className="flex-1 max-w-md mx-auto px-2">
        <button
          type="button"
          onClick={onOpenPalette}
          aria-label={`Open command palette (${modLabel}K)`}
          title={`Find and execute commands (${modLabel}K / ${modLabel}Shift+P)`}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-0)] hover:bg-[var(--bg-2)] hover:border-[var(--text-dim)]/50 transition-all text-xs text-[var(--text-dim)] cursor-pointer group shadow-2xs"
        >
          <svg
            className="w-3.5 h-3.5 text-[var(--text-dim)] group-hover:text-[var(--text)] shrink-0 transition-colors"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <span className="truncate flex-1 text-left text-[11px] group-hover:text-[var(--text)] transition-colors">
            Search commands, papers & lenses…
          </span>
          <kbd className="inline-flex items-center gap-0.5 font-mono text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-1)] border border-[var(--border)] text-[var(--text-dim)] font-medium">
            {modLabel}K
          </kbd>
        </button>
      </div>

      {/* Right: Quick Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {userIdentifier ? (
          <span
            className="text-[11px] text-[var(--text-dim)] max-w-[130px] truncate hidden lg:inline-block px-1"
            title={user?.email ?? undefined}
          >
            {userIdentifier}
          </span>
        ) : (
          <a
            href="/auth/login"
            className="text-[11px] text-[var(--accent)] hover:underline hidden sm:inline-block px-1"
            title="Sign in to sync your research across devices"
          >
            Sign in
          </a>
        )}

        {onToggleLens && (
          <button
            type="button"
            onClick={onToggleLens}
            aria-label="Toggle Lens Chat (Shift+L)"
            title="Toggle Lens Chat (Shift+L)"
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
              lensOpen
                ? "bg-[var(--bg-2)] border-[var(--accent)]/50 text-[var(--accent)] shadow-2xs"
                : "border-[var(--border)] bg-[var(--bg-0)] text-[var(--text-dim)] hover:text-[var(--text)] hover:border-[var(--text-dim)]"
            }`}
          >
            <span className="text-[11px] leading-none">◈</span>
            <span className="hidden sm:inline">Lens Chat</span>
            <kbd
              aria-hidden="true"
              className="font-mono text-[9px] opacity-70 border border-[var(--border)] px-1 rounded"
            >
              ⇧L
            </kbd>
          </button>
        )}

        <button
          type="button"
          onClick={onOpenPalette}
          aria-label={`Commands (${modLabel}K)`}
          title={`Open Command Palette (${modLabel}K)`}
          className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-0)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-dim)] hover:text-[var(--text)] hover:border-[var(--text-dim)] transition-colors cursor-pointer"
        >
          <span className="text-[11px]">⚡</span>
          <span className="hidden md:inline">Commands</span>
        </button>
      </div>
    </header>
  );
}
