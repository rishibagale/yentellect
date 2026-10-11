#!/usr/bin/env tsx
/**
 * Yentellect lens stress test — Package 2 resilient call layer.
 *
 * Usage:
 *   npx tsx scripts/stress-lens.ts                    # defaults
 *   npx tsx scripts/stress-lens.ts --concurrency 10 --duration 60000 --tpm 5000
 *   npx tsx scripts/stress-lens.ts --model openai/gpt-oss-120b --lens analogical
 *
 * Reports latency percentiles, error rates, TPM usage, and circuit-breaker events.
 */
import { loadEnvLocal } from "./eval-lenses-lib";
import { runLens } from "../lib/lens/run";
import type { LensRequest } from "../lib/lens/schema";
import type { LensId } from "../lib/lens/schema";

loadEnvLocal();

function flag(name: string): string | null {
  const i = process.argv.indexOf(name);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : null;
}

function flagBool(name: string): boolean {
  return process.argv.includes(name);
}

const concurrency = Number(flag("--concurrency") ?? process.env.STRESS_CONCURRENCY ?? "5");
const durationMs = Number(flag("--duration") ?? process.env.STRESS_DURATION_MS ?? "30000");
const tpmCap = Number(flag("--tpm") ?? process.env.STRESS_TPM_CAP ?? "8000");
const lensArg = (flag("--lens") ?? "both").toLowerCase();
const modelOverride = flag("--model") ?? undefined;
if (modelOverride) process.env.LENS_MODEL = modelOverride;
const outFile = flag("--out") ?? undefined;
const verbose = flagBool("--verbose");

const lenses: LensId[] =
  lensArg === "both" ? ["analogical", "systems"]
  : lensArg === "analogical" ? ["analogical"]
  : lensArg === "systems" ? ["systems"]
  : (() => { throw new Error(`--lens must be analogical|systems|both, got "${lensArg}"`); })();

interface StressResult {
  ok: boolean;
  latencyMs: number;
  error?: string;
  usedFallback: boolean;
  provider: string;
  model: string;
}

interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  open: boolean;
}

const cbState = new Map<string, CircuitBreakerState>();
const CB_FAILURE_THRESHOLD = 5;
const CB_RESET_MS = 30_000;
const CACHE_TTL_MS = 5 * 60 * 1000;

const responseCache = new Map<string, { value: any; expires: number }>();

function cacheKey(req: LensRequest): string {
  return `${req.lens}:${req.selection.slice(0, 200)}:${req.userField}`;
}

function getCache(key: string): any | null {
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    responseCache.delete(key);
    return null;
  }
  return entry.value;
}

function setCache(key: string, value: any): void {
  responseCache.set(key, { value, expires: Date.now() + CACHE_TTL_MS });
}

function checkCircuitBreaker(provider: string): { allow: boolean; reason?: string } {
  const state = cbState.get(provider) || { failures: 0, lastFailure: 0, open: false };
  if (state.open) {
    if (Date.now() - state.lastFailure > CB_RESET_MS) {
      state.open = false;
      state.failures = 0;
      cbState.set(provider, state);
      return { allow: true };
    }
    return { allow: false, reason: "circuit breaker open" };
  }
  return { allow: true };
}

function recordFailure(provider: string): void {
  const state = cbState.get(provider) || { failures: 0, lastFailure: 0, open: false };
  state.failures += 1;
  state.lastFailure = Date.now();
  if (state.failures >= CB_FAILURE_THRESHOLD) {
    state.open = true;
    console.warn(`[stress] Circuit breaker OPEN for ${provider} after ${state.failures} failures`);
  }
  cbState.set(provider, state);
}

function recordSuccess(provider: string): void {
  const state = cbState.get(provider);
  if (state) {
    state.failures = 0;
    state.open = false;
    cbState.set(provider, state);
  }
}

const tpmBucket: number[] = [];
function checkTpm(): boolean {
  const now = Date.now();
  const windowStart = now - 60_000;
  while (tpmBucket.length && tpmBucket[0] < windowStart) tpmBucket.shift();
  return tpmBucket.length < tpmCap;
}

function recordTpm(): void {
  tpmBucket.push(Date.now());
}

const latencies: number[] = [];
const errors: string[] = [];
const fallbacks = 0;
let totalRequests = 0;
let fallbackCount = 0;
let running = true;

const testItem: LensRequest = {
  lens: "analogical",
  selection: "Bacterial quorum sensing: cells release a signal molecule and switch behaviour once its concentration crosses a threshold.",
  doc: { title: "Quorum sensing (stress test)", kind: "paper excerpt" },
  userField: "distributed systems",
  history: [],
};

async function worker(id: number): Promise<void> {
  while (running) {
    if (!checkTpm()) {
      await new Promise(r => setTimeout(r, 100));
      continue;
    }
    const lens = lenses[totalRequests % lenses.length];
    const req: LensRequest = { ...testItem, lens };
    const cacheHit = getCache(cacheKey(req));
    if (cacheHit && verbose) {
      console.log(`[stress] worker ${id}: cache hit`);
      latencies.push(0);
      totalRequests++;
      continue;
    }

    const cb = checkCircuitBreaker(process.env.LENS_PROVIDER || "groq");
    if (!cb.allow) {
      errors.push(cb.reason || "circuit breaker");
      if (verbose) console.log(`[stress] worker ${id}: ${cb.reason}`);
      await new Promise(r => setTimeout(r, 500));
      continue;
    }

    const start = Date.now();
    try {
      recordTpm();
      const out = await runLens(req);
      const latency = Date.now() - start;
      latencies.push(latency);
      if (out.usedFallback) fallbackCount++;
      setCache(cacheKey(req), out.response);
      recordSuccess(out.provider);
    } catch (err) {
      const latency = Date.now() - start;
      latencies.push(latency);
      errors.push(err instanceof Error ? err.message : String(err));
      recordFailure(process.env.LENS_PROVIDER || "groq");
    }
    totalRequests++;
  }
}

function percentile(arr: number[], p: number): number {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil(p / 100 * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

async function main(): Promise<void> {
  console.log(`[stress] concurrency=${concurrency} duration=${durationMs}ms tpmCap=${tpmCap} lens=${lensArg}`);
  const workers = Array.from({ length: concurrency }, (_, i) => worker(i + 1));
  const timeout = setTimeout(() => { running = false; }, durationMs);
  await Promise.all(workers);
  clearTimeout(timeout);

  const sortedLatencies = latencies.filter(l => l > 0).sort((a, b) => a - b);
  const report = {
    started: new Date().toISOString(),
    durationMs,
    concurrency,
    tpmCap,
    lenses: lensArg,
    totalRequests,
    successful: totalRequests - errors.length,
    errors: errors.length,
    fallbacks: fallbackCount,
    cacheSize: responseCache.size,
    latency: {
      min: sortedLatencies[0] ?? 0,
      p50: percentile(sortedLatencies, 50),
      p90: percentile(sortedLatencies, 90),
      p99: percentile(sortedLatencies, 99),
      max: sortedLatencies[sortedLatencies.length - 1] ?? 0,
      avg: sortedLatencies.reduce((a, b) => a + b, 0) / (sortedLatencies.length || 1),
    },
    errorBreakdown: errors.reduce((acc, e) => { acc[e] = (acc[e] || 0) + 1; return acc; }, {} as Record<string, number>),
    circuitBreakers: Object.fromEntries(cbState),
  };

  const md = `# Stress Test Report\n\n` +
    `**Started:** ${report.started} · **Duration:** ${report.durationMs}ms · **Concurrency:** ${report.concurrency} · **TPM Cap:** ${report.tpmCap}\n\n` +
    `## Summary\n\n` +
    `- Total requests: ${report.totalRequests}\n` +
    `- Successful: ${report.successful}\n` +
    `- Errors: ${report.errors}\n` +
    `- Fallbacks: ${report.fallbacks}\n` +
    `- Cache entries: ${report.cacheSize}\n\n` +
    `## Latency (ms)\n\n` +
    `| Metric | Value |\n|---|---|\n` +
    `| Min | ${report.latency.min} |\n` +
    `| Avg | ${Math.round(report.latency.avg)} |\n` +
    `| P50 | ${report.latency.p50} |\n` +
    `| P90 | ${report.latency.p90} |\n` +
    `| P99 | ${report.latency.p99} |\n` +
    `| Max | ${report.latency.max} |\n\n` +
    `## Errors\n\n` +
    (Object.keys(report.errorBreakdown).length
      ? Object.entries(report.errorBreakdown).map(([k, v]) => `- ${k}: ${v}`).join("\n")
      : "None") + "\n\n" +
    `## Circuit Breakers\n\n` +
    Object.entries(report.circuitBreakers).map(([k, v]) => `- ${k}: ${JSON.stringify(v)}`).join("\n") || "None";

  const { writeFileSync, mkdirSync } = await import("node:fs");
  const { dirname, join } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const HERE = dirname(fileURLToPath(import.meta.url));
  const EVAL_DIR = join(HERE, "..", "eval");
  mkdirSync(EVAL_DIR, { recursive: true });
  const path = outFile ?? join(EVAL_DIR, `stress-report-${Date.now()}.md`);
  writeFileSync(path, md, "utf8");
  console.log(`[stress] wrote ${path}`);
  console.log(JSON.stringify(report, null, 2));
}

main().catch(err => { console.error("[stress] fatal:", err); process.exit(1); });