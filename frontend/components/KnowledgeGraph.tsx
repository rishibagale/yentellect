"use client";

import { useRef, useCallback, useState, useMemo, useEffect } from "react";
import ForceGraph3D from "react-force-graph-3d";
import * as THREE from "three";
import SpriteText from "three-spritetext";
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
    CONVERGENT: "Convergent",
    DIVERGENT: "Divergent",
    ANALOGICAL: "Analogical",
    METACOGNITIVE: "Metacognitive",
    SYSTEMS: "Systems",
    DMN: "Default Mode",
  };
  return map[(mode || "").toUpperCase()] || mode || "Mode";
}

function labelFor(d: any) {
  if (d.concept && d.concept !== "?") return d.concept;
  if (d.name && !d.name.startsWith("Session ")) return d.name;
  const modeLabel = friendlyModeName(
    d.thinkingMode || d.modeTarget || d.mode
  );
  return modeLabel;
}

/* ── Three.js node factories ─────────────────────────────── */

function makeConceptNode(node: any) {
  const color = node.__color as string;
  const radius = (node.__radius as number) || 6;

  const group = new THREE.Group();

  // Core sphere — emissive material for self-lit look
  const geo = new THREE.IcosahedronGeometry(radius, 2);
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    emissive: new THREE.Color(color),
    emissiveIntensity: 0.15,
    roughness: 0.5,
    metalness: 0.2,
    transparent: true,
    opacity: 0.95,
  });
  const mesh = new THREE.Mesh(geo, mat);
  group.add(mesh);

  // Outer glow shell — subtle, not contributing to bloom
  const glowGeo = new THREE.IcosahedronGeometry(radius * 1.4, 2);
  const glowMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity: 0.03,
    side: THREE.BackSide,
    depthWrite: false,
  });
  group.add(new THREE.Mesh(glowGeo, glowMat));

  // Label
  const label = new SpriteText(labelFor(node.__raw), 3, "#d6dde6CC");
  label.position.y = radius + 5;
  label.fontFace = "Space Grotesk, Inter, sans-serif";
  label.fontWeight = "600";
  label.material.depthWrite = false;
  group.add(label);

  // Mode sub-label
  const modeText = new SpriteText(
    friendlyModeName(node.__raw?.thinkingMode),
    2.2,
    `${color}BB`
  );
  modeText.position.y = radius + 1;
  modeText.fontFace = "JetBrains Mono, monospace";
  modeText.material.depthWrite = false;
  group.add(modeText);

  return group;
}

function makeSessionNode(node: any) {
  const color = node.__color as string;
  const radius = 3.5;

  const group = new THREE.Group();

  // Small bright orb
  const geo = new THREE.SphereGeometry(radius, 12, 12);
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    emissive: new THREE.Color(color),
    emissiveIntensity: 0.2,
    roughness: 0.5,
    metalness: 0.3,
    transparent: true,
    opacity: 0.9,
  });
  group.add(new THREE.Mesh(geo, mat));

  // Thin ring
  const ringGeo = new THREE.RingGeometry(radius + 1, radius + 1.5, 32);
  const ringMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 2;
  group.add(ring);

  // Label
  const label = new SpriteText(labelFor(node.__raw), 2.5, "#d6dde6BB");
  label.position.y = radius + 5;
  label.fontFace = "Space Grotesk, Inter, sans-serif";
  label.material.depthWrite = false;
  group.add(label);

  return group;
}

function makeFusionNode(node: any) {
  const radius = 8;

  const group = new THREE.Group();

  // Dual-color gradient sphere (blend of purple + cyan)
  const geo = new THREE.IcosahedronGeometry(radius, 3);
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#7C4DFF"),
    emissive: new THREE.Color("#A855F7"),
    emissiveIntensity: 0.12,
    roughness: 0.4,
    metalness: 0.3,
    transparent: true,
    opacity: 0.92,
  });
  group.add(new THREE.Mesh(geo, mat));

  // Outer glow — subtle
  const glowGeo = new THREE.IcosahedronGeometry(radius * 1.6, 2);
  const glowMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#A855F7"),
    transparent: true,
    opacity: 0.03,
    side: THREE.BackSide,
    depthWrite: false,
  });
  group.add(new THREE.Mesh(glowGeo, glowMat));

  // Infinity symbol label
  const label = new SpriteText("\u221E", 5, "#FFFFFFCC");
  label.fontFace = "Space Grotesk, Inter, sans-serif";
  label.fontWeight = "bold";
  label.material.depthWrite = false;
  group.add(label);

  // Name label
  const nameLabel = new SpriteText(labelFor(node.__raw), 2.8, "#C4B5FD");
  nameLabel.position.y = radius + 5;
  nameLabel.fontFace = "Space Grotesk, Inter, sans-serif";
  nameLabel.fontWeight = "600";
  nameLabel.material.depthWrite = false;
  group.add(nameLabel);

  return group;
}

/* ── Demo data ───────────────────────────────────────────── */

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
  onNodeClick,
}: KnowledgeGraphProps) {
  const fgRef = useRef<any>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [fusing, setFusing] = useState(false);
  const [lastFusion, setLastFusion] = useState<FusionResponse | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const isEmpty = !data || (data.nodes?.length ?? 0) === 0;

  /* ── Build graph data ─────────────────────────────────── */

  const graphData = useMemo(() => {
    const nodesData = isEmpty ? DEMO_NODES : (data?.nodes || []);
    const linksRaw = isEmpty ? DEMO_LINKS : (data?.links || []);

    const graphNodes = nodesData.map((n: any) => {
      const isSession =
        n.type === "session" || n.id?.startsWith("session-");
      const isFusion = n.type === "fusion";
      const color = modeColor(n.thinkingMode || n.modeTarget);

      const baseRadius = isFusion ? 8 : isSession ? 3.5 : 6;
      const radius =
        baseRadius + (n.sessionCount ? Math.min(n.sessionCount * 0.8, 4) : 0);

      return {
        id: n.id || n.name,
        __raw: n,
        __color: color,
        __radius: radius,
        __type: isFusion ? "fusion" : isSession ? "session" : "concept",
        val: radius,
        color,
        fx: undefined as number | undefined,
        fy: undefined as number | undefined,
        fz: undefined as number | undefined,
      };
    });

    const graphLinks = linksRaw
      .filter((l: any) => {
        const src = typeof l.source === "object" ? l.source.id : l.source;
        const tgt = typeof l.target === "object" ? l.target.id : l.target;
        return src && tgt;
      })
      .map((l: any) => ({
        source: typeof l.source === "object" ? l.source.id : l.source,
        target: typeof l.target === "object" ? l.target.id : l.target,
        weight: l.weight || 0.5,
        __type: l.type || "reinforcement",
      }));

    // Add VSA similarity edges between concept nodes
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
            console.log(`[VSA Edge] ${conceptNodes[i].id} <-> ${conceptNodes[j].id}: similarity = ${score.toFixed(3)}`);
          }
        } catch (err) {
          console.warn("[VSA Edge] Failed to create similarity edge:", err);
        }
      }
    }

    return { nodes: graphNodes, links: graphLinks };
  }, [data, isEmpty]);

  /* ── Custom node object ───────────────────────────────── */

  const nodeThreeObject = useCallback((node: any) => {
    if (node.__type === "session") return makeSessionNode(node);
    if (node.__type === "fusion") return makeFusionNode(node);
    return makeConceptNode(node);
  }, []);

  /* ── Bloom post-processing after engine stabilizes ────── */

  const handleEngineStop = useCallback(() => {
    const fg = fgRef.current;
    if (!fg) return;

    // Replace default lights with constant, even illumination
    try {
      const scene = fg.scene();
      // Remove default directional/ambient lights added by the library
      const toRemove: THREE.Object3D[] = [];
      scene.traverse((child: THREE.Object3D) => {
        if (child instanceof THREE.Light) toRemove.push(child);
      });
      toRemove.forEach((l) => l.parent?.remove(l));

      // Single ambient — constant base light, no flicker
      const ambient = new THREE.AmbientLight(0xffffff, 0.7);
      scene.add(ambient);

      // One soft directional from above-front — gives subtle depth
      const dir = new THREE.DirectionalLight(0xffffff, 0.5);
      dir.position.set(50, 80, 100);
      scene.add(dir);

      // Fill from opposite side — kills harsh shadows
      const fill = new THREE.DirectionalLight(0xffffff, 0.2);
      fill.position.set(-40, -20, -60);
      scene.add(fill);
    } catch {
      // Degrade gracefully
    }

    // Bloom
    try {
      const { UnrealBloomPass } = require("three/examples/jsm/postprocessing/UnrealBloomPass");
      const composer = fg.postProcessingComposer();
      composer.addPass(
        new UnrealBloomPass(
          new THREE.Vector2(window.innerWidth, height),
          0.25,
          0.4,
          0.9
        )
      );
    } catch {
      // Bloom is cosmetic — degrade gracefully
    }

    // Set initial camera
    fg.camera().position.set(0, 0, 200);
  }, [height]);

  /* ── Click handler ────────────────────────────────────── */

  const handleClick = useCallback(
    (node: any, event: any) => {
      if (!node) return;

      const nodeId = node.id as string;

      // Ctrl/Cmd + click → multi-select for fusion
      if (event?.ctrlKey || event?.metaKey) {
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (next.has(nodeId)) next.delete(nodeId);
          else next.add(nodeId);
          return next;
        });
        return;
      }

      // Regular click → node detail
      onNodeClick?.(node.__raw || node);
    },
    [onNodeClick]
  );

  /* ── Hover ────────────────────────────────────────────── */

  const handleNodeHover = useCallback((node: any) => {
    setHoveredNode(node ? node.id : null);
  }, []);

  /* ── Fuse selected ────────────────────────────────────── */

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

  /* ── Link particles config ────────────────────────────── */

  const linkDirectionalParticles = useCallback(
    (link: any) => {
      if (link.__type === "similarity") return 1;
      return link.weight > 0.5 ? 3 : 2;
    },
    []
  );

  const linkParticleColor = useCallback(
    (link: any) => {
      if (link.__type === "fusion") return "#A855F7";
      if (link.__type === "produced") return "#00E5FF";
      if (link.__type === "similarity") return "#00E5FF";
      return "#6C63FF";
    },
    []
  );

  /* ── Empty state ──────────────────────────────────────── */

  if (isEmpty) {
    return (
      <div className="relative w-full" style={{ height }}>
        <div style={{ width: "100%", height }} className="rounded-2xl overflow-hidden">
          <ForceGraph3D
            graphData={graphData}
            backgroundColor="#0e1116"
            width={undefined}
            height={height}
            nodeThreeObject={nodeThreeObject}
            nodeThreeObjectExtend={false}
            linkWidth={0.5}
            linkOpacity={0.3}
            linkColor={() => "#6C63FF55"}
            linkDirectionalParticles={linkDirectionalParticles}
            linkDirectionalParticleWidth={1.5}
            linkDirectionalParticleColor={linkParticleColor}
            linkDirectionalParticleSpeed={0.004}
            linkCurvature={0.1}
            d3VelocityDecay={0.3}
            warmupTicks={50}
            cooldownTicks={100}
            onEngineStop={handleEngineStop}
            onNodeClick={handleClick}
            onNodeHover={handleNodeHover}
            enablePointerInteraction={true}
            showNavInfo={false}
          />
        </div>
        <div className="absolute top-3 left-1/2 -translate-x-1/2 text-[var(--text-dim)] text-xs font-mono pointer-events-none z-10">
          Example — your graph will appear here
        </div>
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
          <button
            onClick={() => {
              if (onStartSession) onStartSession();
              // Navigate to session page instead of home
              window.location.href = "/session";
            }}
            className="px-5 py-2.5 rounded-[var(--radius)] bg-[var(--accent)] text-[var(--bg-0)] text-sm font-medium hover:opacity-90 transition cursor-pointer"
          >
            Start your first session
          </button>
        </div>
        {/* Legend */}
        <div className="absolute bottom-3 right-3 text-[9px] font-mono text-[var(--text-dim)] space-y-1 z-10">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#6C63FF]" />
            <span>Concept</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#00E5FF]" />
            <span>Session</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: "linear-gradient(135deg, #6C63FF, #A855F7)" }}
            />
            <span>Fusion</span>
          </div>
        </div>
      </div>
    );
  }

  /* ── Main graph ───────────────────────────────────────── */

  return (
    <div className="relative w-full" style={{ height }}>
      {/* Fusion notification */}
      {lastFusion && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 px-4 py-2 rounded-[10px] bg-[#A855F7]/20 border border-[#A855F7]/40 text-[#C4B5FD] text-xs font-medium z-20 animate-pulse">
          Fusion created: {lastFusion.name}
        </div>
      )}

      {/* Fusion controls */}
      {selectedIds.size === 2 && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 px-4 py-2 rounded-[10px] bg-[var(--bg-1)] border border-[#A855F7]/40 text-[#C4B5FD] text-xs font-medium z-20 flex items-center gap-3">
          <span>2 nodes selected</span>
          <button
            onClick={handleFuse}
            disabled={fusing}
            className="px-3 py-1 rounded-md bg-[#A855F7] text-white text-xs font-medium hover:opacity-90 disabled:opacity-50 transition"
          >
            {fusing ? "Fusing..." : "Fuse sessions"}
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-[var(--text-dim)] hover:text-[var(--text)] transition"
          >
            x
          </button>
        </div>
      )}

      {/* 3D Canvas */}
      <div
        style={{ width: "100%", height }}
        className="rounded-2xl overflow-hidden"
      >
        <ForceGraph3D
          ref={fgRef}
          graphData={graphData}
          backgroundColor="#0e1116"
          width={undefined}
          height={height}
          nodeThreeObject={nodeThreeObject}
          nodeThreeObjectExtend={false}
          nodeRelSize={1}
          linkWidth={0.6}
          linkOpacity={0.35}
          linkColor={linkParticleColor}
          linkDirectionalParticles={linkDirectionalParticles}
          linkDirectionalParticleWidth={2}
          linkDirectionalParticleColor={linkParticleColor}
          linkDirectionalParticleSpeed={0.004}
          linkCurvature={0.15}
          linkDirectionalArrowLength={0}
          d3VelocityDecay={0.3}
          d3AlphaDecay={0.02}
          warmupTicks={80}
          cooldownTicks={150}
          cooldownTime={3000}
          onEngineStop={handleEngineStop}
          onNodeClick={handleClick}
          onNodeHover={handleNodeHover}
          enablePointerInteraction={true}
          showNavInfo={false}
        />
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 right-3 text-[9px] font-mono text-[var(--text-dim)] space-y-1 z-10">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#6C63FF]" />
          <span>Concept</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#00E5FF]" />
          <span>Session</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: "linear-gradient(135deg, #6C63FF, #A855F7)" }}
          />
          <span>Fusion</span>
        </div>
      </div>

      {/* Sparse state */}
      {graphData.nodes.length <= 3 && graphData.links.length === 0 && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-[var(--text-dim)] text-xs text-center pointer-events-none max-w-md leading-relaxed z-10">
          Concepts you explore become nodes. Connections form when Yentellect
          finds related ideas across sessions.
        </div>
      )}
    </div>
  );
}
