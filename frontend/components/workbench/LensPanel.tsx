/**
 * Yentellect workbench — Lens panel (Stage 1 placeholder).
 * 360px default, resizable, collapsible. Threads land in Stage 5;
 * this shell pins the segmented control from the spec.
 */
"use client";

import { useState } from "react";
import type { ThinkingMode } from "@/lib/modes";
import { MODES, visibleLenses } from "@/lib/modes";

interface LensPanelProps {
  activeLens: ThinkingMode;
  onSelect: (lens: ThinkingMode) => void;
  betaModes: boolean;
}

export default function LensPanel({ activeLens, onSelect, betaModes }: LensPanelProps) {
  const [collapsed] = useState(false);
  const lenses = visibleLenses(betaModes);

  return (
    <section
      id="pane-lens"
      data-region="lens"
      aria-label="Lens panel"
      className="h-full flex flex-col overflow-hidden bg-[var(--bg-1)]"
    >
      <div
        role="tablist"
        aria-label="Lens"
        className="flex gap-1 p-2 border-b border-[var(--border)]"
      >
        {lenses.map((lens) => {
          const info = MODES[lens];
          const selected = lens === activeLens;
          const beta = lens !== "ANALOGICAL" && lens !== "SYSTEMS";
          return (
            <button
              key={lens}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onSelect(lens)}
              className={`flex-1 rounded-[var(--radius)] px-2 py-1.5 text-xs transition-colors ${
                selected
                  ? "bg-[var(--bg-2)] text-[var(--text)] border border-[var(--border)]"
                  : "text-[var(--text-dim)] border border-transparent hover:text-[var(--text)]"
              }`}
            >
              {info.label}
              {beta && (
                <span className="ml-1 rounded-[var(--radius)] border border-[var(--border)] px-1 text-[10px] text-[var(--text-dim)]">
                  Beta
                </span>
              )}
            </button>
          );
        })}
      </div>
      {!collapsed && (
        <p className="px-3 py-2 text-xs text-[var(--text-dim)]">
          Threads land in Stage 5. “Import a paper or write a concept to begin.”
        </p>
      )}
    </section>
  );
}
