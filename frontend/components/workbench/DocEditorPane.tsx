"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, placeholder } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import "katex/dist/katex.min.css";
import { getDoc, pendingBody, putDoc, setPendingBody, type WorkDoc } from "@/lib/workbench/db";
import type { ThinkingMode } from "@/lib/modes";
import { renderMarkdownWithKaTeX } from "@/lib/workbench/render-doc";
import FloatingSelectionToolbar from "./FloatingSelectionToolbar";

const SAVE_DEBOUNCE_MS = 800;

export type ViewMode = "read" | "split" | "edit";

const KIND_LABEL: Record<WorkDoc["kind"], string> = {
  paper: "Paper",
  concept: "Concept",
  note: "Note",
  article: "Article",
  dataset: "Dataset",
};

/**
 * Custom CodeMirror dark theme matching workbench tokens
 */
const workbenchEditorTheme = EditorView.theme({
  "&": {
    height: "100%",
    fontSize: "14px",
    backgroundColor: "transparent",
    color: "var(--text)",
  },
  ".cm-content": {
    fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace",
    padding: "20px 24px",
    caretColor: "var(--accent)",
    lineHeight: "1.65",
    minHeight: "100%",
  },
  "&.cm-focused": {
    outline: "none",
  },
  "&.cm-focused .cm-cursor": {
    borderLeftColor: "var(--accent)",
    borderLeftWidth: "2px",
  },
  "&.cm-focused .cm-selectionBackground, ::selection": {
    backgroundColor: "color-mix(in srgb, var(--accent) 30%, transparent)",
  },
  ".cm-scroller": {
    overflow: "auto",
    height: "100%",
    fontFamily: "inherit",
  },
  ".cm-placeholder": {
    color: "var(--text-dim)",
    fontStyle: "italic",
  },
  ".cm-line": {
    padding: "0 2px",
  },
});

export interface DocEditorPaneProps {
  doc: WorkDoc;
  /** Body to start from. Defaults to the doc's persisted body. */
  initialBody?: string;
  onAskLens?: (text: string, mode?: ThinkingMode) => void;
  onSaved?: (body: string) => void;
}

export default function DocEditorPane({
  doc,
  initialBody,
  onAskLens,
  onSaved,
}: DocEditorPaneProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const startBody = initialBody ?? doc.body ?? "";
  const [body, setBody] = useState(startBody);

  // Default to 'read' mode for academic papers; 'edit' for notes/concepts
  const [mode, setMode] = useState<ViewMode>(() =>
    doc.kind === "paper" ? "read" : "edit"
  );
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [docId, setDocId] = useState(doc.id);

  // Floating selection state
  const [selection, setSelection] = useState<{
    text: string;
    coords: { x: number; y: number } | null;
  }>({ text: "", coords: null });

  /** Latest body + dirty flag, readable from the unmount cleanup. */
  const latest = useRef({ body: startBody, dirty: false, docId: doc.id });
  useEffect(() => {
    latest.current.body = body;
    latest.current.dirty = dirty;
    latest.current.docId = docId;
  }, [body, dirty, docId]);

  // A different doc swapped in externally: reset body + save state.
  useEffect(() => {
    if (doc.id === docId) return;
    setDocId(doc.id);
    const newBody = initialBody ?? doc.body ?? "";
    setBody(newBody);
    setDirty(false);
    setSavedAt(null);
    setMode(doc.kind === "paper" ? "read" : "edit");
    setSelection({ text: "", coords: null });

    // Update CodeMirror doc if already mounted
    if (viewRef.current) {
      const state = viewRef.current.state;
      const currentDoc = state.doc.toString();
      if (currentDoc !== newBody) {
        viewRef.current.dispatch({
          changes: { from: 0, to: currentDoc.length, insert: newBody },
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.id]);

  // Listen for text selections in editor or preview
  const handleSelectionChange = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) {
      setSelection({ text: "", coords: null });
      return;
    }
    const text = sel.toString().trim();
    if (text.length < 3) {
      setSelection({ text: "", coords: null });
      return;
    }
    try {
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;
      setSelection({
        text,
        coords: { x: rect.left + rect.width / 2, y: rect.top },
      });
    } catch {
      setSelection({ text: "", coords: null });
    }
  }, []);

  useEffect(() => {
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, [handleSelectionChange]);

  const handleAskSelection = useCallback(
    (text: string, askMode: ThinkingMode) => {
      onAskLens?.(text, askMode);
      setSelection({ text: "", coords: null });
    },
    [onAskLens]
  );

  // Mount CodeMirror once hostRef is available.
  // Because hostRef is ALWAYS in the DOM (hidden via CSS when mode === "read"),
  // hostRef.current is guaranteed to exist on initial render and never unmount!
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    if (viewRef.current) {
      viewRef.current.destroy();
      viewRef.current = null;
    }

    const start = body;
    setPendingBody(doc.id, start);

    const updateListener = EditorView.updateListener.of((update) => {
      if (!update.docChanged) return;
      const next = update.state.doc.toString();
      setBody(next);
      setPendingBody(doc.id, next);
      setDirty(true);
    });

    const state = EditorState.create({
      doc: start,
      extensions: [
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        markdown(),
        EditorView.lineWrapping,
        workbenchEditorTheme,
        placeholder("Write your thoughts, paste excerpts, or explore ideas with LaTeX $...$ math…"),
        updateListener,
      ],
    });

    const view = new EditorView({ state, parent: host });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.id]);

  const saveRef = useRef<(bodyToSave: string, idToSave: string) => Promise<void>>(async () => {});
  saveRef.current = async (bodyToSave: string, idToSave: string) => {
    const existing = await getDoc(idToSave);
    if (!existing) return;
    const now = Date.now();
    await putDoc({
      ...existing,
      body: bodyToSave,
      updatedAt: now,
    });
    setPendingBody(idToSave, bodyToSave);
    if (latest.current.docId === idToSave) {
      setDirty(false);
      setSavedAt(now);
      onSaved?.(bodyToSave);
    }
    // Sync to local bridge so external agents (Cline, Claude Code, Cursor) always have latest written text
    try {
      fetch("http://127.0.0.1:8787/api/active-paper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: existing.title,
          abstract: existing.abstract || "",
          source: existing.source || existing.kind,
          url: existing.url || "",
          year: existing.year || "",
          body: bodyToSave,
        }),
      }).catch(() => {});
    } catch {}
  };

  useEffect(() => {
    if (!dirty) return;
    const id = doc.id;
    const currentBody = body;
    const timer = setTimeout(() => {
      void saveRef.current(currentBody, id);
    }, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [body, dirty, doc.id]);

  useEffect(() => {
    const latestRef = latest;
    return () => {
      const snapshot = latestRef.current;
      const b = pendingBody(snapshot.docId) ?? (snapshot.dirty ? snapshot.body : undefined);
      if (b !== undefined) {
        void saveRef.current(b, snapshot.docId);
      }
    };
  }, []);

  const askFullBody = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (trimmed.length === 0) return;
      onAskLens?.(trimmed);
    },
    [onAskLens]
  );

  // Render LaTeX & Markdown with KaTeX
  const previewHtml = useMemo(() => {
    return renderMarkdownWithKaTeX(body);
  }, [body]);

  const byline =
    doc.authors && doc.authors.length > 0 ? doc.authors.join(", ") : KIND_LABEL[doc.kind];

  return (
    <div className="flex h-full flex-col overflow-hidden relative bg-[var(--bg-0)]">
      <FloatingSelectionToolbar
        selectionText={selection.text}
        coords={selection.coords}
        onAsk={handleAskSelection}
        onDismiss={() => setSelection({ text: "", coords: null })}
      />

      {/* DOCUMENT HEADER & METADATA BAR */}
      <header className="flex flex-shrink-0 items-center justify-between gap-4 border-b border-[var(--border)] px-4 py-2.5 bg-[var(--bg-1)] shadow-2xs">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2
              className="text-sm font-semibold text-[var(--text)] truncate max-w-xl"
              title={doc.title}
            >
              {doc.title}
            </h2>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-[var(--bg-2)] border border-[var(--border)] text-[var(--text-dim)] shrink-0">
              {KIND_LABEL[doc.kind]}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-[var(--text-dim)] mt-0.5 truncate">
            <span className="truncate max-w-md">{byline}</span>
            {doc.year && <span>· {doc.year}</span>}
            {doc.url ? (
              <>
                <span>·</span>
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--accent)] hover:underline inline-flex items-center gap-0.5"
                >
                  <span>{doc.source === "crossref" ? "DOI" : "arXiv"}</span>
                  <span className="text-[10px]">↗</span>
                </a>
              </>
            ) : null}
          </div>
        </div>

        {/* CONTROLS: VIEW MODES + SAVE STATUS */}
        <div className="flex flex-shrink-0 items-center gap-3">
          <span className="text-[11px] text-[var(--text-dim)] hidden sm:inline flex items-center gap-1.5">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                dirty ? "bg-amber-400 animate-pulse" : savedAt ? "bg-emerald-400" : "bg-[var(--text-dim)]/40"
              }`}
            />
            {dirty ? "Editing…" : savedAt ? "Saved" : "Auto-saves"}
          </span>

          {/* VIEW MODE TOGGLE (Read | Split | Edit) */}
          <div className="flex items-center rounded-lg bg-[var(--bg-2)]/90 p-0.5 border border-[var(--border)] text-xs">
            <button
              type="button"
              onClick={() => setMode("read")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-[var(--radius)] transition-all cursor-pointer ${
                mode === "read"
                  ? "bg-[var(--bg-0)] text-[var(--text)] font-semibold shadow-2xs"
                  : "text-[var(--text-dim)] hover:text-[var(--text)]"
              }`}
              title="Academic Reading View (KaTeX Math & Markdown)"
            >
              <span>📖</span>
              <span className="hidden md:inline">Read</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("split");
                // Focus editor on switch
                setTimeout(() => viewRef.current?.focus(), 50);
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-[var(--radius)] transition-all cursor-pointer ${
                mode === "split"
                  ? "bg-[var(--bg-0)] text-[var(--text)] font-semibold shadow-2xs"
                  : "text-[var(--text-dim)] hover:text-[var(--text)]"
              }`}
              title="Side-by-Side: Editor & Live KaTeX Preview"
            >
              <span>◫</span>
              <span className="hidden md:inline">Split</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("edit");
                // Focus editor on switch
                setTimeout(() => viewRef.current?.focus(), 50);
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-[var(--radius)] transition-all cursor-pointer ${
                mode === "edit"
                  ? "bg-[var(--bg-0)] text-[var(--text)] font-semibold shadow-2xs"
                  : "text-[var(--text-dim)] hover:text-[var(--text)]"
              }`}
              title="Focused CodeMirror Editor"
            >
              <span>✎</span>
              <span className="hidden md:inline">Edit</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN DOCUMENT VIEWPORT */}
      <div className="min-h-0 flex-1 overflow-hidden relative">
        {/* 
          IMPORTANT: hostRef MUST ALWAYS stay mounted in the DOM.
          If it is conditionally unmounted during "read" mode, CodeMirror gets destroyed
          or fails to initialize on load because hostRef.current is null when doc opens in Read!
          Using CSS display (hidden vs flex vs block) keeps the editor alive and responsive.
        */}
        <div
          className={`h-full w-full ${
            mode === "read"
              ? "hidden"
              : mode === "split"
              ? "flex flex-row divide-x divide-[var(--border)]"
              : "block"
          }`}
        >
          {/* EDITOR COLUMN */}
          <div
            className={`h-full overflow-hidden bg-[var(--bg-0)] ${
              mode === "split" ? "flex-1 min-w-0" : "max-w-4xl mx-auto w-full"
            }`}
          >
            <div ref={hostRef} className="h-full w-full" data-testid="doc-editor" />
          </div>

          {/* SPLIT LIVE PREVIEW COLUMN */}
          {mode === "split" && (
            <div className="flex-1 min-w-0 h-full overflow-y-auto px-6 py-6 bg-[var(--bg-0)]/50">
              <div className="max-w-2xl mx-auto">
                {doc.abstract && (
                  <div className="mb-6 rounded-lg border border-[var(--accent)]/20 bg-[var(--accent)]/5 p-3.5 text-xs">
                    <span className="text-[11px] font-semibold text-[var(--accent)] block mb-1">
                      ◈ Abstract
                    </span>
                    <p className="text-[12.5px] leading-relaxed text-[var(--text-dim)] italic font-serif">
                      {doc.abstract}
                    </p>
                  </div>
                )}
                <article
                  className="research-doc-body text-[14.5px]"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              </div>
            </div>
          )}
        </div>

        {/* READ ONLY ACADEMIC VIEW */}
        {mode === "read" && (
          <div
            className="h-full overflow-y-auto px-6 py-8 bg-[var(--bg-0)]"
            data-testid="doc-preview"
          >
            <div className="max-w-4xl mx-auto">
              {/* ABSTRACT CALLOUT */}
              {doc.abstract && (
                <div className="mb-8 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/5 p-5 shadow-2xs">
                  <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-[var(--accent)]/15">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)] flex items-center gap-1.5">
                      <span>◈</span> Abstract
                    </span>
                    <span className="text-[10px] font-mono text-[var(--text-dim)]">
                      {doc.source ? doc.source.toUpperCase() : "ORIGINAL PUBLICATION"}
                    </span>
                  </div>
                  <p className="text-[14px] leading-relaxed text-[var(--text)]/90 italic font-serif">
                    {doc.abstract}
                  </p>
                </div>
              )}

              {/* RENDERED MARKDOWN + KATEX MATH */}
              <article
                className="research-doc-body"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          </div>
        )}
      </div>

      {/* FOOTER ACTION BAR */}
      {onAskLens ? (
        <footer className="flex-shrink-0 border-t border-[var(--border)] px-4 py-2 bg-[var(--bg-1)] flex items-center justify-between">
          <span className="text-[11px] text-[var(--text-dim)] flex items-center gap-1.5">
            <span>💡</span>
            <span>Highlight any equation or text to probe with Socratic Lens</span>
          </span>
          <button
            type="button"
            onClick={() => askFullBody(body)}
            className="flex items-center gap-1.5 text-xs font-medium text-[var(--accent)] hover:text-[var(--text)] bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 border border-[var(--accent)]/30 px-3 py-1.5 rounded-[var(--radius)] transition-colors cursor-pointer shadow-2xs"
          >
            <span>◈</span>
            <span>Send entire document to Lens</span>
            <span aria-hidden="true">→</span>
          </button>
        </footer>
      ) : null}
    </div>
  );
}
