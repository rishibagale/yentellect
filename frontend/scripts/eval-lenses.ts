#!/usr/bin/env tsx
/**
 * Yentellect lens eval harness — part 2: runner (Stage 5).
 *
 * Usage:
 *   npm run eval:lenses                        # every item, both lenses
 *   npm run eval:lenses -- --only quorum       # subset by title
 *   npm run eval:lenses -- --lens analogical   # one lens only
 *   LENS_PROVIDER=deepseek npm run eval:lenses # any registry provider
 *
 * Writes frontend/eval/report.md with full outputs + blank scoring tables.
 * Anything the harness can check itself it checks (sums, connection counts,
 * fallback/error counts); grading the 0–2 rubric stays a human job.
 */
import { EVAL_DIR, ITEMS_SEED_PATH, ITEMS_USER_PATH, loadEnvLocal, loadItems, loadSeedItems, renderReport, writeReport, type RunRecord } from "./eval-lenses-lib";
import { runLens } from "../lib/lens/run";
import type { LensRequest } from "../lib/lens/schema";
import type { LensId } from "../lib/lens/schema";

loadEnvLocal();

function flag(name: string): string | null {
  const i = process.argv.indexOf(name);
  return i >= 0 && i + 1 < process.argv.length ? (process.argv[i + 1] as string) : null;
}

const only = flag("--only") ?? undefined;
const lensArg = (flag("--lens") ?? "both").toLowerCase();
const resumeFrom = (() => {
  const i = process.argv.indexOf("--resume-from");
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : null;
})();
const delayMs = (() => {
  const i = process.argv.indexOf("--delay-ms");
  const raw = i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : process.env.EVAL_DELAY_MS;
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
})();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const outFile = flag("--out") ?? undefined;
const baseline = flag("--baseline") !== null;
const modelOverride = flag("--model") ?? undefined;
if (modelOverride) process.env.LENS_MODEL = modelOverride;
const lenses: LensId[] =
  lensArg === "both" ? ["analogical", "systems"]
  : lensArg === "analogical" ? ["analogical"]
  : lensArg === "systems" ? ["systems"]
  : (() => { throw new Error(`--lens must be analogical|systems|both, got "${lensArg}"`); })();

const startedAt = new Date().toISOString();
const t0 = Date.now();

async function main(): Promise<number> {
  console.log(`[eval] seed: ${ITEMS_SEED_PATH}`);
  console.log(`[eval] user: ${ITEMS_USER_PATH}`);
  console.log(`[eval] out:   ${EVAL_DIR}/report.md`);

  const loadFn = baseline ? loadSeedItems : loadItems;
  const items = resumeFrom
    ? (() => {
        const all = loadFn(only);
        const idx = all.findIndex((i) => i.title.toLowerCase().includes(resumeFrom.toLowerCase()));
        return idx < 0 ? all : all.slice(idx);
      })()
    : loadFn(only);
  console.log(`[eval] running ${items.length} item(s) × ${lenses.length} lens(es)`);

  let mockSeen = false;
  const runs: RunRecord[] = [];

  for (const item of items) {
    for (const lens of lenses) {
      if (delayMs > 0) await sleep(delayMs);
      const req: LensRequest = {
        lens,
        selection: item.selection,
        doc: { title: item.title, kind: "paper excerpt" },
        userField: item.userField,
        history: [],
      };
      try {
        const out = await runLens(req);
        if (out.provider === "mock") mockSeen = true;
        runs.push({
          item, lens,
          provider: out.provider,
          model: out.model,
          maskedKey: out.maskedKey,
          attempts: out.attempts,
          usedFallback: out.usedFallback,
          error: null,
          response: out.response,
        });
        console.log(
          `[eval] ${item.title} [${lens}] ok: conns=${out.response.connections.length}` +
          (out.usedFallback ? " FALLBACK" : "")
        );
      } catch (err) {
        runs.push({
          item, lens,
          provider: process.env.LENS_PROVIDER || "groq",
          model: process.env.LENS_MODEL || "(registry default)",
          maskedKey: "n/a",
          attempts: 0,
          usedFallback: false,
          error: err instanceof Error ? err.message : String(err),
          response: null,
        });
        console.log(`[eval] ${item.title} [${lens}] ERROR: ${err instanceof Error ? err.message : err}`);
      }
    }
  }

  const md = renderReport(runs, mockSeen, startedAt, Date.now() - t0);
  const path = writeReport(md, outFile);

  const n = runs.length;
  const ok = runs.filter((r) => !r.error).length;
  const withConns = runs.filter((r) => r.response && r.response.connections.length > 0).length;
  const fallbacks = runs.filter((r) => r.usedFallback).length;
  const errors = runs.filter((r) => r.error).length;
  console.log(`[eval] wrote ${path}`);
  console.log(`[eval] summary: runs=${n} ok=${ok} withConnections=${withConns} fallbacks=${fallbacks} errors=${errors}`);
  if (mockSeen) {
    console.log("[eval] MOCK PROVIDER ACTIVE — report is plumbing-only, not gradable. Set a provider key and rerun.");
    return 2;
  }
  return 0;
}

main().then(
  (code) => { process.exitCode = code; },
  (err) => { console.error("[eval] fatal:", err); process.exitCode = 1; }
);
