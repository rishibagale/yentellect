"use client";

import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { tokens } from "@/lib/tokens";
import { similarity } from "@/lib/combination/vsa";
import { getModeVector } from "@/lib/combination/modeVectors";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

function modeColor(mode?: string): string {
  const key = (mode || "").toUpperCase();
  return (tokens.colors.modes as Record<string, string>)[key] || "#6C63FF";
}
function friendlyModeName(mode?: string) {
  const map: Record<string, string> = {
    CONVERGENT: "Convergent", DIVERGENT: "Divergent", ANALOGICAL: "Analogical",
    METACOGNITIVE: "Metacognitive", SYSTEMS: "Systems", DMN: "Default Mode",
  };
  return map[(mode || "").toUpperCase()] || mode || "Mode";
}
function labelFor(d: any) {
  // Show meaningful label: goal/concept name, fallback to mode + short summary
  if (d.goal) return d.goal;
  if (d.concept && d.concept !== "?") return d.concept;
  if (d.name && !d.name.startsWith("Session ")) return d.name;
  // For session nodes, show mode + learned concept
  const modeLabel = friendlyModeName(d.thinkingMode || d.mode);
  const learned = d.learned_concept || d.topic || "";
  if (learned) return `${modeLabel}: ${learned}`;
  return modeLabel;
}
function radiusFor(d: any) {
  const n = d.connections ?? d.sessionCount ?? 0;
  return Math.max(20, Math.min(48, 20 + n * 6));
}

const DEMO_NODES = [
  { id: "demo-1", name: "Quantum Mechanics", domain: "Physics", mode: "DIVERGENT", sessionCount: 3, connections: 2 },
  { id: "demo-2", name: "Neural Networks", domain: "CS", mode: "CONVERGENT", sessionCount: 2, connections: 1 },
  { id: "demo-3", name: "Epistemology", domain: "Philosophy", mode: "METACOGNITIVE", sessionCount: 2, connections: 1 },
  { id: "demo-4", name: "Game Theory", domain: "Math", mode: "SYSTEMS", sessionCount: 1, connections: 0 },
  { id: "demo-5", name: "Linguistics", domain: "Cognitive Science", mode: "ANALOGICAL", sessionCount: 1, connections: 1 },
];
const DEMO_LINKS = [
  { source: "demo-1", target: "demo-2" },
  { source: "demo-1", target: "demo-3" },
  { source: "demo-2", target: "demo-5" },
];

export default function KnowledgeGraph({
  data,
  height = 500,
  onStartSession,
  userId,
}: {
  data?: { nodes: Array<any>; links: Array<any> } | null;
  height?: number;
  onStartSession?: () => void;
  userId?: string;
}) {
  const fgRef = useRef<any>(null);
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const [simEdges, setSimEdges] = useState<Array<{source: string; target: string; similarity: number}>>([]);
  const [loadingSim, setLoadingSim] = useState(false);

  const nodeCount = data?.nodes?.length ?? 0;
  const edgeCount = data?.links?.length ?? 0;
  const isEmpty = !data || nodeCount === 0;
  const isSparse = !isEmpty && nodeCount <= 3 && edgeCount === 0;

  const resetView = useCallback(() => {
    if (fgRef.current) {
      fgRef.current.zoomToFit(400, 60);
    }
  }, []);

  // Fetch similarity edges for session nodes
  useEffect(() => {
    if (!data?.nodes?.length || !userId) return;
    const sessionIds = data.nodes
      .filter((n: any) => n.session_id)
      .map((n: any) => n.session_id)
      .slice(0, 5);
    if (sessionIds.length < 2) return;
    setLoadingSim(true);
    const fetchAll = sessionIds.map(async (sid: string) => {
      try {
        const res = await fetch(`/api/graph/nearest/${sid}?limit=3`);
        if (!res.ok) return [];
        const json = await res.json();
        return (json.nearest || []).map((n: any) => ({
          source: sid,
          target: n.session_id,
          similarity: n.similarity,
        }));
      } catch { return []; }
    });
    Promise.all(fetchAll).then((results) => {
      const flat = results.flat().filter((e: any) => e.similarity > 0.1);
      setSimEdges(flat);
      setLoadingSim(false);
    });
  }, [data, userId]);

  // Client-side VSA concept-to-concept similarity edges
  const conceptSimEdges = useMemo(() => {
    if (!data?.nodes?.length) return [];
    const conceptNodes = data.nodes.filter((n: any) => n.thinkingMode && !n.session_id);
    if (conceptNodes.length < 2) return [];
    const edges: Array<{ source: string; target: string; similarity: number }> = [];
    for (let i = 0; i < conceptNodes.length; i++) {
      for (let j = i + 1; j < conceptNodes.length; j++) {
        const a = conceptNodes[i];
        const b = conceptNodes[j];
        try {
          const vecA = getModeVector(a.thinkingMode);
          const vecB = getModeVector(b.thinkingMode);
          const score = similarity(vecA, vecB);
          if (score > 0.2) {
            edges.push({
              source: a.concept_id || a.id || a.name,
              target: b.concept_id || b.id || b.name,
              similarity: score,
            });
          }
        } catch { /* skip unknown modes */ }
      }
    }
    return edges;
  }, [data]);

  // If empty, show demo graph with CTA
  if (isEmpty) {
    return (
      <div className="relative w-full" style={{ height }}>
        <div className="absolute inset-0" style={{ background: "#080B11", backgroundImage: "radial-gradient(circle, #1E2535 1px, transparent 1px)", backgroundSize: "24px 24px", opacity: 0.4 }} />
        <div className="absolute inset-0">
          <ForceGraph2D
            ref={fgRef}
            graphData={{ nodes: DEMO_NODES, links: DEMO_LINKS }}
            width={containerRef.current?.clientWidth || 800}
            height={height}
            nodeLabel="name"
            nodeColor={(d: any) => modeColor(d.mode)}
            nodeVal={(d: any) => radiusFor(d) * 0.6}
            nodeRelSize={6}
            linkColor={() => "#00E5FF44"}
            linkWidth={1}
            backgroundColor="#080B11"
            enableZoomInteraction={false}
            enablePanInteraction={false}
            d3VelocityDecay={0.3}
          />
        </div>
        {/* Demo label + CTA */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 text-[#5A6480] text-xs font-mono pointer-events-none">
          Example — your map builds here
        </div>
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
          <button onClick={onStartSession} className="px-5 py-2.5 rounded-[10px] bg-[#6C63FF] text-white text-sm font-medium hover:opacity-90 transition shadow-active cursor-pointer">
            Start your first session →
          </button>
        </div>
      </div>
    );
  }

  // Build graph nodes
  const graphNodes = (data.nodes || []).map((n: any) => ({
    ...n,
    id: n.concept_id || n.id || n.name,
    concept: labelFor(n),
    modeLabel: friendlyModeName(n.thinkingMode),
    color: modeColor(n.thinkingMode),
    val: radiusFor(n),
  }));
  const graphLinks = (data.links || []).map((l: any) => ({
    ...l,
    color: l.weight === "weak" ? "#5A648088" : "#6C63FF99",
    dash: l.weight === "weak" ? [4, 4] : undefined,
  }));

  // Merge similarity edges into graph links (drawn as dashed accent lines)
  for (const e of simEdges) {
    const exists = graphLinks.some(
      (l) => (l.source === e.source && l.target === e.target) || (l.source === e.target && l.target === e.source)
    );
    if (!exists) {
      graphLinks.push({
        source: e.source,
        target: e.target,
        color: `rgba(108, 99, 255, ${Math.max(0.15, e.similarity)})`,
        width: Math.max(0.5, e.similarity * 3),
        dash: [3, 6],
      });
    }
  }

  // Merge client-side VSA concept similarity edges (cyan accent)
  for (const e of conceptSimEdges) {
    const exists = graphLinks.some(
      (l) => (l.source === e.source && l.target === e.target) || (l.source === e.target && l.target === e.source)
    );
    if (!exists) {
      graphLinks.push({
        source: e.source,
        target: e.target,
        color: `rgba(0, 229, 255, ${Math.max(0.1, e.similarity * 0.6)})`,
        width: Math.max(0.5, e.similarity * 2),
        dash: [2, 4],
      });
    }
  }

  // Ghost nodes for sparse state
  if (isSparse) {
    const ghostCount = Math.max(4, 6 - graphNodes.length);
    for (let i = 0; i < ghostCount; i++) {
      graphNodes.push({ id: `ghost-${i}`, ghost: true, concept: "?", modeLabel: "", color: "#1E2535", val: 14 });
    }
  }

  return (
    <div ref={containerRef} className="relative w-full" style={{ height, background: "#080B11", backgroundImage: "radial-gradient(circle, #1E2535 1px, transparent 1px)", backgroundSize: "24px 24px", opacity: 1 }}>
      {/* Canvas tooltip for sparse state */}
      {isSparse && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-[#5A6480] text-xs text-center pointer-events-none max-w-md leading-relaxed">
          Concepts you explore become nodes. Connections form when Yentellect detects related thinking across sessions.
        </div>
      )}
      <ForceGraph2D
        ref={fgRef}
        graphData={{ nodes: graphNodes, links: graphLinks }}
        width={containerRef.current?.clientWidth || 800}
        height={height}
        nodeLabel={(d: any) => {
          if (d.ghost) return "";
          return `${d.concept}\nMode: ${d.modeLabel}\nDomain: ${d.domain || "—"}\nSessions: ${d.sessionCount || 0}`;
        }}
        nodeColor={(d: any) => d.ghost ? "#1E2535" : modeColor(d.thinkingMode)}
        nodeVal={(d: any) => d.ghost ? 14 : radiusFor(d)}
        nodeRelSize={6}
        linkColor={(d: any) => d.color || "#6C63FF99"}
        linkWidth={1.5}
        linkLineDash={(d: any) => d.dash || undefined}
        linkCanvasObjectMode={() => "after"}
        linkCanvasObject={(link: any, ctx: CanvasRenderingContext2D) => {
          const src = typeof link.source === "object" ? (link.source as any) : null;
          const tgt = typeof link.target === "object" ? (link.target as any) : null;
          if (src && tgt) {
            const text = `Connected via shared context`;
            ctx.font = "9px JetBrains Mono, monospace";
            const midX = (src.x + tgt.x) / 2;
            const midY = (src.y + tgt.y) / 2;
            ctx.fillStyle = "#5A6480";
            ctx.textAlign = "center";
            ctx.fillText(text, midX, midY - 4);
          }
        }}
        nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
          if (node.ghost) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, 14, 0, 2 * Math.PI);
            ctx.strokeStyle = "#1E2535";
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 3]);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = "#5A6480";
            ctx.font = "14px JetBrains Mono, monospace";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("?", node.x, node.y);
            return;
          }

          const r = radiusFor(node);
          // Circle
          ctx.beginPath();
          ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
          ctx.fillStyle = modeColor(node.thinkingMode);
          ctx.fill();
          ctx.strokeStyle = "#ffffffcc";
          ctx.lineWidth = 2;
          ctx.stroke();

          if (node.isolated) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
            ctx.setLineDash([5, 3]);
            ctx.strokeStyle = "#ffffff66";
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.setLineDash([]);
          }

          // Label
          const label = labelFor(node);
          ctx.font = `${Math.max(10, 12 / globalScale)}px Space Grotesk, sans-serif`;
          ctx.fillStyle = "#F0F4FF";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(label, node.x, node.y + r + 14 / globalScale);

          // Mode chip
          const modeLabel = friendlyModeName(node.thinkingMode);
          ctx.font = `${Math.max(8, 10 / globalScale)}px JetBrains Mono, monospace`;
          ctx.fillStyle = modeColor(node.thinkingMode);
          ctx.fillText(modeLabel, node.x, node.y + r + 28 / globalScale);

          // Hover tooltip not rendered here — ForceGraph2D handles it via nodeLabel
        }}
        enableNodeDrag={true}
        enableZoomInteraction={true}
        enablePanInteraction={true}
        d3VelocityDecay={0.3}
        cooldownTicks={100}
        onEngineStop={() => {
          if (isSparse) {
            fgRef.current?.zoomToFit(400, 60);
          }
        }}
      />
      {/* Zoom controls */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-1.5">
        <button onClick={() => fgRef.current?.zoomToFit(400, 60)} className="w-8 h-8 rounded-[10px] bg-[#0F1420] border border-[#1E2535] text-[#5A6480] text-[10px] font-medium flex items-center justify-center hover:bg-white/5 transition shadow-card" title="Reset view">⟲</button>
      </div>
    </div>
  );
}