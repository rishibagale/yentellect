/**
 * Yentellect workbench — Explorer sidebar (Stage 1 placeholder).
 * 240px default, resizable, collapsible. The file tree lands in Stage 2;
 * this shell pins the region, the label, and the collapse affordance.
 */
"use client";

export default function ExplorerPanel() {
  return (
    <section
      id="pane-explorer"
      data-region="explorer"
      aria-label="Explorer"
      className="h-full overflow-hidden bg-[var(--bg-1)]"
    >
      <div className="px-3 py-2 text-[11px] uppercase tracking-[0.08em] text-[var(--text-dim)]">
        Explorer
      </div>
      <p className="px-3 text-xs text-[var(--text-dim)]">
        Your areas and documents will appear here.
      </p>
    </section>
  );
}
