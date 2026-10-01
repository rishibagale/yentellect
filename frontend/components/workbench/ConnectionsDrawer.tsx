/**
 * Yentellect workbench — Connections drawer (Stage 1 placeholder).
 * Collapsible, default 200px. The synthesis table lands in Stage 6;
 * this shell pins the region, the label, and the empty-state line.
 */
"use client";

export default function ConnectionsDrawer() {
  return (
    <section
      id="pane-connections"
      data-region="connections"
      aria-label="Connections"
      className="h-full flex flex-col overflow-hidden bg-[var(--bg-1)]"
    >
      <div className="px-3 py-2 text-[11px] uppercase tracking-[0.08em] text-[var(--text-dim)]">
        Connections
      </div>
      <p className="px-3 pb-3 text-xs text-[var(--text-dim)]">
        Synthesis and kept connections land in Stage 6. Nothing kept yet.
      </p>
    </section>
  );
}
