/**
 * Yentellect workbench — Editor area (Stage 1 placeholder).
 * Flexible. Tabs, breadcrumb, content land in Stage 3.
 * Shows the first-run prompt in the palette style (spec):
 * "Import a paper or write a concept to begin."
 */
"use client";

interface EditorAreaProps {
  onOpenPalette: () => void;
}

export default function EditorArea({ onOpenPalette }: EditorAreaProps) {
  return (
    <main
      data-region="editor"
      aria-label="Editor"
      className="h-full flex-1 min-w-0 flex flex-col bg-[var(--bg-0)]"
    >
      <div
        aria-label="Breadcrumb"
        className="h-8 shrink-0 flex items-center px-3 border-b border-[var(--border)] text-[11px] text-[var(--text-dim)]"
      >
        No document open
      </div>
      <div className="flex-1 flex items-center justify-center px-4">
        <button
          type="button"
          onClick={onOpenPalette}
          className="w-full max-w-md rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-1)] px-4 py-3 text-center text-sm text-[var(--text-dim)] hover:text-[var(--text)] hover:border-[var(--text-dim)] transition-colors"
        >
          Import a paper or write a concept to begin.
        </button>
      </div>
    </main>
  );
}
