/**
 * Yentellect workbench — lens transport (Phase C).
 *
 * One fetch, one error type: `postLens` is the central place the workbench
 * dispatches lens queries. Supports:
 * 1. Cloud Engine (POST /api/lens via server-side configured provider)
 * 2. BYOK Engine (direct browser fetch to Anthropic, OpenAI, Groq, OpenRouter, Gemini)
 * 3. Local Machine Engine (direct browser fetch to user's localhost daemon e.g. Ollama or Zen Bridge)
 */
import type { LensId, LensRequest } from "@/lib/lens/schema";
import { LensResponseSchema } from "@/lib/lens/schema";
import type { LensResponse } from "@/lib/lens/schema";
import type { ThinkingMode } from "@/lib/modes";
import { readEngineConfig } from "./engine-config";
import { buildSystemPrompt, JSON_SHAPE_EXAMPLE } from "@/lib/lens/prompts";

const NETWORK_ERROR = "Could not reach the lens service.";
const UNREADABLE_RESPONSE = "Lens service returned an unreadable response.";
const INSECURE = /api[ _-]?key|secret|token|bearer|authorization|LENS_[A-Z_]+/i;

/** Thrown by postLens. `status` is the HTTP status, or 0 for network/unknown failure. */
export class LensCallError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "LensCallError";
    this.status = status;
  }
}

/** Maps a workbench ThinkingMode to the API LensId. Returns null for beta modes (no backend). */
export function thinkingModeToLensId(mode: ThinkingMode): LensId | null {
  if (mode === "ANALOGICAL") return "analogical";
  if (mode === "SYSTEMS") return "systems";
  return null;
}

export interface LensCallResult {
  response: LensResponse;
  provider: string;
  model: string;
  usedFallback: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** The server's `error` field when it is safe to show, else null. */
function safeServerError(body: unknown): string | null {
  if (!isRecord(body)) return null;
  const raw = body.error;
  if (typeof raw !== "string") return null;
  const text = raw.trim();
  if (!text || text.includes("\n") || INSECURE.test(text)) return null;
  return text;
}

function failureMessage(status: number, body: unknown): string {
  if (status === 401) return "Sign in to use lenses.";
  if (status === 400) return "The lens rejected this request.";
  if (status === 500) return "Lens provider is not configured.";
  if (status === 502) return "The lens provider could not complete the request.";
  return safeServerError(body) ?? `Lens request failed (${status}).`;
}

function readHeader(res: Response, name: string): string {
  try {
    const value = res.headers.get(name);
    return value && value.trim() ? value : "unknown";
  } catch {
    return "unknown";
  }
}

function tryExtractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {}

  const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (match) {
    try {
      return JSON.parse(match[1]);
    } catch {}
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {}
  }
  return null;
}

/** Direct transport to user's Local Machine AI daemon on localhost */
async function postLocalLens(req: LensRequest): Promise<LensCallResult> {
  const cfg = readEngineConfig();
  const cleanBase = cfg.localUrl.replace(/\/+$/, "").replace(/\/v1$/, "");
  const endpoint = `${cleanBase}/v1/chat/completions`;

  const system = buildSystemPrompt(req.lens, {
    userField: req.userField,
    docTitle: req.doc.title,
    isFollowUp: req.history.length > 0 || Boolean(req.userMessage),
  });

  const docBody = req.doc.body ? `\nDOCUMENT CONTENT:\n${req.doc.body.slice(0, 4000)}` : "";
  const selectionBlock =
    `DOCUMENT: "${req.doc.title}" (${req.doc.kind})` +
    (req.doc.abstract ? `\nABSTRACT: ${req.doc.abstract}` : "") +
    docBody +
    `\n\nSELECTED EXCERPT / FOCUS TO ANALYZE:\n${req.selection}` +
    `\nUSER FIELD: ${req.userField}`;

  const messages = [
    { role: "system", content: system + "\n\n" + JSON_SHAPE_EXAMPLE },
    { role: "user", content: selectionBlock },
    ...req.history.map((t) => ({ role: t.role, content: t.content })),
  ];
  if (req.userMessage) messages.push({ role: "user", content: req.userMessage });

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: cfg.localModel || "big-pickle",
        messages,
        temperature: 0.2,
      }),
    });
  } catch {
    throw new LensCallError(
      `Could not connect to local AI at ${cleanBase}. Ensure your Command Prompt bridge is running.`,
      0
    );
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* non-json body */
  }

  if (!res.ok) {
    const errorMsg =
      (body as { error?: { message?: string } })?.error?.message ||
      (body as { error?: string })?.error;
    throw new LensCallError(
      typeof errorMsg === "string" && errorMsg.trim()
        ? errorMsg.trim()
        : `Local AI returned error status ${res.status}.`,
      res.status
    );
  }

  if (!body) {
    throw new LensCallError("Local AI returned an empty response.", 0);
  }

  const content = (body as { choices?: Array<{ message?: { content?: string } }> })?.choices?.[0]?.message?.content ?? "";
  const parsedJson = tryExtractJson(content);
  const validated = LensResponseSchema.safeParse(parsedJson);

  if (validated.success) {
    return {
      response: validated.data,
      provider: "Local Machine",
      model: cfg.localModel || "local",
      usedFallback: false,
    };
  }

  // Graceful fallback for non-JSON or freeform local model replies
  return {
    response: {
      message: content.trim() || "Local model produced no output.",
      connections: [],
    },
    provider: "Local Machine",
    model: cfg.localModel || "local",
    usedFallback: true,
  };
}

/** Direct transport using user's personal API key (BYOK) */
async function postByokLens(req: LensRequest): Promise<LensCallResult> {
  const cfg = readEngineConfig();
  if (!cfg.byokApiKey) {
    throw new LensCallError(
      `Please enter your ${cfg.byokProvider.toUpperCase()} API key in the AI Engine settings.`,
      0
    );
  }

  const system = buildSystemPrompt(req.lens, {
    userField: req.userField,
    docTitle: req.doc.title,
    isFollowUp: req.history.length > 0 || Boolean(req.userMessage),
  });

  const docBody = req.doc.body ? `\nDOCUMENT CONTENT:\n${req.doc.body.slice(0, 4000)}` : "";
  const selectionBlock =
    `DOCUMENT: "${req.doc.title}" (${req.doc.kind})` +
    (req.doc.abstract ? `\nABSTRACT: ${req.doc.abstract}` : "") +
    docBody +
    `\n\nSELECTED EXCERPT / FOCUS TO ANALYZE:\n${req.selection}` +
    `\nUSER FIELD: ${req.userField}`;

  let content = "";

  if (cfg.byokProvider === "anthropic") {
    const anthropicMessages = [
      { role: "user", content: selectionBlock },
      ...req.history.map((t) => ({ role: t.role, content: t.content })),
      ...(req.userMessage ? [{ role: "user", content: req.userMessage }] : []),
    ];

    let res: Response;
    try {
      res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": cfg.byokApiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: cfg.byokModel || "claude-3-5-sonnet-20241022",
          max_tokens: 4096,
          system: system + "\n\n" + JSON_SHAPE_EXAMPLE,
          messages: anthropicMessages,
          temperature: 0.2,
        }),
      });
    } catch {
      throw new LensCallError("Could not reach Anthropic API from browser.", 0);
    }

    let body: any = null;
    try {
      body = await res.json();
    } catch {}
    if (!res.ok) {
      throw new LensCallError(body?.error?.message || `Anthropic error (${res.status})`, res.status);
    }
    content = body?.content?.[0]?.text ?? "";
  } else {
    // OpenAI, Groq, OpenRouter, Gemini, or Custom
    let endpoint = "https://api.openai.com/v1/chat/completions";
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.byokApiKey}`,
    };

    if (cfg.byokProvider === "groq") {
      endpoint = "https://api.groq.com/openai/v1/chat/completions";
    } else if (cfg.byokProvider === "openrouter") {
      endpoint = "https://openrouter.ai/api/v1/chat/completions";
      headers["HTTP-Referer"] = "https://yentellect.vercel.app";
      headers["X-Title"] = "Yentellect";
    } else if (cfg.byokProvider === "gemini") {
      endpoint = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
    } else if (cfg.byokProvider === "custom") {
      const base = (cfg.byokBaseUrl || "").replace(/\/+$/, "").replace(/\/v1$/, "");
      endpoint = `${base}/v1/chat/completions`;
    }

    const messages = [
      { role: "system", content: system + "\n\n" + JSON_SHAPE_EXAMPLE },
      { role: "user", content: selectionBlock },
      ...req.history.map((t) => ({ role: t.role, content: t.content })),
      ...(req.userMessage ? [{ role: "user", content: req.userMessage }] : []),
    ];

    let res: Response;
    try {
      res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: cfg.byokModel,
          messages,
          temperature: 0.2,
        }),
      });
    } catch {
      throw new LensCallError(`Could not reach ${cfg.byokProvider} API from browser.`, 0);
    }

    let body: any = null;
    try {
      body = await res.json();
    } catch {}
    if (!res.ok) {
      throw new LensCallError(body?.error?.message || `${cfg.byokProvider} error (${res.status})`, res.status);
    }
    content = body?.choices?.[0]?.message?.content ?? "";
  }

  const parsedJson = tryExtractJson(content);
  const validated = LensResponseSchema.safeParse(parsedJson);

  if (validated.success) {
    return {
      response: validated.data,
      provider: cfg.byokProvider.toUpperCase(),
      model: cfg.byokModel,
      usedFallback: false,
    };
  }

  return {
    response: {
      message: content.trim() || "Model produced no textual response.",
      connections: [],
    },
    provider: cfg.byokProvider.toUpperCase(),
    model: cfg.byokModel,
    usedFallback: true,
  };
}

/** Single transport for Lens. Routes to Cloud, BYOK, or Local Machine based on config. */
export async function postLens(req: LensRequest): Promise<LensCallResult> {
  const engineConfig = readEngineConfig();
  if (engineConfig.target === "byok") {
    return postByokLens(req);
  }
  if (engineConfig.target === "local") {
    return postLocalLens(req);
  }

  let res: Response;
  try {
    res = await fetch("/api/lens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
      cache: "no-store",
    });
  } catch {
    throw new LensCallError(NETWORK_ERROR, 0);
  }

  // The mock provider must NEVER render as an answer: it means "not
  // configured", so surface that as a hard error before reading the body.
  if ((res.headers.get("X-Lens-Provider") || "").trim().toLowerCase() === "mock") {
    throw new LensCallError("Lens output isn't configured on this server yet.", 500);
  }

  let body: unknown = null;
  let parsed = false;
  try {
    body = await res.json();
    parsed = true;
  } catch {
    /* unreadable body: fixed fallback on error statuses, NETWORK_ERROR on ok */
  }

  if (!res.ok) {
    throw new LensCallError(failureMessage(res.status, parsed ? body : null), res.status);
  }
  if (!parsed) {
    throw new LensCallError(NETWORK_ERROR, 0);
  }
  if (!isRecord(body)) {
    throw new LensCallError(UNREADABLE_RESPONSE, 0);
  }

  // Full re-parse: the server validates, but the client never trusts an HTTP
  // body it did not check (proxy payloads, future route changes).
  const parsedResponse = LensResponseSchema.safeParse(body);
  if (!parsedResponse.success) {
    throw new LensCallError(UNREADABLE_RESPONSE, 0);
  }

  return {
    response: parsedResponse.data,
    provider: readHeader(res, "X-Lens-Provider"),
    model: readHeader(res, "X-Lens-Model"),
    usedFallback: body.usedFallback === true,
  };
}
