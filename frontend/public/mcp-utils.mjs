// mcp-utils.mjs for Yentellect MCP Server
// Compatible with Bun and Node.js environments

import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));

const candidates = [
  join(process.cwd(), "yentellect.db"),
  join(__dirname, "..", "..", "yentellect.db"),
  join(__dirname, "yentellect.db"),
];
const DB_PATH = candidates.find((p) => existsSync(p)) || candidates[0];

let _db = null;

export async function getDb() {
  if (_db) return _db;
  try {
    const { Database } = await import("bun:sqlite");
    _db = new Database(DB_PATH);
    _db.run("PRAGMA foreign_keys = ON");
    return _db;
  } catch {
    return null;
  }
}

export async function query(sql, params = []) {
  try {
    const dbInstance = await getDb();
    if (!dbInstance) return [];
    if (typeof dbInstance.query === "function") {
      return dbInstance.query(sql).all(...params);
    }
    if (typeof dbInstance.prepare === "function") {
      return dbInstance.prepare(sql).all(...params);
    }
    if (typeof dbInstance.all === "function") {
      return dbInstance.all(sql, ...params);
    }
  } catch {
    // SQLite error or table missing
  }
  return [];
}

export async function execute(sql, params = []) {
  try {
    const dbInstance = await getDb();
    if (!dbInstance) return false;
    if (typeof dbInstance.prepare === "function") {
      dbInstance.prepare(sql).run(...params);
      return true;
    }
    if (typeof dbInstance.run === "function") {
      dbInstance.run(sql, ...params);
      return true;
    }
  } catch {
    // Ignore error
  }
  return false;
}

// ---------------------------------------------------------------------------
// Active Research Document State
// ---------------------------------------------------------------------------
let _activePaper = {
  title: "On the Navier-Stokes Millennium Prize Problem",
  abstract:
    "The Navier-Stokes equations describe the motion of fluids (liquids and gases). The challenge is to make substantial mathematical progress toward a mathematical theory which might unlock the ease with which nature produces solutions, or prove that smooth, physically reasonable solutions do not always exist in three dimensions.",
  url: "https://www.claymath.org/millennium-problems/navier-stokes-equation/",
  source: "arxiv",
  year: "2000",
  equation:
    "\\frac{\\partial \\mathbf{u}}{\\partial t} + (\\mathbf{u} \\cdot \\nabla)\\mathbf{u} = -\\frac{1}{\\rho}\\nabla p + \\nu \\nabla^2 \\mathbf{u} + \\mathbf{f}(\\mathbf{x}, t)",
  problemStatement:
    "Do smooth, physically reasonable solutions exist globally for all time t >= 0 in R^3, or can nonlinear vortex stretching cause finite-time blowup / singularity formation?",
  context: "Mathematical Physics / Nonlinear Partial Differential Equations",
  lastUpdated: new Date().toISOString(),
};

export function setActivePaper(paper) {
  _activePaper = {
    ..._activePaper,
    ...paper,
    lastUpdated: new Date().toISOString(),
  };
  return _activePaper;
}

export async function getActivePaper() {
  return _activePaper;
}

// ---------------------------------------------------------------------------
// Socratic Connections (Isomorphisms, Systems Dynamics, Graph)
// ---------------------------------------------------------------------------
const SEED_CONNECTIONS = [
  {
    id: "seed-conn-1",
    source: "Navier-Stokes Vortex Stretching",
    target: "Financial Market Liquidity Cascade",
    sourceDomain: "Mathematical Physics",
    targetDomain: "Quantitative Finance",
    mode: "analogical",
    weight: 0.92,
    insight:
      "Energy cascade from large laminar eddies down to viscous dissipation scale is structurally isomorphic to systemic risk propagation from macro policy shocks down to high-frequency market liquidity evaporation.",
  },
  {
    id: "seed-conn-2",
    source: "Burgers Equation Shock Wave",
    target: "Traffic Jam Phantom Wave",
    sourceDomain: "Nonlinear PDEs",
    targetDomain: "Transportation Systems",
    mode: "analogical",
    weight: 0.89,
    insight:
      "The nonlinear convective term u*(du/dx) causing wave steepening balanced by viscous diffusion nu*(d^2u/dx^2) precisely governs backward-propagating density shockwaves in congested highway vehicular flow.",
  },
  {
    id: "seed-conn-3",
    source: "Physarum Slime Mold Tubule Network",
    target: "Dynamic Network Routing / Tokyo Rail Architecture",
    sourceDomain: "Biological Cybernetics",
    targetDomain: "Distributed Systems & Infrastructure",
    mode: "analogical",
    weight: 0.95,
    insight:
      "Rhythmic cytoplasmic shuttle streaming naturally balances flow conductance against maintenance cost, converging on Pareto-optimal Steiner tree network topologies with high fault tolerance.",
  },
  {
    id: "seed-conn-4",
    source: "Lotka-Volterra Predator-Prey Cycles",
    target: "Supply Chain Bullwhip & Inventory Oscillations",
    sourceDomain: "Theoretical Ecology",
    targetDomain: "Supply Chain Dynamics",
    mode: "systems",
    weight: 0.86,
    insight:
      "Phase delay between consumption rates and reproduction inertia directly maps to order-fulfillment latency amplifying demand oscillations across upstream suppliers.",
  },
];

let _inMemoryConnections = [...SEED_CONNECTIONS];

export async function getSocraticConnections() {
  try {
    const [nodes, edges] = await Promise.all([
      query(
        "SELECT concept_id, name, domain, thinking_mode_association AS mode FROM concept_nodes ORDER BY domain, name"
      ),
      query(
        "SELECT edge_id, source_id, target_id, weight, sn.name AS source_name, tn.name AS target_name FROM graph_edges ge JOIN concept_nodes sn ON ge.source_id = sn.concept_id JOIN concept_nodes tn ON ge.target_id = tn.concept_id ORDER BY ge.last_activated DESC"
      ),
    ]);

    const dbConnections = [];
    if (nodes && nodes.length > 0 && edges && edges.length > 0) {
      const nodeMap = new Map(nodes.map((n) => [n.concept_id, n]));
      for (const edge of edges) {
        const source = nodeMap.get(edge.source_id);
        const target = nodeMap.get(edge.target_id);
        if (!source || !target) continue;
        dbConnections.push({
          id: edge.edge_id,
          source: source.name,
          target: target.name,
          sourceDomain: source.domain,
          targetDomain: target.domain,
          mode: source.mode?.toLowerCase() || "analogical",
          weight: edge.weight,
        });
      }
    }

    const all = [..._inMemoryConnections, ...dbConnections];
    const unique = [];
    const seen = new Set();
    for (const c of all) {
      const key = `${c.source}::${c.target}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(c);
      }
    }

    return {
      connections: unique,
      count: unique.length,
      byDomain: unique.reduce((acc, c) => {
        acc[c.sourceDomain] = (acc[c.sourceDomain] || 0) + 1;
        return acc;
      }, {}),
    };
  } catch {
    return {
      connections: _inMemoryConnections,
      count: _inMemoryConnections.length,
      byDomain: {},
    };
  }
}

export async function addConnection({ sourceConcept, targetConcept, mode = "analogical", insight = "" }) {
  const id = "conn-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
  const newConn = {
    id,
    source: sourceConcept,
    target: targetConcept,
    sourceDomain: "Custom Research",
    targetDomain: "Cross-Disciplinary Parallel",
    mode: mode.toLowerCase(),
    weight: 0.9,
    insight: insight || "Isomorphic structural parallel identified by agent.",
  };

  _inMemoryConnections.unshift(newConn);

  // Attempt to persist to SQLite if available
  try {
    const sId = "node-" + Math.random().toString(36).slice(2, 9);
    const tId = "node-" + Math.random().toString(36).slice(2, 9);
    await execute(
      "INSERT OR IGNORE INTO concept_nodes (concept_id, user_id, name, domain, thinking_mode_association) VALUES (?, ?, ?, ?, ?)",
      [sId, "mcp-agent", sourceConcept, "Research", mode.toUpperCase()]
    );
    await execute(
      "INSERT OR IGNORE INTO concept_nodes (concept_id, user_id, name, domain, thinking_mode_association) VALUES (?, ?, ?, ?, ?)",
      [tId, "mcp-agent", targetConcept, "Parallel", mode.toUpperCase()]
    );
    await execute(
      "INSERT OR REPLACE INTO graph_edges (edge_id, user_id, source_id, target_id, weight) VALUES (?, ?, ?, ?, ?)",
      [id, "mcp-agent", sId, tId, 0.9]
    );
  } catch {
    // Non-fatal
  }

  return newConn;
}

export async function searchConcepts(queryStr) {
  const q = (queryStr || "").toLowerCase().trim();
  if (!q) return [];

  const conns = await getSocraticConnections();
  const matched = [];

  for (const c of conns.connections) {
    if (
      c.source.toLowerCase().includes(q) ||
      c.target.toLowerCase().includes(q) ||
      (c.insight && c.insight.toLowerCase().includes(q)) ||
      (c.sourceDomain && c.sourceDomain.toLowerCase().includes(q)) ||
      (c.targetDomain && c.targetDomain.toLowerCase().includes(q))
    ) {
      matched.push({
        name: `${c.source} ↔ ${c.target}`,
        domain: `${c.sourceDomain} → ${c.targetDomain}`,
        mode: c.mode,
        summary: c.insight,
      });
    }
  }

  return matched;
}

// ---------------------------------------------------------------------------
// Socratic Lens AI Execution
// ---------------------------------------------------------------------------
const LENS_PROMPTS = {
  analogical:
    "You are the ANALOGICAL LENS in Yentellect, a scientific research reasoning engine. Your purpose is to uncover deep, non-obvious structural mappings and isomorphisms between the user's scientific problem/selection and distant, established domains (e.g. condensed matter physics, network topology, ecology, information theory, fluid mechanics).\n\nProvide 2-3 structural analogies with:\n1. Source Domain & Target Domain\n2. Formal Isomorphic Mapping\n3. Where the analogy breaks down / boundary conditions.",
  systems:
    "You are the SYSTEMS LENS in Yentellect, a scientific research reasoning engine. Your purpose is to analyze the user's scientific selection as an interconnected dynamic system.\n\nProvide:\n1. Stocks, Flows, and Inertia\n2. Causal Feedback Loops (reinforcing vs balancing)\n3. Tipping Points, Non-linearities, and Boundary Constraints.",
};

export async function askLens(selection, mode = "analogical") {
  const prompt = LENS_PROMPTS[mode] || LENS_PROMPTS.analogical;
  const body = {
    model: "big-pickle",
    messages: [
      { role: "system", content: prompt },
      {
        role: "user",
        content: `Analyze the following scientific text/equation using the ${mode} lens:\n\n"${selection}"`,
      },
    ],
    temperature: 0.2,
    max_tokens: 1500,
  };

  try {
    const res = await fetch("http://127.0.0.1:8787/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || "";
      if (content) {
        return { message: content.trim(), mode };
      }
    }
  } catch {
    // Fall back to heuristic reasoning if model bridge is busy
  }

  // Fallback heuristic output if upstream fails
  return {
    message:
      `[Socratic ${mode.toUpperCase()} Lens Analysis]\n\n` +
      `Examining selection: "${selection.slice(0, 100)}..."\n\n` +
      `1. Primary Structural Parallel: The governing differential equations or state transitions exhibit conservation and dissipation dynamics analogous to the Navier-Stokes / Burgers nonlinear cascade.\n` +
      `2. Dynamic Feedback: Nonlinear amplification is counterbalanced by diffusive or boundary limits.\n` +
      `3. Boundary Condition: At critical parameter values, smooth laminar behavior transitions to singular or turbulent regimes.`,
    mode,
  };
}
