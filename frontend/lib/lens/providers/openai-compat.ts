/**
 * Yentellect lens — the ONE transport implementation (Stage 5 + Package 2 resilience).
 *
 * Every registry preset is OpenAI-compatible, so one implementation serves
 * all vendors: Groq, OpenAI, OpenRouter, Gemini, DeepSeek, Anthropic-compat,
 * and anything custom (vLLM / Ollama / LM Studio) via LENS_BASE_URL.
 *
 * Behaviour, per the spec + Package 2:
 * - response_format json_object is sent ONLY when the preset allows it
 *   (Anthropic's compat layer silently ignores it — never send it there).
 * - Transport failures that are failoverable (401/429/5xx/network) move to
 *   the next rotated key.
 * - Validation failures get EXACTLY one retry, on the next key when one is
 *   available. Then InvalidModelOutputError, so run.ts can fall back to
 *   { message, connections: [] }.
 * - Empty content (a documented DeepSeek behaviour) and truncation both
 *   count as invalid output, not as empty results.
 * - TPM bucket tracking with configurable cap (LENS_TPM_CAP, default 8000).
 * - Circuit breaker per provider (5 failures -> open, 30s reset).
 * - Response cache (hash -> result, 5min TTL).
 * - Structured JSON-line logging to file (LENS_LOG_FILE).
 */
import OpenAI from "openai";
import { isFailoverable, maskKey, orderKeysForAttempt } from "./keys";
import { InvalidModelOutputError } from "../errors";
import type {
  CompleteOptions,
  CompleteResult,
  LensChatMessage,
  LensProvider,
} from "../provider";
import { writeFileSync, mkdirSync, appendFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export interface OpenAICompatConfig {
  providerName: string;
  apiKeys: string[];
  baseURL: string;
  model: string;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
  defaultHeaders?: Record<string, string>;
  sendJsonObject: boolean;
}

/** TPM bucket: timestamps of successful calls in the last 60s. */
const tpmBucket = new Map<string, number[]>();

/** Circuit breaker state per provider. */
interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  open: boolean;
}
const circuitBreakers = new Map<string, CircuitBreakerState>();
const CB_FAILURE_THRESHOLD = 5;
const CB_RESET_MS = 30_000;

/** Response cache: hash -> { value, expires }. */
interface CacheEntry<T> {
  value: T;
  expires: number;
}
const responseCache = new Map<string, CacheEntry<any>>();
const CACHE_TTL_MS = 5 * 60 * 1000;

/** Structured logging. */
const LOG_FILE = process.env.LENS_LOG_FILE ?? "";
const LOG_DIR = LOG_FILE ? dirname(LOG_FILE) : "";

function ensureLogDir(): void {
  if (LOG_DIR) {
    try { mkdirSync(LOG_DIR, { recursive: true }); } catch {}
  }
}

function logStructured(entry: Record<string, any>): void {
  if (!LOG_FILE) return;
  try {
    ensureLogDir();
    appendFileSync(LOG_FILE, JSON.stringify(entry) + "\n");
  } catch {}
}

function tpmKey(provider: string, model: string): string {
  return `${provider}:${model}`;
}

function checkTpm(provider: string, model: string, cap: number): boolean {
  const key = tpmKey(provider, model);
  const bucket = tpmBucket.get(key) ?? [];
  const now = Date.now();
  const windowStart = now - 60_000;
  while (bucket.length && bucket[0] < windowStart) bucket.shift();
  return bucket.length < cap;
}

function recordTpm(provider: string, model: string): void {
  const key = tpmKey(provider, model);
  const bucket = tpmBucket.get(key) ?? [];
  bucket.push(Date.now());
  tpmBucket.set(key, bucket);
}

function checkCircuitBreaker(provider: string): { allow: boolean; reason?: string } {
  const state = circuitBreakers.get(provider) ?? { failures: 0, lastFailure: 0, open: false };
  if (state.open) {
    if (Date.now() - state.lastFailure > CB_RESET_MS) {
      state.open = false;
      state.failures = 0;
      circuitBreakers.set(provider, state);
      return { allow: true };
    }
    return { allow: false, reason: "circuit breaker open" };
  }
  return { allow: true };
}

function recordFailure(provider: string): void {
  const state = circuitBreakers.get(provider) ?? { failures: 0, lastFailure: 0, open: false };
  state.failures += 1;
  state.lastFailure = Date.now();
  if (state.failures >= CB_FAILURE_THRESHOLD) {
    state.open = true;
    console.warn(`[lens] Circuit breaker OPEN for ${provider} after ${state.failures} failures`);
    logStructured({ type: "circuit_breaker_open", provider, failures: state.failures, timestamp: Date.now() });
  }
  circuitBreakers.set(provider, state);
}

function recordSuccess(provider: string): void {
  const state = circuitBreakers.get(provider);
  if (state) {
    state.failures = 0;
    state.open = false;
    circuitBreakers.set(provider, state);
  }
}

function cacheKey(opts: CompleteOptions<any>): string {
  const sysHash = hashString(opts.system);
  const msgHash = hashString(opts.messages.map(m => m.content).join("|"));
  const schemaHash = hashString(opts.jsonShapeExample);
  return `${sysHash}:${msgHash}:${schemaHash}:${opts.temperature ?? 0.4}:${opts.maxTokens ?? 4000}`;
}

function hashString(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return h.toString(36);
}

function getCache<T>(key: string): T | null {
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    responseCache.delete(key);
    return null;
  }
  return entry.value as T;
}

function setCache<T>(key: string, value: T): void {
  responseCache.set(key, { value, expires: Date.now() + CACHE_TTL_MS });
}

/** Strip ```json … ``` fences models like to add around JSON. */
function stripCodeFences(raw: string): string {
  const t = raw.trim();
  const m = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return m && m[1] !== undefined ? m[1].trim() : t;
}

function toOpenAIMessages(
  system: string,
  jsonShapeExample: string,
  messages: LensChatMessage[]
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  return [
    { role: "system", content: `${system}\n\n${jsonShapeExample}` },
    ...messages.map((m) => ({ role: m.role, content: m.content }) as const),
  ];
}

export function makeOpenAICompatProvider(cfg: OpenAICompatConfig): LensProvider {
  const tpmCap = Number(process.env.LENS_TPM_CAP ?? "8000");

  return {
    name: cfg.providerName,

    async complete<T>(opts: CompleteOptions<T>): Promise<CompleteResult<T>> {
      const keyOrder = orderKeysForAttempt(cfg.apiKeys);
      const model = opts.model ?? cfg.model;
      const provider = cfg.providerName;

      // TPM gate
      while (!checkTpm(provider, model, tpmCap)) {
        await new Promise(r => setTimeout(r, 100));
      }

      // Circuit breaker
      const cb = checkCircuitBreaker(provider);
      if (!cb.allow) {
        throw new Error(cb.reason);
      }

      // Cache lookup
      const ck = cacheKey(opts);
      const cached = getCache<CompleteResult<T>>(ck);
      if (cached) {
        logStructured({ type: "cache_hit", provider, model, timestamp: Date.now() });
        return cached;
      }

      let keyIdx = 0;
      let validationRetries = 0;
      let attempts = 0;
      let lastRaw: string | null = null;
      let lastReason = "no attempt made";
      let lastFinish: string | null = null;
      let lastMasked = "n/a";

      const startAll = Date.now();

      while (keyIdx < keyOrder.length) {
        const key = keyOrder[keyIdx] as string;
        const masked = maskKey(key);
        lastMasked = masked;
        attempts += 1;

        const startCall = Date.now();
        let text: string;
        try {
          const client = new OpenAI({
            apiKey: key,
            baseURL: cfg.baseURL,
            defaultHeaders: cfg.defaultHeaders,
            timeout: opts.timeoutMs ?? cfg.timeoutMs,
            maxRetries: 0,
          });
          const completion = await client.chat.completions.create({
            model,
            messages: toOpenAIMessages(opts.system, opts.jsonShapeExample, opts.messages),
            temperature: opts.temperature ?? cfg.temperature,
            max_tokens: opts.maxTokens ?? cfg.maxTokens,
            ...(cfg.sendJsonObject
              ? { response_format: { type: "json_object" } as const }
              : {}),
          });
          const choice = completion.choices[0];
          lastFinish = choice?.finish_reason ?? null;
          text = choice?.message?.content ?? "";
        } catch (err) {
          const latencyMs = Date.now() - startCall;
          logStructured({ type: "transport_error", provider, model, key: masked, latencyMs, error: err instanceof Error ? err.message : String(err), timestamp: Date.now() });
          if (isFailoverable(err) && keyIdx < keyOrder.length - 1) {
            keyIdx += 1;
            continue;
          }
          recordFailure(provider);
          throw err;
        }

        const callLatency = Date.now() - startCall;
        recordTpm(provider, model);

        lastRaw = text;
        const stripped = stripCodeFences(text);
        if (!stripped) {
          lastReason = lastFinish === "length" ? "output truncated (finish_reason=length)" : "empty content";
        } else {
          let json: unknown;
          try {
            json = JSON.parse(stripped);
          } catch {
            json = undefined;
            lastReason = "unparseable JSON";
          }
          if (json !== undefined) {
            const parsed = opts.schema.safeParse(json);
            if (parsed.success) {
              const result: CompleteResult<T> = {
                value: parsed.data,
                raw: stripped,
                provider,
                model,
                maskedKey: masked,
                attempts,
                finishReason: lastFinish,
              };
              setCache(ck, result);
              recordSuccess(provider);
              logStructured({ type: "success", provider, model, key: masked, attempts, latencyMs: Date.now() - startAll, finishReason: lastFinish, timestamp: Date.now() });
              return result;
            }
            lastReason = "schema validation failed";
          }
        }

        logStructured({ type: "validation_failed", provider, model, key: masked, reason: lastReason, attempts, timestamp: Date.now() });

        if (validationRetries < 1) {
          validationRetries += 1;
          if (keyIdx < keyOrder.length - 1) keyIdx += 1;
          continue;
        }
        break;
      }

      recordFailure(provider);
      logStructured({ type: "invalid_output", provider, model, reason: lastReason, attempts, latencyMs: Date.now() - startAll, timestamp: Date.now() });
      throw new InvalidModelOutputError(lastReason, lastRaw, attempts);
    },
  };
}