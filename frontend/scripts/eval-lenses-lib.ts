/**
 * Yentellect lens eval harness — part 1: types, loading, markdown (Stage 5).
 *
 * Pure helpers with no provider dependency so the runner (part 2) stays thin.
 * All imports are RELATIVE so tsx needs no path-alias resolution.
 *
 * Items (eval/items.json): { title, selection, userField }. The starter set
 * is SHORT, well-attested passages from real, famous papers graders will
 * recognise; userField is deliberately varied to test the spec's cross-field
 * pressure. REPLACE with the user's own papers before trusting the bar.
 * NOTE: items.json must be strict JSON (no comments) — every consumer parses
 * it with JSON.parse.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { LensConnection, LensId, LensResponse } from "../lib/lens/schema";

export interface EvalItem {
  title: string;
  selection: string;
  userField: string;
}

const HERE = dirname(fileURLToPath(import.meta.url));
export const EVAL_DIR = join(HERE, "..", "eval");
export const ITEMS_PATH = join(EVAL_DIR, "items.json");

export function loadEnvLocal(): void {
  // Node >= 20.12: no dotenv dependency needed.
  try {
    process.loadEnvFile(join(HERE, "..", ".env.local"));
  } catch {
    /* absent or unreadable — provider resolution will report mock */
  }
}

export function loadItems(only?: string): EvalItem[] {
  const raw = JSON.parse(readFileSync(ITEMS_PATH, "utf8")) as unknown;
  if (!Array.isArray(raw)) throw new Error("eval/items.json must be an array");
  const items = raw as EvalItem[];
  if (only) {
    const needle = only.toLowerCase();
    return items.filter((i) => i.title.toLowerCase().includes(needle));
  }
  return items;
}

export interface RunRecord {
  item: EvalItem;
  lens: LensId;
  provider: string;
  model: string;
  maskedKey: string;
  attempts: number;
  usedFallback: boolean;
  error: string | null;
  response: LensResponse | null;
}

function esc(s: string): string {
  return s.replace(/\|/g, "\\|").replace(/\n+/g, " ");
}

export function renderConnection(c: LensConnection, idx: number): string {
  const head = `#### Connection ${idx + 1} — ${c.type} · ${c.confidence} confidence\n\n` +
    `**Label:** ${c.targetLabel}${c.targetField ? ` (${c.targetField})` : ""}\n\n` +
    `**Summary:** ${c.summary}\n`;
  if (c.type === "analogy") {
    const rows = c.detail.mapping.map((m) => `| ${esc(m.source)} | ${esc(m.target)} |`).join("\n");
    return head +
      `\n**Mapping:**\n\n| source | target |\n|---|---|\n${rows}\n\n` +
      `**Transfers:** ${c.detail.transfers}\n\n**Breaks:** ${c.detail.breaks}\n\n**Test:** ${c.detail.test}\n`;
  }
  const nodes = c.detail.nodes.map((n) => `\`${n.id}\` ${n.label} [${n.kind}]`).join("; ");
  const edges = c.detail.edges
    .map((e) => `\`${e.from}\` —${e.sign}→ \`${e.to}\`${e.delay ? " (delay)" : ""}`)
    .join("; ");
  const loops = c.detail.loops.map((l) => `\`${l.nodes.join(" → ")}\` (${l.kind}): ${l.note}`).join(" | ");
  return head +
    `\n**Nodes:** ${nodes || "(none)"}\n\n**Edges:** ${edges || "(none)"}\n\n**Loops:** ${loops || "(none)"}\n\n` +
    `**Leverage:** ${c.detail.leverage}\n\n**Assumptions:** ${c.detail.assumptions.join(" | ") || "(none)"}\n\n**Touches user model:** ${c.detail.touchesUserModel}\n`;
}

export function renderRun(r: RunRecord): string {
  const meta = `provider \`${r.provider}\` · model \`${r.model}\` · key ${r.maskedKey} · attempts ${r.attempts}` +
    (r.usedFallback ? " · **FALLBACK**" : "");
  if (r.error) return `### ${r.item.title} — ${r.lens}\n\n${meta}\n\n**ERROR:** ${r.error}\n`;
  const resp = r.response as LensResponse;
  const conns = resp.connections.length
    ? resp.connections.map((c, i) => renderConnection(c, i)).join("\n")
    : "_No connections returned._\n";
  const table = resp.connections.length
    ? `\n**Hand grade (0–2 each; pass ≥ 6/8):**\n\n| # | structural | non-obvious | actionable | honest | total | pass? |\n` +
      resp.connections.map((_, i) => `| ${i + 1} |  |  |  |  |  |  |`).join("\n") + "\n"
    : "";
  return `### ${r.item.title} — ${r.lens}\n\n${meta}\n\n> ${resp.message}\n\n${conns}${table}\n`;
}

export function renderReport(
  runs: RunRecord[],
  mock: boolean,
  startedAt: string,
  elapsedMs: number
): string {
  const lines = [
    "# Lens eval report",
    ``,
    `Started: ${startedAt} · elapsed ${(elapsedMs / 1000).toFixed(1)}s · runs ${runs.length}`,
  ];
  if (mock) {
    lines.push(
      ``,
      `> **MOCK PROVIDER — DO NOT GRADE.** No LLM keys were configured, so every`,
      `> response is canned. This report proves the harness plumbing only.`,
      `> Set a provider key (see frontend/.env.example) and rerun.`
    );
  }
  lines.push(
    ``,
    `## Bar`,
    ``,
    `- A connection passes at **≥ 6/8** (0–2 on structural validity, non-obviousness, actionability, honesty).`,
    `- The lens passes when **≥ half the items produce one passing connection**, and the user answers yes to`,
    `  "did this give me a connection I would not have made alone?" on **≥ 3 items**.`,
    ``,
    `## Runs`,
    ``
  );
  const byLens: Record<string, RunRecord[]> = { analogical: [], systems: [] };
  for (const r of runs) byLens[r.lens]?.push(r);
  for (const lens of ["analogical", "systems"] as const) {
    lines.push(`## Lens: ${lens}`, ``);
    for (const r of byLens[lens] ?? []) lines.push(renderRun(r), `---`, ``);
  }
  return lines.join("\n");
}

export function writeReport(md: string, outPath?: string): string {
  mkdirSync(EVAL_DIR, { recursive: true });
  const raw = outPath ?? join(EVAL_DIR, "report.md");
  // --out may be a bare filename ("rerun-systems.md") or a path. Bare names
  // land in EVAL_DIR; anything else resolves against the repo root (cwd).
  const path =
    raw === join(EVAL_DIR, "report.md") || raw.includes("/") || raw.includes("\\")
      ? raw
      : join(EVAL_DIR, raw);
  writeFileSync(path, md, "utf8");
  return path;
}
