/**
 * Yentellect workbench — Editor area (Stage 3).
 * Three states: the import prompt (arXiv URL / DOI), the editable
 * doc pane (CodeMirror + KaTeX, saved to the local library), and the
 * first-run prompt in the palette style (spec):
 * "Import a paper or write a concept to begin."
 *
 * The top row is the TAB STRIP: every open document, with the active one
 * focused. Tabs hold ids only — the body lives in the Dexie library, so
 * switching tabs never shows a stale copy of a note.
 */

"use client";

import { useEffect, useState } from "react";
import type { WorkDoc } from "@/lib/workbench/db";
import type { TabMeta } from "@/lib/workbench/tabs";
import DocEditorPane from "./DocEditorPane";

interface EditorAreaProps {
  onOpenPalette: () => void;
  /** The active document, or null when no tab is focused. */
  doc?: WorkDoc | null;
  /** Open documents, in tab order. */
  tabs?: TabMeta[];
  /** Id of the focused tab. */
  activeTabId?: string | null;
  onSelectTab?: (id: string) => void;
  onCloseTab?: (id: string) => void;
  importOpen?: boolean;
  importStatus?: "idle" | "loading" | "error";
  importError?: string | null;
  onSubmitImport?: (raw: string) => void;
  onCancelImport?: () => void;
  onAskLens?: (text: string) => void;
  onRenameTab?: (id: string, title: string) => void;
}

const KIND_LABEL: Record<TabMeta["kind"], string> = {
  paper: "Paper",
  concept: "Concept",
  note: "Note",
};

export default function EditorArea({
  onOpenPalette,
  doc = null,
  tabs = [],
  activeTabId = null,
  onSelectTab,
  onCloseTab,
  importOpen = false,
  importStatus = "idle",
  importError = null,
  onSubmitImport,
  onCancelImport,
  onAskLens,
  onRenameTab,
}: EditorAreaProps) {
  const [draft, setDraft] = useState("");
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");

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

  function commitRename(id: string): void {
    const title = newTitle.trim();
    if (!title || title === tabs.find((t) => t.id === id)?.title) {
      setEditingTabId(null);
      setNewTitle("");
      return;
    }
    onRenameTab?.(id, title);
    setEditingTabId(null);
    setNewTitle("");
  }

  function cancelRename(): void {
    setEditingTabId(null);
    setNewTitle("");
  }

  const waitingForDoc = activeTabId !== null && doc === null;

  return (
    <main
      data-region="editor"
      aria-label="Editor"
      className="h-full flex-1 min-w-0 flex flex-col bg-[var(--bg-0)]"
    >
      {/* Tab strip — one row, so the editor's vertical budget is unchanged. */}
      <div
        role="tablist"
        aria-label="Open documents"
        className="h-8 shrink-0 flex items-stretch overflow-x-auto border-b border-[var(--border)] bg-[var(--bg-1)]"
      >
        {tabs.length === 0 ? (
          <span className="flex items-center px-3 text-[11px] text-[var(--text-dim)]">
            No document open
          </span>
        ) : (
          tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                tabIndex={isActive ? 0 : -1}
                onClick={() => onSelectTab?.(tab.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectTab?.(tab.id);
                  }
                }}
                title={`${tab.title} — ${KIND_LABEL[tab.kind]}`}
                className={`group flex shrink-0 cursor-pointer items-center gap-2 border-r border-[var(--border)] px-3 text-[11px] transition-colors duration-150 ${
                  isActive
                    ? "bg-[var(--bg-0)] text-[var(--text)] shadow-[inset_0_-1px_0_0_var(--accent)]"
                    : "text-[var(--text-dim)] hover:bg-[var(--bg-2)] hover:text-[var(--text)]"
                }`}
              >
                {editingTabId === tab.id ? (
                  <input
                    autoFocus
                    value={newTitle || tab.title}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        commitRename(tab.id);
                      } else if (e.key === "Escape") {
                        cancelRename();
                      }
                    }}
                    onBlur={() => commitRename(tab.id)}
                    className="flex-1 min-w-0 bg-transparent border-none px-2 py-0.5 text-xs text-[var(--text)] focus:outline-none focus:ring-0"
                    maxLength={120}
                  />
                ) : (
                  <span
                    className="max-w-[24ch] truncate cursor-pointer select-none"
                    onDoubleClick={() => {
                      setEditingTabId(tab.id);
                      setNewTitle(tab.title);
                    }}
                  >
                    {tab.title || "(untitled)"}
                  </span>
                )}
                <button
                  type="button"
                  aria-label={`Close ${tab.title || "document"}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab?.(tab.id);
                  }}
                  onAuxClick={(e) => {
                    if (e.button === 1) {
                      e.preventDefault();
                      e.stopPropagation();
                      onCloseTab?.(tab.id);
                    }
                  }}
                  className="rounded-[2px] px-1 text-[var(--text-dim)] opacity-0 transition-opacity duration-150 hover:text-[var(--danger)] focus:opacity-100 group-hover:opacity-100"
                >
                  ×
                </button>
              </div>
            );
          })
        )}
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
        <DocEditorPane
          key={doc.id}
          doc={doc}
          initialBody={doc.body}
          onAskLens={onAskLens}
        />
      ) : waitingForDoc ? (
        <div className="flex-1 flex items-center justify-center px-4 text-[12px] text-[var(--text-dim)]">
          Loading document…
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
