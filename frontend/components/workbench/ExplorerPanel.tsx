"use client";

import SessionHistoryList from "@/components/SessionHistoryList";
import type { WorkDoc } from "@/lib/workbench/db";

type Props = {
  /** The document currently open in the editor, if any. */
  doc?: WorkDoc | null;
  /** The library contents (live). */
  docs?: WorkDoc[];
  /** Open a document in a tab (or focus its existing tab). */
  openDoc?: (doc: WorkDoc) => void;
};

const KIND_LABEL: Record<WorkDoc["kind"], string> = {
  paper: "Paper",
  concept: "Concept",
  note: "Note",
  article: "Article",
  dataset: "Dataset",
};

export default function ExplorerPanel({ doc, docs = [], openDoc }: Props) {
  return (
    <section
      id="pane-explorer"
      data-region="explorer"
      aria-label="Library"
      className="flex h-full flex-col overflow-hidden bg-[var(--bg-1)]"
    >
      <div className="px-3 py-2 text-[11px] uppercase tracking-[0.08em] text-[var(--text-dim)]">Library</div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pb-3">
        {doc ? (
          <div className="mb-4 border border-[var(--border)] rounded-lg p-3 bg-[var(--bg-0)]">
            <div className="text-[10px] uppercase tracking-[0.05em] text-[var(--text-dim)]">Open now</div>
            {doc.url ? (
              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 block text-[12px] font-medium leading-snug text-[var(--text)] hover:text-[var(--accent)]"
              >
                {doc.title}
              </a>
            ) : (
              <div className="mt-1 text-[12px] font-medium leading-snug text-[var(--text)]">
                {doc.title}
              </div>
            )}
            <div className="mt-1 text-[11px] text-[var(--text-dim)]">
              {[doc.authors?.slice(0, 2).join(", "), doc.year].filter(Boolean).join(" · ") ||
                KIND_LABEL[doc.kind]}
            </div>
          </div>
        ) : null}

        <div className="mb-2 text-[10px] uppercase tracking-[0.05em] text-[var(--text-dim)]">Docs</div>
        <div className="flex flex-col gap-1">
          {docs.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => openDoc?.(d)}
              aria-current={doc?.id === d.id ? "true" : undefined}
              className={`w-full rounded-md px-2 py-1 text-left text-[12px] leading-snug transition-colors duration-150 hover:bg-[var(--bg-2)] focus:outline-none ${
                doc?.id === d.id ? "text-[var(--accent)]" : "text-[var(--text)]"
              }`}
            >
              <span className="block truncate">{d.title || "(untitled)"}</span>
              <span className="text-[10px] text-[var(--text-dim)]">{KIND_LABEL[d.kind]}</span>
            </button>
          ))}
          {docs.length === 0 && (
            <div className="text-[12px] text-[var(--text-dim)]">No docs yet. Import a paper or write a concept.</div>
          )}
        </div>

        <div className="mt-6 mb-[2px] text-[10px] uppercase tracking-[0.05em] text-[var(--text-dim)]">Recent sessions</div>
        <SessionHistoryList variant="panel" />
      </div>
    </section>
  );
}
