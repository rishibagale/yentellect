/**
 * Yentellect workbench — side panel router (Stage 1).
 *
 * The activity bar picks WHICH view occupies the side region. The region id
 * stays `pane-explorer` for every activity so the Splitter's aria-controls
 * and resize measurement (document.getElementById) never lose their target.
 * Explorer keeps its own body; the other views land in later stages, so they
 * render honest placeholders — Settings is fully reformed now (shared with
 * the /settings route via components/SettingsForm.tsx).
 */
"use client";

import Link from "next/link";
import ExplorerPanel from "./ExplorerPanel";
import SettingsForm from "@/components/SettingsForm";
import type { Activity } from "@/lib/workbench/layout";

const LABELS: Record<Activity, string> = {
  explorer: "Explorer",
  graph: "Knowledge graph",
  search: "Search",
  settings: "Settings",
};

export default function SidePanelView({
  activity,
  betaModes,
  onToggleBetaModes,
}: {
  activity: Activity;
  betaModes: boolean;
  onToggleBetaModes: (on: boolean) => void;
}) {
  if (activity === "explorer") return <ExplorerPanel />;

  return (
    <section
      id="pane-explorer"
      data-region={`side-${activity}`}
      aria-label={LABELS[activity]}
      className="h-full flex flex-col overflow-hidden bg-[var(--bg-1)]"
    >
      <div className="px-3 py-2 text-[11px] uppercase tracking-[0.08em] text-[var(--text-dim)] shrink-0">
        {LABELS[activity]}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 px-3 pb-3">
        {activity === "settings" && (
          <SettingsForm betaModes={betaModes} onToggleBetaModes={onToggleBetaModes} />
        )}

        {activity === "graph" && (
          <div className="space-y-3">
            <p className="text-xs text-[var(--text-dim)]">
              The graph tab lands in Stage 6. The working knowledge graph lives on the
              profile page until then.
            </p>
            <Link
              href="/profile"
              className="block text-xs bg-[var(--accent)] text-[var(--bg-0)] rounded-lg px-3 py-2 text-center hover:opacity-90 transition"
            >
              Open knowledge graph
            </Link>
          </div>
        )}

        {activity === "search" && (
          <p className="text-xs text-[var(--text-dim)]">
            Search across areas and notes lands in Stage 2.
          </p>
        )}
      </div>
    </section>
  );
}
