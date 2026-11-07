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
  /** Delete a document from the library. */
  onDeleteDoc?: (id: string) => void;
};

const KIND_LABEL: Record<WorkDoc["kind"], string> = {
  paper: "Paper",
  concept: "Concept",
  note: "Note",
  article: "Article",
  dataset: "Dataset",
  graph: "Graph",
};

export default function ExplorerPanel({ doc, docs = [], openDoc, onDeleteDoc }: Props) {
  return (
    <section
      id="pane-explorer"
      data-region="explorer"
      aria-label="Library"
      className="flex h-full flex-col overflow-hidden bg-[var(--bg-1)]"
    >
      <div className="px-3 py-2 text-[11px] uppercase tracking-[0.08em] text-[var(--text-dim)]">
        Library
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pb-3">
        {doc ? (
          <div className="mb-4 border border-[var(--border)] rounded-lg p-3 bg-[var(--bg-0)] shadow-2xs">
            <div className="text-[10px] uppercase tracking-[0.05em] text-[var(--text-dim)]">
              Open now
            </div>
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

        <div className="mb-2 text-[10px] uppercase tracking-[0.05em] text-[var(--text-dim)]">
          Docs ({docs.length})
        </div>
        <div className="flex flex-col gap-1">
          {docs.map((d) => (
            <div
              key={d.id}
              className={`group flex items-center justify-between rounded-md px-2 py-1.5 text-[12px] leading-snug transition-colors duration-150 hover:bg-[var(--bg-2)] ${
                doc?.id === d.id ? "bg-[var(--bg-2)]/70 text-[var(--accent)]" : "text-[var(--text)]"
              }`}
            >
              <button
                type="button"
                onClick={() => openDoc?.(d)}
                aria-current={doc?.id === d.id ? "true" : undefined}
                className="flex-1 text-left min-w-0 focus:outline-none"
              >
                <span className="block truncate font-medium">{d.title || "(untitled)"}</span>
                <span className="text-[10px] text-[var(--text-dim)]">{KIND_LABEL[d.kind]}</span>
              </button>

              {onDeleteDoc && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Remove "${d.title}" from library?`)) {
                      onDeleteDoc(d.id);
                    }
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-[var(--text-dim)] hover:text-[var(--danger)] transition-all ml-1 shrink-0 rounded"
                  title="Remove from library"
                  aria-label={`Remove ${d.title} from library`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          ))}
          {docs.length === 0 && (
            <div className="text-[12px] text-[var(--text-dim)] py-2">
              No docs yet. Import a paper or try the demo.
            </div>
          )}
        </div>

        <div className="mt-6 mb-[2px] text-[10px] uppercase tracking-[0.05em] text-[var(--text-dim)]">
          Recent sessions
        </div>
        <SessionHistoryList variant="panel" />
      </div>
    </section>
  );
}
