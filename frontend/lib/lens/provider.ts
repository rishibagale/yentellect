/**
 * Yentellect lens — the single swappable LLM interface (Stage 5).
 *
 * This is the seam the spec demands: everything above (run.ts, the route,
 * the eval harness) talks ONLY to `LensProvider.complete()`. Swapping the
 * model, the vendor, or the transport means changing env + registry, never
 * call-site code.
 *
 * `complete()` is generic over a zod schema so the contract is enforced at
 * the boundary for any payload, not just LensResponse.
 */
import type { z } from "zod";
import { getPreset } from "./providers/registry";
import { splitKeys } from "./providers/keys";
import { makeOpenAICompatProvider } from "./providers/openai-compat";
import { mockProvider } from "./providers/mock";

export interface LensChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CompleteOptions<T> {
  /** Lens system prompt (without the JSON contract — added by the caller via jsonShapeExample). */
  system: string;
  /** Turn history + current user turn. System is passed separately. */
  messages: LensChatMessage[];
  /** The response contract. complete() validates against it. */
  schema: z.ZodType<T>;
  /**
   * Appended to the system prompt. Always includes the literal word "json"
   * and a full shape example — required by DeepSeek, helpful everywhere.
   */
  jsonShapeExample: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

export interface CompleteMeta {
  provider: string;
  model: string;
  /** Masked key suffix (…abcd), never the key. */
  maskedKey: string;
  attempts: number;
  finishReason?: string | null;
}

export interface CompleteResult<T> extends CompleteMeta {
  value: T;
  raw: string;
}

export interface LensProvider {
  name: string;
  complete<T>(opts: CompleteOptions<T>): Promise<CompleteResult<T>>;
}

function numEnv(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * Resolve the active provider from the environment. Reads env at CALL time
 * (per request / per eval run), so key rotation and provider switches take
 * effect without a restart.
 *
 * No usable keys → mock provider with a loud warning (graceful, never silent).
 */
export function getProvider(): LensProvider {
  const name = (process.env.LENS_PROVIDER || "groq").trim().toLowerCase();
  if (name === "mock") return mockProvider();

  const preset = getPreset(name); // throws a clear error on unknown names
  const baseURL = preset.baseURL ?? (process.env.LENS_BASE_URL || "").trim();
  if (!baseURL) {
    throw new Error("LENS_PROVIDER=custom requires LENS_BASE_URL to be set.");
  }
  const model = (process.env.LENS_MODEL || "").trim() || preset.defaultModel;
  if (!model) {
    throw new Error("No model configured: set LENS_MODEL (required for LENS_PROVIDER=custom).");
  }
  const keys = splitKeys(process.env[preset.apiKeyEnv]);
  if (keys.length === 0) {
    console.warn(
      `[lens] No keys in ${preset.apiKeyEnv}; using the mock provider. ` +
        `Set ${preset.apiKeyEnv} for real output.`
    );
    return mockProvider();
  }
  if (preset.note) console.info(`[lens] provider=${name} model=${model} note: ${preset.note}`);

  return makeOpenAICompatProvider({
    providerName: name,
    apiKeys: keys,
    baseURL,
    model,
    temperature: numEnv(process.env.LENS_TEMPERATURE, 0.4),
    maxTokens: numEnv(process.env.LENS_MAX_TOKENS, 4000),
    timeoutMs: numEnv(process.env.LENS_TIMEOUT_MS, 120_000),
    defaultHeaders: preset.defaultHeaders,
    sendJsonObject: preset.jsonObject,
  });
}
