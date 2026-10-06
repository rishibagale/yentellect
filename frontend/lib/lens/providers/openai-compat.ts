/**
 * Yentellect lens — the ONE transport implementation (Stage 5).
 *
 * Every registry preset is OpenAI-compatible, so one implementation serves
 * all vendors: Groq, OpenAI, OpenRouter, Gemini, DeepSeek, Anthropic-compat,
 * and anything custom (vLLM / Ollama / LM Studio) via LENS_BASE_URL.
 *
 * Behaviour, per the spec:
 * - response_format json_object is sent ONLY when the preset allows it
 *   (Anthropic's compat layer silently ignores it — never send it there).
 * - Transport failures that are failoverable (401/429/5xx/network) move to
 *   the next rotated key.
 * - Validation failures get EXACTLY one retry, on the next key when one is
 *   available. Then InvalidModelOutputError, so run.ts can fall back to
 *   { message, connections: [] }.
 * - Empty content (a documented DeepSeek behaviour) and truncation both
 *   count as invalid output, not as empty results.
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
  return {
    name: cfg.providerName,

    async complete<T>(opts: CompleteOptions<T>): Promise<CompleteResult<T>> {
      const keyOrder = orderKeysForAttempt(cfg.apiKeys);
      const model = opts.model ?? cfg.model;

      let keyIdx = 0;
      let validationRetries = 0;
      let attempts = 0;
      let lastRaw: string | null = null;
      let lastReason = "no attempt made";
      let lastFinish: string | null = null;
      let lastMasked = "n/a";

      // Bounded: at most one call per key for transport failover, plus the
      // spec's single validation retry.
      while (keyIdx < keyOrder.length) {
        const key = keyOrder[keyIdx] as string;
        const masked = maskKey(key);
        lastMasked = masked;
        attempts += 1;

        let text: string;
        try {
          const client = new OpenAI({
            apiKey: key,
            baseURL: cfg.baseURL,
            defaultHeaders: cfg.defaultHeaders,
            timeout: opts.timeoutMs ?? cfg.timeoutMs,
            maxRetries: 0, // failover/rotation is ours, not the SDK's
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
          if (isFailoverable(err) && keyIdx < keyOrder.length - 1) {
            keyIdx += 1; // dead/rate-limited key → next rotated key
            continue;
          }
          throw err; // non-failoverable: propagate (request bug, 400, …)
        }

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
              return {
                value: parsed.data,
                raw: stripped,
                provider: cfg.providerName,
                model,
                maskedKey: masked,
                attempts,
                finishReason: lastFinish,
              };
            }
            lastReason = "schema validation failed";
          }
        }

        if (validationRetries < 1) {
          validationRetries += 1; // the spec's single retry…
          if (keyIdx < keyOrder.length - 1) keyIdx += 1; // …on the next key when one exists
          continue;
        }
        break;
      }

      throw new InvalidModelOutputError(lastReason, lastRaw, attempts);
    },
  };
}
