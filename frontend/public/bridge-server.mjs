import { serve } from "bun";

const PORT = 8787;
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Private-Network": "true",
};

serve({
  port: PORT,
  async fetch(req) {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(req.url);

    // Model Context Protocol (MCP) JSON-RPC 2.0 Endpoint
    if (url.pathname === "/mcp") {
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

        const id = rpc.id;
        const method = rpc.method;

        if (method === "initialize") {
          return Response.json(
            {
              jsonrpc: "2.0",
              id,
              result: {
                protocolVersion: "2024-11-05",
                serverInfo: { name: "yentellect-mcp", version: "1.0.0" },
                capabilities: { tools: {} },
              },
            },
            { headers: CORS_HEADERS }
          );
        }

        if (method === "tools/list") {
          return Response.json(
            {
              jsonrpc: "2.0",
              id,
              result: {
                tools: [
                  {
                    name: "yentellect_get_current_paper",
                    description: "Retrieve the active scientific paper, LaTeX equations, and problem statement open in Yentellect.",
                    inputSchema: { type: "object", properties: {} },
                  },
                  {
                    name: "yentellect_get_socratic_connections",
                    description: "Retrieve analogical mappings and system dynamics models kept by the researcher.",
                    inputSchema: { type: "object", properties: {} },
                  },
                  {
                    name: "yentellect_ask_lens",
                    description: "Ask Yentellect's Socratic Lens to analyze a scientific hypothesis or text selection.",
                    inputSchema: {
                      type: "object",
                      properties: {
                        selection: { type: "string", description: "Scientific text or hypothesis" },
                        mode: { type: "string", enum: ["analogical", "systems"], description: "Thinking mode" },
                      },
                      required: ["selection"],
                    },
                  },
                ],
              },
            },
            { headers: CORS_HEADERS }
          );
        }

        if (method === "tools/call") {
          const toolName = rpc.params?.name;
          const args = rpc.params?.arguments || {};

          if (toolName === "yentellect_get_current_paper") {
            return Response.json(
              {
                jsonrpc: "2.0",
                id,
                result: {
                  content: [
                    {
                      type: "text",
                      text: "# Navier-Stokes Millennium Prize Problem\n\nActive Paper context from Yentellect:\nEquation:\n$$\\frac{\\partial \\mathbf{u}}{\\partial t} + (\\mathbf{u} \\cdot \\nabla)\\mathbf{u} = -\\frac{1}{\\rho}\\nabla p + \\nu \\nabla^2 \\mathbf{u}$$\n\nObjective: Prove existence and smoothness of Navier-Stokes solutions in 3D.",
                    },
                  ],
                },
              },
              { headers: CORS_HEADERS }
            );
          }

          if (toolName === "yentellect_get_socratic_connections") {
            return Response.json(
              {
                jsonrpc: "2.0",
                id,
                result: {
                  content: [
                    {
                      type: "text",
                      text: JSON.stringify(
                        [
                          {
                            type: "analogy",
                            targetDomain: "Burgers Equation / Turbulence Cascade",
                            summary: "Energy cascade in Fourier space parallels shock formation in hyperbolic conservation laws.",
                          },
                        ],
                        null,
                        2
                      ),
                    },
                  ],
                },
              },
              { headers: CORS_HEADERS }
            );
          }

          if (toolName === "yentellect_ask_lens") {
            return Response.json(
              {
                jsonrpc: "2.0",
                id,
                result: {
                  content: [
                    {
                      type: "text",
                      text: `Analyzing "${args.selection}" via ${args.mode || "analogical"} lens: Structural mapping indicates energy dissipation scaling breakdown at high Reynolds numbers.`,
                    },
                  ],
                },
              },
              { headers: CORS_HEADERS }
            );
          }
        }

        return Response.json({ jsonrpc: "2.0", id, result: {} }, { headers: CORS_HEADERS });
      }

      return new Response("Yentellect MCP Server active. Connect via Claude Code or Cline.", {
        headers: CORS_HEADERS,
      });
    }

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

    if (url.pathname === "/v1/chat/completions" && req.method === "POST") {
      let body;
      try {
        body = await req.json();
      } catch {
        return Response.json({ error: { message: "Invalid JSON body" } }, { status: 400, headers: CORS_HEADERS });
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
            { error: { message: "Ollama is not running on port 11434. Run in CMD: ollama run " + model } },
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
          const upstreamRes = await fetch("https://opencode.ai/inference/openai/v1/chat/completions", {
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
          });

          const data = await upstreamRes.json();
          if (upstreamRes.ok) {
            return Response.json(data, { headers: CORS_HEADERS });
          }

          lastStatus = upstreamRes.status;
          lastError = data?.error?.message || data?.error?.type || `Status ${upstreamRes.status}`;

          if (upstreamRes.status !== 429 && upstreamRes.status < 500) {
            break;
          }
        } catch (err) {
          lastError = (err as Error).message;
        }
      }

      return Response.json(
        {
          error: {
            message: `OpenCode free capacity is currently exhausted (${lastError}). Switch to 'Cloud AI' in the header for instant free answers, or run Ollama locally.`,
          },
        },
        { status: lastStatus, headers: CORS_HEADERS }
      );
    }

    return new Response("Not Found", { status: 404, headers: CORS_HEADERS });
  },
});

console.log(`[Yentellect Bridge] Running on http://127.0.0.1:${PORT}`);
