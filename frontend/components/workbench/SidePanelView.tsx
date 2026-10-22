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

import ExplorerPanel from "./ExplorerPanel";
import SettingsForm from "@/components/SettingsForm";
import type { Activity } from "@/lib/workbench/layout";
import type { WorkDoc } from "@/lib/workbench/db";

export default function SidePanelView({
  activity,
  betaModes,
  onToggleBetaModes,
  doc,
  docs,
  openDoc,
}: {
  activity: Activity;
  betaModes: boolean;
  onToggleBetaModes: (on: boolean) => void;
  doc?: WorkDoc | null;
  docs?: WorkDoc[];
  openDoc: (doc: WorkDoc) => void;
}) {
  if (activity !== "settings")   return <ExplorerPanel doc={doc} docs={docs} openDoc={openDoc} />;

  return (
    <section
      id="pane-explorer"
      data-region={`side-${activity}`}
      aria-label="Settings"
      className="h-full flex flex-col overflow-hidden bg-[var(--bg-1)]"
    >
      <div className="px-3 py-2 text-[11px] uppercase tracking-[0.08em] text-[var(--text-dim)] shrink-0">
        Settings
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 px-3 pb-3">
        <SettingsForm betaModes={betaModes} onToggleBetaModes={onToggleBetaModes} />
      </div>
    </section>
  );
}
