/**
 * Yentellect workbench — side panel router (Stage 1 + Stage 6).
 *
 * The activity bar picks WHICH view occupies the side region. The region id
 * stays `pane-explorer` for every activity so the Splitter's aria-controls
 * and resize measurement (document.getElementById) never lose their target.
 */
"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import ExplorerPanel from "./ExplorerPanel";
import SettingsForm from "@/components/SettingsForm";
import type { Activity } from "@/lib/workbench/layout";
import type { WorkDoc } from "@/lib/workbench/db";
import type { LensThread } from "@/lib/workbench/lens-thread";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

function GraphTab({ thread, doc }: { thread?: LensThread | null; doc?: WorkDoc | null }) {
  const kept = useMemo(() => thread?.connections.filter((c) => c.status === "kept") ?? [], [thread?.connections]);
  const graphData = useMemo(() => {
    const nodes = new Map<string, any>();
    const centerId = doc?.id ?? thread?.pinnedDocTitle ?? "source";
    nodes.set(centerId, { id: centerId, name: doc?.title ?? thread?.pinnedDocTitle ?? "Source", group: "source", val: 6 });
    const links: any[] = [];
    for (const entry of kept) {
      const conn = entry.connection;
      const id = `${entry.id}`;
      nodes.set(id, { id, name: conn.summary.slice(0, 60), group: conn.type, val: 4 });
      links.push({ source: centerId, target: id, label: conn.type === "analogy" ? "analogy" : "system" });
    }
    return { nodes: Array.from(nodes.values()), links };
  }, [kept, doc, thread?.pinnedDocTitle]);

  return (
    <section
      id="pane-explorer"
      data-region="side-graph"
      aria-label="Graph"
      className="h-full flex flex-col overflow-hidden bg-[var(--bg-1)]"
    >
      <div className="px-3 py-2 text-[11px] uppercase tracking-[0.08em] text-[var(--text-dim)] shrink-0">
        Graph (2D)
      </div>
      <div className="flex-1 min-h-0">
        {kept.length === 0 ? (
          <p className="px-3 py-2 text-xs text-[var(--text-dim)]">Keep connections in the lens to see them here.</p>
        ) : (
          <ForceGraph2D
            graphData={graphData}
            nodeLabel="name"
            linkLabel="label"
            nodeColor={(node: any) => (node.group === "analogy" ? "#5eb0ef" : node.group === "system" ? "#9d7bff" : "#b9c0c9")}
            linkColor={() => "rgba(185,192,201,0.4)"}
            linkDirectionalArrowLength={4}
            linkDirectionalArrowRelPos={1}
          />
        )}
      </div>
    </section>
  );
}

export default function SidePanelView({
  activity,
  betaModes,
  onToggleBetaModes,
  doc,
  docs,
  openDoc,
  onDeleteDoc,
  thread,
}: {
  activity: Activity;
  betaModes: boolean;
  onToggleBetaModes: (on: boolean) => void;
  doc?: WorkDoc | null;
  docs?: WorkDoc[];
  openDoc: (doc: WorkDoc) => void;
  onDeleteDoc?: (id: string) => void;
  thread?: LensThread | null;
}) {
  if (activity === "graph") return <GraphTab thread={thread} doc={doc} />;

  if (activity !== "settings") return <ExplorerPanel doc={doc} docs={docs} openDoc={openDoc} onDeleteDoc={onDeleteDoc} />;

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
