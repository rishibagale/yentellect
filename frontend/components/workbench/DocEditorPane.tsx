"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, placeholder } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import katex from "katex";
import "katex/dist/katex.min.css";
import { getDoc, pendingBody, putDoc, setPendingBody, type WorkDoc } from "@/lib/workbench/db";
import type { ThinkingMode } from "@/lib/modes";
import FloatingSelectionToolbar from "./FloatingSelectionToolbar";

const SAVE_DEBOUNCE_MS = 800;

type PreviewMode = "edit" | "preview";

const KIND_LABEL: Record<WorkDoc["kind"], string> = {
  paper: "Paper",
  concept: "Concept",
  note: "Note",
  article: "Article",
  dataset: "Dataset",
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const MATH_RE = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;

function renderMathHtml(source: string): string {
  let out = "";
  let last = 0;
  MATH_RE.lastIndex = 0;
  let match = MATH_RE.exec(source);
  while (match !== null) {
    const start = match.index;
    out += escapeHtml(source.slice(last, start));
    const isDisplay = match[1] !== undefined;
    const tex = isDisplay ? match[1] : match[2];
    if (tex) {
      try {
        out += katex.renderToString(tex, {
          throwOnError: false,
          displayMode: isDisplay,
        });
      } catch {
        out += escapeHtml(match[0]);
      }
    }
    last = start + match[0].length;
    match = MATH_RE.exec(source);
  }
  out += escapeHtml(source.slice(last));
  return out;
}

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
  const [mode, setMode] = useState<PreviewMode>("edit");
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
    setBody(initialBody ?? doc.body ?? "");
    setDirty(false);
    setSavedAt(null);
    setMode("edit");
    setSelection({ text: "", coords: null });
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

  // Create / destroy the CodeMirror view keyed on doc identity.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

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

  const previewHtml = useMemo(
    () => (mode === "preview" ? renderMathHtml(body) : ""),
    [mode, body]
  );

  const byline =
    doc.authors && doc.authors.length > 0 ? doc.authors.join(", ") : KIND_LABEL[doc.kind];
  const meta: string[] = [];
  if (doc.year) meta.push(doc.year);
  meta.push(KIND_LABEL[doc.kind]);

  return (
    <div className="flex h-full flex-col overflow-hidden relative">
      <FloatingSelectionToolbar
        selectionText={selection.text}
        coords={selection.coords}
        onAsk={handleAskSelection}
        onDismiss={() => setSelection({ text: "", coords: null })}
      />

      <header className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3 bg-[var(--bg-1)]">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-[var(--text)]">{doc.title}</h2>
          <p className="truncate text-xs text-[var(--text-dim)]">
            {byline} · {meta.join(" · ")}
            {doc.url ? (
              <>
                {" · "}
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--accent)] hover:underline"
                >
                  {doc.source === "crossref" ? "DOI" : "arXiv"}
                </a>
              </>
            ) : null}
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setMode(mode === "edit" ? "preview" : "edit")}
            className="rounded-[var(--radius)] border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--text)] hover:bg-[var(--bg-2)] transition-colors"
            aria-label={mode === "edit" ? "Show math preview" : "Back to editing"}
          >
            {mode === "edit" ? "Preview" : "Edit"}
          </button>
          <span className="text-xs text-[var(--text-dim)]">
            {dirty ? "editing…" : savedAt ? "saved" : "auto-saves"}
          </span>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-hidden">
        {mode === "edit" ? (
          <div ref={hostRef} className="font-doc h-full" data-testid="doc-editor" />
        ) : (
          <div
            className="font-doc h-full max-w-[72ch] overflow-y-auto px-4 py-4 text-[15px] leading-[1.6]"
            data-testid="doc-preview"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        )}
      </div>

      {onAskLens ? (
        <footer className="flex-shrink-0 border-t border-[var(--border)] px-4 py-2 bg-[var(--bg-1)] flex items-center justify-between">
          <span className="text-[11px] text-[var(--text-dim)]">
            Highlight text to ask, or probe entire note
          </span>
          <button
            type="button"
            onClick={() => askFullBody(body)}
            className="flex items-center gap-1.5 text-xs font-medium text-[var(--accent)] hover:text-[var(--text)] bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 border border-[var(--accent)]/30 px-2.5 py-1 rounded-[var(--radius)] transition-colors"
          >
            <span>◈</span>
            <span>Send entire note to lens</span>
            <span aria-hidden="true">→</span>
          </button>
        </footer>
      ) : null}
    </div>
  );
}
