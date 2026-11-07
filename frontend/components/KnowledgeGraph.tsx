"use client";

import { useRef, useCallback, useState, useMemo, useEffect } from "react";
import ForceGraph3D from "react-force-graph-3d";
import * as THREE from "three";
import SpriteText from "three-spritetext";
import { tokens } from "@/lib/tokens";
import { similarity } from "@/lib/combination/vsa";
import { getModeVector } from "@/lib/combination/modeVectors";
import {
  fuseSessions,
  type FusionResponse,
  type D3GraphData,
  type CognitiveRegime,
} from "@/lib/api";

function regimeConfig(regime?: CognitiveRegime) {
  switch (regime) {
    case "INTEGRATED":
      return {
        name: "Integrated Regime",
        color: "#10B981",
        badgeBg: "rgba(16, 185, 129, 0.15)",
        badgeBorder: "rgba(16, 185, 129, 0.4)",
        desc: "Optimal algebraic mixing (high λ₂) and balanced conceptual salience (high H_c).",
      };
    case "COMPARTMENTALIZED":
      return {
        name: "Compartmentalized",
        color: "#F59E0B",
        badgeBg: "rgba(245, 158, 11, 0.15)",
        badgeBorder: "rgba(245, 158, 11, 0.4)",
        desc: "Weakly bridged conceptual silos (low λ₂). Spectral bridge healing recommended.",
      };
    case "FIXATED":
      return {
        name: "Fixated Regime",
        color: "#EF4444",
        badgeBg: "rgba(239, 68, 68, 0.15)",
        badgeBorder: "rgba(239, 68, 68, 0.4)",
        desc: "Salience concentrated in few dominant hubs (low normalized stationary entropy H_c).",
      };
    case "RIGID_ROUTINE":
      return {
        name: "Rigid Routine",
        color: "#8B5CF6",
        badgeBg: "rgba(139, 92, 246, 0.15)",
        badgeBorder: "rgba(139, 92, 246, 0.4)",
        desc: "High connectivity but deterministic, rigid transitions (low entropy rate h_rate).",
      };
    default:
      return {
        name: "Inactive Regime",
        color: "#64748B",
        badgeBg: "rgba(100, 116, 139, 0.15)",
        badgeBorder: "rgba(100, 116, 139, 0.4)",
        desc: "Awaiting concept activations to form active support V⁺.",
      };
  }
}

function modeColor(mode?: string): string {
  const key = (mode || "").toUpperCase();
  return (tokens.colors.modes as Record<string, string>)[key] || "#6C63FF";
}

function friendlyModeName(mode?: string) {
  if (!mode) return "Exploratory";
  const m = mode.toUpperCase();
  const map: Record<string, string> = {
    CONVERGENT: "Convergent",
    DIVERGENT: "Divergent",
    ANALOGICAL: "Analogical",
    METACOGNITIVE: "Metacognitive",
    SYSTEMS: "Systems",
    DMN: "Default Mode",
  };
  return map[m] || mode;
}

function cleanConceptName(rawName?: string): string {
  if (!rawName) return "";
  let name = rawName.trim();
  const prefixes = [
    "CONVERGENT:", "DIVERGENT:", "ANALOGICAL:", "METACOGNITIVE:", "SYSTEMS:", "DMN:",
    "CONVERGENT -", "DIVERGENT -", "ANALOGICAL -", "METACOGNITIVE -", "SYSTEMS -", "DMN -",
    "MODE:", "CONCEPT:"
  ];
  for (const p of prefixes) {
    if (name.toUpperCase().startsWith(p)) {
      name = name.slice(p.length).trim();
    }
  }
  return name;
}

function labelFor(d: any) {
  if (!d) return "Node";
  const candidate = d.concept && d.concept !== "?" ? d.concept : (d.title || d.name || d.topic);
  const cleaned = cleanConceptName(candidate);
  if (cleaned && !cleaned.toLowerCase().startsWith("session ")) {
    return cleaned.length > 24 ? cleaned.slice(0, 22) + "…" : cleaned;
  }
  if (d.title || d.topic) {
    const sessionTitle = cleanConceptName(d.title || d.topic);
    if (sessionTitle) {
      return sessionTitle.length > 24 ? sessionTitle.slice(0, 22) + "…" : sessionTitle;
    }
  }
  if (cleaned) {
    return cleaned.length > 24 ? cleaned.slice(0, 22) + "…" : cleaned;
  }
  const modeLabel = friendlyModeName(d.thinkingMode || d.modeTarget || d.mode);
  return `${modeLabel} Node`;
}

/* ── Scientific 3D Node Factories ───────────────────────── */

interface NodeVisualOpts {
  labelMode: "smart" | "all" | "none";
  isHovered: boolean;
  isBridgeEndpoint: boolean;
}

function makeConceptNode(node: any, opts: NodeVisualOpts) {
  const color = node.__color as string;
  const radius = (node.__radius as number) || 5;
  const group = new THREE.Group();

  // Core crystalline sphere
  const geo = new THREE.SphereGeometry(radius, 24, 24);
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    emissive: new THREE.Color(color),
    emissiveIntensity: opts.isHovered ? 0.6 : opts.isBridgeEndpoint ? 0.45 : 0.25,
    roughness: 0.3,
    metalness: 0.5,
  });
  group.add(new THREE.Mesh(geo, mat));

  // Scientific orbital / target ring
  const ringRadius = radius * (opts.isBridgeEndpoint ? 1.45 : 1.3);
  const ringGeo = new THREE.RingGeometry(ringRadius, ringRadius + 0.5, 36);
  const ringMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(opts.isBridgeEndpoint ? "#10B981" : color),
    transparent: true,
    opacity: opts.isHovered ? 0.7 : opts.isBridgeEndpoint ? 0.65 : 0.3,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 3;
  group.add(ring);

  // If bridge candidate, add a second perpendicular pulse ring
  if (opts.isBridgeEndpoint) {
    const bridgeRingGeo = new THREE.RingGeometry(ringRadius * 1.15, ringRadius * 1.25, 36);
    const bridgeRingMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color("#10B981"),
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const bridgeRing = new THREE.Mesh(bridgeRingGeo, bridgeRingMat);
    bridgeRing.rotation.y = Math.PI / 3;
    group.add(bridgeRing);
  }

  // Smart single-label rendering with dark scientific pill background
  const showLabel =
    opts.labelMode === "all" ||
    opts.isHovered ||
    opts.isBridgeEndpoint ||
    (opts.labelMode === "smart" && radius >= 6.5);

  if (showLabel) {
    const textStr = labelFor(node.__raw);
    const label = new SpriteText(textStr, 2.3, "#f8fafc");
    label.fontFace = "JetBrains Mono, monospace";
    label.fontWeight = "600";
    label.backgroundColor = "rgba(15, 23, 42, 0.85)";
    label.borderColor = opts.isBridgeEndpoint ? "#10B981" : `${color}88`;
    label.borderWidth = 0.6;
    label.borderRadius = 3;
    label.padding = 1.6;
    label.position.y = radius + 3.8;
    label.material.depthWrite = false;
    group.add(label);
  }

  return group;
}

function makeSessionNode(node: any, opts: NodeVisualOpts) {
  const color = node.__color as string;
  const radius = 3.2;
  const group = new THREE.Group();

  // Precision bead
  const geo = new THREE.SphereGeometry(radius, 16, 16);
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    emissive: new THREE.Color(color),
    emissiveIntensity: opts.isHovered ? 0.5 : 0.3,
    roughness: 0.4,
    metalness: 0.3,
  });
  group.add(new THREE.Mesh(geo, mat));

  // Concentric targeting ring
  const ringGeo = new THREE.RingGeometry(radius + 0.8, radius + 1.2, 24);
  const ringMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity: opts.isHovered ? 0.6 : 0.25,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 2;
  group.add(ring);

  const showLabel = opts.labelMode === "all" || opts.isHovered;
  if (showLabel) {
    const label = new SpriteText(labelFor(node.__raw), 2.0, "#94a3b8");
    label.fontFace = "JetBrains Mono, monospace";
    label.backgroundColor = "rgba(15, 23, 42, 0.8)";
    label.borderColor = `${color}44`;
    label.borderWidth = 0.5;
    label.borderRadius = 2;
    label.padding = 1.2;
    label.position.y = radius + 3.2;
    label.material.depthWrite = false;
    group.add(label);
  }

  return group;
}

function makeFusionNode(node: any, opts: NodeVisualOpts) {
  const radius = 7.5;
  const group = new THREE.Group();

  // Dual-tone crystal sphere
  const geo = new THREE.IcosahedronGeometry(radius, 2);
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#7C4DFF"),
    emissive: new THREE.Color("#A855F7"),
    emissiveIntensity: opts.isHovered ? 0.6 : 0.35,
    roughness: 0.3,
    metalness: 0.4,
  });
  group.add(new THREE.Mesh(geo, mat));

  // Outer wireframe geodesic
  const wireGeo = new THREE.IcosahedronGeometry(radius * 1.35, 1);
  const wireMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#C4B5FD"),
    wireframe: true,
    transparent: true,
    opacity: 0.3,
  });
  group.add(new THREE.Mesh(wireGeo, wireMat));

  // Label with infinity sign
  const textStr = `\u221E ${labelFor(node.__raw)}`;
  const label = new SpriteText(textStr, 2.5, "#E9D5FF");
  label.fontFace = "JetBrains Mono, monospace";
  label.fontWeight = "600";
  label.backgroundColor = "rgba(30, 27, 75, 0.85)";
  label.borderColor = "#A855F788";
  label.borderWidth = 0.6;
  label.borderRadius = 3;
  label.padding = 1.8;
  label.position.y = radius + 4.2;
  label.material.depthWrite = false;
  group.add(label);

  return group;
}

/* ── Demo Sample Data ────────────────────────────────────── */

const DEMO_NODES = [
  { id: "demo-1", name: "Quantum Mechanics", domain: "Physics", thinkingMode: "DIVERGENT", sessionCount: 3 },
  { id: "demo-2", name: "Neural Networks", domain: "CS", thinkingMode: "CONVERGENT", sessionCount: 2 },
  { id: "demo-3", name: "Epistemology", domain: "Philosophy", thinkingMode: "METACOGNITIVE", sessionCount: 2 },
  { id: "demo-4", name: "Game Theory", domain: "Math", thinkingMode: "SYSTEMS", sessionCount: 1 },
  { id: "demo-5", name: "Linguistics", domain: "CogSci", thinkingMode: "ANALOGICAL", sessionCount: 1 },
];

const DEMO_LINKS = [
  { source: "demo-1", target: "demo-2", weight: 0.6 },
  { source: "demo-2", target: "demo-3", weight: 0.4 },
  { source: "demo-3", target: "demo-4", weight: 0.5 },
  { source: "demo-1", target: "demo-5", weight: 0.35 },
  { source: "demo-4", target: "demo-5", weight: 0.45 },
];

/* ── Component ───────────────────────────────────────────── */

interface KnowledgeGraphProps {
  data?: D3GraphData | null;
  height?: number | string;
  onStartSession?: () => void;
  userId?: string;
  onNodeClick?: (node: any) => void;
  className?: string;
}

export default function KnowledgeGraph({
  data,
  height,
  onStartSession,
  onNodeClick,
  className = "",
}: KnowledgeGraphProps) {
  const fgRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 0,
    height: typeof height === "number" ? height : 500,
  });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [fusing, setFusing] = useState(false);
  const [lastFusion, setLastFusion] = useState<FusionResponse | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [showSpectralHUD, setShowSpectralHUD] = useState(false);
  const [labelMode, setLabelMode] = useState<"smart" | "all" | "none">("smart");
  const [isPaused, setIsPaused] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const isEmpty = !data || (data.nodes?.length ?? 0) === 0;

  // Measure container dimensions with ResizeObserver for crisp responsiveness
  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: Math.floor(rect.width) || 600,
          height:
            typeof height === "number"
              ? height
              : Math.floor(rect.height) > 100
              ? Math.floor(rect.height)
              : 500,
        });
      }
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [height]);

  /* ── Build graph data ─────────────────────────────────── */

  const graphData = useMemo(() => {
    const rawNodes = isEmpty ? DEMO_NODES : (data?.nodes || []);
    const rawLinks = isEmpty ? DEMO_LINKS : (data?.links || []);

    const bridgeU = data?.recommendedBridge?.node_u;
    const bridgeV = data?.recommendedBridge?.node_v;

    // Filter by mode if active
    const filteredNodes = activeFilter
      ? rawNodes.filter((n: any) => {
          const m = (n.thinkingMode || n.modeTarget || n.mode || "").toUpperCase();
          return m === activeFilter;
        })
      : rawNodes;

    const nodeIds = new Set(filteredNodes.map((n: any) => n.id || n.name));

    const graphNodes = filteredNodes.map((n: any) => {
      const isSession = n.type === "session" || n.id?.startsWith("session-");
      const isFusion = n.type === "fusion";
      const color = modeColor(n.thinkingMode || n.modeTarget);

      const baseRadius = isFusion ? 7.5 : isSession ? 3.2 : 5;
      const radius = baseRadius + (n.sessionCount ? Math.min(n.sessionCount * 0.8, 3.5) : 0);

      const id = n.id || n.name;
      const isBridgeEndpoint = id === bridgeU || id === bridgeV;

      return {
        id,
        __raw: n,
        __color: color,
        __radius: radius,
        __type: isFusion ? "fusion" : isSession ? "session" : "concept",
        __isBridgeEndpoint: isBridgeEndpoint,
        val: radius,
        color,
      };
    });

    const graphLinks = rawLinks
      .filter((l: any) => {
        const src = typeof l.source === "object" ? l.source.id : l.source;
        const tgt = typeof l.target === "object" ? l.target.id : l.target;
        return nodeIds.has(src) && nodeIds.has(tgt);
      })
      .map((l: any) => ({
        source: typeof l.source === "object" ? l.source.id : l.source,
        target: typeof l.target === "object" ? l.target.id : l.target,
        weight: l.weight || 0.5,
        __type: l.type || "reinforcement",
      }));

    // Add VSA similarity edges
    const conceptNodes = graphNodes.filter((n) => n.__type === "concept");
    for (let i = 0; i < conceptNodes.length; i++) {
      for (let j = i + 1; j < conceptNodes.length; j++) {
        try {
          const vecA = getModeVector(conceptNodes[i].__raw.thinkingMode);
          const vecB = getModeVector(conceptNodes[j].__raw.thinkingMode);
          const score = similarity(vecA, vecB);
          if (score > 0.3) {
            graphLinks.push({
              source: conceptNodes[i].id,
              target: conceptNodes[j].id,
              weight: score,
              __type: "similarity",
            });
          }
        } catch {}
      }
    }

    // Add recommended spectral bridge edge
    if (data?.recommendedBridge) {
      const u = data.recommendedBridge.node_u;
      const v = data.recommendedBridge.node_v;
      if (nodeIds.has(u) && nodeIds.has(v)) {
        graphLinks.push({
          source: u,
          target: v,
          weight: Math.max(0.4, Math.min(1.0, data.recommendedBridge.fiedler_gap)),
          __type: "spectral_bridge",
        });
      }
    }

    return { nodes: graphNodes, links: graphLinks };
  }, [data, isEmpty, activeFilter]);

  /* ── Custom node object ───────────────────────────────── */

  const nodeThreeObject = useCallback(
    (node: any) => {
      const isHovered = hoveredNode === node.id;
      const opts: NodeVisualOpts = {
        labelMode,
        isHovered,
        isBridgeEndpoint: !!node.__isBridgeEndpoint,
      };
      if (node.__type === "session") return makeSessionNode(node, opts);
      if (node.__type === "fusion") return makeFusionNode(node, opts);
      return makeConceptNode(node, opts);
    },
    [hoveredNode, labelMode]
  );

  /* ── Scientific 3D Grid & Studio Lighting ─────────────── */

  const handleEngineStop = useCallback(() => {
    const fg = fgRef.current;
    if (!fg) return;

    try {
      const scene = fg.scene();
      // Remove default lights
      const toRemove: THREE.Object3D[] = [];
      scene.traverse((child: THREE.Object3D) => {
        if (child instanceof THREE.Light || child instanceof THREE.GridHelper) {
          toRemove.push(child);
        }
      });
      toRemove.forEach((l) => l.parent?.remove(l));

      // Constant scientific laboratory lights
      const ambient = new THREE.AmbientLight(0xffffff, 0.75);
      scene.add(ambient);

      const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
      dirLight.position.set(60, 100, 80);
      scene.add(dirLight);

      const fillLight = new THREE.DirectionalLight(0x94a3b8, 0.25);
      fillLight.position.set(-60, -30, -80);
      scene.add(fillLight);

      // 3D Laboratory Ground Grid Plane
      const grid = new THREE.GridHelper(500, 50, 0x334155, 0x1e293b);
      grid.position.y = -65;
      (grid.material as THREE.Material).transparent = true;
      (grid.material as THREE.Material).opacity = 0.22;
      scene.add(grid);
    } catch {}

    fg.camera().position.set(0, 0, 220);
  }, []);

  /* ── Camera & Layout Presets ──────────────────────────── */

  const setCameraView = (type: "iso" | "top" | "reset") => {
    const fg = fgRef.current;
    if (!fg) return;
    if (type === "iso") {
      fg.cameraPosition({ x: 130, y: 110, z: 180 }, { x: 0, y: 0, z: 0 }, 800);
    } else if (type === "top") {
      fg.cameraPosition({ x: 0, y: 260, z: 0 }, { x: 0, y: 0, z: 0 }, 800);
    } else {
      fg.cameraPosition({ x: 0, y: 0, z: 220 }, { x: 0, y: 0, z: 0 }, 800);
    }
  };

  const togglePause = () => {
    const fg = fgRef.current;
    if (!fg) return;
    if (isPaused) {
      fg.resumeAnimation();
      setIsPaused(false);
    } else {
      fg.pauseAnimation();
      setIsPaused(true);
    }
  };

  const focusSpectralBridge = () => {
    const fg = fgRef.current;
    if (!fg || !data?.recommendedBridge) return;
    const u = graphData.nodes.find((n) => n.id === data.recommendedBridge?.node_u);
    const v = graphData.nodes.find((n) => n.id === data.recommendedBridge?.node_v);
    if (u && v && typeof (u as any).x === "number" && typeof (v as any).x === "number") {
      const midX = ((u as any).x + (v as any).x) / 2;
      const midY = ((u as any).y + (v as any).y) / 2;
      const midZ = ((u as any).z + (v as any).z) / 2;
      fg.cameraPosition({ x: midX + 30, y: midY + 40, z: midZ + 90 }, { x: midX, y: midY, z: midZ }, 1000);
    }
  };

  /* ── Interaction Handlers ─────────────────────────────── */

  const handleClick = useCallback(
    (node: any, event: any) => {
      if (!node) return;
      const nodeId = node.id as string;
      if (event?.ctrlKey || event?.metaKey) {
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (next.has(nodeId)) next.delete(nodeId);
          else next.add(nodeId);
          return next;
        });
        return;
      }
      onNodeClick?.(node.__raw || node);
    },
    [onNodeClick]
  );

  const handleNodeHover = useCallback((node: any) => {
    setHoveredNode(node ? node.id : null);
  }, []);

  const handleFuse = useCallback(async () => {
    if (selectedIds.size !== 2) return;
    const ids = Array.from(selectedIds);
    setFusing(true);
    try {
      const result = await fuseSessions(ids[0], ids[1]);
      setLastFusion(result);
      setSelectedIds(new Set());
      setTimeout(() => setLastFusion(null), 4000);
    } catch (err) {
      console.error("Fusion failed:", err);
    } finally {
      setFusing(false);
    }
  }, [selectedIds]);

  const linkDirectionalParticles = useCallback((link: any) => {
    if (link.__type === "spectral_bridge") return 4;
    if (link.__type === "similarity") return 1;
    return link.weight > 0.5 ? 3 : 2;
  }, []);

  const linkParticleColor = useCallback((link: any) => {
    if (link.__type === "spectral_bridge") return "#10B981";
    if (link.__type === "fusion") return "#A855F7";
    if (link.__type === "produced") return "#00E5FF";
    if (link.__type === "similarity") return "#00E5FF";
    return "#6C63FF";
  }, []);

  /* ── Render ────────────────────────────────────────────── */

  const containerStyle = {
    height: typeof height === "number" ? `${height}px` : height || "100%",
    width: "100%",
  };

  return (
    <div
      ref={containerRef}
      style={containerStyle}
      className={`relative w-full h-full min-h-[420px] bg-[#0b0e14] overflow-hidden select-none ${className}`}
    >
      {/* Scientific Telemetry & Regime HUD (Top-Left) */}
      {data?.diagnostics ? (
        <div className="absolute top-3 left-3 z-20 flex flex-col items-start gap-2 max-w-xs md:max-w-sm pointer-events-auto">
          {(() => {
            const reg = regimeConfig(data.diagnostics?.regime);
            return (
              <div
                className="bg-[#0f172a]/90 backdrop-blur-md border rounded-xl p-2.5 shadow-xl transition-all"
                style={{ borderColor: reg.badgeBorder }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full animate-pulse"
                      style={{ backgroundColor: reg.color }}
                    />
                    <span className="text-xs font-mono font-bold tracking-wide" style={{ color: reg.color }}>
                      {reg.name}
                    </span>
                  </div>
                  <button
                    onClick={() => setShowSpectralHUD(!showSpectralHUD)}
                    className="text-[10px] font-mono text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/60 transition cursor-pointer"
                  >
                    {showSpectralHUD ? "Hide Telemetry" : "Telemetry"}
                  </button>
                </div>

                {showSpectralHUD && (
                  <div className="mt-2.5 pt-2.5 border-t border-slate-800 text-[10px] font-mono space-y-2">
                    <p className="text-slate-400 text-[11px] leading-snug">{reg.desc}</p>
                    <div className="grid grid-cols-2 gap-2 text-slate-400 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                      <div>
                        <span className="text-slate-500">Gap (λ₂): </span>
                        <span className="text-emerald-400 font-semibold">
                          {data.diagnostics.lambda_2.toFixed(3)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Components: </span>
                        <span className="text-slate-200 font-semibold">
                          {data.diagnostics.num_components}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">H_c (bits): </span>
                        <span className="text-indigo-300 font-semibold">
                          {data.diagnostics.H_c.toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">h_rate (bits): </span>
                        <span className="text-cyan-300 font-semibold">
                          {data.diagnostics.h_rate.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {data.recommendedBridge && (
                      <div className="mt-2 p-2 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-emerald-200">
                        <div className="font-semibold text-emerald-400 flex items-center justify-between mb-1">
                          <span className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                            Spectral Bridge Healing
                          </span>
                          <button
                            onClick={focusSpectralBridge}
                            className="text-[9px] bg-emerald-500/20 hover:bg-emerald-500/30 px-1.5 py-0.5 rounded text-emerald-300 transition"
                          >
                            Focus ⚡
                          </button>
                        </div>
                        <div className="text-[10px] truncate text-slate-200 font-medium">
                          {data.recommendedBridge.node_u_name} ↔ {data.recommendedBridge.node_v_name}
                        </div>
                        <div className="text-[9px] text-emerald-400/80 mt-0.5">
                          Fiedler gap: Δf = {data.recommendedBridge.fiedler_gap.toFixed(3)} (maximally raises λ₂)
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      ) : null}

      {/* Scientific Instrument Controls (Top-Right Toolbar) */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 bg-[#0f172a]/90 backdrop-blur-md border border-slate-800 rounded-xl p-1 shadow-lg pointer-events-auto">
        <button
          onClick={() => setCameraView("iso")}
          title="Isometric 3D Perspective"
          className="px-2 py-1 text-[10px] font-mono rounded text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
        >
          📐 3D
        </button>
        <button
          onClick={() => setCameraView("top")}
          title="Top Plan (XY projection)"
          className="px-2 py-1 text-[10px] font-mono rounded text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
        >
          🔭 Plan
        </button>
        <button
          onClick={() => setCameraView("reset")}
          title="Reset Camera Center"
          className="px-2 py-1 text-[10px] font-mono rounded text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
        >
          ↺
        </button>
        <div className="w-px h-4 bg-slate-800" />
        <button
          onClick={togglePause}
          title={isPaused ? "Resume Force Simulation" : "Freeze Simulation Physics"}
          className={`px-2 py-1 text-[10px] font-mono rounded transition cursor-pointer ${
            isPaused ? "bg-amber-500/20 text-amber-300" : "text-slate-300 hover:text-white hover:bg-slate-800"
          }`}
        >
          {isPaused ? "▶ Run" : "⏸ Freeze"}
        </button>
        <button
          onClick={() =>
            setLabelMode((prev) => (prev === "smart" ? "all" : prev === "all" ? "none" : "smart"))
          }
          title="Cycle Label Visibility: Smart → All → Off"
          className="px-2 py-1 text-[10px] font-mono rounded text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
        >
          🏷️ {labelMode === "smart" ? "Smart" : labelMode === "all" ? "All" : "Off"}
        </button>
      </div>

      {/* Filter Mode Bar (Bottom-Left) */}
      <div className="absolute bottom-3 left-3 z-20 flex items-center gap-1 bg-[#0f172a]/85 backdrop-blur-md border border-slate-800/80 rounded-xl p-1 shadow-md pointer-events-auto text-[9px] font-mono">
        <span className="px-2 text-slate-500">Filter:</span>
        {["ALL", "CONVERGENT", "DIVERGENT", "SYSTEMS", "ANALOGICAL", "METACOGNITIVE"].map((m) => {
          const isActive = (m === "ALL" && activeFilter === null) || activeFilter === m;
          return (
            <button
              key={m}
              onClick={() => setActiveFilter(m === "ALL" ? null : m)}
              className={`px-2 py-1 rounded transition cursor-pointer ${
                isActive
                  ? "bg-slate-700 text-white font-semibold shadow-xs"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              {m === "ALL" ? "All Modes" : friendlyModeName(m)}
            </button>
          );
        })}
      </div>

      {/* Fusion Notification */}
      {lastFusion && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl bg-purple-950/80 border border-purple-500/40 text-purple-200 text-xs font-mono font-medium z-30 shadow-2xl animate-pulse">
          Synthesis created: {lastFusion.name}
        </div>
      )}

      {/* Fusion Controls */}
      {selectedIds.size === 2 && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl bg-slate-900/95 border border-purple-500/50 text-purple-200 text-xs font-mono z-30 flex items-center gap-3 shadow-2xl">
          <span>2 concepts selected</span>
          <button
            onClick={handleFuse}
            disabled={fusing}
            className="px-3 py-1 rounded-md bg-purple-600 hover:bg-purple-500 text-white font-medium transition cursor-pointer disabled:opacity-50"
          >
            {fusing ? "Fusing…" : "Fuse (u ⊕ v)"}
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-slate-400 hover:text-white transition cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 3D Force Canvas */}
      <div className="w-full h-full">
        <ForceGraph3D
          ref={fgRef}
          graphData={graphData}
          backgroundColor="#0b0e14"
          width={dimensions.width || undefined}
          height={dimensions.height || undefined}
          nodeThreeObject={nodeThreeObject}
          nodeThreeObjectExtend={false}
          nodeRelSize={1}
          linkWidth={(link: any) => (link.__type === "spectral_bridge" ? 1.6 : 0.65)}
          linkOpacity={0.35}
          linkColor={(link: any) =>
            link.__type === "spectral_bridge" ? "#10B981" : linkParticleColor(link)
          }
          linkDirectionalParticles={linkDirectionalParticles}
          linkDirectionalParticleWidth={(link: any) =>
            link.__type === "spectral_bridge" ? 2.6 : 1.8
          }
          linkDirectionalParticleColor={linkParticleColor}
          linkDirectionalParticleSpeed={(link: any) =>
            link.__type === "spectral_bridge" ? 0.008 : 0.004
          }
          linkCurvature={0.12}
          linkDirectionalArrowLength={0}
          d3VelocityDecay={0.3}
          d3AlphaDecay={0.02}
          warmupTicks={60}
          cooldownTicks={120}
          cooldownTime={2500}
          onEngineStop={handleEngineStop}
          onNodeClick={handleClick}
          onNodeHover={handleNodeHover}
          enablePointerInteraction={true}
          showNavInfo={false}
        />
      </div>

      {/* Scientific Legend (Bottom-Right) */}
      <div className="absolute bottom-3 right-3 text-[9px] font-mono text-slate-400 space-y-1.5 z-10 bg-slate-900/90 backdrop-blur-md p-2.5 rounded-xl border border-slate-800 shadow-xl pointer-events-auto">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#6C63FF]" />
          <span>Active Concept V⁺</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#00E5FF]" />
          <span>Session Orb</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: "linear-gradient(135deg, #6C63FF, #A855F7)" }}
          />
          <span>VSA Synthesis (u ⊕ v)</span>
        </div>
        {data?.recommendedBridge && (
          <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
            <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
            <span className="text-emerald-400 font-semibold">Fiedler Bridge</span>
          </div>
        )}
      </div>

      {/* Empty State Banner */}
      {isEmpty && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center z-10 pointer-events-auto bg-slate-900/85 backdrop-blur-md p-6 rounded-2xl border border-slate-800 shadow-2xl max-w-sm">
          <div className="w-10 h-10 mx-auto rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold mb-3">
            ◈
          </div>
          <h4 className="text-sm font-mono font-semibold text-slate-200 mb-1">
            Cognitive Lattice Initialized
          </h4>
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            Sample demonstration topology loaded. Start exploring concepts in the workbench or dialogue to grow your personalized cognitive graph.
          </p>
          <button
            onClick={() => {
              if (onStartSession) onStartSession();
              else window.location.href = "/session";
            }}
            className="w-full py-2 rounded-lg bg-[var(--accent)] text-[var(--bg-0)] text-xs font-mono font-semibold hover:opacity-90 transition cursor-pointer shadow-md"
          >
            Start Dialogue Session →
          </button>
        </div>
      )}
    </div>
  );
}
