"use client";

import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { tokens } from "@/lib/tokens";
import { similarity } from "@/lib/combination/vsa";
import { getModeVector } from "@/lib/combination/modeVectors";
import { fuseSessions, type FusionResponse } from "@/lib/api";

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
  if (d.goal) return d.goal;
  if (d.concept && d.concept !== "?") return d.concept;
  if (d.name && !d.name.startsWith("Session ")) return d.name;
  const modeLabel = friendlyModeName(d.thinkingMode || d.modeTarget || d.mode);
  const learned = d.learned_concept || d.topic || "";
  if (learned) return `${modeLabel}: ${learned}`;
  return modeLabel;
}

function radiusFor(d: any) {
  if (d.type === "session") return Math.max(12, Math.min(22, 12 + (d.turnCount || 1) * 2));
  if (d.type === "fusion") return Math.max(28, Math.min(42, 28 + (d.sessionCount || 1) * 4));
  const n = d.connections ?? d.sessionCount ?? 0;
  return Math.max(18, Math.min(38, 18 + n * 5));
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

interface KnowledgeGraphProps {
  data?: { nodes: Array<any>; links: Array<any> } | null;
  height?: number;
  onStartSession?: () => void;
  userId?: string;
  onNodeClick?: (node: any) => void;
}

export default function KnowledgeGraph({
  data,
  height = 500,
  onStartSession,
  userId,
  onNodeClick,
}: KnowledgeGraphProps) {
  const fgRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [fusing, setFusing] = useState(false);
  const [lastFusion, setLastFusion] = useState<FusionResponse | null>(null);
  const particlesRef = useRef<Array<{ x: number; y: number; tx: number; ty: number; speed: number; edgeIdx: number; progress: number }>>([]);

  const nodeCount = data?.nodes?.length ?? 0;
  const edgeCount = data?.links?.length ?? 0;
  const isEmpty = !data || nodeCount === 0;
  const isSparse = !isEmpty && nodeCount <= 3 && edgeCount === 0;

  const resetView = useCallback(() => {
    if (fgRef.current) {
      fgRef.current.zoomToFit(400, 60);
    }
  }, []);

  // Multi-select with Ctrl/Cmd+Click
  const handleNodeClick = useCallback((node: any, event: any) => {
    if (node.ghost || node.type === "session") {
      onNodeClick?.(node);
      return;
    }
    if (event?.ctrlKey || event?.metaKey) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(node.id)) next.delete(node.id);
        else next.add(node.id);
        return next;
      });
    } else {
      onNodeClick?.(node);
      setSelectedIds(new Set());
    }
  }, [onNodeClick]);

  // Fuse selected sessions
  const handleFuse = useCallback(async () => {
    if (selectedIds.size !== 2) return;
    const ids = Array.from(selectedIds);
    setFusing(true);
    try {
      const result = await fuseSessions(ids[0], ids[1]);
      setLastFusion(result);
      setSelectedIds(new Set());
      setTimeout(() => setLastFusion(null), 3000);
    } catch (err) {
      console.error("Fusion failed:", err);
    } finally {
      setFusing(false);
    }
  }, [selectedIds]);

  // Client-side VSA concept-to-concept similarity edges
  const conceptSimEdges = useMemo(() => {
    if (!data?.nodes?.length) return [];
    const conceptNodes = data.nodes.filter((n: any) => n.thinkingMode && n.type !== "session");
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
              source: a.id || a.name,
              target: b.id || b.name,
              similarity: score,
            });
          }
        } catch { /* skip */ }
      }
    }
    return edges;
  }, [data]);

  // Empty state: demo graph
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
        <div className="absolute top-3 left-1/2 -translate-x-1/2 text-[#5A6480] text-xs font-mono pointer-events-none">
          Example — your map builds here
        </div>
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
          <button onClick={onStartSession} className="px-5 py-2.5 rounded-[10px] bg-[#6C63FF] text-white text-sm font-medium hover:opacity-90 transition shadow-active cursor-pointer">
            Start your first session
          </button>
        </div>
      </div>
    );
  }

  // Build graph data
  const graphNodes = (data.nodes || []).map((n: any) => ({
    ...n,
    id: n.id || n.name,
    concept: labelFor(n),
    modeLabel: friendlyModeName(n.thinkingMode || n.modeTarget),
    color: modeColor(n.thinkingMode || n.modeTarget),
    val: radiusFor(n),
    selected: selectedIds.has(n.id),
  }));

  const graphLinks = (data.links || []).map((l: any) => ({
    ...l,
    color: l.type === "fusion"
      ? "#A855F788"
      : l.type === "produced"
      ? "#00E5FF44"
      : l.weight === "weak"
      ? "#5A648088"
      : "#6C63FF66",
    dash: l.type === "produced" ? [4, 4] : l.type === "fusion" ? [6, 3] : undefined,
    linkType: l.type || "reinforcement",
  }));

  // Merge similarity edges
  for (const e of conceptSimEdges) {
    const exists = graphLinks.some(
      (l: any) => (l.source === e.source && l.target === e.target) || (l.source === e.target && l.target === e.source)
    );
    if (!exists) {
      graphLinks.push({
        source: e.source,
        target: e.target,
        color: `rgba(0, 229, 255, ${Math.max(0.1, e.similarity * 0.5)})`,
        width: Math.max(0.5, e.similarity * 2),
        dash: [2, 4],
        linkType: "similarity",
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
    <div ref={containerRef} className="relative w-full" style={{ height, background: "#080B11", backgroundImage: "radial-gradient(circle, #1E2535 1px, transparent 1px)", backgroundSize: "24px 24px" }}>
      {/* Sparse state caption */}
      {isSparse && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-[#5A6480] text-xs text-center pointer-events-none max-w-md leading-relaxed z-10">
          Concepts you explore become nodes. Connections form when Yentellect detects related thinking across sessions.
        </div>
      )}

      {/* Fusion notification */}
      {lastFusion && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 px-4 py-2 rounded-[10px] bg-[#A855F7]/20 border border-[#A855F7]/40 text-[#C4B5FD] text-xs font-medium z-10 animate-pulse">
          Fusion created: {lastFusion.name}
        </div>
      )}

      {/* Fusion controls */}
      {selectedIds.size === 2 && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 px-4 py-2 rounded-[10px] bg-[#0F1420] border border-[#A855F7]/40 text-[#C4B5FD] text-xs font-medium z-10 flex items-center gap-3">
          <span>2 sessions selected</span>
          <button
            onClick={handleFuse}
            disabled={fusing}
            className="px-3 py-1 rounded-md bg-[#A855F7] text-white text-xs font-medium hover:opacity-90 disabled:opacity-50 transition"
          >
            {fusing ? "Fusing..." : "Fuse sessions"}
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="text-[#5A6480] hover:text-white transition">
            x
          </button>
        </div>
      )}

      <ForceGraph2D
        ref={fgRef}
        graphData={{ nodes: graphNodes, links: graphLinks }}
        width={containerRef.current?.clientWidth || 800}
        height={height}
        nodeLabel={(d: any) => {
          if (d.ghost) return "";
          if (d.type === "session") return `Session\nMode: ${friendlyModeName(d.modeTarget)}\nTurns: ${d.turnCount || 0}\n${d.name || ""}`;
          if (d.type === "fusion") return `Fusion\n${d.name}\n${d.domain || ""}`;
          return `${d.concept}\nMode: ${d.modeLabel}\nDomain: ${d.domain || "-"}\nSessions: ${d.sessionCount || 0}`;
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
          const color = node.color || modeColor(node.thinkingMode);

          // === SESSION NODES: glowing orbs with pulse ===
          if (node.type === "session") {
            const pulse = 1 + 0.15 * Math.sin(Date.now() * 0.003 + node.id?.charCodeAt(0));
            const glowR = r * pulse;

            // Outer glow
            ctx.beginPath();
            ctx.arc(node.x, node.y, glowR + 6, 0, 2 * Math.PI);
            ctx.fillStyle = `${color}15`;
            ctx.fill();

            // Glow ring
            ctx.beginPath();
            ctx.arc(node.x, node.y, glowR + 2, 0, 2 * Math.PI);
            ctx.fillStyle = `${color}30`;
            ctx.fill();

            // Core
            ctx.beginPath();
            ctx.arc(node.x, node.y, glowR, 0, 2 * Math.PI);
            const grad = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, glowR);
            grad.addColorStop(0, `${color}CC`);
            grad.addColorStop(1, `${color}44`);
            ctx.fillStyle = grad;
            ctx.fill();

            // Label
            const label = labelFor(node);
            ctx.font = `${Math.max(8, 10 / globalScale)}px Space Grotesk, sans-serif`;
            ctx.fillStyle = "#F0F4FFCC";
            ctx.textAlign = "center";
            ctx.fillText(label.length > 30 ? label.slice(0, 27) + "..." : label, node.x, node.y + glowR + 12 / globalScale);
            return;
          }

          // === FUSION NODES: dual-color gradient with infinity symbol ===
          if (node.type === "fusion") {
            const pulse = 1 + 0.08 * Math.sin(Date.now() * 0.002);

            // Outer glow (dual color)
            ctx.beginPath();
            ctx.arc(node.x, node.y, r * pulse + 8, 0, 2 * Math.PI);
            ctx.fillStyle = "#A855F718";
            ctx.fill();

            // Core with gradient
            ctx.beginPath();
            ctx.arc(node.x, node.y, r * pulse, 0, 2 * Math.PI);
            const grad = ctx.createRadialGradient(node.x - r * 0.3, node.y, 0, node.x, node.y, r * pulse);
            grad.addColorStop(0, "#6C63FFCC");
            grad.addColorStop(1, "#A855F7CC");
            ctx.fillStyle = grad;
            ctx.fill();

            // Border
            ctx.strokeStyle = "#FFFFFF88";
            ctx.lineWidth = 2;
            ctx.stroke();

            // Infinity symbol
            ctx.font = `bold ${Math.max(14, 18 / globalScale)}px Space Grotesk, sans-serif`;
            ctx.fillStyle = "#FFFFFFCC";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("\u221E", node.x, node.y);

            // Label
            ctx.font = `${Math.max(9, 11 / globalScale)}px Space Grotesk, sans-serif`;
            ctx.fillStyle = "#C4B5FD";
            ctx.fillText(node.concept || node.name, node.x, node.y + r * pulse + 14 / globalScale);
            return;
          }

          // === CONCEPT NODES: solid circles with glow ===
          // Glow
          ctx.beginPath();
          ctx.arc(node.x, node.y, r + 3, 0, 2 * Math.PI);
          ctx.fillStyle = `${color}20`;
          ctx.fill();

          // Core
          ctx.beginPath();
          ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
          ctx.fillStyle = color;
          ctx.fill();

          // White stroke
          ctx.strokeStyle = "#FFFFFFCC";
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Isolated dashed outline
          if (node.isolated) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, r + 5, 0, 2 * Math.PI);
            ctx.setLineDash([5, 3]);
            ctx.strokeStyle = "#FFFFFF44";
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.setLineDash([]);
          }

          // Selected highlight
          if (node.selected) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, r + 6, 0, 2 * Math.PI);
            ctx.strokeStyle = "#00E5FF";
            ctx.lineWidth = 2;
            ctx.stroke();
          }

          // Label
          const label = labelFor(node);
          ctx.font = `${Math.max(9, 11 / globalScale)}px Space Grotesk, sans-serif`;
          ctx.fillStyle = "#F0F4FF";
          ctx.textAlign = "center";
          ctx.fillText(label, node.x, node.y + r + 12 / globalScale);

          // Mode chip
          ctx.font = `${Math.max(7, 9 / globalScale)}px JetBrains Mono, monospace`;
          ctx.fillStyle = color;
          ctx.fillText(node.modeLabel, node.x, node.y + r + 24 / globalScale);
        }}
        linkCanvasObject={(link: any, ctx: CanvasRenderingContext2D) => {
          const src = typeof link.source === "object" ? (link.source as any) : null;
          const tgt = typeof link.target === "object" ? (link.target as any) : null;
          if (!src || !tgt) return;

          // Dynamic link label
          let text = "";
          if (link.linkType === "fusion") text = "VSA Fusion";
          else if (link.linkType === "produced") text = "Session concept";
          else if (link.linkType === "similarity") text = "Mode similarity";
          else if (link.weight > 0.5) text = "Strong connection";
          else text = "Shared context";

          const midX = (src.x + tgt.x) / 2;
          const midY = (src.y + tgt.y) / 2;
          ctx.font = "8px JetBrains Mono, monospace";
          ctx.fillStyle = "#5A648088";
          ctx.textAlign = "center";
          ctx.fillText(text, midX, midY - 4);

          // Particle effect along edge
          if (link.linkType === "reinforcement" && link.weight > 0.3) {
            const t = (Date.now() * 0.001 * (link.weight || 0.5)) % 1;
            const px = src.x + (tgt.x - src.x) * t;
            const py = src.y + (tgt.y - src.y) * t;
            ctx.beginPath();
            ctx.arc(px, py, 2, 0, 2 * Math.PI);
            ctx.fillStyle = link.color || "#6C63FF88";
            ctx.fill();
          }
        }}
        nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => {
          const r = radiusFor(node);
          ctx.beginPath();
          ctx.arc(node.x, node.y, r + 4, 0, 2 * Math.PI);
          ctx.fillStyle = color;
          ctx.fill();
        }}
        onNodeClick={handleNodeClick}
        enableNodeDrag={true}
        enableZoomInteraction={true}
        enablePanInteraction={true}
        d3VelocityDecay={0.3}
        cooldownTicks={100}
        onEngineStop={() => {
          if (isSparse) fgRef.current?.zoomToFit(400, 60);
        }}
      />

      {/* Zoom controls */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-1.5 z-10">
        <button onClick={resetView} className="w-8 h-8 rounded-[10px] bg-[#0F1420] border border-[#1E2535] text-[#5A6480] text-[10px] font-medium flex items-center justify-center hover:bg-white/5 transition shadow-card" title="Reset view">{"\u27F2"}</button>
      </div>

      {/* Legend */}
      <div className="absolute top-3 right-3 text-[9px] font-mono text-[#5A6480] space-y-1 z-10">
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#6C63FF]" /><span>Concept</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#00E5FF]" /><span>Session</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{background: "linear-gradient(135deg, #6C63FF, #A855F7)"}} /><span>Fusion</span></div>
      </div>
    </div>
  );
}
