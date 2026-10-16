/**
 * Yentellect workbench — Library sidebar (Stage 1, Tier B).
 * 240px default, resizable, collapsible. Pins the imported doc at top
 * and lists recent sessions below. File tree lands in Stage 2.
 */
"use client";

import type { ImportedDoc } from "@/lib/workbench/import-client";
import SessionHistoryList from "@/components/SessionHistoryList";

interface ExplorerPanelProps {
  doc?: ImportedDoc | null;
}

export default function ExplorerPanel({ doc }: ExplorerPanelProps) {
  return (
    <section
      id="pane-explorer"
      data-region="explorer"
      aria-label="Library"
      className="h-full overflow-hidden bg-[var(--bg-1)]"
    >
      <div className="px-3 py-2 text-[11px] uppercase tracking-[0.08em] text-[var(--text-dim)]">
        Library
      </div>
      <div className="flex-1 overflow-y-auto min-h-0 px-3 pb-3">
        {doc && (
          <div className="mb-4 border border-[var(--border)] rounded-lg p-3 bg-[var(--bg-0)]">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] uppercase tracking-[0.05em] text-[var(--text-dim)]">
                Pinned paper
              </span>
            </div>
            <a
              href={doc.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-[var(--text)] hover:underline"
            >
              {doc.title}
            </a>
            <p className="text-xs text-[var(--text-dim)] mt-1">
              {doc.authors.slice(0, 2).join(", ")}
              {doc.authors.length > 2 ? " et al." : ""}
              {doc.year ? ` · ${doc.year}` : ""}
            </p>
          </div>
        )}
        <div className="mb-2">
          <span className="text-[10px] uppercase tracking-[0.05em] text-[var(--text-dim)]">
            Recent sessions
          </span>
        </div>
        <SessionHistoryList variant="panel" />
      </div>
    </section>
  );
}
