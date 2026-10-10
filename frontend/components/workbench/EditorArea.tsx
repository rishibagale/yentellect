/**
 * Yentellect workbench — Editor area (Stages 1 + 4).
 * Flexible. Tabs and a real editor land in Stage 3; for now the pane has
 * exactly three states: the import prompt (arXiv URL / DOI), a read-only
 * paper view whose selection can be sent to the lens, and the first-run
 * prompt in the palette style (spec):
 * "Import a paper or write a concept to begin."
 */
"use client";

import { useEffect, useState } from "react";
import type { ImportedDoc } from "@/lib/workbench/import-client";

interface EditorAreaProps {
  onOpenPalette: () => void;
  doc?: ImportedDoc | null;
  importOpen?: boolean;
  importStatus?: "idle" | "loading" | "error";
  importError?: string | null;
  onSubmitImport?: (raw: string) => void;
  onCancelImport?: () => void;
  onAskLens?: (text: string) => void;
}

/** A selection must be a real passage before it is worth sending. */
const MIN_SELECTION = 20;

export default function EditorArea({
  onOpenPalette,
  doc = null,
  importOpen = false,
  importStatus = "idle",
  importError = null,
  onSubmitImport,
  onCancelImport,
  onAskLens,
}: EditorAreaProps) {
  const [draft, setDraft] = useState("");
  const [selection, setSelection] = useState<string | null>(null);

  const loading = importStatus === "loading";

  // A fresh prompt starts empty; a stale draft from last time is noise.
  useEffect(() => {
    if (importOpen) setDraft("");
  }, [importOpen]);

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    const raw = draft.trim();
    if (!raw || loading) return;
    onSubmitImport?.(raw);
  }

  /** Mouse-up = the user just finished (or cleared) a text selection. */
  function handleMouseUp(): void {
    const selected = window.getSelection();
    const text = selected ? selected.toString().trim() : "";
    setSelection(text.length >= MIN_SELECTION ? text : null);
  }

  function handleAskLens(): void {
    if (!selection) return;
    const text = selection;
    window.getSelection()?.removeAllRanges();
    setSelection(null);
    onAskLens?.(text);
  }

  return (
    <main
      data-region="editor"
      aria-label="Editor"
      className="h-full flex-1 min-w-0 flex flex-col bg-[var(--bg-0)]"
    >
      <div
        aria-label="Breadcrumb"
        className="h-8 shrink-0 flex items-center px-3 border-b border-[var(--border)] text-[11px] text-[var(--text-dim)] truncate"
      >
        {doc ? doc.title : "No document open"}
      </div>

      {importOpen ? (
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-8">
          <div className="mx-auto w-full max-w-[72ch]">
            <h1 className="text-[11px] uppercase tracking-[0.08em] text-[var(--text-dim)]">
              Import a paper
            </h1>
            <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="arXiv URL or DOI — e.g. arxiv.org/abs/1706.03762 or 10.1145/3544548.3581234"
                aria-label="arXiv URL or DOI"
                className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-1)] px-3 py-2 text-[13px] text-[var(--text)] placeholder:text-[var(--text-dim)]"
              />
              {importStatus === "error" && importError && (
                <p role="alert" className="text-[12px] text-[var(--danger)]">
                  {importError}
                </p>
              )}
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-[var(--radius)] bg-[var(--accent)] px-3 py-1.5 text-[12px] text-[var(--bg-1)] transition-opacity duration-150 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Importing…" : "Import"}
                </button>
                <button
                  type="button"
                  onClick={onCancelImport}
                  className="rounded-[var(--radius)] border border-[var(--border)] px-3 py-1.5 text-[12px] text-[var(--text-dim)] hover:text-[var(--text)] transition-colors duration-150"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : doc ? (
        <div className="flex-1 min-h-0 relative" onMouseUp={handleMouseUp}>
          <div className="h-full overflow-y-auto px-6 py-8">
            <article className="mx-auto max-w-[72ch] font-doc">
              <h1 className="text-[22px] leading-[1.35] text-[var(--text)]">{doc.title}</h1>
              <p className="mt-2 text-[14px] text-[var(--text-dim)]">
                {doc.authors.join(", ")}
                {doc.year ? ` · ${doc.year}` : ""}
              </p>
              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-[12px] text-[var(--accent)] hover:underline"
              >
                {doc.source === "arxiv" ? "arXiv" : "DOI"}
              </a>
              {doc.abstract ? (
                doc.abstract.split(/\n{2,}/).map((paragraph, i) => (
                  <p
                    key={`abstract-${i}`}
                    className="mt-4 whitespace-pre-wrap break-words max-w-[72ch] font-doc text-[var(--text)]"
                  >
                    {paragraph}
                  </p>
                ))
              ) : (
                <p className="mt-4 text-[13px] text-[var(--text-dim)]">
                  No abstract in the registry record — paste a passage into the lens composer.
                </p>
              )}
            </article>
          </div>
          {selection && (
            <button
              type="button"
              onClick={handleAskLens}
              className="absolute bottom-4 right-4 rounded-[var(--radius)] bg-[var(--accent)] px-2.5 py-1.5 text-[11px] text-[var(--bg-1)] transition-opacity duration-150 hover:opacity-90"
            >
              Ask lens about selection
            </button>
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center px-4">
          <button
            type="button"
            onClick={onOpenPalette}
            className="w-full max-w-md rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-1)] px-4 py-3 text-center text-sm text-[var(--text-dim)] hover:text-[var(--text)] hover:border-[var(--text-dim)] transition-colors"
          >
            Import a paper or write a concept to begin.
          </button>
        </div>
      )}
    </main>
  );
}
