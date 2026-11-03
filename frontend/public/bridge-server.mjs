import { serve } from "bun";
import {
  getActivePaper,
  setActivePaper,
  getSocraticConnections,
  addConnection,
  searchConcepts,
  askLens,
} from "./mcp-utils.mjs";

const PORT = 8787;
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Private-Network": "true",
};

// Map of active SSE sessions: sessionId -> { controller, keepAlive }
const sseSessions = new Map();

function sendToSse(sessionId, data) {
  const session = sseSessions.get(sessionId);
  if (!session) return false;
  try {
    const payload = typeof data === "string" ? data : JSON.stringify(data);
    session.controller.enqueue(new TextEncoder().encode(`event: message\ndata: ${payload}\n\n`));
    return true;
  } catch {
    clearInterval(session.keepAlive);
    sseSessions.delete(sessionId);
    return false;
  }
}

async function handleMcpToolCall(name, args) {
  if (name === "yentellect_get_current_paper") {
    const paper = await getActivePaper();
    const lines = [
      `# ${paper.title || "Active Research Paper"}`,
      "",
      "**Context:** " + (paper.context || "Mathematical Physics / Interdisciplinary Research"),
    ];
    if (paper.abstract) {
      lines.push("", "### Abstract / Problem Statement", paper.abstract);
    }
    if (paper.equation) {
      lines.push("", "### Governing LaTeX Equation", `$$${paper.equation}$$`);
    }
    if (paper.problemStatement && paper.problemStatement !== paper.abstract) {
      lines.push("", "### Core Conjecture", paper.problemStatement);
    }
    if (paper.body) {
      lines.push("", "### Document Content (from Researcher's Editor)", paper.body);
    }
    if (paper.url) {
      lines.push("", `**Source Reference:** ${paper.url}`);
    }
    return {
      content: [{ type: "text", text: lines.join("\n") }],
    };
  }

  if (name === "yentellect_get_socratic_connections") {
    const conns = await getSocraticConnections();
    const lines = [
      "## Socratic Connections (Analogical + Systems Mappings)",
      "",
      "Current structural isomorphisms and causal dynamics in the Research Workbench:",
      "",
      "| # | Source Concept | Target Concept | Mode | Weight |",
      "|---|----------------|----------------|------|--------|",
    ];
    for (let i = 0; i < conns.connections.length; i++) {
      const c = conns.connections[i];
      lines.push(`| ${i + 1} | ${c.source} | ${c.target} | ${c.mode} | ${Number(c.weight).toFixed(2)} |`);
    }
    lines.push("", `**Total:** ${conns.count} active connections`);

    // Include detailed insights
    lines.push("", "### Detailed Isomorphic Insights:");
    for (let i = 0; i < Math.min(conns.connections.length, 6); i++) {
      const c = conns.connections[i];
      if (c.insight) {
        lines.push(`- **${c.source} ↔ ${c.target}** (${c.mode}): ${c.insight}`);
      }
    }

    return {
      content: [{ type: "text", text: lines.join("\n") }],
    };
  }

  if (name === "yentellect_ask_lens") {
    let selection = args?.selection || "";
    const mode = args?.mode || "analogical";

    // If selection is omitted or a short prompt/question, augment with active paper context!
    if (
      !selection ||
      selection.length < 100 ||
      /^(analyze|what|find|tell|explain|why|how)/i.test(selection.trim())
    ) {
      const paper = await getActivePaper();
      const docExcerpt = paper.body || paper.abstract || paper.equation || "";
      if (docExcerpt) {
        selection = selection
          ? `Specific Focus/Question: ${selection}\n\nDocument Context & Text ("${paper.title}"):\n${docExcerpt}`
          : `Document Text to Analyze ("${paper.title}"):\n${docExcerpt}`;
      }
    }

    if (!selection) {
      return {
        content: [
          {
            type: "text",
            text: "Error: Missing required parameter 'selection' and no active document found in the workbench.",
          },
        ],
      };
    }
    const result = await askLens(selection, mode);
    return {
      content: [
        {
          type: "text",
          text: `## Socratic Lens Analysis (${mode.toUpperCase()})\n\n${result.message}`,
        },
      ],
    };
  }

  if (name === "yentellect_add_connection") {
    const source = args?.sourceConcept || "";
    const target = args?.targetConcept || "";
    const mode = args?.mode || "analogical";
    const insight = args?.insight || "";

    if (!source || !target) {
      return {
        content: [{ type: "text", text: "Error: Both sourceConcept and targetConcept are required." }],
      };
    }

    const saved = await addConnection({
      sourceConcept: source,
      targetConcept: target,
      mode,
      insight,
    });

    return {
      content: [
        {
          type: "text",
          text: `Successfully mapped isomorphic connection:\n- **Source:** ${source}\n- **Target:** ${target}\n- **Mode:** ${mode}\n- **Insight:** ${insight}\n\nAdded to the research knowledge graph with ID: \`${saved.id}\`.`,
        },
      ],
    };
  }

  if (name === "yentellect_search_concepts") {
    const query = args?.query || "";
    const matches = await searchConcepts(query);
    if (matches.length === 0) {
      return {
        content: [{ type: "text", text: `No concepts matching "${query}" were found in the workbench.` }],
      };
    }
    const lines = [`### Found ${matches.length} matching concept(s) in the workbench:\n`];
    for (const m of matches) {
      lines.push(`- **${m.name}** [${m.domain}] (${m.mode})\n  ${m.summary}`);
    }
    return {
      content: [{ type: "text", text: lines.join("\n") }],
    };
  }

  return {
    content: [{ type: "text", text: `Unknown tool: ${name}` }],
  };
}

serve({
  port: PORT,
  async fetch(req) {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(req.url);

    // -------------------------------------------------------------------------
    // Sync API for Frontend Browser Workbench
    // -------------------------------------------------------------------------
    if (url.pathname === "/api/active-paper") {
      if (req.method === "POST") {
        try {
          const body = await req.json();
          const updated = setActivePaper(body);
          return Response.json({ ok: true, paper: updated }, { headers: CORS_HEADERS });
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400, headers: CORS_HEADERS });
        }
      }
      return Response.json(await getActivePaper(), { headers: CORS_HEADERS });
    }

    // -------------------------------------------------------------------------
    // Model Context Protocol (MCP) Endpoints
    // -------------------------------------------------------------------------
    if (url.pathname === "/mcp" || url.pathname === "/sse" || url.pathname === "/mcp/messages") {
      // 1. SSE Connection initiation: GET /mcp or GET /sse
      if (req.method === "GET") {
        const accept = req.headers.get("accept") || "";

        // If visited in normal web browser (HTML), show info & config dashboard
        if (accept.includes("text/html") && !url.searchParams.has("sse")) {
          const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Research Workbench MCP Server</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0c0d12; color: #e1e4ea; margin: 0; padding: 40px; line-height: 1.6; }
    .card { max-width: 680px; margin: 0 auto; background: #161822; border: 1px solid #282c3f; border-radius: 12px; padding: 32px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    h1 { color: #60a5fa; margin-top: 0; font-size: 24px; display: flex; align-items: center; gap: 10px; }
    .badge { background: #065f46; color: #34d399; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 9999px; }
    pre { background: #0a0b10; border: 1px solid #282c3f; border-radius: 8px; padding: 16px; overflow-x: auto; color: #93c5fd; font-family: 'Fira Code', monospace; font-size: 13px; }
    .tools-list { margin-top: 20px; list-style: none; padding: 0; }
    .tools-list li { background: #1f2333; padding: 10px 14px; border-radius: 6px; margin-bottom: 8px; border-left: 3px solid #3b82f6; font-size: 13px; }
    .tools-list code { color: #67e8f9; font-weight: bold; }
  </style>
</head>
<body>
  <div class="card">
    <h1><span>⚡ Research Workbench MCP Server</span> <span class="badge">Running :8787</span></h1>
    <p>The Model Context Protocol bridge is active. Connect your coding agents to give them direct access to your scientific papers, LaTeX equations, and Socratic isomorphisms.</p>
    
    <h3>Cline / Cursor MCP Config</h3>
    <p>Add this to your <code>cline_mcp_settings.json</code>:</p>
    <pre>{
  "mcpServers": {
    "yentellect": {
      "url": "http://127.0.0.1:8787/mcp"
    }
  }
}</pre>

    <h3>Active Tools Exposed to Agent</h3>
    <ul class="tools-list">
      <li><code>yentellect_get_current_paper</code>: Read the active paper, equations, and conjectures open in the workbench.</li>
      <li><code>yentellect_get_socratic_connections</code>: Retrieve cross-disciplinary structural isomorphisms.</li>
      <li><code>yentellect_ask_lens</code>: Trigger Analogical or Systems thinking on any scientific text.</li>
      <li><code>yentellect_add_connection</code>: Save an agent-discovered analogy back into the workbench graph.</li>
      <li><code>yentellect_search_concepts</code>: Search concepts across domains in the knowledge graph.</li>
    </ul>
  </div>
</body>
</html>`;
          return new Response(html, {
            headers: { ...CORS_HEADERS, "Content-Type": "text/html; charset=utf-8" },
          });
        }

        // Handle SSE client (Cline, Cursor, etc.)
        const sessionId = crypto.randomUUID();
        let keepAlive;

        const stream = new ReadableStream({
          start(controller) {
            keepAlive = setInterval(() => {
              try {
                controller.enqueue(new TextEncoder().encode(": keepalive\n\n"));
              } catch {
                clearInterval(keepAlive);
                sseSessions.delete(sessionId);
              }
            }, 15000);

            sseSessions.set(sessionId, { controller, keepAlive });

            // Send initial endpoint event (MCP SSE Specification)
            const endpointUri = `/mcp/messages?sessionId=${sessionId}`;
            controller.enqueue(
              new TextEncoder().encode(`event: endpoint\ndata: ${endpointUri}\n\n`)
            );
          },
          cancel() {
            if (keepAlive) clearInterval(keepAlive);
            sseSessions.delete(sessionId);
          },
        });

        return new Response(stream, {
          headers: {
            ...CORS_HEADERS,
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
          },
        });
      }

      // 2. JSON-RPC Client Request: POST /mcp or POST /mcp/messages
      if (req.method === "POST") {
        let rpc;
        try {
          rpc = await req.json();
        } catch {
          return Response.json(
            { jsonrpc: "2.0", error: { code: -32700, message: "Parse error" } },
            { status: 400, headers: CORS_HEADERS }
          );
        }

        // Notification: client sent a notification (no response expected)
        if (rpc.id === undefined && rpc.method?.startsWith("notifications/")) {
          return new Response(null, { status: 204, headers: CORS_HEADERS });
        }

        const id = rpc.id !== undefined ? rpc.id : null;
        const method = rpc.method;
        let result = null;
        let error = null;

        try {
          if (method === "initialize") {
            result = {
              protocolVersion: "2024-11-05",
              serverInfo: { name: "yentellect-mcp", version: "1.0.0" },
              capabilities: {
                tools: {
                  listChanged: false,
                },
              },
            };
          } else if (method === "tools/list") {
            result = {
              tools: [
                {
                  name: "yentellect_get_current_paper",
                  description:
                    "Retrieve the active scientific paper, LaTeX equations, problem statement, and context currently open in Research Workbench.",
                  inputSchema: { type: "object", properties: {} },
                },
                {
                  name: "yentellect_get_socratic_connections",
                  description:
                    "Retrieve analogical mappings, isomorphic principles, and system dynamics models in Research Workbench's knowledge graph.",
                  inputSchema: { type: "object", properties: {} },
                },
                {
                  name: "yentellect_ask_lens",
                  description:
                    "Ask Research Workbench's Socratic Lens to analyze scientific text or hypotheses using Analogical reasoning or System Dynamics.",
                  inputSchema: {
                    type: "object",
                    properties: {
                      selection: {
                        type: "string",
                        description: "The scientific text, formula, or hypothesis to analyze.",
                      },
                      mode: {
                        type: "string",
                        enum: ["analogical", "systems"],
                        description: "Thinking mode ('analogical' or 'systems')",
                      },
                    },
                    required: ["selection"],
                  },
                },
                {
                  name: "yentellect_add_connection",
                  description:
                    "Save a newly discovered structural analogy or cross-disciplinary insight back into Research Workbench's research knowledge graph.",
                  inputSchema: {
                    type: "object",
                    properties: {
                      sourceConcept: {
                        type: "string",
                        description: "Source concept or phenomenon",
                      },
                      targetConcept: {
                        type: "string",
                        description: "Target concept or parallel domain",
                      },
                      mode: {
                        type: "string",
                        enum: ["analogical", "systems"],
                        description: "Thinking mode",
                      },
                      insight: {
                        type: "string",
                        description:
                          "Explanation of the structural isomorphism or dynamic feedback",
                      },
                    },
                    required: ["sourceConcept", "targetConcept", "insight"],
                  },
                },
                {
                  name: "yentellect_search_concepts",
                  description: "Search existing concepts and mapped insights in Research Workbench.",
                  inputSchema: {
                    type: "object",
                    properties: {
                      query: { type: "string", description: "Search query or concept name" },
                    },
                    required: ["query"],
                  },
                },
              ],
            };
          } else if (method === "tools/call") {
            result = await handleMcpToolCall(rpc.params?.name, rpc.params?.arguments || {});
          } else {
            result = {};
          }
        } catch (err) {
          error = { code: -32603, message: err instanceof Error ? err.message : String(err) };
        }

        const responsePayload = error
          ? { jsonrpc: "2.0", id, error }
          : { jsonrpc: "2.0", id, result };

        const targetSessionId = url.searchParams.get("sessionId");

        // If this request came from an SSE session, push the response via SSE!
        if (targetSessionId && sseSessions.has(targetSessionId)) {
          sendToSse(targetSessionId, responsePayload);
          return new Response("Accepted", { status: 202, headers: CORS_HEADERS });
        }

        // If there's an active SSE session and no session was specified in query:
        // Also emit to active sessions so SSE listeners don't miss anything
        for (const [sId] of sseSessions) {
          sendToSse(sId, responsePayload);
        }

        // Direct JSON response for cURL, scripts, and non-SSE HTTP clients
        return Response.json(responsePayload, { headers: CORS_HEADERS });
      }
    }

    // -------------------------------------------------------------------------
    // Health & Models List
    // -------------------------------------------------------------------------
    if (url.pathname === "/v1/models" || url.pathname === "/health") {
      return Response.json(
        {
          object: "list",
          data: [
            { id: "big-pickle", name: "Big Pickle (OpenCode Free)" },
            { id: "deepseek-v4.1-flash-free", name: "DeepSeek Flash (OpenCode Free)" },
            { id: "glm-5.3-flash-free", name: "GLM Flash (OpenCode Free)" },
            { id: "llama3.3", name: "Llama 3.3 (Local Ollama)" },
            { id: "deepseek-r1", name: "DeepSeek R1 (Local Ollama)" },
          ],
        },
        { headers: CORS_HEADERS }
      );
    }

    // -------------------------------------------------------------------------
    // Chat Completions Proxy (OpenCode Free Models + Ollama)
    // -------------------------------------------------------------------------
    if (url.pathname === "/v1/chat/completions" && req.method === "POST") {
      let body;
      try {
        body = await req.json();
      } catch {
        return Response.json(
          { error: { message: "Invalid JSON body" } },
          { status: 400, headers: CORS_HEADERS }
        );
      }

      const model = body.model || "big-pickle";

      // If user is targeting local Ollama
      if (model.includes("llama") || model.includes("deepseek-r1") || model.includes("qwen")) {
        try {
          const ollamaRes = await fetch("http://127.0.0.1:11434/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const data = await ollamaRes.json();
          return Response.json(data, { headers: CORS_HEADERS });
        } catch {
          return Response.json(
            {
              error: {
                message:
                  "Ollama is not running on port 11434. Run in CMD: ollama run " + model,
              },
            },
            { status: 502, headers: CORS_HEADERS }
          );
        }
      }

      // If user is targeting OpenCode models with auto-failover
      const candidates = [
        model,
        "big-pickle",
        "deepseek-v4.1-flash-free",
        "glm-5.3-flash-free",
        "nemotron-3.5-lightning-free",
        "beam-free",
      ].filter((m, idx, arr) => arr.indexOf(m) === idx);

      const sessionId = "opencode-session-" + Math.random().toString(36).slice(2);
      const projectId = "opencode-proj-" + Math.random().toString(36).slice(2);

      let lastError = "Rate limit reached";
      let lastStatus = 429;

      for (const candidate of candidates) {
        try {
          const upstreamRes = await fetch(
            "https://opencode.ai/inference/openai/v1/chat/completions",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "User-Agent": "opencode/2.1.4",
                "x-opencode-client": "cli",
                "x-opencode-session": sessionId,
                "x-opencode-project": projectId,
              },
              body: JSON.stringify({
                model: candidate,
                messages: body.messages,
                temperature: body.temperature ?? 0.2,
                stream: false,
              }),
            }
          );

          const data = await upstreamRes.json();
          if (upstreamRes.ok) {
            return Response.json(data, { headers: CORS_HEADERS });
          }

          lastStatus = upstreamRes.status;
          lastError =
            data?.error?.message || data?.error?.type || `Status ${upstreamRes.status}`;

          if (upstreamRes.status !== 429 && upstreamRes.status < 500) {
            break;
          }
        } catch (err) {
          lastError = err.message;
        }
      }

      return Response.json(
        {
          error: {
            message: `OpenCode free capacity is currently exhausted (${lastError}). Switch to 'Cloud AI' in the header for instant free answers, or enter your API key under 'Bring Your Own Key'.`,
          },
        },
        { status: lastStatus, headers: CORS_HEADERS }
      );
    }

    return new Response("Not Found", { status: 404, headers: CORS_HEADERS });
  },
});

console.log(`[Research Workbench Bridge & MCP Server] Running on http://127.0.0.1:${PORT}`);
console.log(`[Research Workbench Bridge & MCP Server] MCP URL: http://127.0.0.1:${PORT}/mcp`);
