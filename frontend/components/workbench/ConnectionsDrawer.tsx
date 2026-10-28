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
      className="h-full flex flex-col overflow-hidden bg-[var(--bg-1)] border-t border-[var(--border)]"
    >
      <div className="px-3 py-1.5 text-[11px] uppercase tracking-[0.08em] text-[var(--text-dim)] flex items-center justify-between">
        <span>Connections</span>
        <span>{kept.length} kept</span>
      </div>
      {kept.length === 0 ? (
        <p className="px-3 py-2 text-xs text-[var(--text-dim)]">
          Keep connections from the lens thread to see them here.
        </p>
      ) : (
        <div className="flex-1 overflow-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[var(--text-dim)]">
                <th className="text-left px-3 py-1.5 font-normal">Type</th>
                <th className="text-left px-3 py-1.5 font-normal">Summary</th>
                <th className="text-right px-3 py-1.5 font-normal">Actions</th>
              </tr>
            </thead>
            <tbody>
              {kept.map((entry) => (
                <tr key={entry.id} className="border-t border-[var(--border)] hover:bg-[var(--bg-2)]">
                  <td className="px-3 py-1.5 text-[var(--text-dim)] capitalize">{entry.connection.type}</td>
                  <td className="px-3 py-1.5 text-[var(--text)] truncate max-w-[200px]" title={entry.connection.summary}>
                    {entry.connection.summary}
                  </td>
                  <td className="px-3 py-1.5 text-right space-x-2">
                    <button
                      type="button"
                      onClick={() => thread?.discard(entry.id)}
                      className="text-[var(--text-dim)] hover:text-[var(--text)]"
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
