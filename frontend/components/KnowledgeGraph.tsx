"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";

const MODE_COLORS: Record<string, string> = {
  CONVERGENT: "#6C63FF",
  DIVERGENT: "#A855F7",
  ANALOGICAL: "#F59E0B",
  METACOGNITIVE: "#10B981",
  SYSTEMS: "#EF4444",
  DMN: "#3B82F6",
};

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

export default function KnowledgeGraph({
  data,
  height,
}: {
  data: {
    nodes: Array<{
      id: string;
      name: string;
      domain: string;
      confidenceScore: number;
      lastReinforced: string;
      sessionCount: number;
      thinkingMode: string;
      isolated: boolean;
      topic?: string;
      concept?: string;
      connections?: number;
    }>;
    links: Array<{
      source: string;
      target: string;
      weight: number;
      connectionCount: number;
      lastActivated: string;
    }>;
  };
  height?: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data) return;
    d3.select(svgRef.current).selectAll("*").remove();

    const nodes = (data.nodes || []).map((n) => ({
      ...n,
      x: undefined,
      y: undefined,
      fx: null,
      fy: null,
    }));

    const links = (data.links || []).map((l) => ({ ...l }));

    const width = svgRef.current.clientWidth || 800;
    const svg = d3
      .select(svgRef.current)
      .attr("viewBox", [0, 0, width, height || 500]);

    const defs = svg.append("defs");
    ["CONVERGENT", "DIVERGENT", "ANALOGICAL", "METACOGNITIVE", "SYSTEMS", "DMN"].forEach((m) => {
      const c = modeColor(m);
      const filter = defs
        .append("filter")
        .attr("id", `glow-${m}`)
        .attr("x", "-30%")
        .attr("y", "-30%")
        .attr("width", "160%")
        .attr("height", "160%");
      filter.append("feDropShadow").attr("dx", 0).attr("dy", 0).attr("stdDeviation", 6).attr("flood-color", c).attr("flood-opacity", 0.45);
    });

    const simulation = d3
      .forceSimulation(nodes as any)
      .force("link", d3.forceLink(links as any).id((d: any) => d.id).distance(140).strength(0.5))
      .force("charge", d3.forceManyBody().strength(-500))
      .force("center", d3.forceCenter(width / 2, (height || 500) / 2))
      .force("collision", d3.forceCollide().radius((d: any) => radiusFor(d) + 12));

    const link = svg
      .append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "#00E5FF")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", (d: any) => (d.weight === "weak" ? "6,4" : "none"));

    const node = svg.append("g").selectAll("g").data(nodes).join("g").attr("cursor", "pointer").call(
      d3.drag<any, any>().on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      }).on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      }).on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      })
    );

    node
      .append("circle")
      .attr("r", (d) => radiusFor(d))
      .attr("fill", (d) => modeColor(d.thinkingMode))
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .attr("filter", (d) => `url(#glow-${(d.thinkingMode || "").toUpperCase() || "CONVERGENT"})`)
      .attr("stroke-dasharray", (d) => (d.isolated ? "5,3" : "none"))
      .attr("opacity", (d) => (d.isolated ? 0.9 : 1));

    node
      .append("text")
      .text((d) => labelFor(d))
      .attr("x", 0)
      .attr("y", (d) => radiusFor(d) + 16)
      .attr("text-anchor", "middle")
      .attr("font-size", "11px")
      .attr("font-family", "sans-serif")
      .attr("font-weight", 600)
      .attr("fill", "#ffffff")
      .attr("pointer-events", "none")
      .style("text-shadow", "0 0 6px rgba(0,0,0,0.6)");

    node
      .append("text")
      .text((d) => friendlyModeName(d.thinkingMode))
      .attr("x", 0)
      .attr("y", (d) => radiusFor(d) + 28)
      .attr("text-anchor", "middle")
      .attr("font-size", "9px")
      .attr("font-family", "sans-serif")
      .attr("fill", (d) => modeColor(d.thinkingMode))
      .attr("pointer-events", "none")
      .style("letter-spacing", "0.08em");

    node.append("title").text((d) => [d.id, "Domain: " + (d.domain || "—"), "Mode: " + friendlyModeName(d.thinkingMode), "Sessions: " + (d.sessionCount || 0), d.isolated ? "Isolated — needs bridging" : ""].filter(Boolean).join("\n"));

    // Isolated animated pulse
    node
      .filter((d) => d.isolated)
      .append("animate")
      .attr("attributeName", "stroke-opacity")
      .attr("values", "1;0.4;1")
      .attr("dur", "2s")
      .attr("repeatCount", "indefinite");
    node
      .filter((d) => !d.isolated && (!d.connections || d.connections < 2))
      .append("animate")
      .attr("attributeName", "opacity")
      .attr("values", "0.8;1;0.8")
      .attr("dur", "3s")
      .attr("repeatCount", "indefinite");

    simulation.on("tick", () => {
      (link as any)
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);
      (node as any).attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });
  }, [data, height]);

  return (
    <div className="relative w-full">
      <svg ref={svgRef} style={{ width: "100%", height: height || 500 }} />
    </div>
  );
}

function friendlyModeName(mode?: string) {
  switch ((mode || "").toUpperCase()) {
    case "CONVERGENT":
      return "Convergent";
    case "DIVERGENT":
      return "Divergent";
    case "ANALOGICAL":
      return "Analogical";
    case "METACOGNITIVE":
      return "Metacognitive";
    case "SYSTEMS":
      return "Systems";
    case "DMN":
      return "Default Mode";
    default:
      return mode || "Mode";
  }
}