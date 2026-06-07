"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { D3GraphData, ThinkingMode, getModeColor } from "@/lib/api";

interface KnowledgeGraphProps {
  data: D3GraphData;
  width?: number;
  height?: number;
}

export default function KnowledgeGraph({
  data,
  width = 800,
  height = 600,
}: KnowledgeGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data.nodes.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Set up force simulation
    const simulation = d3
      .forceSimulation(data.nodes as any)
      .force(
        "link",
        d3
          .forceLink(data.links)
          .id((d: any) => d.id)
          .distance(100)
          .strength(0.5)
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(30));

    // Arrow marker for directed edges
    svg
      .append("defs")
      .append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 20)
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
      .selectAll("line")
      .data(data.links)
      .enter()
      .append("line")
      .attr("stroke", (d) =>
        d.weight < 0.3 ? "#F59E0B" : "#94a3b8"
      )
      .attr("stroke-opacity", (d) => 0.3 + d.weight * 0.7)
      .attr("stroke-width", (d) => 1 + d.weight * 3)
      .attr("marker-end", "url(#arrowhead)");

    // Nodes
    const node = svg
      .append("g")
      .selectAll("g")
      .data(data.nodes)
      .enter()
      .append("g")
      .call(
        d3
          .drag<any, any>()
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
      .attr("opacity", (d) => (d.isolated ? 0.6 : 1))
      .style("cursor", "pointer");

    // Node labels
    node
      .append("text")
      .text((d) => d.name)
      .attr("x", 0)
      .attr("y", (d) => 8 + d.confidenceScore * 12 + 14)
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .attr("fill", "#475569")
      .attr("font-family", "sans-serif");

    // Tooltips
    const tooltip = d3
      .select("body")
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
      .style("z-index", "1000");

    node
      .on("mouseover", (event, d: any) => {
        tooltip
          .html(
            `<strong>${d.name}</strong><br/>` +
              `Domain: ${d.domain}<br/>` +
              `Confidence: ${(d.confidenceScore * 100).toFixed(0)}%<br/>` +
              `Mode: ${d.thinkingMode}<br/>` +
              `Sessions: ${d.sessionCount}<br/>` +
              `${d.isolated ? "<em>(Isolated)</em>" : ""}`
          )
          .style("visibility", "visible");
      })
      .on("mousemove", (event) => {
        tooltip
          .style("top", event.pageY - 10 + "px")
          .style("left", event.pageX + 10 + "px");
      })
      .on("mouseout", () => {
        tooltip.style("visibility", "hidden");
      });

    // Update positions on simulation tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
      tooltip.remove();
    };
  }, [data, width, height]);

  if (!data.nodes.length) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-12 text-center">
        <p className="text-slate-500">
          No concepts yet. Start a session to build your knowledge graph.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-4">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="w-full"
        style={{ maxWidth: "100%" }}
      />
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500 px-2">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-blue-500" /> Convergent
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-purple-500" /> Divergent
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-amber-500" /> Analogical
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-500" /> Metacognitive
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-red-500" /> Systems
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-indigo-500" /> DMN
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <div className="w-3 h-0.5 bg-amber-500" /> Weak bridge
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full border-2 border-amber-500 border-dashed" />{" "}
          Isolated
        </div>
      </div>
    </div>
  );
}