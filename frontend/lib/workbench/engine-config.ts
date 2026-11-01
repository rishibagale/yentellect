/**
 * Yentellect workbench — AI engine configuration (Cloud vs BYOK vs Local Machine).
 * Persists user preference in localStorage under "yentellect:engine-config".
 */
"use client";

export type EngineTarget = "cloud" | "byok" | "local";

export type ByokProvider =
  | "anthropic"
  | "openai"
  | "openrouter"
  | "groq"
  | "gemini"
  | "custom";

export interface EngineConfig {
  target: EngineTarget;
  // BYOK fields
  byokProvider: ByokProvider;
  byokApiKey: string;
  byokModel: string;
  byokBaseUrl?: string;
  // Local Machine fields
  localUrl: string;
  localModel: string;
}

const STORAGE_KEY = "yentellect:engine-config";

export const DEFAULT_BYOK_MODELS: Record<ByokProvider, string> = {
  anthropic: "claude-3-5-sonnet-20241022",
  openai: "gpt-4o",
  openrouter: "deepseek/deepseek-r1",
  groq: "llama-3.3-70b-versatile",
  gemini: "gemini-2.0-flash",
  custom: "default-model",
};

export const DEFAULT_ENGINE_CONFIG: EngineConfig = {
  target: "cloud",
  byokProvider: "anthropic",
  byokApiKey: "",
  byokModel: "claude-3-5-sonnet-20241022",
  byokBaseUrl: "",
  localUrl: "http://127.0.0.1:11434",
  localModel: "llama3.3",
};

export function readEngineConfig(): EngineConfig {
  if (typeof window === "undefined") return DEFAULT_ENGINE_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ENGINE_CONFIG;
    const parsed = JSON.parse(raw);
    const target: EngineTarget =
      parsed.target === "byok" || parsed.target === "local" ? parsed.target : "cloud";
    const byokProvider: ByokProvider = [
      "anthropic",
      "openai",
      "openrouter",
      "groq",
      "gemini",
      "custom",
    ].includes(parsed.byokProvider)
      ? parsed.byokProvider
      : "anthropic";

    return {
      target,
      byokProvider,
      byokApiKey: typeof parsed.byokApiKey === "string" ? parsed.byokApiKey.trim() : "",
      byokModel:
        typeof parsed.byokModel === "string" && parsed.byokModel.trim()
          ? parsed.byokModel.trim()
          : DEFAULT_BYOK_MODELS[byokProvider],
      byokBaseUrl: typeof parsed.byokBaseUrl === "string" ? parsed.byokBaseUrl.trim() : "",
      localUrl:
        typeof parsed.localUrl === "string" && parsed.localUrl.trim()
          ? parsed.localUrl.trim()
          : DEFAULT_ENGINE_CONFIG.localUrl,
      localModel:
        typeof parsed.localModel === "string" && parsed.localModel.trim()
          ? parsed.localModel.trim()
          : DEFAULT_ENGINE_CONFIG.localModel,
    };
  } catch {
    return DEFAULT_ENGINE_CONFIG;
  }
}

export function writeEngineConfig(next: Partial<EngineConfig>): EngineConfig {
  if (typeof window === "undefined") return DEFAULT_ENGINE_CONFIG;
  const current = readEngineConfig();
  const merged: EngineConfig = { ...current, ...next };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    window.dispatchEvent(new CustomEvent("yentellect:engine-changed", { detail: merged }));
  } catch {}
  return merged;
}

export interface LocalHealthResult {
  online: boolean;
  models: string[];
  latencyMs?: number;
  detectedType?: "ollama" | "zen-proxy" | "lm-studio" | "openai-compat";
}

/** Check if the given local engine endpoint is alive and fetch its available models */
export async function probeLocalEngine(baseUrl: string): Promise<LocalHealthResult> {
  const cleanBase = baseUrl.replace(/\/+$/, "").replace(/\/v1$/, "");
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000);
  const start = performance.now();

  try {
    const res = await fetch(`${cleanBase}/v1/models`, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeoutId);
    if (!res.ok) return { online: false, models: [] };

    const data = await res.json();
    const models: string[] = [];
    if (Array.isArray(data?.data)) {
      for (const m of data.data) {
        if (typeof m?.id === "string") models.push(m.id);
      }
    } else if (Array.isArray(data?.models)) {
      for (const m of data.models) {
        if (typeof m?.name === "string") models.push(m.name);
      }
    }

    const latencyMs = Math.round(performance.now() - start);
    let detectedType: LocalHealthResult["detectedType"] = "openai-compat";
    if (cleanBase.includes(":11434")) detectedType = "ollama";
    else if (cleanBase.includes(":8787")) detectedType = "zen-proxy";
    else if (cleanBase.includes(":1234")) detectedType = "lm-studio";

    return {
      online: true,
      models,
      latencyMs,
      detectedType,
    };
  } catch {
    clearTimeout(timeoutId);
    return { online: false, models: [] };
  }
}
