/**
 * Yentellect workbench — Editor area (Stage 3 + Multi-Platform Import).
 *
 * Supports:
 * 1. Tab strip with double-click inline rename and middle-click to close
 * 2. Editable doc pane (CodeMirror + KaTeX, autosaved to Dexie)
 * 3. Multi-platform research importer:
 *    - Academic links & IDs: arXiv, DOI, bioRxiv, PubMed, PMC, and Web/Journal articles
 *    - File uploads: PDF papers, Markdown notes (.md), Text (.txt), CSV/JSON datasets
 *    - Text / Abstract paste
 */

"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { WorkDoc, DocKind } from "@/lib/workbench/db";
import type { TabMeta } from "@/lib/workbench/tabs";
import type { ThinkingMode } from "@/lib/modes";
import { isMacOS } from "@/lib/workbench/commands";
import { getGraph, type D3GraphData } from "@/lib/api";
import { useSupabase } from "@/utils/supabase/provider";
import DocEditorPane from "./DocEditorPane";

const KnowledgeGraph = dynamic(() => import("@/components/KnowledgeGraph"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center text-xs font-mono text-[var(--text-dim)]">
      Initializing 3D Cognitive Lattice…
    </div>
  ),
});

const NodeDetailPanel = dynamic(() => import("@/components/NodeDetailPanel"), {
  ssr: false,
});

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
  onSubmitFileImport?: (file: File) => void;
  onSubmitCustomDoc?: (doc: { title: string; body: string; kind: DocKind }) => void;
  onCancelImport?: () => void;
  onAskLens?: (text: string, mode?: ThinkingMode) => void;
  onRenameTab?: (id: string, title: string) => void;
  onLoadDemo?: () => void;
  onOpenImport?: () => void;
  onOpenGraphTab?: () => void;
}

const KIND_LABEL: Record<DocKind, string> = {
  paper: "Paper",
  concept: "Concept",
  note: "Note",
  article: "Article",
  dataset: "Dataset",
  graph: "Graph",
};

type ImportTab = "link" | "file" | "paste";

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
  onSubmitFileImport,
  onSubmitCustomDoc,
  onCancelImport,
  onAskLens,
  onRenameTab,
  onLoadDemo,
  onOpenImport,
  onOpenGraphTab,
}: EditorAreaProps) {
  const { user } = useSupabase();
  const [draft, setDraft] = useState("");
  const [importTab, setImportTab] = useState<ImportTab>("link");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [customBody, setCustomBody] = useState("");
  const [customKind, setCustomKind] = useState<DocKind>("paper");

  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isGraphTab =
    activeTabId === "system:knowledge-graph" ||
    tabs.find((t) => t.id === activeTabId)?.kind === "graph";

  const [graphData, setGraphData] = useState<D3GraphData | null>(null);
  const [selectedGraphNode, setSelectedGraphNode] = useState<any | null>(null);

  useEffect(() => {
    if (isGraphTab && !graphData) {
      getGraph()
        .then((d) => setGraphData(d))
        .catch((err) => console.warn("Failed to load graph data for editor tab:", err));
    }
  }, [isGraphTab, graphData]);

  const loading = importStatus === "loading";

  // Reset import state when opened
  useEffect(() => {
    if (importOpen) {
      setDraft("");
      setSelectedFile(null);
      setCustomTitle("");
      setCustomBody("");
      setCustomKind("paper");
    }
  }, [importOpen]);

  function handleLinkSubmit(e: React.FormEvent): void {
    e.preventDefault();
    const raw = draft.trim();
    if (!raw || loading) return;
    onSubmitImport?.(raw);
  }

  function handleFileSubmit(e: React.FormEvent): void {
    e.preventDefault();
    if (!selectedFile || loading) return;
    onSubmitFileImport?.(selectedFile);
  }

  function handlePasteSubmit(e: React.FormEvent): void {
    e.preventDefault();
    const body = customBody.trim();
    if (!body || loading) return;
    onSubmitCustomDoc?.({
      title: customTitle.trim() || `Untitled ${customKind}`,
      body,
      kind: customKind,
    });
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

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function onDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  }

  const waitingForDoc = activeTabId !== null && doc === null;

  return (
    <main
      data-region="editor"
      aria-label="Editor"
      className="h-full flex-1 min-w-0 flex flex-col bg-[var(--bg-0)]"
    >
      {/* Tab strip */}
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
            const isGraph = tab.id === "system:knowledge-graph" || tab.kind === "graph";
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
                title={`${tab.title} — ${KIND_LABEL[tab.kind] ?? "Document"}`}
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
                    className="flex items-center gap-1.5 max-w-[24ch] truncate cursor-pointer select-none"
                    onDoubleClick={() => {
                      if (!isGraph) {
                        setEditingTabId(tab.id);
                        setNewTitle(tab.title);
                      }
                    }}
                  >
                    {isGraph && <span className="text-xs text-[var(--accent)]">◈</span>}
                    <span>{tab.title || (isGraph ? "Knowledge Graph" : "(untitled)")}</span>
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
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-8 bg-[var(--bg-0)]">
          <div className="mx-auto w-full max-w-[76ch] border border-[var(--border)] rounded-[var(--radius)] bg-[var(--bg-1)] p-6 shadow-md">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-4 mb-5">
              <div>
                <h1 className="text-sm font-semibold text-[var(--text)] tracking-wide">
                  Import Research & Data
                </h1>
                <p className="text-xs text-[var(--text-dim)] mt-0.5">
                  Load academic publications, preprints, journal articles, notes, or datasets.
                </p>
              </div>
              <button
                type="button"
                onClick={onCancelImport}
                aria-label="Cancel import"
                className="text-xs text-[var(--text-dim)] hover:text-[var(--text)] transition-colors p-1"
              >
                ✕
              </button>
            </div>

            {/* Source Type Selector Tabs */}
            <div className="flex gap-2 border-b border-[var(--border)] pb-3 mb-5">
              <button
                type="button"
                onClick={() => setImportTab("link")}
                className={`px-3 py-1.5 rounded-[var(--radius)] text-xs font-medium transition-colors ${
                  importTab === "link"
                    ? "bg-[var(--bg-2)] text-[var(--accent)] border border-[var(--border)] shadow-sm"
                    : "text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--bg-2)]/50 border border-transparent"
                }`}
              >
                Academic Link / Identifier
              </button>
              <button
                type="button"
                onClick={() => setImportTab("file")}
                className={`px-3 py-1.5 rounded-[var(--radius)] text-xs font-medium transition-colors ${
                  importTab === "file"
                    ? "bg-[var(--bg-2)] text-[var(--accent)] border border-[var(--border)] shadow-sm"
                    : "text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--bg-2)]/50 border border-transparent"
                }`}
              >
                Upload File / Dataset
              </button>
              <button
                type="button"
                onClick={() => setImportTab("paste")}
                className={`px-3 py-1.5 rounded-[var(--radius)] text-xs font-medium transition-colors ${
                  importTab === "paste"
                    ? "bg-[var(--bg-2)] text-[var(--accent)] border border-[var(--border)] shadow-sm"
                    : "text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--bg-2)]/50 border border-transparent"
                }`}
              >
                Paste Text / Abstract
              </button>
            </div>

            {/* TAB 1: Link & Identifier */}
            {importTab === "link" && (
              <form onSubmit={handleLinkSubmit} className="flex flex-col gap-4">
                <div>
                  <label htmlFor="import-link-input" className="block text-xs font-medium text-[var(--text)] mb-1.5">
                    URL or Publication Identifier
                  </label>
                  <input
                    id="import-link-input"
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="arXiv link, DOI (10.xxxx/...), bioRxiv URL, PubMed ID (pmid:12345), or web article..."
                    aria-label="Publication URL or identifier"
                    className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-0)] px-3 py-2 text-[13px] text-[var(--text)] placeholder:text-[var(--text-dim)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>

                {/* Platform Badges */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-[var(--text-dim)] mr-1">Supported platforms:</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-2)] border border-[var(--border)] text-[var(--text)]">
                    arXiv
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-2)] border border-[var(--border)] text-[var(--text)]">
                    DOI (Crossref)
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-2)] border border-[var(--border)] text-[var(--text)]">
                    bioRxiv / medRxiv
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-2)] border border-[var(--border)] text-[var(--text)]">
                    PubMed / PMC
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-2)] border border-[var(--border)] text-[var(--text)]">
                    Nature, Science & Online Journals
                  </span>
                </div>

                {/* Quick Examples */}
                <div className="border border-[var(--border)]/70 rounded-[var(--radius)] bg-[var(--bg-0)] p-3">
                  <span className="text-[10px] uppercase tracking-wider text-[var(--text-dim)] font-medium block mb-2">
                    Try an example
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setDraft("https://arxiv.org/abs/1706.03762")}
                      className="text-[11px] px-2 py-1 rounded border border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--accent)] hover:border-[var(--accent)]/50 transition-colors"
                    >
                      arXiv: Transformer (1706.03762)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDraft("10.1038/s41586-021-03819-2")}
                      className="text-[11px] px-2 py-1 rounded border border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--accent)] hover:border-[var(--accent)]/50 transition-colors"
                    >
                      Nature DOI: AlphaFold2
                    </button>
                    <button
                      type="button"
                      onClick={() => setDraft("pmid:35848512")}
                      className="text-[11px] px-2 py-1 rounded border border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--accent)] hover:border-[var(--accent)]/50 transition-colors"
                    >
                      PubMed: Cell Therapy (pmid:35848512)
                    </button>
                  </div>
                </div>

                {importStatus === "error" && importError && (
                  <p role="alert" className="text-[12px] text-[var(--danger)]">
                    {importError}
                  </p>
                )}

                <div className="flex items-center gap-2 pt-2 border-t border-[var(--border)]">
                  <button
                    type="submit"
                    disabled={loading || !draft.trim()}
                    className="rounded-[var(--radius)] bg-[var(--accent)] px-4 py-1.5 text-[12px] font-medium text-[var(--bg-0)] transition-opacity duration-150 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                  >
                    {loading ? "Fetching Publication…" : "Import Publication"}
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
            )}

            {/* TAB 2: File Upload (PDF, Markdown, Text, Dataset) */}
            {importTab === "file" && (
              <form onSubmit={handleFileSubmit} className="flex flex-col gap-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.md,.txt,.csv,.tsv,.json"
                  onChange={onFileChange}
                  className="hidden"
                />

                <div
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-[var(--radius)] p-8 text-center cursor-pointer transition-colors ${
                    isDragging
                      ? "border-[var(--accent)] bg-[var(--accent)]/5"
                      : "border-[var(--border)] bg-[var(--bg-0)] hover:border-[var(--text-dim)]"
                  }`}
                >
                  <div className="text-2xl mb-2 text-[var(--text-dim)]">📄</div>
                  {selectedFile ? (
                    <div>
                      <p className="text-sm font-medium text-[var(--text)] truncate max-w-[400px] mx-auto">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-[var(--text-dim)] mt-1">
                        {(selectedFile.size / 1024).toFixed(1)} KB · Click or drag another file to replace
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-medium text-[var(--text)]">
                        Click to select or drag and drop your file here
                      </p>
                      <p className="text-[11px] text-[var(--text-dim)] mt-1">
                        Supported: PDF papers, Markdown notes (.md), Text (.txt), and Datasets (.csv, .tsv, .json)
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[10px] text-[var(--text-dim)]">
                  <div className="p-2 border border-[var(--border)] rounded bg-[var(--bg-0)]">
                    <strong className="block text-[var(--text)]">PDF Papers</strong>
                    Full text extracted
                  </div>
                  <div className="p-2 border border-[var(--border)] rounded bg-[var(--bg-0)]">
                    <strong className="block text-[var(--text)]">Markdown (.md)</strong>
                    Notes & Drafts
                  </div>
                  <div className="p-2 border border-[var(--border)] rounded bg-[var(--bg-0)]">
                    <strong className="block text-[var(--text)]">Datasets (.csv/.tsv)</strong>
                    Schema & Sample Table
                  </div>
                  <div className="p-2 border border-[var(--border)] rounded bg-[var(--bg-0)]">
                    <strong className="block text-[var(--text)]">JSON Data</strong>
                    Structured preview
                  </div>
                </div>

                {importStatus === "error" && importError && (
                  <p role="alert" className="text-[12px] text-[var(--danger)]">
                    {importError}
                  </p>
                )}

                <div className="flex items-center gap-2 pt-2 border-t border-[var(--border)]">
                  <button
                    type="submit"
                    disabled={loading || !selectedFile}
                    className="rounded-[var(--radius)] bg-[var(--accent)] px-4 py-1.5 text-[12px] font-medium text-[var(--bg-0)] transition-opacity duration-150 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                  >
                    {loading ? "Parsing Document…" : "Upload & Parse Document"}
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
            )}

            {/* TAB 3: Paste Custom Text / Abstract */}
            {importTab === "paste" && (
              <form onSubmit={handlePasteSubmit} className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label htmlFor="custom-title-input" className="block text-xs font-medium text-[var(--text)] mb-1">
                      Title / Reference
                    </label>
                    <input
                      id="custom-title-input"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      placeholder="e.g. Scaling Laws for Neural Language Models"
                      className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-0)] px-3 py-1.5 text-[13px] text-[var(--text)] placeholder:text-[var(--text-dim)] focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                  <div className="w-36">
                    <label htmlFor="custom-kind-select" className="block text-xs font-medium text-[var(--text)] mb-1">
                      Kind
                    </label>
                    <select
                      id="custom-kind-select"
                      value={customKind}
                      onChange={(e) => setCustomKind(e.target.value as DocKind)}
                      className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-0)] px-2 py-1.5 text-xs text-[var(--text)] focus:outline-none"
                    >
                      <option value="paper">Paper</option>
                      <option value="article">Article</option>
                      <option value="dataset">Dataset</option>
                      <option value="concept">Concept</option>
                      <option value="note">Note</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="custom-body-input" className="block text-xs font-medium text-[var(--text)] mb-1">
                    Content / Abstract / Excerpt
                  </label>
                  <textarea
                    id="custom-body-input"
                    rows={8}
                    value={customBody}
                    onChange={(e) => setCustomBody(e.target.value)}
                    placeholder="Paste the text, paper abstract, journal excerpt, or dataset notes here..."
                    className="w-full resize-y rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-0)] px-3 py-2 text-[13px] text-[var(--text)] placeholder:text-[var(--text-dim)] focus:outline-none focus:border-[var(--accent)] leading-relaxed font-mono text-xs"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-[var(--border)]">
                  <button
                    type="submit"
                    disabled={loading || !customBody.trim()}
                    className="rounded-[var(--radius)] bg-[var(--accent)] px-4 py-1.5 text-[12px] font-medium text-[var(--bg-0)] transition-opacity duration-150 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                  >
                    Save to Workbench Library
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
            )}
          </div>
        </div>
      ) : isGraphTab ? (
        <div className="flex-1 min-h-0 relative w-full h-full overflow-hidden bg-[#0b0e14]">
          <KnowledgeGraph
            data={graphData}
            userId={user?.id}
            onNodeClick={(node) => setSelectedGraphNode(node)}
          />
          {selectedGraphNode && (
            <NodeDetailPanel
              node={selectedGraphNode}
              onClose={() => setSelectedGraphNode(null)}
              recommendedBridge={graphData?.recommendedBridge}
            />
          )}
        </div>
      ) : doc ? (
        <DocEditorPane
          key={doc.id}
          doc={doc}
          initialBody={doc.body}
          onAskLens={onAskLens}
          onOpenPalette={onOpenPalette}
        />
      ) : waitingForDoc ? (
        <div className="flex-1 flex items-center justify-center px-4 text-[12px] text-[var(--text-dim)]">
          Loading document…
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 max-w-xl mx-auto w-full text-center">
          <div className="w-12 h-12 rounded-2xl bg-[var(--bg-2)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)] text-xl mb-4 shadow-sm">
            ◈
          </div>
          <h2 className="text-base font-semibold text-[var(--text)] mb-1">
            Research Workbench
          </h2>
          <p className="text-xs text-[var(--text-dim)] max-w-md leading-relaxed mb-6">
            Import research papers, write notes with LaTeX math, and uncover structural analogies and systemic dynamics.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full mb-4">
            {onLoadDemo && (
              <button
                type="button"
                onClick={onLoadDemo}
                className="group flex flex-col items-start p-3.5 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/5 hover:bg-[var(--accent)]/10 hover:border-[var(--accent)]/60 text-left transition-all shadow-xs"
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-xs font-semibold text-[var(--accent)]">Try Demo Paper</span>
                  <span className="text-[11px] text-[var(--accent)] opacity-60 group-hover:opacity-100 transition-opacity">→</span>
                </div>
                <span className="text-[11px] text-[var(--text)] font-medium line-clamp-1">
                  Navier-Stokes Problem
                </span>
                <span className="text-[10px] text-[var(--text-dim)] mt-0.5">
                  Pre-loaded with fluid equations & Socratic probes
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenImport ?? onOpenPalette}
              className="group flex flex-col items-start p-3.5 rounded-xl border border-[var(--border)] bg-[var(--bg-1)] hover:bg-[var(--bg-2)] hover:border-[var(--text-dim)] text-left transition-all shadow-xs"
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="text-xs font-semibold text-[var(--text)]">Import Research</span>
                <span className="text-[11px] text-[var(--text-dim)] group-hover:text-[var(--text)] transition-colors">📥</span>
              </div>
              <span className="text-[11px] text-[var(--text-dim)] group-hover:text-[var(--text)] font-medium">
                arXiv, DOI, Web, or PDF
              </span>
              <span className="text-[10px] text-[var(--text-dim)] mt-0.5">
                Automatically formats title, abstract, and text
              </span>
            </button>

            {onOpenGraphTab && (
              <button
                type="button"
                onClick={onOpenGraphTab}
                className="group flex flex-col items-start p-3.5 rounded-xl border border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/10 hover:border-purple-500/60 text-left transition-all shadow-xs"
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-xs font-semibold text-purple-400">Knowledge Graph</span>
                  <span className="text-[11px] text-purple-400 opacity-60 group-hover:opacity-100 transition-opacity">◈</span>
                </div>
                <span className="text-[11px] text-[var(--text)] font-medium line-clamp-1">
                  3D Cognitive Network
                </span>
                <span className="text-[10px] text-[var(--text-dim)] mt-0.5">
                  Spectral observables & Fiedler bridges
                </span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onOpenPalette}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-1)] hover:bg-[var(--bg-2)] px-4 py-3 text-left text-xs text-[var(--text-dim)] hover:text-[var(--text)] hover:border-[var(--text-dim)]/50 transition-all flex items-center justify-between shadow-xs cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-md bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center text-xs font-bold">
                ⚡
              </span>
              <div>
                <span className="font-medium text-[var(--text)] block text-xs">
                  Command Palette & Quick Actions
                </span>
                <span className="text-[10.5px] text-[var(--text-dim)]">
                  Access all research tools, cognitive lenses, and view modes
                </span>
              </div>
            </div>
            <kbd className="text-[10px] border border-[var(--border)] px-2 py-1 rounded-md bg-[var(--bg-0)] font-mono text-[var(--text-dim)] group-hover:text-[var(--text)] font-semibold">
              {typeof navigator !== "undefined" && isMacOS() ? "⌘K" : "Ctrl+K"}
            </kbd>
          </button>
        </div>
      )}
    </main>
  );
}
