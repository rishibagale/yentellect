"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";

const MODE_COLORS: Record<string, string> = {
  CONVERGENT: "#6C63FF",
  DIVERGENT: "#A855F7",
  ANALOGICAL: "#F59E0B",
  METACOGNITIVE: "#10B981",
  SYSTEMS: "#EF4444",
  DMN: "#3B82F6",
};

function friendlyModeName(mode?: string) {
  switch ((mode || "").toUpperCase()) {
    case "CONVERGENT": return "Convergent";
    case "DIVERGENT": return "Divergent";
    case "ANALOGICAL": return "Analogical";
    case "METACOGNITIVE": return "Metacognitive";
    case "SYSTEMS": return "Systems";
    case "DMN": return "Default Mode";
    default: return mode || "Mode";
  }
}

function modeColor(mode?: string) {
  return MODE_COLORS[(mode || "").toUpperCase()] || "#6C63FF";
}

function labelFor(d: any) {
  return d.topic || d.concept || d.name || "Concept";
}

function radiusFor(d: any) {
  const n = d.connections ?? d.sessionCount ?? 0;
  return Math.max(20, Math.min(48, 20 + n * 6));
}

/* Demo placeholder concepts for the 0-session state */
const DEMO_NODES = [
  { id: "demo-1", name: "Quantum Mechanics", domain: "Physics", thinkingMode: "DIVERGENT", sessionCount: 3, confidenceScore: 0.7, isolated: false, connections: 2, topic: "Quantum Mechanics", concept: "Quantum Mechanics", x: 300, y: 200 },
  { id: "demo-2", name: "Neural Networks", domain: "CS", thinkingMode: "CONVERGENT", sessionCount: 2, confidenceScore: 0.6, isolated: false, connections: 1, topic: "Neural Networks", concept: "Neural Networks", x: 500, y: 250 },
  { id: "demo-3", name: "Epistemology", domain: "Philosophy", thinkingMode: "METACOGNITIVE", sessionCount: 2, confidenceScore: 0.65, isolated: false, connections: 1, topic: "Epistemology", concept: "Epistemology", x: 400, y: 350 },
  { id: "demo-4", name: "Game Theory", domain: "Math", thinkingMode: "SYSTEMS", sessionCount: 1, confidenceScore: 0.5, isolated: true, connections: 0, topic: "Game Theory", concept: "Game Theory", x: 200, y: 380 },
  { id: "demo-5", name: "Linguistics", domain: "Cognitive Science", thinkingMode: "ANALOGICAL", sessionCount: 1, confidenceScore: 0.55, isolated: false, connections: 1, topic: "Linguistics", concept: "Linguistics", x: 600, y: 150 },
];

const DEMO_EDGES = [
  { source: "demo-1", target: "demo-2", weight: 1, connectionCount: 1, lastActivated: "" },
  { source: "demo-1", target: "demo-3", weight: 1, connectionCount: 1, lastActivated: "" },
  { source: "demo-2", target: "demo-5", weight: 1, connectionCount: 1, lastActivated: "" },
];

export default function KnowledgeGraph({
  data,
  height,
  onStartSession,
}: {
  data?: {
    nodes: Array<any>;
    links: Array<any>;
  } | null;
  height?: number;
  onStartSession?: () => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  const nodeCount = data?.nodes?.length ?? 0;
  const edgeCount = data?.links?.length ?? 0;
  const isEmpty = !data || nodeCount === 0;
  const isSparse = !isEmpty && nodeCount <= 3 && edgeCount === 0;

  const resetZoom = useCallback(() => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current).transition().duration(500).call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
      setZoomLevel(1);
    }
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;
    const svgEl = svgRef.current;
    const container = svgEl.parentElement;
    d3.select(svgEl).selectAll("*").remove();

    const w = svgEl.clientWidth || 800;
    const h = height || 500;
    const svg = d3.select(svgEl).attr("viewBox", [0, 0, w, h]);

    // Background rect to catch events
    svg.append("rect").attr("width", w).attr("height", h).attr("fill", "#080B11").attr("opacity", 0);

    // Grid dot pattern
    const defs = svg.append("defs");
    defs.append("pattern").attr("id", "grid-dots").attr("width", 24).attr("height", 24).attr("patternUnits", "userSpaceOnUse")
      .append("circle").attr("cx", 12).attr("cy", 12).attr("r", 1).attr("fill", "#5A6480").attr("opacity", 0.12);
    svg.append("rect").attr("width", w).attr("height", h).attr("fill", "url(#grid-dots)");

    // Constellation background dots (random faint dots)
    const constellationDots = 60;
    const dotGroup = svg.append("g").attr("opacity", 0.15);
    for (let i = 0; i < constellationDots; i++) {
      dotGroup.append("circle")
        .attr("cx", Math.random() * w)
        .attr("cy", Math.random() * h)
        .attr("r", Math.random() * 1.5 + 0.3)
        .attr("fill", "#6C63FF");
    }

    // Tooltip overlay
    const tooltipDiv = d3.select(container).select<HTMLDivElement>(".kg-tooltip");
    let tooltip: d3.Selection<HTMLDivElement, unknown, null, undefined>;
    if (tooltipDiv.empty()) {
      tooltip = d3.select(container).append("div").attr("class", "kg-tooltip")
        .style("position", "absolute")
        .style("pointer-events", "none")
        .style("background", "#0F1420")
        .style("border", "1px solid #1E2535")
        .style("border-radius", "10px")
        .style("padding", "8px 12px")
        .style("font-size", "12px")
        .style("color", "#F0F4FF")
        .style("visibility", "hidden")
        .style("z-index", "100")
        .style("max-width", "280px")
        .style("line-height", "1.5")
        .style("box-shadow", "0 0 0 1px #1E2535, 0 8px 32px rgba(0,0,0,0.4)");
    } else {
      tooltip = tooltipDiv;
    }

    // Glow defs for mode colors
    ["CONVERGENT", "DIVERGENT", "ANALOGICAL", "METACOGNITIVE", "SYSTEMS", "DMN"].forEach((m) => {
      const c = modeColor(m);
      defs.append("filter").attr("id", `glow-${m}`).attr("x", "-30%").attr("y", "-30%").attr("width", "160%").attr("height", "160%")
        .append("feDropShadow").attr("dx", 0).attr("dy", 0).attr("stdDeviation", 6).attr("flood-color", c).attr("flood-opacity", 0.45);
    });

    // Zoom behavior
    const zoomGroup = svg.append("g");
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on("zoom", (event) => {
        zoomGroup.attr("transform", event.transform);
        setZoomLevel(event.transform.k);
      });
    svg.call(zoom);
    zoomBehaviorRef.current = zoom;

    // ======== 0 sessions: demo graph ========
    if (isEmpty) {
      const demoTitle = zoomGroup.append("text")
        .attr("x", w / 2).attr("y", 30)
        .attr("text-anchor", "middle").attr("font-size", "13px")
        .attr("font-family", "sans-serif").attr("fill", "#5A6480")
        .attr("opacity", 0.8)
        .text("Example — your map builds here");

      const demoNodes = DEMO_NODES.map(n => ({ ...n }));
      const demoLinks = DEMO_EDGES.map(l => ({ ...l }));

      const demoSim = d3.forceSimulation(demoNodes as any)
        .force("link", d3.forceLink(demoLinks as any).id((d: any) => d.id).distance(140).strength(0.4))
        .force("charge", d3.forceManyBody().strength(-300))
        .force("center", d3.forceCenter(w / 2, h / 2 + 20))
        .force("collision", d3.forceCollide().radius(30));

      const demoLink = zoomGroup.append("g").selectAll("line").data(demoLinks).join("line")
        .attr("stroke", "#00E5FF").attr("stroke-opacity", 0.3).attr("stroke-width", 1.5);

      const demoNode = zoomGroup.append("g").selectAll("g").data(demoNodes).join("g");
      demoNode.append("circle")
        .attr("r", (d) => radiusFor(d))
        .attr("fill", (d) => modeColor(d.thinkingMode))
        .attr("stroke", "#fff").attr("stroke-width", 1.5)
        .attr("opacity", 0.6)
        .attr("filter", (d) => `url(#glow-${(d.thinkingMode || "").toUpperCase()})`);

      demoNode.append("text")
        .text((d) => labelFor(d))
        .attr("x", 0).attr("y", (d) => radiusFor(d) + 16)
        .attr("text-anchor", "middle").attr("font-size", "10px")
        .attr("font-family", "sans-serif").attr("font-weight", 600)
        .attr("fill", "#ffffff").attr("opacity", 0.7)
        .attr("pointer-events", "none")
        .style("text-shadow", "0 0 6px rgba(0,0,0,0.6)");

      demoNode.append("text")
        .text((d) => friendlyModeName(d.thinkingMode))
        .attr("x", 0).attr("y", (d) => radiusFor(d) + 26)
        .attr("text-anchor", "middle").attr("font-size", "8px")
        .attr("fill", (d) => modeColor(d.thinkingMode)).attr("opacity", 0.6)
        .attr("pointer-events", "none");

      demoSim.on("tick", () => {
        demoLink.attr("x1", (d: any) => d.source.x).attr("y1", (d: any) => d.source.y)
          .attr("x2", (d: any) => d.target.x).attr("y2", (d: any) => d.target.y);
        demoNode.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
      });

      // CTA button
      const ctaGroup = zoomGroup.append("g").attr("cursor", "pointer")
        .on("click", () => onStartSession?.())
        .on("mouseenter", () => ctaRect.attr("opacity", 0.9))
        .on("mouseleave", () => ctaRect.attr("opacity", 1));
      const ctaRect = ctaGroup.append("rect")
        .attr("x", w / 2 - 100).attr("y", h - 70)
        .attr("width", 200).attr("height", 38)
        .attr("rx", 10).attr("fill", "#6C63FF").attr("opacity", 1)
        .attr("cursor", "pointer");
      ctaGroup.append("text")
        .attr("x", w / 2).attr("y", h - 47)
        .attr("text-anchor", "middle").attr("font-size", "13px")
        .attr("font-family", "sans-serif").attr("font-weight", 600)
        .attr("fill", "#ffffff").attr("pointer-events", "none")
        .text("Start your first session →");

      return;
    }

    // ======== Has data: real graph ========
    const nodes = (data.nodes || []).map((n) => ({ ...n, x: undefined, y: undefined, fx: null, fy: null }));
    const links = (data.links || []).map((l) => ({ ...l }));

    // Ghost placeholder nodes for sparse state
    const GHOST_COUNT = isSparse ? Math.max(4, 6 - nodes.length) : 0;
    const ghosts: any[] = [];
    for (let i = 0; i < GHOST_COUNT; i++) {
      ghosts.push({ id: `ghost-${i}`, ghost: true, x: undefined, y: undefined });
    }
    const allNodes = [...nodes, ...ghosts];

    const sim = d3.forceSimulation(allNodes as any)
      .force("link", d3.forceLink(links as any).id((d: any) => d.id).distance(140).strength(0.5))
      .force("charge", d3.forceManyBody().strength(-500))
      .force("center", d3.forceCenter(w / 2, h / 2))
      .force("collision", d3.forceCollide().radius((d: any) => d.ghost ? 18 : radiusFor(d) + 12));

    const link = zoomGroup.append("g").selectAll("line").data(links).join("line")
      .attr("stroke", "#00E5FF").attr("stroke-opacity", 0.6).attr("stroke-width", 1.5);

    const nodeG = zoomGroup.append("g").selectAll("g").data(allNodes).join("g").attr("cursor", "pointer").call(
      d3.drag<any, any>().on("start", (event, d) => {
        if (!event.active) sim.alphaTarget(0.3).restart();
        d.fx = d.x; d.fy = d.y;
      }).on("drag", (event, d) => {
        d.fx = event.x; d.fy = event.y;
      }).on("end", (event, d) => {
        if (!event.active) sim.alphaTarget(0);
        d.fx = null; d.fy = null;
      })
    );

    // Ghost nodes
    nodeG.filter((d) => d.ghost).append("circle")
      .attr("r", 16).attr("fill", "none").attr("stroke", "#1E2535")
      .attr("stroke-width", 1.5).attr("stroke-dasharray", "4,3")
      .attr("opacity", 0.5);
    nodeG.filter((d) => d.ghost).append("text")
      .text("?").attr("x", 0).attr("y", 5)
      .attr("text-anchor", "middle").attr("font-size", "14px")
      .attr("fill", "#5A6480").attr("opacity", 0.5).attr("pointer-events", "none");

    // Real nodes
    nodeG.filter((d) => !d.ghost).append("circle")
      .attr("r", (d) => radiusFor(d))
      .attr("fill", (d) => modeColor(d.thinkingMode))
      .attr("stroke", "#fff").attr("stroke-width", 2)
      .attr("filter", (d) => `url(#glow-${(d.thinkingMode || "").toUpperCase() || "CONVERGENT"})`)
      .attr("stroke-dasharray", (d) => (d.isolated ? "5,3" : "none"))
      .attr("opacity", (d) => (d.isolated ? 0.9 : 1));

    nodeG.filter((d) => !d.ghost).append("text")
      .text((d) => labelFor(d))
      .attr("x", 0).attr("y", (d) => radiusFor(d) + 16)
      .attr("text-anchor", "middle").attr("font-size", "11px")
      .attr("font-family", "sans-serif").attr("font-weight", 600)
      .attr("fill", "#ffffff").attr("pointer-events", "none")
      .style("text-shadow", "0 0 6px rgba(0,0,0,0.6)");

    nodeG.filter((d) => !d.ghost).append("text")
      .text((d) => friendlyModeName(d.thinkingMode))
      .attr("x", 0).attr("y", (d) => radiusFor(d) + 28)
      .attr("text-anchor", "middle").attr("font-size", "9px")
      .attr("font-family", "sans-serif").attr("fill", (d) => modeColor(d.thinkingMode))
      .attr("pointer-events", "none").style("letter-spacing", "0.08em");

    // Hover tooltips on real nodes
    nodeG.filter((d) => !d.ghost)
      .on("mouseenter", function (event, d) {
        d3.select(this).select("circle").transition().duration(200).attr("opacity", 0.8);
        tooltip.style("visibility", "visible")
          .html(`<div style="font-weight:600;margin-bottom:4px">${labelFor(d)}</div>
                 <div style="color:#5A6480">Mode: ${friendlyModeName(d.thinkingMode)}</div>
                 <div style="color:#5A6480">Domain: ${d.domain || "—"}</div>
                 <div style="color:#5A6480">Sessions: ${d.sessionCount || 0}</div>
                 ${d.isolated ? '<div style="color:#F59E0B;margin-top:4px;font-style:italic">Isolated — waiting to connect</div>' : ""}`);
      })
      .on("mousemove", (event) => {
        const parentRect = container?.getBoundingClientRect();
        if (parentRect) {
          tooltip.style("top", (event.clientY - parentRect.top - 10) + "px")
            .style("left", (event.clientX - parentRect.left + 16) + "px");
        }
      })
      .on("mouseleave", function () {
        d3.select(this).select("circle").transition().duration(200).attr("opacity", 1);
        tooltip.style("visibility", "hidden");
      });

    // Edge hover
    link.on("mouseenter", function (event, d: any) {
      d3.select(this).attr("stroke-opacity", 1).attr("stroke-width", 2.5);
      const src = typeof d.source === "object" ? d.source : null;
      const tgt = typeof d.target === "object" ? d.target : null;
      const srcLabel = src ? labelFor(src) : "?";
      const tgtLabel = tgt ? labelFor(tgt) : "?";
      tooltip.style("visibility", "visible")
        .html(`<div style="color:#5A6480">Connected via shared context</div>
               <div style="margin-top:4px;color:#F0F4FF;font-weight:500">${srcLabel} ↔ ${tgtLabel}</div>`);
    }).on("mousemove", (event) => {
      const parentRect = container?.getBoundingClientRect();
      if (parentRect) {
        tooltip.style("top", (event.clientY - parentRect.top - 10) + "px")
          .style("left", (event.clientX - parentRect.left + 16) + "px");
      }
    }).on("mouseleave", function () {
      d3.select(this).attr("stroke-opacity", 0.6).attr("stroke-width", 1.5);
      tooltip.style("visibility", "hidden");
    });

    // Sparse state canvas tooltip
    if (isSparse) {
      const canvasTip = zoomGroup.append("text")
        .attr("x", w / 2).attr("y", h - 20)
        .attr("text-anchor", "middle").attr("font-size", "11px")
        .attr("font-family", "sans-serif").attr("fill", "#5A6480")
        .attr("opacity", 0.7)
        .text("Your knowledge map grows with every session. Concepts you explore become nodes. Connections form when Yentellect detects related thinking across sessions.");
    }

    // Animate isolated nodes
    nodeG.filter((d: any) => d.isolated && !d.ghost)
      .append("animate")
      .attr("attributeName", "opacity")
      .attr("values", "0.7;1;0.7").attr("dur", "2.5s").attr("repeatCount", "indefinite");

    sim.on("tick", () => {
      (link as any).attr("x1", (d: any) => d.source.x).attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x).attr("y2", (d: any) => d.target.y);
      (nodeG as any).attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });
  }, [data, height, isEmpty, isSparse, onStartSession]);

  return (
    <div className="relative w-full" style={{ position: "relative" }}>
      <svg ref={svgRef} style={{ width: "100%", height: height || 500 }} />
      {/* Zoom controls */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-1.5">
        <button
          onClick={() => { if (zoomBehaviorRef.current && svgRef.current) { d3.select(svgRef.current).transition().duration(300).call(zoomBehaviorRef.current.scaleBy, 1.3); setZoomLevel(z => z * 1.3); } }}
          className="w-8 h-8 rounded-[10px] bg-[#0F1420] border border-[#1E2535] text-[#F0F4FF] text-sm font-bold flex items-center justify-center hover:bg-white/5 transition shadow-card"
        >+</button>
        <button
          onClick={() => { if (zoomBehaviorRef.current && svgRef.current) { d3.select(svgRef.current).transition().duration(300).call(zoomBehaviorRef.current.scaleBy, 0.7); setZoomLevel(z => z * 0.7); } }}
          className="w-8 h-8 rounded-[10px] bg-[#0F1420] border border-[#1E2535] text-[#F0F4FF] text-sm font-bold flex items-center justify-center hover:bg-white/5 transition shadow-card"
        >−</button>
        <button
          onClick={resetZoom}
          className="w-8 h-8 rounded-[10px] bg-[#0F1420] border border-[#1E2535] text-[#5A6480] text-[10px] font-medium flex items-center justify-center hover:bg-white/5 transition shadow-card"
          title="Reset view"
        >⟲</button>
      </div>
    </div>
  );
}