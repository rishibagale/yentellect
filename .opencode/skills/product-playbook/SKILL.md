---
name: product-playbook
description: Use when planning, implementing, testing, or shipping a product change — especially for A/B testing / experimentation, product test automation (E2E or regression verification), and note-taking / decision logging. Trigger words: A/B test, experiment, feature flag, variant, E2E test, regression, verify before shipping, decision log, release checklist, product notes. Applies to the Yentellect workbench and can be adapted to any software product.
---

# Product Playbook (Yentellect)

A repeatable loop for shipping product changes with evidence:
**Note → Gate → Test → Measure → Decide.** Anchored to the real Yentellect
repo (`CONTEXT.md` is the source of truth; verify against it before
following something here that seems stale).

## Operating principles (non-negotiable)

1. **Freeze friction this repo already solved.** tsc gate is
   `& .\node_modules\.bin\tsc.cmd --noEmit --incremental false` (never bare
   `tsc`; it rewrites the *tracked* `frontend/tsconfig.tsbuildinfo`, which
   must stay out of commits). Never `npm run lint` (no ESLint config →
   interactive prompt). Never `npm install` without checking install health
   first (npm installs are flaky on this machine; `tsx` runs via the
   `node_modules/.bin/tsx.cmd` shim only).
2. **Eval gates UI for lens work.** The lens spec forbids polished UI on a
   failing lens. Any prompt change → rerun the harness
   (`.\node_modules\.bin\tsx.cmd scripts/eval-lenses.ts --lens <lens>
   --out <file>`, pace with `EVAL_DELAY_MS=15000`) → regrade → then UI.
   `eval/report.md` is the graded master; treat as append-only evidence.
3. **Prompts verbatim.** `frontend/lib/lens/prompts-base.ts` is
   character-identical to the lens spec. Improvising prompt changes without
   a rerun is forbidden.
4. **No new deps lightly.** Adding `dexie` / `@codemirror/*` / `katex` /
   `react-force-graph-2d` / Playwright etc. requires verifying package.json
   state and npm health first. Be explicit about what the change costs.
5. **Stages are honest placeholders.** Explorer / Connections drawer are
   placeholders; `/session`, `/profile`, `/history`, `/settings` stay and
   dissolve into workbench panels stage by stage. `frontend/lib/modes.ts`
   must never be deleted.

## The loop

### 1. Note (capture before you touch code)

Write the decision down FIRST. Keep the repo's documentation discipline:

- `CONTEXT.md` — single source of truth. Update it in the same pass as the
  code (sections 5, 11, 13, 16 are the ones that drift).
- `BUILD_STATUS.md` — shipping log; append what shipped + verification.
- `DESIGN_RESEARCH.md` — design rationale and corrections.

Use this **experiment/decision entry** template (append to DESIGN_RESEARCH
under a new subsection, or to CONTEXT.md Section 11 checklist when brief):

```markdown
## YYYY-MM-DD — <short title>
Status: drafting | running | shipped | rolled back | decided
Hypothesis: <one sentence, falsifiable>
Variant A (current): <what exists today>
Variant B (proposed): <the change>
Metric: <the one number that decides>    (e.g. kept-connections rate, timeout rate)
Gate: <feature-flag key or eval lane>
Verdict bar: <e.g. B matches A on quality AND reduces friction |
              eval >= 6/8 | user "wouldn't-have-found-alone" on >= 3 items>
Evidence: <links to eval runs, build logs, decision commits>
Decision: <keep / roll back / iterate — 1-2 lines WHY>
```

Future sessions read these entries to know WHY a thing exists.

### 2. Gate the change (A/B testing)

The platform-independent A/B primitive in Yentellect is the **feature
flag**. Prefer options in this order:

1. **localStorage flag** (native pattern, no infra): follow the existing
   `yentellect.*.v1` convention (`yentellect.betaModes.v1`,
   `yentellect.userField.v1`, `yentellect.doc.v1`) in
   `frontend/lib/workbench/storage.ts`. Shell state (`shell-state.ts`) is
   the source of truth inside the workbench; `SettingsForm` falls back to
   localStorage on `/settings`. **Beta modes** are the precedent: a default-off
   toggle that shows hidden functionality with a "Beta" badge.
2. **Eval harness lanes** (for lens/prompt variants): run both variants
   through `scripts/eval-lenses.ts` with `--out <separate file>` and compare
   the graded report. A/B of prompts is NOT two model calls — it is two
   system prompts graded against the 0-2 rubric.
3. **External experimentation platform** (only if you need real user-rollout
   analytics): self-hostable options are PostHog, GrowthBook, or Flagsmith.
   Adding one is a dependency + infra decision — see principle 4 and ask
   before wiring.

Rules:
- A change is never on by default for everyone until its verdict bar is hit.
- Keep Variant A reachable (flag off = old behaviour, always).
- One metric per experiment; two metrics = two experiments.
- Record which cohort/flag saw what in the decision entry.

### 3. Test (product test automation, lean-first)

Run the product's verification ladder, cheapest first. Stop when the change
is proven at its level.

1. **Type gate** (always):
   ```powershell
   cd "C:\Users\rushi\OneDrive\Desktop\yentellect\frontend"
   & .\node_modules\.bin\tsc.cmd --noEmit --incremental false
   ```
2. **Production build gate** (always before shipping UI):
   ```powershell
   Remove-Item -Recurse -Force .next   # OneDrive EINVAL readlink flakiness
   $env:NODE_OPTIONS='--max-old-space-size=8192'
   & .\node_modules\.bin\next.cmd build
   ```
   Watch for: failed routes, `Failed to compile`, missing modules, and that
   `frontend/tsconfig.tsbuildinfo` is NOT left modified afterwards.
3. **Lens eval** (only when lens/prompt code changed): see principle 2.
4. **Behavioral regression** — the honest, dependency-free checks:
   - grep audits for removed strings / banned terms (`rg -n "pattern" app components lib`).
   - contract audits (zod schemas are the API contract in
     `frontend/lib/lens/schema.ts` — TS types are inferred from them, never
     hand-written).
   - live probe of deployed routes (`/api/lens` returns 400/401 without a
     session — proving the route is gated before any LLM cost).
5. **E2E / UI automation** (only when the change is UI-heavy AND you want
   durable protection): add **Playwright** as a dev dependency after
   checking npm health. Standard layout is a `frontend/e2e/` spec per
   critical path (import a paper → ask a lens → keep a connection), run
   against the local dev server. Directory this decision in the note.
   Alternative without new deps: an `agentic smoke spec` written as a
   checklist the next session executes (documented steps, one command each).

After every verification run: confirm `git status --porcelain` shows only
intended paths (root `.gitignore` has bare `package.json`; stray `eval-*.txt`
and `*.tsbuildinfo` must not be committed).

### 4. Measure & decide (close the loop)

- Compare the metric against the verdict bar from the note.
- **Keep** → merge behind the default-on flag (or delete the flag if the old
  variant is fully replaced), record the decision, refresh CONTEXT.md.
- **Roll back** → flip the flag off; ship; record why.
- **Iterate** → capture the specific failure (quote the rubric/gauge), refine,
  and re-enter the loop at Step 1.
- Never leave a "running" experiment undocumented at end of session. A
  half-finished experiment with no note is a bug, not a feature.

### 5. Ship

- Commit by pathspec only (`git add -- <paths>`), never `git add -A`.
- Keep `frontend/tsconfig.tsbuildinfo` and scratch files out of commits.
- Push to `origin/main` and verify with `git ls-remote origin main` == local
  HEAD (standing decision 7).
- If the change needs backend env/config (e.g. LLM keys): Vercel project env
  vars (`GROQ_API_KEY`, `LENS_PROVIDER`, `LENS_MODEL`) must be set and a
  redeploy triggered — env-only changes do not apply to existing builds.

## Yentellect-specific test targets

| Surface | Gate | Notes |
|---|---|---|
| Workbench shell (tabs, splitters, palette) | tsc + build + manual | geometry 36/48/240/flex/360/200/24; splitters persist via `yentellect.layout.v1` |
| Paper import (arXiv/DOI → doc pane) | tsc + build + live probe | route self-gates 401; arXiv server-side (no CORS), Crossref browser-direct |
| Lens thread + connections | tsc + eval harness >= 6/8 | provider layer via `LensProvider.complete()` only; no second transport |
| Knowledge graph / profile / session routes | tsc + build + grep audit | metric displays removed (Phase D); never resurrect |

## Anti-patterns

- Skipping the note and shipping a flag with no verdict bar.
- tsc via bare `tsc` (dirty tsbuildinfo) or `npm run lint` (interactive hang).
- A/B'ing prompts by eyeballing two chats instead of the graded eval.
- Adding Playwright/dexie/etc. without npm health + dependency-cost check.
- Committing with `git add -A` (root `.gitignore` has bare `package.json`).
- Leaving the deployed app's env vars out of sync (Vercel needs its own
  `GROQ_API_KEY` / `LENS_PROVIDER` / `LENS_MODEL` even if local works).