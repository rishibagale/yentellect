/**
 * Yentellect workbench — lens transport (Phase C).
 *
 * One fetch, one error type: `postLens` is the ONLY place the workbench
 * talks to POST /api/lens, so provider/model headers, failure copy, and the
 * status-to-message map cannot drift across callers. Plain module, no
 * "use client" — it is only ever called from client components.
 *
 * Failures throw LensCallError carrying the real HTTP status (0 for
 * network/unknown). Messages are fixed safe strings, or a server `error`
 * field only when it is a non-empty single line that shows no sign of a
 * key/secret/token: zod issues, stack traces, and headers never reach the UI.
 * `thinkingModeToLensId` is the mode-to-lens bridge; beta modes have no
 * backend lens and map to null.
 */
import type { LensId, LensRequest } from "@/lib/lens/schema";
import { LensResponseSchema } from "@/lib/lens/schema";
import type { LensResponse } from "@/lib/lens/schema";
import type { ThinkingMode } from "@/lib/modes";

const NETWORK_ERROR = "Could not reach the lens service.";
const UNREADABLE_RESPONSE = "Lens service returned an unreadable response.";
const INSECURE = /api[_-]?key|secret|token|bearer|authorization/i;

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
  let fallback = `Lens request failed (${status}).`;
  if (status === 500) fallback = "Lens provider is not configured.";
  else if (status === 502) fallback = "Lens provider request failed.";
  return safeServerError(body) ?? fallback;
}

function readHeader(res: Response, name: string): string {
  try {
    const value = res.headers.get(name);
    return value && value.trim() ? value : "unknown";
  } catch {
    return "unknown";
  }
}

/** Single transport to POST /api/lens. Never adds a second one. */
export async function postLens(req: LensRequest): Promise<LensCallResult> {
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
