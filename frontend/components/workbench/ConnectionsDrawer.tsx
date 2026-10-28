/**
 * Yentellect workbench — Connections drawer (Stage 6).
 */
"use client";

import type { LensThread } from "@/lib/workbench/lens-thread";

export default function ConnectionsDrawer({ thread }: { thread?: LensThread | null }) {
  const connections = thread?.connections ?? [];
  const kept = connections.filter((c) => c.status === "kept");

  return (
    <section
      id="pane-connections"
      data-region="connections"
      aria-label="Connections"
      className="h-full flex flex-col overflow-hidden bg-[var(--bg-1)] border-t border-[var(--border)]/70"
    >
      <div className="px-3 py-2 text-[11px] font-medium text-[var(--text-dim)] flex items-center justify-between border-b border-[var(--border)]/40">
        <span className="uppercase tracking-wider text-[10px]">Saved Connections</span>
        <span>{kept.length} kept</span>
      </div>
      {kept.length === 0 ? (
        <p className="px-3 py-3 text-xs text-[var(--text-dim)] leading-relaxed">
          Keep connections from the lens thread to see them organized here.
        </p>
      ) : (
        <div className="flex-1 overflow-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[var(--text-dim)] border-b border-[var(--border)]/30">
                <th className="text-left px-3 py-1.5 font-normal">Type</th>
                <th className="text-left px-3 py-1.5 font-normal">Summary</th>
                <th className="text-right px-3 py-1.5 font-normal">Actions</th>
              </tr>
            </thead>
            <tbody>
              {kept.map((entry) => (
                <tr key={entry.id} className="border-b border-[var(--border)]/30 hover:bg-[var(--bg-2)]/50 transition-colors">
                  <td className="px-3 py-2 text-[var(--text-dim)] capitalize">{entry.connection.type}</td>
                  <td className="px-3 py-2 text-[var(--text)] truncate max-w-[200px]" title={entry.connection.summary}>
                    {entry.connection.summary}
                  </td>
                  <td className="px-3 py-2 text-right space-x-2">
                    <button
                      type="button"
                      onClick={() => thread?.discard(entry.id)}
                      className="text-[var(--text-dim)] hover:text-[var(--danger)] transition-colors text-[11px]"
                    >
                      Discard
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
