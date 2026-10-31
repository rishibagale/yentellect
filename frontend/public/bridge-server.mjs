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

    if (url.pathname === "/v1/models" || url.pathname === "/health") {
      return Response.json(
        {
          object: "list",
          data: [
            { id: "big-pickle", name: "Big Pickle (OpenCode Free)" },
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
      if (model.includes("llama") || model.includes("deepseek") || model.includes("qwen")) {
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
            { error: { message: "Ollama is not running on port 11434. Run: ollama run " + model } },
            { status: 502, headers: CORS_HEADERS }
          );
        }
      }

      // If user is targeting OpenCode (big-pickle)
      const sessionId = "opencode-session-" + Math.random().toString(36).slice(2);
      const projectId = "opencode-proj-" + Math.random().toString(36).slice(2);

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
            model: "big-pickle",
            messages: body.messages,
            temperature: body.temperature ?? 0.2,
            stream: false,
          }),
        });

        const data = await upstreamRes.json();
        if (!upstreamRes.ok) {
          const errType = data?.error?.type || "Error";
          const errMsg = data?.error?.message || "OpenCode upstream error";
          return Response.json(
            { error: { message: `[OpenCode ${errType}] ${errMsg}` } },
            { status: upstreamRes.status, headers: CORS_HEADERS }
          );
        }

        return Response.json(data, { headers: CORS_HEADERS });
      } catch (err) {
        return Response.json(
          { error: { message: `Failed to contact OpenCode: ${err.message}` } },
          { status: 502, headers: CORS_HEADERS }
        );
      }
    }

    return new Response("Not Found", { status: 404, headers: CORS_HEADERS });
  },
});

console.log(`[Yentellect Bridge] Running on http://127.0.0.1:${PORT}`);

