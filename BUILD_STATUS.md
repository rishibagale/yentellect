# BUILD_STATUS — as-built vs as-planned

> Snapshot of the two work plans as of the working tree after commit `4f5f948` (2026-10-06; Stage 2 library + Stage 3 editor/tabs uncommitted in working tree),
> updated by the PASS LOG below (verify cells against the current tree).
> Read straight from the specs: **Prompt #1** = workbench master, **Prompt #2** = lens spec.
> Verdict: **Prompt #2 is built and passing; Prompt #1 partially built — Stage 1 (shell, palette, prompts, tokens) is exact; minimal Stage 4 import + Phase C chat shipped; Stage 2 data model and Stage 3 editor/tabs/inline rename/middle-click close now shipped; only the floating selection toolbar remains of Stage 3; Stage 6 outstanding.**

---

## PASS LOG — 10/2026 (working tree: Stage 2 library + Stage 3 editor/tabs, uncommitted)

What shipped this pass. Verification: project `tsc --noEmit` clean, `npm run lint` clean ("✔ No ESLint warnings or errors"),
`next build` compiled successfully with all 14 routes, tab-rule unit check 16/16 pass (scratch script, deleted after). Stage 3 now includes double-click inline rename (Enter/Escape/blur, `maxLength={120}`, title synced to Dexie) and middle-click close on tabs.

- **Stage 3 editor** — `frontend/components/workbench/DocEditorPane.tsx`: CodeMirror 6 (markdown,
  history, line-wrapping, placeholder) + KaTeX preview mode. New deps: `@codemirror/state`,
  `@codemirror/view`, `@codemirror/commands`, `@codemirror/lang-markdown`, `katex`, `dexie`.
  The old read-only paper pane (title/byline/abstract in `EditorArea`) is gone; the paper is now an
  editable note, and its abstract seeds the body on first import.
- **Autosave that actually saves** — two real bugs in the pre-existing pane, both fixed:
  the CodeMirror update listener never set the dirty flag, so typing after the first save was
  **never persisted**; and the debounce effect returned early on `savedAt !== null`, which
  compounded it. Now: dirty is set on every change, the debounce only fires when dirty, and an
  unmount flush writes the last keystrokes when the user switches tabs (a React ref would lag a
  render and could rewrite an older body over a newer one — the flush reads the synchronous
  pending-body registry instead).
- **Stage 2 library (Dexie)** — `frontend/lib/workbench/db.ts`: `yentellect.library.v1`,
  `docs: "id, kind, updatedAt"`, `WorkDoc { id, kind: paper|concept|note, title, body, timestamps, paper metadata }`.
  `liveDocs()` (liveQuery) feeds the Explorer list. Re-importing a paper refreshes its metadata
  and **keeps** the body the user wrote (`upsertImportedDoc`).
- **Tab strip (Stage 3)** — `frontend/lib/workbench/tabs.ts` + `EditorArea` tab row + `Shell` wiring.
  Tabs hold ids and labels only; bodies live in Dexie, so a tab can never hold a stale copy of a note.
  Open/select/close rules are pure functions (16/16 assertions pass): closing the active tab moves
  to the right neighbour, or the left one when the rightmost was closed; closing the last tab leaves
  no active document. Persisted in `localStorage` `yentellect.tabs.v1`.
- **Pending-body registry** (`db.ts`) — the newest body per doc, written synchronously on every
  keystroke. It is the source of truth for "what the user sees", so a tab switch can never show (and
  then re-save) an older body as the newest one. Cleared only when the doc is deleted.
- **Explorer is real** — the Activity → Explorer pane now lists the live Dexie library, the active
  document is marked, and clicking a doc opens it in a tab. The old "file tree lands Stage 2"
  placeholder is gone. Still a flat list: no tree or context menu/icons yet (item 13).
- **Legacy pinned-paper migration** — the pre-Stage-3 build kept one paper in `localStorage`
  `yentellect.doc.v1`. It is now read exactly once, folded into the library as a tab, and the key is
  deleted. There is deliberately **no writer** for that key any more.
- **"New concept" / "New note" now work** — the palette commands create a blank doc in the library
  and open it in a tab (they were disabled-with-reason in the committed tree).
- **Not in this pass** (still outstanding): the floating Analogical/Systems selection toolbar over
  the editor, the Explorer tree, and Stage 6 (connections drawer, 2D graph tab, kept→edges).

---

## PASS LOG — 10/2026 (working tree after `4f5f948`)

What shipped this pass. Verification: project `tsc` clean, `next build` EXIT=0 with all 14 routes,
copy audit clean, **zero new deps** (package.json untouched).

- **Lens config honesty** — an unconfigured provider is never rendered as a fake answer.
  `/api/lens` returns `500 "Lens provider is not configured."` on config errors; the workbench
  client detects `X-Lens-Provider: mock` and throws `LensCallError("Lens output isn't configured on this server yet.", 500)`.
  Both `frontend/app/api/lens/route.ts` and `frontend/lib/workbench/lens-client.ts` scrub
  key/secret/token/LENS_ substrings before returning; `lib/lens/providers/mock.ts` message is professional.
  ⚠️ **Outstanding user action:** on Vercel, set `GROQ_API_KEY` + `LENS_PROVIDER=groq`
  (+ `LENS_MODEL=openai/gpt-oss-120b`) in the project env vars, or every lens call surfaces this honest error.
- **Minimal paper import** (Stage 4 lite, no PDF, zero new deps) — new `POST /api/import/arxiv`
  (server-side: arXiv has no CORS; 401 self-gate, 400 bad id, 502 upstream) + `frontend/lib/workbench/import-client.ts`
  (`classifyInput`/`importPaper`: arXiv URL/bare-id and DOI; DOI goes browser-direct to Crossref, CORS `*`).
  Palette "Import paper" opens an inline form in `EditorArea`; success pins the doc in shell state and
  persists `localStorage` `yentellect.doc.v1`; the doc renders as a read-only pane (`.font-doc`) with a
  select-text → "Ask lens about selection" button. Not full Stage 4 (no tabs/note-taking).
- **Copy sweep** — developer "Stage N / lands in" jargon removed from all user-visible strings
  (`ExplorerPanel`, `ConnectionsDrawer`, `SidePanelView`, `SettingsForm`); stage-gated palette entries
  now say "Creating notes is coming soon".
- **Phase D remove-list sweep** — `ProgressChart.tsx` deleted (zero refs); training metrics/wording gone
  from session/profile/auth UI ("Modes activated", "Overall score", "Weakest mode (target)",
  "Training focus", "Signal clarity", 🧠, "Training history", "Your cognitive profile", "neural map",
  "Start training your thinking", "Sign in to continue training"). Routes `/session /profile /history /settings`
  stay (standing decision); `lib/modes.ts` untouched.

---

## INDEX A — Prompt #1 (workbench master) requirement-by-requirement

### Layout & shell
| # | Requirement | Status |
|---|---|---|
| 1 | Full viewport, no page scroll, region table (36/48/240/flex/360/200/24) | ✅ `Shell.tsx`, exact |
| 2 | Splitters pointer-draggable, persist sizes/state | ✅ `Splitter.tsx` + `storage.ts` (clamped read+write) |
| 3 | Min width 1024 → plain notice | ✅ `MinWidthNotice.tsx` |
| 4 | Command palette Cmd+K fuzzy, 10 commands | ✅ all 13 exist; Import paper live, New concept/New note now live (create a doc + open a tab) |
| 5 | Keyboard: K/B/J/Shift+L/1/2 | ✅ `shell-keys.ts` |
| 6 | First-run prompt exact string | ✅ `EditorArea.tsx` |

### Modes
| # | Requirement | Status |
|---|---|---|
| 7 | Only Analogical + Systems visible, default | ✅ `visibleLenses()` |
| 8 | Four others stay in codebase, hidden | ✅ `lib/modes.ts` preserved |
| 9 | Settings "Beta modes" toggle, default off, Beta badge | ✅ (added in Phase A — was missing initially) |

### Data & persistence
| # | Requirement | Status |
|---|---|---|
| 10 | `Doc` / `Connection` types exactly as specified | ⚠️ `WorkDoc` shipped (id/kind/title/body/timestamps + paper metadata) — not the spec's literal `Doc` shape; `Connection` is the lens schema's, persisted only in-thread (kept→edges is Stage 6) |
| 11 | IndexedDB via Dexie (say so if replacing persistence) | ✅ Dexie `yentellect.library.v1` (`db.ts`); docs + bodies live there |
| 12 | Reuse existing persistence "where it fits" | ✅ Dexie for documents, `localStorage` for layout/prefs/open tabs (geometry still `localStorage`) |

### Components (spec, item by item)
| # | Requirement | Status |
|---|---|---|
| 13 | Explorer: tree, context menu, icons | ⚠️ real list over the live Dexie library (active doc marked, click opens a tab) — **not** a tree; no context menu or icons |
| 14 | Editor: CodeMirror 6, KaTeX `$…$`/`$$…$$`, tabs dirty/middle-click/rename, floating Analogical/Systems selection toolbar | ⚠️ CodeMirror 6 ✅, KaTeX preview ✅, tab strip ✅, dirty/saved indicator ✅, middle-click-to-close ✅, double-click inline rename ✅ (Enter/Escape/blur, `maxLength={120}`, Dexie title sync); floating selection toolbar ❌ (footer "Send note to lens" instead) |
| 15 | Import: Cmd+K, arXiv URL or DOI, Crossref fetch, no PDF v1 | ✅ minimal v1 shipped 10/2026: arXiv via server route, DOI via Crossref, no PDF — NOT full Stage 4 (no tabs/notes) |
| 16 | Lens panel: segmented control / collapsed selection card / thread / connection cards with Keep–Discard–Ask-why / composer / **calls POST /api/lens** | ✅ Phase C (10/2026): switcher + selection card + thread + cards + composer, wired to `/api/lens`; "New thread" clears; error strip for 500/502 |
| 17 | Connections drawer: table, jump-to-range, keep/discard, kept→edges | ❌ 23-line placeholder |
| 18 | Graph tab as editor tab, react-force-graph-**2d**, dashed/solid edges, human titles, empty state | ❌ `open-graph` → `/profile` (3D legacy); **`react-force-graph-2d` not installed** (only 3d) |
| 19 | Data model + persistence (overlaps 10) | ⚠️ docs ✅ (Dexie + tab list); connections/edges ❌ (Stage 6) |

### Remove list (explicit "Remove")
| # | Requirement | Status |
|---|---|---|
| 20 | Delete dashboard/session/training/assessment screens | ⚠️ **dashboard deleted ✅**; session/training screens kept under the later *reform-not-delete* decision; cognitive wording removed ✅ (Phase D sweep) |
| 21 | Mode scores / metrics displays removed | ✅ `ProgressChart` DELETED (Phase D); lifecycle/training metric framing gone from session/profile/auth UI |
| 22 | Session IDs as labels anywhere | ✅ zero occurrences found |
| 23 | Weakest-mode logic not surfaced | ⚠️ backend still computes it; UI no longer surfaces it directly |

### Design tokens / typography / motion
| # | Requirement | Status |
|---|---|---|
| 24 | CSS-block tokens verbatim | ✅ byte-identical `:root` |
| 25 | JetBrains Mono 12–13 chrome; Source Serif 4/Inter 15–16 body | ✅ fonts loaded in `layout.tsx`; doc pane uses `.font-doc` (Source Serif 4, 15px, 1.6, 72ch) |
| 26 | One accent; lenses by icon/label not colour; edges dashed/solid | ✅ one `--accent`; edge dash rule awaits Stage 6 |
| 27 | 1px borders, no gradients/glows/shadows except palette | ✅ |
| 28 | Motion 120–160ms ease-out, reduced-motion honoured | ✅ globals reduced-motion block; thread motion ships (120ms easeOut, honoured under reduced motion) |

### Work order & acceptance criteria
| # | Requirement | Status |
|---|---|---|
| 29 | Stage 1 shell | ✅ |
| 30 | Stage 2 data model/Explorer/new concept-note | ⚠️ data model + Dexie ✅, New concept/New note ✅ (create + open a tab); Explorer **tree** ❌ (flat live list) |
| 31 | Stage 3 editor/KaTeX/tabs/toolbar | ⚠️ editor ✅, KaTeX ✅, tabs ✅, dirty indicator ✅, middle-click close ✅, inline rename ✅ (double-click, Enter/Escape/blur, `maxLength={120}`, Dexie sync); floating selection toolbar ❌ |
| 32 | Stage 4 import | ✅ minimal v1 (no PDF/tabs); full Stage 4 follows the editor |
| 33 | Stage 5 lens panel wired + cards | ✅ Phase C: composer, thread, connection cards, `New thread`, error strip — `/api/lens` reachable end-to-end |
| 34 | Stage 6 drawer/graph/shortcuts/empty states | ❌ (shortcuts ✅ part of Stage 1) |
| 35 | No zero-metric/ID screens | ✅ metric displays removed (Phase D) |
| 36 | Fresh workspace → lens result in 5 actions | ⚠️ reachable end-to-end (import → tab → write → Send note to lens → thread); exact 5-action count not re-audited |
| 37 | Panels toggle by keyboard, remember state | ✅ |
| 38 | Beta off → only 2 lenses visible | ✅ |
| 39 | Kept → drawer + edges; discarded → not | ❌ Stage 6 |
| 40 | Lighthouse a11y 90+ / focus rings | ⚠️ `:focus-visible` + aria in shell; Lighthouse never run |
| 41 | Out of scope respected (terminal, PDF, mobile…) | ✅ |

**Prompt #1 scorecard: ✅ 27 · ⚠️ 10 · ❌ 4**

---

## INDEX B — Prompt #2 (lens spec) requirement-by-requirement

| # | Requirement | Status |
|---|---|---|
| 1 | `POST /api/lens`, logic in `lib/lens/` | ✅ |
| 2 | Single swappable `complete()` interface | ✅ `LensProvider.complete` — one transport, 7 presets |
| 3 | Eval harness **built and run before UI depends on it** | ✅ run twice before UI; UI now wired (ordering honored) |
| 4 | API contract exact (`LensRequest/Response/Connection`, AnalogyDetail, SystemDetail) | ✅ zod = contract, discriminated union, `mapping.min(3)`, `nodes.max(10)` |
| 5 | Structured output (JSON mode/tool) + zod | ✅ `json_object` when preset allows + zod |
| 6 | Retry once on validation failure → `{message, connections:[]}` | ✅ exactly one retry (on next key), then fallback |
| 7 | Stream `message` if supported, else loading state | ⚠️ deliberate: loading state (spec's allowed alternative) |
| 8 | Shared rules 1–8, one block both lenses | ✅ appended once, can't drift |
| 9 | Analogical system prompt verbatim | ✅ character-identical (`prompts-base.ts`) |
| 10 | Systems system prompt verbatim | ✅ + one sanctioned "Diagram discipline" paragraph (needed, verified) |
| 11 | Follow-up rules (evaluate, don't agree, "just tell me", `connections:[]`) | ✅ `FOLLOWUP_RULES` |
| 12 | Output-format example (format only) | ✅ `JSON_SHAPE_EXAMPLE` (word "json" + full shape — DeepSeek requirement) |
| 13 | 8 shared rules (structure>surface, checkable, empty allowed, calibrated, no invented sources, Socratic, userField, terse) | ✅ verbatim in `SHARED_RULES` |
| 14 | Eval: 5–10 items, both lenses, `report.md`, grade 0–2×4, ≥6/8 | ✅ 6 items, 12 runs, grades in report |
| 15 | Bar: ≥half items with a passing connection | ✅ **6/6**, 24/24 connections after hardening (was 24/28) |
| 16 | "Wouldn't have found alone" on ≥3 items | ⏳ **user's call** (4 candidates listed) |
| 17 | Items = *real papers the user cares about* | ❌ still seed set — user owes real passages |
| 18 | If bar fails → change prompts, rerun, no polished UI | ✅ did exactly that; UI built only after the >=6/8 bar (user-item verdict #16 still outstanding, eval-before-UI honored) |

**Prompt #2 scorecard: ✅ 15 · ⚠️ 1 · ⏳ 1 · ❌ 1 (user's items)**

---

## INDEX C — Tab/pane index (what each tab shows today)

| Tab / pane | Opens | State |
|---|---|---|
| Activity → **Explorer** | `ExplorerPanel` | ✅ **live** — the live Dexie library; active doc marked, click opens a tab. Flat list: no tree / context menu / icons yet |
| Activity → **Graph** | `SidePanelView` graph slot | honest placeholder + "Open knowledge graph" → `/profile` |
| Activity → **Search** | search slot | placeholder ("Stage 2") |
| Activity → **Settings** | `SettingsForm` | ✅ **live** — Profile, Research (userField), Lenses (beta toggle) |
| **Lens panel** tabs | Analogical \| Systems (+4 beta when on) | ✅ Phase C: switcher + thread + connection cards (Keep/Discard/Ask-why) + composer; "New thread" clears |
| **Drawer** | Connections | placeholder ("Stage 6") |
| **Editor tabs** | `EditorArea` tab row | ✅ **live** — open documents as tabs (ids + labels only; bodies in Dexie); close button, active marker, persisted across reloads |
| **Cmd+K palette** | 13 commands | ✅ live; New concept/New note now live (create a doc + open a tab) |
| Status bar | lens/words/kept/save | ✅ static zeros (honest, per C8) |
| Routes `/session /history /settings /profile` | legacy screens | ✅ live, re-skinned, scrollable |

**Interactive today beyond chrome: Settings, the Lens panel chat, the Editor (import → editable note → tabs), and the Library list.** Search and the Drawer remain shell awaiting their stage.

---

## Bottom line
- **Lens spec (Prompt #2): built, graded, passing, UI wired — only real papers and the 3-item verdict remain.**
- **Workbench spec (Prompt #1): shell + palette + keyboard + tokens + first-run exact; the core research loop is now reachable
  (import → editable note in a tab → send to lens → thread), with the document library and tab strip live (tabs support middle-click close and double-click inline rename).**
  Critical path: **Stage 3 toolbar (floating selection toolbar) → 6** (connections drawer, 2D graph tab, kept→edges);
  the Explorer **tree** (item 13) is the other open piece of Stage 2.
