/**
 * Yentellect lens — provider registry (Stage 5).
 *
 * Every entry needs only three things to work: an OpenAI-compatible baseURL,
 * an env var holding the key(s), and honest capability flags. Adding a new
 * provider is one object here — never new call-site code.
 *
 * Flags were verified against vendor docs (10/2026), not from memory:
 * - Anthropic's OpenAI-compat layer *silently ignores* unsupported fields
 *   (their own docs call it non-production), so response_format must NOT be
 *   trusted there: jsonObject is false and we rely on prompt-only JSON.
 * - DeepSeek documents response_format json_object, but REQUIRES the literal
 *   word "json" plus a format example in the prompt, may return empty
 *   content, and warns that large outputs truncate (hence generous maxTokens).
 * - Groq documents JSON Object Mode on all models, but strict json_schema is
 *   "only available on select models", so we never build on it.
 */
import type { LensProviderName } from "../schema";

export interface ProviderPreset {
  name: Exclude<LensProviderName, "custom" | "mock"> | "custom";
  baseURL: string | null; // null = read from LENS_BASE_URL at call time
  apiKeyEnv: string;
  defaultModel: string;
  /** Extra headers, e.g. OpenRouter attribution. */
  defaultHeaders?: Record<string, string>;
  /** May we send response_format {type:"json_object"}? */
  jsonObject: boolean;
  /** Extra prompt/parse handling this preset needs. */
  needsJsonExampleInPrompt: boolean;
  mayReturnEmptyContent?: boolean;
  /** Human-readable caveat shown in logs/reports. */
  note?: string;
}

const PRESETS: Record<string, ProviderPreset> = {
  groq: {
    name: "groq",
    baseURL: "https://api.groq.com/openai/v1",
    apiKeyEnv: "GROQ_API_KEY",
    defaultModel: "openai/gpt-oss-120b",
    jsonObject: true,
    needsJsonExampleInPrompt: true,
    note: "Strict json_schema not trusted on this provider; JSON Object Mode + zod + retry.",
  },
  openai: {
    name: "openai",
    baseURL: "https://api.openai.com/v1",
    apiKeyEnv: "OPENAI_API_KEY",
    defaultModel: "gpt-4o-mini",
    jsonObject: true,
    needsJsonExampleInPrompt: true,
  },
  openrouter: {
    name: "openrouter",
    baseURL: "https://openrouter.ai/api/v1",
    apiKeyEnv: "OPENROUTER_API_KEY",
    defaultModel: "anthropic/claude-sonnet-4",
    jsonObject: true,
    needsJsonExampleInPrompt: true,
    defaultHeaders: { "X-Title": "Yentellect lens" },
    note: "Model fallbacks available at the router level; same chat-completions shape.",
  },
  gemini: {
    name: "gemini",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    apiKeyEnv: "GEMINI_API_KEY",
    defaultModel: "gemini-2.5-flash",
    jsonObject: true,
    needsJsonExampleInPrompt: true,
    note: "OpenAI-compat layer is beta; expect rough edges.",
  },
  deepseek: {
    name: "deepseek",
    baseURL: "https://api.deepseek.com",
    apiKeyEnv: "DEEPSEEK_API_KEY",
    defaultModel: "deepseek-chat",
    jsonObject: true,
    needsJsonExampleInPrompt: true,
    mayReturnEmptyContent: true,
    note: "Requires the word 'json' + a format example in the prompt; may return empty content (treated as invalid → retry).",
  },
  anthropic: {
    name: "anthropic",
    baseURL: "https://api.anthropic.com/v1/",
    apiKeyEnv: "ANTHROPIC_API_KEY",
    defaultModel: "claude-sonnet-4-20250514",
    jsonObject: false,
    needsJsonExampleInPrompt: true,
    note: "Compat layer silently ignores unsupported fields — response_format is NEVER sent here; prompt-only JSON + zod + retry. Prefer OpenRouter for Claude.",
  },
};

export function getPreset(name: string): ProviderPreset {
  if (name === "custom") {
    return {
      name: "custom",
      baseURL: null,
      apiKeyEnv: "LENS_API_KEY",
      defaultModel: "",
      jsonObject: true,
      needsJsonExampleInPrompt: true,
      note: "vLLM / Ollama / LM Studio / anything OpenAI-compatible. Set LENS_BASE_URL.",
    };
  }
  const preset = PRESETS[name];
  if (!preset) {
    throw new Error(
      `Unknown LENS_PROVIDER "${name}". Expected one of: ${Object.keys(PRESETS).join(", ")}, custom.`
    );
  }
  return preset;
}

export function listPresetNames(): string[] {
  return [...Object.keys(PRESETS), "custom"];
}
