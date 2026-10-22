"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, placeholder } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import katex from "katex";
import "katex/dist/katex.min.css";
import { getDoc, pendingBody, putDoc, setPendingBody, type WorkDoc } from "@/lib/workbench/db";

const SAVE_DEBOUNCE_MS = 800;

type PreviewMode = "edit" | "preview";

const KIND_LABEL: Record<WorkDoc["kind"], string> = {
  paper: "Paper",
  concept: "Concept",
  note: "Note",
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
  onAskLens?: (text: string) => void;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.id]);

  // Create / destroy the CodeMirror view keyed on doc identity.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    if (viewRef.current) {
      viewRef.current.destroy();
      viewRef.current = null;
    }
    const state = EditorState.create({
      doc: initialBody ?? doc.body ?? "",
      extensions: [
        history(),
        EditorView.lineWrapping,
        placeholder("Write equations with $...$ or $$...$$; notes save automatically."),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const text = update.state.doc.toString();
            setPendingBody(docId, text);
            setBody(text);
            setDirty(true);
          }
        }),
        markdown(),
      ],
    });
    const view = new EditorView({ state, parent: host });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // remount deliberately on doc swap so editor doc matches state
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.id, docId]);

  const save = useCallback(
    async (text: string, targetId: string) => {
      const existing = (await getDoc(targetId)) ?? null;
      // Nothing changed: don't rewrite the row (a rewrite would bump
      // updatedAt and reorder the library for no reason).
      if (existing && existing.body === text) {
        if (latest.current.docId === targetId) {
          setSavedAt(Date.now());
          setDirty(false);
        }
        return;
      }
      const next: WorkDoc = {
        ...(existing ?? doc),
        id: targetId,
        body: text,
      };
      await putDoc(next);
      if (latest.current.docId !== targetId) return;
      setSavedAt(Date.now());
      setDirty(false);
      onSaved?.(text);
    },
    [doc, onSaved]
  );

  /** Save through a ref so the unmount flush never depends on re-renders. */
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  // Debounced autosave. Only runs once the body is actually dirty, so
  // opening a document never rewrites it.
  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(() => {
      void saveRef.current(body, docId);
    }, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [body, dirty, docId]);

  // Unmount flush: switching tabs or closing the editor must not lose the
  // last keystrokes that were still inside the debounce window. The body
  // comes from the pending registry, which the editor updates SYNCHRONOUSLY
  // on every keystroke — a React ref would lag by a render and could
  // rewrite an older body over the newer one.
  useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const snapshot = latest.current;
      const body = pendingBody(snapshot.docId) ?? (snapshot.dirty ? snapshot.body : undefined);
      if (body !== undefined) {
        void saveRef.current(body, snapshot.docId);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const askSelection = useCallback(
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
    <div className="flex h-full flex-col overflow-hidden">
      <header className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-medium text-[var(--text)]">{doc.title}</h2>
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
            className="rounded-[var(--radius)] border border-[var(--border)] px-2 py-1 text-xs text-[var(--text)] hover:bg-[var(--bg-2)]"
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
        <footer className="flex-shrink-0 border-t border-[var(--border)] px-4 py-2">
          <button
            type="button"
            onClick={() => askSelection(body)}
            className="text-xs text-[var(--accent)] hover:underline"
          >
            Send note to lens
          </button>
        </footer>
      ) : null}
    </div>
  );
}
