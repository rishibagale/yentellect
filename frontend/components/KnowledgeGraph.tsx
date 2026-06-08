"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { D3GraphData, ThinkingMode, getModeColor, getModeName } from "@/lib/api";

interface KnowledgeGraphProps {
  data: D3GraphData;
  width?: number;
  height?: number;
}

interface SimNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  domain: string;
  confidenceScore: number;
  thinkingMode: ThinkingMode;
  isolated: boolean;
  sessionCount: number;
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  weight: number;
  connectionCount: number;
}

const MODE_LEGEND: Array<{
  mode: ThinkingMode;
  color: string;
  label: string;
}> = [
  { mode: "CONVERGENT", color: "#3B82F6", label: "Convergent" },
  { mode: "DIVERGENT", color: "#8B5CF6", label: "Divergent" },
  { mode: "ANALOGICAL", color: "#F59E0B", label: "Analogical" },
  { mode: "METACOGNITIVE", color: "#10B981", label: "Metacognitive" },
  { mode: "SYSTEMS", color: "#EF4444", label: "Systems" },
  { mode: "DMN", color: "#6366F1", label: "DMN" },
];

export default function KnowledgeGraph({
  data,
  width = 800,
  height = 600,
}: KnowledgeGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!svgRef.current || !data.nodes.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Use viewBox for responsive scaling while preserving aspect ratio
    const containerWidth = svgRef.current.clientWidth || width;
    const w = Math.max(width, containerWidth);

    // Clone data so d3 can mutate positions
    const nodes: SimNode[] = data.nodes.map((n) => ({ ...n }));
    const links: SimLink[] = data.links.map((l) => ({
      source: l.source,
      target: l.target,
      weight: l.weight,
      connectionCount: l.connectionCount,
    }));

    // Set up force simulation
    const simulation = d3
      .forceSimulation<SimNode>(nodes)
      .force(
        "link",
        d3
          .forceLink<SimNode, SimLink>(links)
          .id((d) => d.id)
          .distance((d) => 80 + (1 - d.weight) * 60)
          .strength(0.4)
      )
      .force("charge", d3.forceManyBody().strength(-280))
      .force("center", d3.forceCenter(w / 2, height / 2))
      .force("collision", d3.forceCollide().radius(35));

    // Arrow marker for directed edges
    const defs = svg.append("defs");
    defs
      .append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 18)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#94a3b8");

    // Links
    const link = svg
      .append("g")
      .attr("stroke-linecap", "round")
      .selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke", (d) => (d.weight < 0.3 ? "#F59E0B" : "#94a3b8"))
      .attr("stroke-opacity", (d) => 0.3 + d.weight * 0.7)
      .attr("stroke-width", (d) => 1 + d.weight * 3)
      .attr("marker-end", "url(#arrowhead)");

    // Nodes group
    const node = svg
      .append("g")
      .selectAll<SVGGElement, SimNode>("g")
      .data(nodes)
      .enter()
      .append("g")
      .style("cursor", "grab")
      .call(
        d3
          .drag<SVGGElement, SimNode>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    // Node circles
    node
      .append("circle")
      .attr("r", (d) => 8 + d.confidenceScore * 12)
      .attr("fill", (d) => getModeColor(d.thinkingMode))
      .attr("stroke", (d) => (d.isolated ? "#F59E0B" : "#fff"))
      .attr("stroke-width", (d) => (d.isolated ? 2 : 1.5))
      .attr("stroke-dasharray", (d) => (d.isolated ? "4,2" : "0"))
      .attr("opacity", (d) => (d.isolated ? 0.6 : 1));

    // Node labels
    node
      .append("text")
      .text((d) => d.name)
      .attr("x", 0)
      .attr("y", (d) => 8 + d.confidenceScore * 12 + 14)
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .attr("fill", "#475569")
      .attr("font-family", "sans-serif")
      .attr("pointer-events", "none");

    // Tooltip - built with DOM API to avoid HTML escaping issues
    const tooltip = d3
      .select(svgRef.current.parentElement ?? document.body)
      .append("div")
      .attr("class", "d3-tooltip")
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("background", "rgba(15, 23, 42, 0.95)")
      .style("color", "white")
      .style("padding", "8px 12px")
      .style("border-radius", "6px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("z-index", "1000")
      .style("max-width", "240px")
      .style("line-height", "1.4");

    // Pre-build the tooltip body element structure
    tooltip.append("div").attr("class", "tt-name").style("font-weight", "600");
    tooltip.append("div").attr("class", "tt-domain").style("opacity", "0.85");
    tooltip.append("div").attr("class", "tt-conf");
    tooltip.append("div").attr("class", "tt-mode");
    tooltip.append("div").attr("class", "tt-sessions");
    tooltip.append("div").attr("class", "tt-iso").style("font-style", "italic").style("color", "#fbbf24");

    node
      .on("mouseover", function (event: MouseEvent, d: SimNode) {
        tooltip.select(".tt-name").text(d.name);
        tooltip.select(".tt-domain").text("Domain: " + d.domain);
        tooltip.select(".tt-conf").text("Confidence: " + Math.round(d.confidenceScore * 100) + "%");
        tooltip.select(".tt-mode").text("Mode: " + getModeName(d.thinkingMode));
        tooltip.select(".tt-sessions").text("Sessions: " + d.sessionCount);
        tooltip.select(".tt-iso").text(d.isolated ? "(Isolated — needs bridging)" : "");
        tooltip.style("visibility", "visible");
      })
      .on("mousemove", (event: MouseEvent) => {
        const parentRect = (
          svgRef.current?.parentElement ?? document.body
        ).getBoundingClientRect();
        tooltip
          .style("top", event.clientY - parentRect.top - 10 + "px")
          .style("left", event.clientX - parentRect.left + 12 + "px");
      })
      .on("mouseout", () => {
        tooltip.style("visibility", "hidden");
      });

    // Update positions on tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as SimNode).x ?? 0)
        .attr("y1", (d) => (d.source as SimNode).y ?? 0)
        .attr("x2", (d) => (d.target as SimNode).x ?? 0)
        .attr("y2", (d) => (d.target as SimNode).y ?? 0);

      node.attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    return () => {
      simulation.stop();
      tooltip.remove();
    };
  }, [data, width, height]);

  if (!data.nodes.length) {
    return (
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-lg p-12 text-center border border-slate-200/50 dark:border-slate-700/50">
        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mx-auto mb-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-6 h-6 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
            />
          </svg>
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
          No concepts yet
        </p>
        <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
          Start a session to build your knowledge graph.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-lg p-4 border border-slate-200/50 dark:border-slate-700/50">
      <div className="relative">
        <svg
          ref={svgRef}
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          className="w-full"
          style={{ maxWidth: "100%" }}
        />
        {!isClient && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
            Loading graph...
          </div>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-3 gap-y-2 text-xs text-slate-600 dark:text-slate-300 px-2">
        {MODE_LEGEND.map((m) => (
          <div key={m.mode} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: m.color }}
            />
            {m.label}
          </div>
        ))}
        <div className="flex items-center gap-1.5 ml-auto">
          <div className="w-3 h-0.5 bg-amber-500" /> Weak bridge
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full border-2 border-amber-500 border-dashed" />
          Isolated
        </div>
      </div>
    </div>
  );
}
