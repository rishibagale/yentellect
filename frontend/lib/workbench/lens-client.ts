/**
 * Yentellect workbench — lens transport (Phase C).
 *
 * One fetch, one error type: `postLens` is the central place the workbench
 * dispatches lens queries. Supports:
 * 1. Cloud Engine (POST /api/lens via server-side configured provider)
 * 2. Local Machine Engine (direct browser fetch to user's localhost daemon e.g. Ollama or Zen Bridge)
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

  const selectionBlock =
    `SELECTION (from "${req.doc.title}", ${req.doc.kind})` +
    (req.doc.abstract ? `\nABSTRACT: ${req.doc.abstract}` : "") +
    `\nTEXT: ${req.selection}` +
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
        model: cfg.localModel || "llama3.3",
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

  if (!res.ok) {
    throw new LensCallError(`Local AI returned error status ${res.status}.`, res.status);
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new LensCallError("Local AI returned an unreadable response.", 0);
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

/** Single transport for Lens. Routes to Cloud or Local Machine based on config. */
export async function postLens(req: LensRequest): Promise<LensCallResult> {
  const engineConfig = readEngineConfig();
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
