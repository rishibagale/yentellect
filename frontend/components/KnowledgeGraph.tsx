"use client";

import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { tokens } from "@/lib/tokens";
import { similarity } from "@/lib/combination/vsa";
import { getModeVector } from "@/lib/combination/modeVectors";
import { fuseSessions, type FusionResponse } from "@/lib/api";

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
  if (d.concept && d.concept !== "?") return d.concept;
  if (d.name && !d.name.startsWith("Session ")) return d.name;
  const modeLabel = friendlyModeName(d.thinkingMode || d.modeTarget || d.mode);
  return modeLabel;
}

interface GraphNode {
  id: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  radius: number;
  color: string;
  label: string;
  modeLabel: string;
  type: "session" | "concept" | "fusion" | "ghost";
  data: any;
  glowIntensity: number;
  pulsePhase: number;
}

interface GraphEdge {
  source: GraphNode;
  target: GraphNode;
  weight: number;
  color: string;
  type: string;
  particles: Array<{ t: number; speed: number; size: number }>;
}

const DEMO_NODES = [
  { id: "demo-1", name: "Quantum Mechanics", domain: "Physics", thinkingMode: "DIVERGENT", sessionCount: 3 },
  { id: "demo-2", name: "Neural Networks", domain: "CS", thinkingMode: "CONVERGENT", sessionCount: 2 },
  { id: "demo-3", name: "Epistemology", domain: "Philosophy", thinkingMode: "METACOGNITIVE", sessionCount: 2 },
  { id: "demo-4", name: "Game Theory", domain: "Math", thinkingMode: "SYSTEMS", sessionCount: 1 },
  { id: "demo-5", name: "Linguistics", domain: "CogSci", thinkingMode: "ANALOGICAL", sessionCount: 1 },
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);
  const nodesRef = useRef<GraphNode[]>([]);
  const edgesRef = useRef<GraphEdge[]>([]);
  const selectedIdsRef = useRef<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [fusing, setFusing] = useState(false);
  const [lastFusion, setLastFusion] = useState<FusionResponse | null>(null);
  const hoverNodeRef = useRef<GraphNode | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height });
  const dragRef = useRef<{ node: GraphNode | null; offsetX: number; offsetY: number }>({ node: null, offsetX: 0, offsetY: 0 });

  const isEmpty = !data || (data.nodes?.length ?? 0) === 0;
  const isSparse = !isEmpty && (data.nodes?.length ?? 0) <= 3 && (data.links?.length ?? 0) === 0;

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const obs = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      setDimensions({ width, height });
    });
    obs.observe(container);
    return () => obs.disconnect();
  }, [height]);

  // Build layered layout
  const buildLayout = useCallback((w: number, h: number) => {
    const nodesData = isEmpty ? DEMO_NODES : (data?.nodes || []);
    const linksData = isEmpty ? [] : (data?.links || []);

    // Classify nodes into layers
    const sessions: any[] = [];
    const concepts: any[] = [];
    const fusions: any[] = [];

    for (const n of nodesData) {
      if (n.type === "session" || n.id?.startsWith("session-")) sessions.push(n);
      else if (n.type === "fusion") fusions.push(n);
      else concepts.push(n);
    }

    // If no sessions/fusions, put everything in concepts
    if (sessions.length === 0 && fusions.length === 0 && concepts.length > 0) {
      // Split concepts into two layers for visual interest
      const mid = Math.ceil(concepts.length / 2);
      const leftLayer = concepts.slice(0, mid);
      const rightLayer = concepts.slice(mid);
      concepts.length = 0;

      const layerX = [w * 0.25, w * 0.75];
      const layers = [leftLayer, rightLayer];

      const graphNodes: GraphNode[] = [];
      layers.forEach((layer, li) => {
        const spacing = Math.min(80, (h - 80) / Math.max(layer.length, 1));
        const startY = (h - (layer.length - 1) * spacing) / 2;
        layer.forEach((n: any, ni: number) => {
          const color = modeColor(n.thinkingMode);
          graphNodes.push({
            id: n.id || n.name,
            x: layerX[li] + (Math.random() - 0.5) * 20,
            y: startY + ni * spacing + (Math.random() - 0.5) * 10,
            targetX: layerX[li],
            targetY: startY + ni * spacing,
            radius: Math.max(16, Math.min(32, 16 + (n.sessionCount || 1) * 4)),
            color,
            label: labelFor(n),
            modeLabel: friendlyModeName(n.thinkingMode),
            type: n.type || "concept",
            data: n,
            glowIntensity: 0.6,
            pulsePhase: Math.random() * Math.PI * 2,
          });
        });
      });

      // Build edges
      const graphEdges: GraphEdge[] = [];
      const nodeMap = new Map(graphNodes.map((n) => [n.id, n]));
      for (const l of linksData) {
        const srcId = typeof l.source === "object" ? l.source.id : l.source;
        const tgtId = typeof l.target === "object" ? l.target.id : l.target;
        const src = nodeMap.get(srcId);
        const tgt = nodeMap.get(tgtId);
        if (src && tgt) {
          graphEdges.push({
            source: src,
            target: tgt,
            weight: l.weight || 0.5,
            color: `${modeColor(src.data?.thinkingMode)}66`,
            type: l.type || "reinforcement",
            particles: Array.from({ length: 2 }, () => ({ t: Math.random(), speed: 0.002 + Math.random() * 0.003, size: 1.5 + Math.random() })),
          });
        }
      }

      return { nodes: graphNodes, edges: graphEdges };
    }

    // Three-layer layout: Sessions | Concepts | Fusions
    const graphNodes: GraphNode[] = [];
    const layers = [
      { items: sessions, x: w * 0.15, type: "session" as const },
      { items: concepts, x: w * 0.5, type: "concept" as const },
      { items: fusions, x: w * 0.85, type: "fusion" as const },
    ];

    for (const layer of layers) {
      const count = layer.items.length;
      if (count === 0) continue;
      const spacing = Math.min(80, (h - 80) / Math.max(count, 1));
      const startY = (h - (count - 1) * spacing) / 2;

      layer.items.forEach((n: any, i: number) => {
        const color = modeColor(n.thinkingMode || n.modeTarget);
        const isFusion = layer.type === "fusion";
        const isSession = layer.type === "session";

        graphNodes.push({
          id: n.id || n.name,
          x: layer.x + (Math.random() - 0.5) * 15,
          y: startY + i * spacing + (Math.random() - 0.5) * 8,
          targetX: layer.x,
          targetY: startY + i * spacing,
          radius: isFusion ? 28 : isSession ? 14 : Math.max(16, Math.min(30, 16 + (n.sessionCount || 1) * 3)),
          color,
          label: labelFor(n),
          modeLabel: friendlyModeName(n.thinkingMode || n.modeTarget),
          type: layer.type,
          data: n,
          glowIntensity: isFusion ? 0.9 : isSession ? 0.7 : 0.5,
          pulsePhase: Math.random() * Math.PI * 2,
        });
      });
    }

    // Build edges
    const graphEdges: GraphEdge[] = [];
    const nodeMap = new Map(graphNodes.map((n) => [n.id, n]));
    for (const l of linksData) {
      const srcId = typeof l.source === "object" ? l.source.id : l.source;
      const tgtId = typeof l.target === "object" ? l.target.id : l.target;
      const src = nodeMap.get(srcId);
      const tgt = nodeMap.get(tgtId);
      if (src && tgt) {
        graphEdges.push({
          source: src,
          target: tgt,
          weight: l.weight || 0.5,
          color: l.type === "fusion" ? "#A855F766" : l.type === "produced" ? "#00E5FF44" : `${modeColor(src.data?.thinkingMode)}55`,
          type: l.type || "reinforcement",
          particles: Array.from({ length: l.weight > 0.5 ? 3 : 1 }, () => ({
            t: Math.random(),
            speed: 0.001 + Math.random() * 0.004,
            size: 1 + Math.random() * 1.5,
          })),
        });
      }
    }

    // Add VSA similarity edges between concept nodes
    const conceptNodes = graphNodes.filter((n) => n.type === "concept");
    for (let i = 0; i < conceptNodes.length; i++) {
      for (let j = i + 1; j < conceptNodes.length; j++) {
        try {
          const vecA = getModeVector(conceptNodes[i].data.thinkingMode);
          const vecB = getModeVector(conceptNodes[j].data.thinkingMode);
          const score = similarity(vecA, vecB);
          if (score > 0.3) {
            graphEdges.push({
              source: conceptNodes[i],
              target: conceptNodes[j],
              weight: score,
              color: `rgba(0, 229, 255, ${score * 0.3})`,
              type: "similarity",
              particles: [{ t: Math.random(), speed: 0.001, size: 1 }],
            });
          }
        } catch { /* skip */ }
      }
    }

    return { nodes: graphNodes, edges: graphEdges };
  }, [data, isEmpty]);

  // Initialize layout
  useEffect(() => {
    const { nodes, edges } = buildLayout(dimensions.width, dimensions.height);
    nodesRef.current = nodes;
    edgesRef.current = edges;
  }, [buildLayout, dimensions]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 1;
      const w = canvas.width;
      const h = canvas.height;
      const dpr = window.devicePixelRatio || 1;

      ctx.clearRect(0, 0, w, h);

      // Background
      ctx.fillStyle = "#080B11";
      ctx.fillRect(0, 0, w, h);

      // Grid dots
      ctx.fillStyle = "#1E253520";
      for (let x = 0; x < w; x += 24) {
        for (let y = 0; y < h; y += 24) {
          ctx.beginPath();
          ctx.arc(x, y, 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      const nodes = nodesRef.current;
      const edges = edgesRef.current;

      // Animate nodes toward targets
      for (const node of nodes) {
        node.x += (node.targetX - node.x) * 0.08;
        node.y += (node.targetY - node.y) * 0.08;
        node.pulsePhase += 0.02;
      }

      // Draw edges
      for (const edge of edges) {
        const { source, target } = edge;
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Curved edge (quadratic bezier with control point offset)
        const midX = (source.x + target.x) / 2;
        const midY = (source.y + target.y) / 2;
        const perpX = -dy / dist * 20;
        const perpY = dx / dist * 20;
        const cpX = midX + perpX;
        const cpY = midY + perpY;

        // Edge glow
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.quadraticCurveTo(cpX, cpY, target.x, target.y);
        ctx.strokeStyle = edge.color;
        ctx.lineWidth = 1 + edge.weight * 2;
        ctx.stroke();

        // Edge core
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.quadraticCurveTo(cpX, cpY, target.x, target.y);
        ctx.strokeStyle = edge.color.replace(/[\d.]+\)$/, "0.8)");
        ctx.lineWidth = 0.5 + edge.weight;
        ctx.stroke();

        // Particles along edge
        for (const particle of edge.particles) {
          particle.t += particle.speed;
          if (particle.t > 1) particle.t -= 1;

          const t = particle.t;
          const px = (1 - t) * (1 - t) * source.x + 2 * (1 - t) * t * cpX + t * t * target.x;
          const py = (1 - t) * (1 - t) * source.y + 2 * (1 - t) * t * cpY + t * t * target.y;

          ctx.beginPath();
          ctx.arc(px, py, particle.size, 0, Math.PI * 2);
          ctx.fillStyle = edge.color.replace(/[\d.]+\)$/, "0.9)");
          ctx.fill();
        }
      }

      // Draw nodes
      for (const node of nodes) {
        const pulse = 1 + 0.08 * Math.sin(node.pulsePhase);
        const r = node.radius * pulse;
        const isSelected = selectedIdsRef.current.has(node.id);
        const isHovered = hoverNodeRef.current?.id === node.id;

        // Outer glow
        const glowGrad = ctx.createRadialGradient(node.x, node.y, r * 0.5, node.x, node.y, r * 2.5);
        glowGrad.addColorStop(0, `${node.color}30`);
        glowGrad.addColorStop(1, `${node.color}00`);
        ctx.beginPath();
        ctx.arc(node.x, node.y, r * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = glowGrad;
        ctx.fill();

        if (node.type === "session") {
          // Session: small glowing orb
          const grad = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, r);
          grad.addColorStop(0, `${node.color}DD`);
          grad.addColorStop(0.7, `${node.color}88`);
          grad.addColorStop(1, `${node.color}22`);
          ctx.beginPath();
          ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();

          // Ring
          ctx.beginPath();
          ctx.arc(node.x, node.y, r + 2, 0, Math.PI * 2);
          ctx.strokeStyle = `${node.color}66`;
          ctx.lineWidth = 1;
          ctx.stroke();
        } else if (node.type === "fusion") {
          // Fusion: dual-color gradient with infinity
          const grad = ctx.createRadialGradient(node.x - r * 0.3, node.y, 0, node.x, node.y, r);
          grad.addColorStop(0, "#6C63FFCC");
          grad.addColorStop(1, "#A855F7CC");
          ctx.beginPath();
          ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();

          ctx.strokeStyle = "#FFFFFF88";
          ctx.lineWidth = 2;
          ctx.stroke();

          // Infinity symbol
          ctx.font = `bold ${Math.round(r * 0.8)}px Space Grotesk, sans-serif`;
          ctx.fillStyle = "#FFFFFFCC";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("\u221E", node.x, node.y);
        } else {
          // Concept: solid circle with glow
          ctx.beginPath();
          ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
          ctx.fillStyle = node.color;
          ctx.fill();

          // Inner highlight
          const innerGrad = ctx.createRadialGradient(node.x - r * 0.3, node.y - r * 0.3, 0, node.x, node.y, r);
          innerGrad.addColorStop(0, "rgba(255,255,255,0.15)");
          innerGrad.addColorStop(1, "rgba(255,255,255,0)");
          ctx.beginPath();
          ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
          ctx.fillStyle = innerGrad;
          ctx.fill();

          // Border
          ctx.beginPath();
          ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
          ctx.strokeStyle = isHovered ? "#FFFFFF" : "#FFFFFF88";
          ctx.lineWidth = isHovered ? 2.5 : 1.5;
          ctx.stroke();
        }

        // Selected ring
        if (isSelected) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, r + 6, 0, Math.PI * 2);
          ctx.strokeStyle = "#00E5FF";
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Label below node
        const dpr = window.devicePixelRatio || 1;
        ctx.font = `${Math.round(11 / dpr)}px Space Grotesk, sans-serif`;
        ctx.fillStyle = "#F0F4FFCC";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        const labelText = node.label.length > 25 ? node.label.slice(0, 22) + "..." : node.label;
        ctx.fillText(labelText, node.x, node.y + r + 6);

        // Mode chip
        ctx.font = `${Math.round(9 / dpr)}px JetBrains Mono, monospace`;
        ctx.fillStyle = `${node.color}CC`;
        ctx.fillText(node.modeLabel, node.x, node.y + r + 20);
      }

      // Layer labels
      if (!isEmpty) {
        ctx.font = "10px JetBrains Mono, monospace";
        ctx.fillStyle = "#5A648066";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";

        const hasSessions = nodes.some((n) => n.type === "session");
        const hasFusions = nodes.some((n) => n.type === "fusion");

        if (hasSessions) {
          ctx.fillText("SESSIONS", dimensions.width * 0.15, 12);
          // Vertical line
          ctx.beginPath();
          ctx.moveTo(dimensions.width * 0.3, 30);
          ctx.lineTo(dimensions.width * 0.3, dimensions.height - 30);
          ctx.strokeStyle = "#1E253544";
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 8]);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        ctx.fillText("CONCEPTS", dimensions.width * 0.5, 12);

        if (hasFusions) {
          ctx.fillText("FUSIONS", dimensions.width * 0.85, 12);
          ctx.beginPath();
          ctx.moveTo(dimensions.width * 0.7, 30);
          ctx.lineTo(dimensions.width * 0.7, dimensions.height - 30);
          ctx.strokeStyle = "#1E253544";
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 8]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [dimensions, isEmpty]);

  // Mouse interactions
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const getNodeAt = (mx: number, my: number): GraphNode | null => {
      for (const node of nodesRef.current) {
        const dx = mx - node.x;
        const dy = my - node.y;
        if (dx * dx + dy * dy < (node.radius + 8) * (node.radius + 8)) return node;
      }
      return null;
    };

    const getCanvasPos = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const onMouseMove = (e: MouseEvent) => {
      const { x, y } = getCanvasPos(e);

      if (dragRef.current.node) {
        dragRef.current.node.targetX = x - dragRef.current.offsetX;
        dragRef.current.node.targetY = y - dragRef.current.offsetY;
        dragRef.current.node.x = x - dragRef.current.offsetX;
        dragRef.current.node.y = y - dragRef.current.offsetY;
        canvas.style.cursor = "grabbing";
        return;
      }

      const node = getNodeAt(x, y);
      hoverNodeRef.current = node;
      canvas.style.cursor = node ? "pointer" : "default";
    };

    const onMouseDown = (e: MouseEvent) => {
      const { x, y } = getCanvasPos(e);
      const node = getNodeAt(x, y);
      if (node && node.type !== "ghost") {
        dragRef.current = { node, offsetX: x - node.x, offsetY: y - node.y };
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      const { x, y } = getCanvasPos(e);
      const wasDragging = dragRef.current.node !== null;
      const dragNode = dragRef.current.node;
      dragRef.current = { node: null, offsetX: 0, offsetY: 0 };

      if (!wasDragging) return;

      // Check if it was a click (didn't move much)
      if (dragNode) {
        const dx = x - (dragNode.x + dragRef.current.offsetX);
        const dy = y - (dragNode.y + dragRef.current.offsetY);
        // It was a drag, not a click — snap back
        dragNode.targetX = dragNode.x;
        dragNode.targetY = dragNode.y;
      }
    };

    const onClick = (e: MouseEvent) => {
      const { x, y } = getCanvasPos(e);
      const node = getNodeAt(x, y);
      if (!node || node.type === "ghost") return;

      if (e.ctrlKey || e.metaKey) {
        // Multi-select
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (next.has(node.id)) next.delete(node.id);
          else next.add(node.id);
          selectedIdsRef.current = next;
          return next;
        });
      } else {
        onNodeClick?.(node.data);
        setSelectedIds(new Set());
        selectedIdsRef.current = new Set();
      }
    };

    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("click", onClick);

    return () => {
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("click", onClick);
    };
  }, [onNodeClick]);

  // Fuse selected
  const handleFuse = useCallback(async () => {
    if (selectedIds.size !== 2) return;
    const ids = Array.from(selectedIds);
    setFusing(true);
    try {
      const result = await fuseSessions(ids[0], ids[1]);
      setLastFusion(result);
      setSelectedIds(new Set());
      selectedIdsRef.current = new Set();
      setTimeout(() => setLastFusion(null), 4000);
    } catch (err) {
      console.error("Fusion failed:", err);
    } finally {
      setFusing(false);
    }
  }, [selectedIds]);

  // Empty state
  if (isEmpty) {
    return (
      <div className="relative w-full" style={{ height }}>
        <div ref={containerRef} className="absolute inset-0">
          <canvas
            ref={canvasRef}
            width={dimensions.width * (typeof window !== "undefined" ? window.devicePixelRatio : 1)}
            height={height * (typeof window !== "undefined" ? window.devicePixelRatio : 1)}
            style={{ width: dimensions.width, height }}
          />
        </div>
        <div className="absolute top-3 left-1/2 -translate-x-1/2 text-[#5A6480] text-xs font-mono pointer-events-none z-10">
          Example — your neural map builds here
        </div>
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
          <button onClick={onStartSession} className="px-5 py-2.5 rounded-[10px] bg-[#6C63FF] text-white text-sm font-medium hover:opacity-90 transition shadow-active cursor-pointer">
            Start your first session
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full" style={{ height }}>
      {/* Fusion notification */}
      {lastFusion && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 px-4 py-2 rounded-[10px] bg-[#A855F7]/20 border border-[#A855F7]/40 text-[#C4B5FD] text-xs font-medium z-20 animate-pulse">
          Fusion created: {lastFusion.name}
        </div>
      )}

      {/* Fusion controls */}
      {selectedIds.size === 2 && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 px-4 py-2 rounded-[10px] bg-[#0F1420] border border-[#A855F7]/40 text-[#C4B5FD] text-xs font-medium z-20 flex items-center gap-3">
          <span>2 nodes selected</span>
          <button
            onClick={handleFuse}
            disabled={fusing}
            className="px-3 py-1 rounded-md bg-[#A855F7] text-white text-xs font-medium hover:opacity-90 disabled:opacity-50 transition"
          >
            {fusing ? "Fusing..." : "Fuse sessions"}
          </button>
          <button onClick={() => { setSelectedIds(new Set()); selectedIdsRef.current = new Set(); }} className="text-[#5A6480] hover:text-white transition">
            x
          </button>
        </div>
      )}

      <canvas
        ref={canvasRef}
        width={dimensions.width * (typeof window !== "undefined" ? window.devicePixelRatio : 1)}
        height={height * (typeof window !== "undefined" ? window.devicePixelRatio : 1)}
        style={{ width: dimensions.width, height, borderRadius: "16px" }}
      />

      {/* Legend */}
      <div className="absolute bottom-3 right-3 text-[9px] font-mono text-[#5A6480] space-y-1 z-10">
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#6C63FF]" /><span>Concept</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#00E5FF]" /><span>Session</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{background: "linear-gradient(135deg, #6C63FF, #A855F7)"}} /><span>Fusion</span></div>
      </div>

      {/* Sparse state caption */}
      {isSparse && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-[#5A6480] text-xs text-center pointer-events-none max-w-md leading-relaxed z-10">
          Concepts you explore become neurons. Connections form when Yentellect detects related thinking across sessions.
        </div>
      )}
    </div>
  );
}
