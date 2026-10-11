# Yentellect -- Project Context

> Single source of truth for the Yentellect platform and how to run every part of it.
> Generated on **7/18/2026**. Last full refresh: **9/30/2026** (commits through `6fed645`).
> Doc cleanup **9/30/2026**: removed stale `puter_test/` / `go_watcher/` / `rebuild` Go-source references (those directories no longer exist); corrected port guidance.
> Full refresh **10/6/2026** (commits through `ae28fb2`): the app is now a research workbench, not a training app. Sections 1, 2, 3, 4, 5, 8, 10, 11, 12 rewritten or extended; new Sections 13 (lens system), 14 (eval harness + verdict), 15 (session commit history), 16 (standing user decisions). Sections 6, 7, 9 (backend API, VSA, Supabase) verified still accurate and kept.
> Extended **10/2026** (working tree after `8f761f1`): lens config honesty (no mock-as-answer), minimal paper import (Stage 4 lite), copy sweep, Phase D remove-list sweep. Sections 2, 5, 8, 11, 13, 16 updated to match.
> Extended **10/2026** (commits through `610ae44`): P2 fallback-honesty UI (real-provider fallback surfaces as "Couldn't structure a response — retry?"), P1 eval rerun 12/12 passes on live Groq. Sections 11, 13, 15 updated.

---

## 1. What is Yentellect?

**Yentellect** is a research workbench for PhD students, research scientists, and STEM people. It helps a researcher understand new concepts and fit them into their own research. It is NOT a training app: mode-weakness detection, cognitive scores, streaks, assessments, onboarding quizzes, dashboards, and zero-value metrics are removed from the UI by spec (prompt #1 "Remove" list; enforcement sweep = Phase D, DONE -- see Section 11).

Core loop:
1. Import a paper (arXiv URL or DOI, Stage 4) or write a concept/note (Stage 2).
2. Select text and apply a lens (Analogical or Systems).
3. Work through a Socratic thread in the side lens panel (no-doc chat works too: a typed 3am thought IS the selection).
4. Keep the useful connections. They become edges in the user's knowledge graph (Stage 6).

> *"Most AI makes you more informed. Yentellect makes you think better."*

### Lenses, not training modes

Only two lenses are active: **Analogical** and **Systems**.

The other four modes (Convergent, Divergent, Metacognitive, DMN) stay in the codebase but are hidden. Their data is preserved in `frontend/lib/modes.ts`, which MUST NOT be deleted. Nothing in `frontend/components/workbench/` may import it except the lens switcher and the Settings toggle (enforced by convention, not by lint). A Settings toggle "Beta modes", default off, shows them in the lens switcher with a "Beta" badge. Persisted in localStorage (`yentellect.betaModes.v1`); the shell state (`shell-state.ts`) is the source of truth inside the workbench, `SettingsForm` falls back to localStorage on the `/settings` route.

| Mode | Lens role | Neural basis (legacy reference) |
|------|-----------|---------------------------------|
| **Convergent** | Beta only | Dorsolateral Prefrontal Cortex (DLPFC) |
| **Divergent** | Beta only | DMN-DLPFC coupling |
| **Analogical** | ACTIVE lens | Frontopolar cortex (Brodmann 10) |
| **Metacognitive** | Beta only | Anterior Prefrontal Cortex |
| **Systems** | ACTIVE lens | Inferior parietal + DLPFC |
| **DMN** | Beta only | Posterior Cingulate + Medial PFC |

---

## 2. Repository Map

```
yentellect/
├── CONTEXT.md                          # ← this file (full refresh 10/6/2026 through `ae28fb2`; extended 10/2026 through `610ae44`, see blockquote)
├── README.md                           # project readme (repo: github.com/rishibagale/yentellect)
├── LICENSE                             # MIT
├── .env.example                        # backend env template
│
├── frontend/                           # Next.js 14 UI (TypeScript) -- RESEARCH WORKBENCH
│   ├── app/
│   │   ├── layout.tsx                  # root layout (body scrolls normally; shell self-clips)
│   │   ├── globals.css                 # workbench tokens (CSS vars, dark default) + scrollbar/focus styles
│   │   ├── page.tsx                    # `/`: the AUTHE'd workbench (dynamic, ssr:false). NO marketing landing.
│   │   ├── api/lens/route.ts           # POST /api/lens (401 gate, 400 validation, 502/500 transport, 500 on unconfigured provider)
│   │   ├── api/import/arxiv/route.ts   # POST /api/import/arxiv (Stage 4 lite: arXiv Atom proxy, 401 self-gate, 400 bad id, 502 upstream)
│   │   ├── session/page.tsx            # Socratic chat flow (reform host; wording sweep done, Phase D)
│   │   ├── profile/page.tsx            # knowledge graph (metric displays removed, Phase D)
│   │   ├── history/page.tsx            # thin host over SessionHistoryList
│   │   ├── settings/page.tsx           # thin host over SettingsForm
│   │   └── auth/                       # login, signup, reset-password, callback
│   ├── components/
│   │   ├── workbench/                  # Stage 1 shell
│   │   │   ├── Shell.tsx               # grid root 36/48/240/flex/360/200/24, state+keys
│   │   │   ├── TitleBar.tsx            # 36px: workspace name left, Cmd+K hint right
│   │   │   ├── ActivityBar.tsx         # 48px icons: Explorer, Graph, Search, Settings
│   │   │   ├── SidePanelView.tsx       # activity router (settings live, rest placeholders)
│   │   │   ├── ExplorerPanel.tsx       # PLACEHOLDER (file tree = Stage 2)
│   │   │   ├── EditorArea.tsx          # import form + read-only doc pane + select→Ask-lens (tabs/editor = Stage 3)
│   │   │   ├── LensPanel.tsx           # Phase C (live): switcher + thread + connection cards + composer
│   │   │   ├── ConnectionsDrawer.tsx   # PLACEHOLDER (table = Stage 6)
│   │   │   ├── StatusBar.tsx           # 24px: lens, words, kept, save state
│   │   │   ├── CommandPalette.tsx      # Cmd+K fuzzy palette, stage-gated commands
│   │   │   ├── Splitter.tsx            # draggable, persisted sizes
│   │   │   ├── MinWidthNotice.tsx      # plain notice below 1024px
│   │   │   ├── shell-state.ts          # lens+beta+narrow+doc/import state, CommandContext
│   │   │   └── shell-keys.ts           # Cmd+K/B/J/Shift+L/1/2
│   │   ├── Header.tsx                  # legacy top nav (reformed routes)
│   │   ├── AppShell.tsx                # legacy route shell (zero /dashboard refs)
│   │   ├── SettingsForm.tsx            # shared settings (profile + Research + Lenses)
│   │   ├── SessionHistoryList.tsx      # shared history (page + future panel variant)
│   │   ├── LoadingState.tsx / ErrorState.tsx / SessionCard.tsx / SessionChat.tsx
│   │   ├── ModeIndicator.tsx / ModeBadge.tsx / NodeDetailPanel.tsx
│   │   ├── KnowledgeGraph.tsx          # react-force-graph-3D (legacy profile graph)
│   │   ├── DomainExplorer.tsx          # 3D graph with domain filter bar
│   │   ├── ProgressChart.tsx           # DELETED 10/2026 (Phase D sweep); was a metric display
│   │   └── AuthGuard.tsx               # NO `/` exemption: unsigned users never see the workbench
│   ├── lib/
│   │   ├── workbench/                  # layout.tsx (LayoutProvider), storage.ts (layout+prefs+doc keys), commands.ts (registry), import-client.ts (arXiv/DOI import)
│   │   ├── lens/                       # 12 files (see Section 13): schema, prompts, provider+4 providers, run, errors, index
│   │   ├── modes.ts                    # hidden beta modes live here. DO NOT DELETE.
│   │   ├── api.ts                      # typed API client (SessionDetailResponse expects full turn fields)
│   │   ├── tokens.ts                   # HEX tokens for WebGL (three.js cannot read CSS vars)
│   │   ├── auth-types.ts
│   │   └── combination/                # VSA vector math
│   │       ├── vsa.ts
│   │       └── modeVectors.ts
│   ├── utils/supabase/                 # Supabase client, server, middleware, provider
│   ├── scripts/eval-lenses.ts          # eval runner (--only/--lens/--out/--delay-ms/--resume-from)
│   ├── scripts/eval-lenses-lib.ts      # eval types, items loading, report rendering
│   ├── eval/items.json                 # SEED set (REPLACE with the user's real papers)
│   ├── eval/report.md                  # graded master report (use --out for reruns, never clobber)
│   ├── eval/report-systems-rerun.md    # prompt-hardening evidence
│   ├── .env.example                    # server-only LENS_* template (keys NEVER committed)
│   └── package.json                    # next, react, openai, zod, tsx(dev). NO codemirror/katex/dexie yet
│
├── backend/                            # FastAPI service (Python)
│   ├── pyproject.toml                  # uv-managed
│   ├── api/
│   │   ├── main.py                     # FastAPI app + CORS
│   │   ├── security.py                 # auth, rate limiting, sanitization, CSP
│   │   └── routes/
│   │       ├── sessions.py             # /sessions/start, /turn, /end, /metrics, /{id} (detail enriches predicted_mode/started_at)
│   │       ├── profile.py              # /profile/{id}, /metrics
│   │       ├── graph.py                # /graph/{id}, /nearest/{session_id}
│   │       └── dashboard.py            # /dashboard/{id}, /history, /fingerprint
│   ├── core/
│   │   ├── models.py                   # Pydantic: ThinkingMode, SignalVector, …
│   │   ├── signals.py                  # spaCy + heuristic signal extraction
│   │   ├── classifier.py               # mode prediction
│   │   ├── graph.py                    # NetworkX knowledge graph + decay
│   │   ├── session.py                  # LangGraph state machine (metrics saved only if turn_count >= 2)
│   │   ├── vsa.py                      # VSA vector computation (Python mirror)
│   │   └── prompts.py                  # per-mode system prompts
│   ├── db/
│   │   ├── database.py                 # SQLite (singleton) + _migrate() (vector, started_at, fusion cols)
│   │   ├── database_supabase.py        # Supabase PostgreSQL client (full turn fields)
│   │   ├── schema.sql                  # SQLite DDL (sessions.started_at added 9/30/2026)
│   │   ├── schema_supabase.sql         # Supabase DDL
│   │   ├── rls_policies.sql            # Row-level security policies
│   │   └── migrations/
│   │       └── 002_add_session_vector.sql
│   └── Makefile
│
├── rebuild/                            # Retired. Go file-watcher CLI (fsnotify).
│   └── bin/rebuild.exe                 # 4 MB Windows binary (kept); Go sources
│                                       # (main.go, go.mod, internal/debouncer|runner|watcher)
│                                       # are no longer in the repo and cannot be rebuilt.
│                                       # Do not reference rebuild Go sources in new work.
```

---

## 3. How Everything Connects

```
┌───────────────────────────┐         ┌───────────────────────────┐
│     Frontend (Next.js)    │  HTTP   │      Backend (FastAPI)    │
│   localhost:3000          │ ──────► │   localhost:8000          │
│   (Yentellect UI)         │         │   (session logic, LLM)    │
└───────────────────────────┘         └───────────────────────────┘
```

- **Frontend <-> Backend (Python)**: REST + JSON. CORS allows `http://localhost:3000`.
  The port-8000 backend is the only local server now; there is no second
  local service competing for the port (the Node `puter_test` playground and
  its `rebuild.exe` watcher bridge were removed from the repo).
- **Browser -> POST /api/lens (NEW, Next.js route, NOT the Python backend)**:
  the browser calls the Next.js frontend's own `/api/lens`. The route checks a
  Supabase session itself (the app middleware deliberately excludes `/api/*`),
  then calls `runLens()` in-process. Real LLM calls go from the Next.js server
  to Groq (or another registry provider) using server-only keys. The Python
  backend is NOT involved in lenses. So there are TWO separate LLM paths with
  TWO separate keys: `GROQ_API_KEY` in Render (Python sessions) and
  `GROQ_API_KEY` in `frontend/.env.local` (lens route + eval). Same value is
  fine; they are read in different runtimes.

---

## 4. Run Instructions

### Prerequisites (already installed on this machine)

| Tool | Path | Version |
|------|------|---------|
| Node.js | `C:\Program Files\nodejs` | 22.x |
| Go | `C:\Program Files\Go\bin` | 1.26.4 (added to user PATH) |
| Python | (uv-managed) | 3.11+ via `uv` |

### A) Start the Frontend

```powershell
cd "c:\Users\rushi\OneDrive\Desktop\yentellect\frontend"
npm install        # first time only
npm run dev        # http://localhost:3000
```

### B) Start the Backend

```powershell
cd "c:\Users\rushi\OneDrive\Desktop\yentellect\backend"
uv sync --all-extras                              # first time only
python -m spacy download en_core_web_sm           # first time only
cp ../.env.example .env                           # first time only
uv run uvicorn backend.api.main:app --reload --port 8000
```

Port `8000` is free for the backend (the retired Node `puter_test` playground that used to occupy it is gone). Note: `frontend/.env.local` currently has no `NEXT_PUBLIC_API_URL`, so the frontend defaults to the production Render backend (`https://yentellect.onrender.com`); for local development add `NEXT_PUBLIC_API_URL=http://localhost:8000` to `frontend/.env.local`.

### Lens + eval environment (NEW 10/6/2026)

`frontend/.env.local` (gitignored, NEVER committed) currently holds:

```
NEXT_PUBLIC_SUPABASE_URL=https://ygapudtdgcslbqhibgjl.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_0a24AEe8x7IDz0VD0jWlAg_sZF0hgo2
GROQ_API_KEY=gsk_...   # live Groq key (Render backend has the same key as a dashboard env var)
LENS_PROVIDER=groq
```

Full server-only var reference lives in `frontend/.env.example`: `LENS_PROVIDER` (groq|openai|openrouter|gemini|deepseek|anthropic|custom|mock), `LENS_MODEL`, `LENS_BASE_URL` + `LENS_API_KEY` (custom only), `LENS_TEMPERATURE` (0.4), `LENS_MAX_TOKENS` (4000), `LENS_TIMEOUT_MS`, and the six provider key vars (comma-separated = rotation + failover). `tsx` is a devDependency but npm installs are flaky on this machine; a working tsx CLI is shimmed at `frontend/node_modules/.bin/tsx.cmd` pointing at `%TEMP%/tsx-bin` (see Section 14 gotchas).

### C) Run the lens eval

```powershell
cd "c:\Users\rushi\OneDrive\Desktop\yentellect\frontend"
$env:EVAL_DELAY_MS='15000'   # free-tier TPM pacing (Groq on_demand = 8000 TPM); required for full runs
.\node_modules\.bin\tsx.cmd scripts/eval-lenses.ts   # 6 items x 2 lenses -> eval/report.md
# flags: -- --only <title-substring> -- --lens analogical|systems|both -- --out <file> -- --delay-ms <ms> -- --resume-from <title>
```

---

## 5. UI Status (frontend) -- Last rewrite 10/6/2026 (workbench, commits through `ae28fb2`)

The Yentellect UI is now the **research workbench**. The old dashboard/training screens are gone as a product; four routes (session, history, settings, profile) were restored and re-skinned, NOT kept as training UI -- they are reform hosts that will dissolve into workbench panels stage by stage (standing user decision, Section 16). The workbench shell (Stage 1) is fully live. Phase C (lens chat box) and a minimal paper import (Stage 4 lite) shipped after `ae28fb2`: `EditorArea` hosts the import form + a read-only doc pane, and `LensPanel` hosts the thread/composer/connection cards. Explorer, Search and the Drawer remain honest placeholders; real editing (tabs, KaTeX) is Stage 3, the drawer table is Stage 6.

### Routes
| Route | Description |
|-------|-------------|
| `/` | THE WORKBENCH. Auth-required (middleware + AuthGuard). Dynamic import, SSR off. No marketing landing -- the old landing is deleted; its opening prompt lives as the editor first-run prompt. |
| `/session` | Socratic chat flow (legacy `SessionChat`). Reform host; Phase D wording sweep done. |
| `/profile` | Knowledge graph (3D, legacy) + history. Metric displays removed (Phase D done). |
| `/history` | Thin host: `AppShell` + `SessionHistoryList`. Same component the Stage 2 Explorer tree will render. |
| `/settings` | Thin host: `AppShell` + `SettingsForm` (Profile + Research[userField] + Lenses[beta toggle]). Shares persistence keys with the workbench (Section 13 storage paragraph). |
| `/api/lens` | POST only. NOT a page. 401 without Supabase session; 400 bad shape; 502/500 transport/config (never masked as lens output). Adds `X-Lens-Provider`/`X-Lens-Model` headers. On an unconfigured provider the route returns `500 "Lens provider is not configured."` and the client refuses to render a mock answer. |
| `/api/import/arxiv` | POST only. NOT a page. 401 without Supabase session; 400 bad arXiv id; 502 upstream. arXiv has no CORS, so the fetch is server-side only; returns `{xml}` for the client to parse. |
| `/auth/login`, `/auth/signup`, `/auth/reset-password`, `/auth/callback` | Supabase auth (unchanged). |
| `/dashboard` | DELETED. Zero references remain anywhere (verified by grep in `3c99dee`). Old dashboard metrics are retired by design correction C8. |

### Workbench shell (all live)
- Geometry: title 36 / activity 48 / explorer 240 / editor flex / lens 360 / drawer 200 default / status 24 (exact per spec; splitters drag + persist via `yentellect.layout.v1` with clamp-on-read-and-write).
- Keyboard: Cmd/Ctrl+K palette, B sidebar, J drawer, Shift+L lens panel, 1/2 lens switch. All from a single command registry (`lib/workbench/commands.ts`) that also feeds the palette; not-yet-built commands render disabled WITH a reason, never hidden.
- `Cmd+K` commands: Import paper (**live** — opens the editor's import form), New concept/note (Stage 2, disabled: "Creating notes is coming soon"), New session, Open history, Open settings, Run Analogical/Systems (switches lens tab), Open graph (-> /profile until Stage 6), Toggle beta, Toggle sidebar/lens/drawer.
- First run: exact string in `EditorArea`: "Import a paper or write a concept to begin." (opens palette on click).
- Import + doc view: palette "Import paper" opens an inline arXiv-URL/DOI form in `EditorArea`; on success the doc is pinned in shell state, persisted to localStorage `yentellect.doc.v1`, and rendered as a read-only paper pane (title/byline/source link/abstract, `.font-doc`, `max-w-[72ch]`). Selecting >= 20 chars in a doc shows an "Ask lens about selection" button that seeds the lens thread; `useLensThread` takes the optional `doc`, pins it at first send (`pinnedDocTitle`), and `LensPanel`'s "New thread" clears it. No-doc chat still works: the first typed thought IS the selection (`doc` "Untitled thought", kind "note").
- Minimum width 1024px (else `MinWidthNotice`).
- Design tokens = the spec's CSS block byte-for-byte, all CSS vars, one accent (`--accent: #5eb0ef`). Chrome: JetBrains Mono 12px. Doc body (later): Source Serif 4 / Inter 15-16px, 1.6, max 72ch.
- Scroll model (two fixes, `b415604` + `2b39a3f`): NO `overflow:hidden` on `body` anywhere (neither CSS nor Tailwind class). Document-flow routes scroll the document; the workbench self-clips at its own `h-screen overflow-hidden` root. All remaining `overflow-hidden` in the tree are inner panes (graph containers, chat, panels) -- legitimate.

### Key components (legacy/reformed)
- `SettingsForm` -- the ONE shared settings source (route + panel hosts). Owns userField + beta toggle persistence.
- `SessionHistoryList` -- the ONE shared history source (`variant="page"|"panel"`).
- `AppShell` -- legacy route shell: sidebar has "Workbench -> /" (NOT dashboard), logo -> `/`. No `/dashboard` strings.
- `KnowledgeGraph` / `DomainExplorer` -- three.js 3D graphs (legacy profile page). Hex colours stay hex here on purpose (WebGL cannot read CSS vars).
- `ProgressChart` -- DELETED 10/2026 (Phase D sweep). Do not resurrect.

---

## 6. Backend API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/sessions/start` | Start new session |
| POST | `/sessions/{id}/turn` | Process a turn |
| POST | `/sessions/{id}/end` | End session and get summary (metrics saved only if `turn_count >= 2`) |
| GET | `/sessions/{id}` | Fetch ended session details + full turns (enriches `predicted_mode`/`started_at`; turns carry `turn_id`, `turn_number`, `predicted_mode`, `confidence`, `created_at`) |
| GET | `/sessions/metrics` | Fetch all session metrics for user |
| GET | `/profile/{id}` | Get cognitive profile |
| GET | `/profile/{id}/metrics` | Get profile metrics |
| GET | `/graph/{id}` | Get knowledge graph data |
| GET | `/graph/nearest/{session_id}` | Get VSA-similar sessions |
| GET | `/dashboard/{id}` | Get dashboard data |
| GET | `/dashboard/history/{id}` | Get paginated session history |
| GET | `/dashboard/fingerprint/{id}` | Get cognitive fingerprint |

---

## 7. VSA Combination Mechanism

Added in this session (commits `e34c8aa` → `574790f`, extended through `8910925`):

### Frontend (`frontend/lib/combination/`)
- **`vsa.ts`** — VSA math: `bind()`, `bundle()`, `unbind()`, `cosineSimilarity()`, `computeSessionVector()`
- **`modeVectors.ts`** — 512-dimensional mode vectors for all 6 thinking modes

### Backend (`backend/core/vsa.py`)
- Python mirror of the VSA math: `compute_session_vector()`, `cosine_similarity()`
- Used in `end_session()` to persist a vector per session

### Database
- `backend/db/migrations/002_add_session_vector.sql` — Adds `vector` column (TEXT, JSON float array) to `sessions` table

### API
- `GET /api/graph/nearest/{session_id}?limit=3` — Returns top-K similar sessions by cosine similarity

### KnowledgeGraph
- Renders VSA similarity edges with console-logged scores for debugging; 3D rewrite uses bloom post-processing with constant even lighting

---

## 8. Security Hardening (+ lens route, 10/6/2026)

Added in commit `eb2d20f` (backend) and `d721257` (lens route):

- **`backend/api/security.py`** — JWT auth via Supabase, rate limiting (per-endpoint), input sanitization, CSRF protection, CSP headers, brute force protection
- **`backend/db/rls_policies.sql`** — Row-level security policies for Supabase
- **Auth middleware** — `frontend/middleware.ts` protects routes (uses local `getSession()`, not remote `getUser()`, per `40c58ed` to avoid 504 timeouts), `frontend/utils/supabase/` provides client/server/provider
- **AuthGuard** component redirects unauthenticated users. Since `3c99dee` the `/` exemption is REMOVED: the workbench is auth-only, so middleware + guard agree and a session miss can never paint the shell for a signed-out user.
- **`/api/lens` gates itself** (`frontend/app/api/lens/route.ts`): the app middleware deliberately excludes `/api/*`, so the route checks `supabase.auth.getUser()` and returns **401** without a session. An ungated LLM proxy would be an open abuse/cost vector. Error payloads are scrubbed for key/secret/token substrings before returning.
- **`/api/import/arxiv` gates itself** (`frontend/app/api/import/arxiv/route.ts`): same pattern — the middleware excludes `/api/*`, so the route checks `supabase.auth.getUser()` (401), zod-validates the arXiv id (400), and returns 502 on an unreachable upstream (never a stack/key/env string). arXiv has no CORS, so the fetch is server-side only; DOI imports go browser-direct to Crossref (CORS `*`).

---

## 9. Supabase Integration

- **Database**: Supabase PostgreSQL with `database_supabase.py` client (returns full turn fields: `turn_id`, `turn_number`, `predicted_mode`, `confidence`, `created_at` mapped from `timestamp`)
- **Auth**: Supabase Auth with email/password + OAuth callback
- **Deployment**: Frontend on Vercel, backend on Render
- **Schema**: `backend/db/schema_supabase.sql` + `rls_policies.sql`

---

## 10. UI Fixes (commits b6e3c10 → 6fed645)

| Issue | Fix |
|-------|-----|
| Dashboard "Start session" goes to `/` | Changed to `/session` |
| Mobile session UI cramped | Sidebar hidden behind collapsible `<details>` on mobile |
| Graph shows "Session a1b2c3d4" | Labels now show `"{mode}: {goal}"` from user's opening message |
| Progress chart empty with 10+ sessions | Added `/api/sessions/metrics` endpoint, lowered threshold to 1 session |
| History click does nothing | Session cards navigate to `/session?session_id=...`, page loads ended session read-only |
| Zero-score sessions saved immediately | `save_session_metrics()` guarded behind `turn_count >= 2` |
| Slow loading | `SessionSkeleton` renders immediately while API call is in-flight |
| KnowledgeGraph flat/dim | Full 3D rewrite (`7f88f96`): react-force-graph-3d, bloom, constant even lighting (`d207c39`) |
| Progress chart empty on Supabase | Handle JSONB native objects in chart parsing (`5b34091`) |
| 504 middleware timeouts | `middleware.ts` uses local `getSession()` instead of remote `getUser()` (`40c58ed`) |
| Ended session shows only first exchange | `SessionChat` gained `readOnly` + `initialTurns` props; `session/page.tsx` passes full turns (`f387012`) |
| Clicking completed session → client-side exception | `get_session_turns()` returned only `user_input`/`response`; both SQLite + Supabase now return all 7 turn fields (`f9c8666`) |
| Session detail missing `predicted_mode`/`started_at` | `GET /sessions/{id}` enriches session from first turn; `started_at` column added to SQLite schema + `_migrate()` (`6fed645`) |
| Header says "+ New", AppShell says "New session" | Header CTA unified to "New session" → `/session` |
| VSA edges fail silently | Similarity-edge creation now logs scores/warnings to console |

### Workbench + lens era (10/6/2026, commits `644db06` -> `ae28fb2`)

| Issue | Fix |
|-------|-----|
| History/profile pages don't scroll | TWO blockers removed: `body{overflow:hidden}` in `globals.css` (`b415604`) AND `h-screen overflow-hidden` on the `<body>` tag in `app/layout.tsx` (`2b39a3f`). First fix alone did nothing -- the Tailwind class kept clipping. Workbench unaffected (self-clips at `Shell.tsx:41`). |
| `llama-3.3-70b-versatile` 404 on Groq | Model retired. Live model list queried via `/openai/v1/models`; default moved to `openai/gpt-oss-120b` (`registry.ts`). `LENS_MODEL` always overrides; re-check before trusting any pinned name. |
| Eval dies at 8/12 calls: Groq 429 TPM | Free-tier `on_demand` = 8000 TPM. Harness gained `--delay-ms` pacing (`EVAL_DELAY_MS=15000` for full runs); key rotation (`keys.ts`) covers multi-key failover, not single-key pacing. |
| Targeted rerun overwrote master report | `writeReport` wrote `report.md` unconditionally. Harness gained `--out <file>` (bare names land in `eval/`); master report carries hand-grades, must never be casually rewritten. `--resume-from <title>` also wired. |
| Eval runner script corruption (line splices) | Two line-level `editor` inserts landed inside the `for` loop body and destroyed it; tsc caught 7+ errors. Recovered via `git checkout` + clean diffs. Lesson: for `scripts/`, prefer whole-block rewrites verified by `tsc`, not micro-inserts. |

---

## 11. Open Tasks / Known Limitations (rewritten 10/6/2026)

Carried over (still true):
- [ ] **Backend venv is an empty stub**: `backend/.venv` ships with no packages installed; run `uv sync --all-extras` + `python -m spacy download en_core_web_sm` before first launch
- [ ] **Missing local API URL**: `frontend/.env.local` has no `NEXT_PUBLIC_API_URL`, so a local frontend calls the production Render backend by default
- [ ] **CORS**: backend's `allow_origins` includes `http://localhost:3000` and `https://localhost:3000`. If you serve the frontend on a different port, update `backend/api/main.py`.
- [ ] **OneDrive `.next` build flakiness**: `EINVAL readlink` errors under `frontend/.next/` occur on OneDrive-synced paths; workaround is `Remove-Item -Recurse -Force .next` before `npm run build`

New (workbench + lens era):
- [x] **Phase C -- lens chat box DONE** (commit `8f761f1`, hardened this pass): composer, thread, connection cards (Keep/Discard/Ask-why), "New thread", error strip, no-doc mode (the first typed thought IS the selection), provider/model readout. `POST /api/lens` is reachable end-to-end; no approved-but-unbuilt panel remains.
- [x] **Phase D -- Remove-list sweep DONE** (this pass): `ProgressChart.tsx` deleted (zero refs; README clean too). Training metrics/wording gone from the UI ("Modes activated", "Overall score", "Weakest mode (target)", "Training focus", "Signal clarity", 🧠, "Training history", "Your cognitive profile", "neural map", "Start training your thinking", "Sign in to continue training"). Routes stay (standing decision); `lib/modes.ts` untouched.
- [x] **Minimal paper import DONE** (this pass, Stage 4 lite, no PDF, zero new deps): see Section 5. This is NOT full Stage 4 (no tabs/note-taking yet).
- [x] **Lens config honesty DONE** (this pass): an unconfigured server never renders a mock as a lens answer. See Section 13.
- [x] **Copy sweep DONE** (this pass): developer "Stage N / lands in" jargon removed from all user-visible strings; stage-gated entries now say "Creating notes is coming soon".
- [x] **P2 fallback-honesty UI DONE** (commit `610ae44`): real-provider fallback (invalid model output) now surfaces a degraded strip "Couldn't structure a response — retry?" with a Retry button, distinct from the red transport/config error strip. Threads `usedFallback` through `lens-client.ts` → `lens-thread.ts` → `LensPanel.tsx`.
- [x] **P1 eval rerun DONE** (commit `610ae44`): 12/12 passes on live Groq (`openai/gpt-oss-120b`), 0 fallbacks, 0 errors. Report at `eval/audit-rerun.md`.
- [ ] **Stages 2, 3, 6**: data model + Dexie + Explorer tree (2), CodeMirror + KaTeX + tabs + selection toolbar (3), drawer table + 2D graph tab (6). Deps needed: `dexie`, `@codemirror/*`, `katex`, `react-force-graph-2d` (currently only the 3D variant is installed).
- [ ] **Vercel env vars (or lenses are honestly down on prod)**: set `GROQ_API_KEY` + `LENS_PROVIDER=groq` (+ `LENS_MODEL=openai/gpt-oss-120b`) in the Vercel project env vars. Without them every `/api/lens` call returns `500 "Lens provider is not configured."` -- intended honesty, not a bug.
- [ ] **Eval seed data**: `eval/items.json` is a 6-item starter set of famous-paper paraphrases, NOT the user's papers. Bar transfers only if the user's own material grades as well. User owes real passages + the "wouldn't-have-found-alone" verdict on >= 3 items.
- [ ] **npm installs are unreliable on this machine**: `tsx`/`zod`/`openai` had to be hand-placed; `tsx` runs only via the `node_modules/.bin/tsx.cmd` shim (`%TEMP%/tsx-bin`). Verify install health at the start of Stage 2 before promising dates. Also `npm run <script> -- <flags>` misparses flags; invoke `.bin` shims directly.
- [ ] **Groq key was shared in chat**: rotate it in the Groq console when convenient, then update Render dashboard + `frontend/.env.local`. Repo-local git transport tunings were set during flaky pushes (`http.postBuffer`, `http.version=HTTP/1.1`, low-speed overrides) -- harmless, revert if unwanted.
- [ ] **`frontend/tsconfig.tsbuildinfo` is TRACKED and churns on every build**: deliberately left out of every commit. Consider untracking it (`git rm --cached`).

---

## 12. Pointers for the Next Agent (extended 10/6/2026)

- **Where to start testing**: backend on `http://localhost:8000` (`uv run uvicorn backend.api.main:app --reload --port 8000`), frontend on `http://localhost:3000` (`npm run dev`). Set `NEXT_PUBLIC_API_URL=http://localhost:8000` in `frontend/.env.local` for local runs.
- **Where to add a feature**: New workbench UI goes in `frontend/components/workbench/` (shell chrome) or `frontend/components/` (shared). Lens logic goes in `frontend/lib/lens/` and talks to the world ONLY through `LensProvider.complete()` -- never add a second transport. New Python API routes go in `backend/api/routes/`.
- **Eval-before-UI is a hard rule**: the lens spec forbids polished UI on a lens that fails the >=6/8 bar. Any prompt change -> rerun (`--out` a separate file) -> regrade -> then UI. `eval/report.md` is the graded master; treat it as append-only evidence.
- **The prompts are verbatim to spec** (`lib/lens/prompts-base.ts`): Analogical + Systems system prompts are character-identical to the lens spec. The ONLY sanctioned addition is the "Diagram discipline" paragraph in the Systems prompt (added `ae28fb2`, verified by rerun). Do not improvise prompt changes without a rerun.
- **Beta modes live in `frontend/lib/modes.ts` and MUST NOT be deleted.** Only the lens switcher and the Settings toggle may import it.
- **Don't add new dependencies lightly** -- and verify npm health first (Section 11). Stage 2-4 needs `dexie`, `@codemirror/*`, `katex`, `react-force-graph-2d`.
- **VSA vectors**: 512-dimensional float arrays stored as JSON in `sessions.vector`. The frontend and backend both have VSA math modules that must stay in sync.
- **Supabase**: Auth is fully wired. `/api/lens` uses `createClient` from `@/utils/supabase/server` + `auth.getUser()` (NOT middleware).
- **Session detail contract**: unchanged (Section 6 backend routes).
- **SQLite migrations**: unchanged (see `started_at` precedent).
- **Line-surgery on `scripts/` is dangerous**: the `editor` tool once spliced lines inside a loop body; always re-run `tsc` after script edits.

---

## 13. Lens System (NEW 10/6/2026, commits `d721257` + `ae28fb2`)

### Contract (`frontend/lib/lens/schema.ts`)
The zod schemas ARE the API contract -- TS types are inferred, never hand-written. `LensRequest{ lens, selection, doc{title,kind,abstract?}, userField, history[], userMessage? }`; `LensResponse{ message, connections[] }`. `LensConnection` is a discriminated union on `type`: `analogy` carries `AnalogyDetail` (mapping>=3 pairs, transfers, breaks, test), `system` carries `SystemDetail` (nodes<=10, edges with +/-/delay, loops, leverage, assumptions[], touchesUserModel). Responses clamp to 3 connections in `run.ts` (code, not just prompt).

### Semantics (`run.ts`)
Validate request (caller bug throws) -> build system prompt (lens + shared rules + JSON shape) -> exactly one `complete()` call per attempt -> zod-validate -> EXACTLY one validation retry (on next key when keys exist) -> else `InvalidModelOutputError` -> fallback `{ message: <plain>, connections: [] }`. Transport/auth/config errors propagate as 502/500, NEVER masked as lens output. Empty content (documented DeepSeek behaviour) and `finish_reason=length` truncation count as invalid, not empty. Code fences are stripped before parsing. Streaming: NOT implemented; the spec-allowed loading-state + full response is used. No-doc chat needs no schema change: the typed thought becomes `selection` with `doc{title:"Untitled thought",kind:"note"}`.

### Prompts (`prompts-base.ts` + `prompts.ts`)
Both system prompts verbatim to spec (`{userField}`/`{docTitle}` interpolated). ONE shared-rules block appended to both (8 rules: structure-over-surface, checkable, empty-allowed, calibrated, no-invented-sources, Socratic, userField, terse) + follow-up rules + "Diagram discipline" paragraph (systems only, `ae28fb2`). The output-shape example ALWAYS includes the literal word "json" + full field example: required by DeepSeek, helpful everywhere.

### Provider layer (`provider.ts` + `providers/`)
Single seam: `LensProvider.complete<T>({ system, messages, schema, jsonShapeExample, model?, temperature?, maxTokens?, timeoutMs? })`. ONE transport (`openai-compat.ts`: raw `openai` SDK + baseURL + `response_format:json_object` only when the preset allows). Registry presets (URLs verified against vendor docs 10/2026): groq (`api.groq.com/openai/v1`, default model now `openai/gpt-oss-120b` after `llama-3.3-70b-versatile` retired), openai (`gpt-4o-mini`), openrouter (`anthropic/claude-sonnet-4` + attribution header), gemini (beta compat layer), deepseek (needs "json"+example in prompt, may return empty), anthropic (**`jsonObject:false` -- its compat layer silently ignores `response_format`**; use OpenRouter for Claude), custom (`LENS_BASE_URL` + `LENS_API_KEY`: vLLM/Ollama/LM Studio/anything-compatible). `keys.ts`: comma rotation + failover on 429/5xx, `maskKey` (last-4 only, never logged). `getProvider()` reads env at CALL time (no restart for key/provider switches); no usable keys -> loud-warning mock (plumbing only, never gradable). **Lens config honesty (10/2026):** with no usable key the route returns `500 "Lens provider is not configured."` and the workbench client detects `X-Lens-Provider: mock` and throws `LensCallError("Lens output isn't configured on this server yet.", 500)` — a mock NEVER renders as a real lens answer. `route.ts` and `lens-client.ts` both scrub key/secret/token/LENS_ substrings from error payloads. Live Groq key = Render dashboard `GROQ_API_KEY` + same value in `frontend/.env.local` (TWO separate runtimes reading it; Python sessions and lens route are independent paths).

### Fallback honesty UI (commit `610ae44`)
`runLens` returns `{ message, connections: [], usedFallback: true }` when model output is invalid (zod failure after retry). `postLens` in `lens-client.ts` surfaces `usedFallback`; `LensThread` in `lens-thread.ts` stores it on `ConnectionEntry` and exposes `lastResponseUsedFallback`; `LensPanel.tsx` renders a distinct degraded strip — "Couldn't structure a response — retry?" with a Retry button — when `lastResponseUsedFallback && !error`, visually separate from the red transport/config error strip.

### Storage (`lib/workbench/storage.ts`)
`yentellect.layout.v1` (geometry+activity, clamped read+write; `paletteOpen` deliberately NOT persisted) plus `yentellect.userField.v1` (feeds prompts; set in Settings > Research), `yentellect.betaModes.v1` (default off), and `yentellect.doc.v1` (the pinned imported doc; `readDoc`/`writeDoc`/`clearDoc`). All readers SSR-safe (window guard + try/catch).

---

## 14. Eval Harness + Verdict (NEW 10/6/2026)

Harness: `scripts/eval-lenses.ts` (runner) + `scripts/eval-lenses-lib.ts` (pure helpers, relative imports so tsx needs no alias resolution). Input `eval/items.json` (SEED: 6 famous-paper passages; REPLACE with the user's real papers). Output `eval/report.md` + per-run grade tables. Flags: `--only <substr>`, `--lens analogical|systems|both`, `--out <file>` (bare names land in `eval/`), `--delay-ms <ms>` / `EVAL_DELAY_MS` (Groq free-tier pacing -- 15000 required for full 12-call runs), `--resume-from <title>`. Grading the 0-2 rubric is a human job and lives IN the report as "Hand grades" sections.

Rubric: structural validity / non-obviousness / actionability / honesty, 0-2 each, connection passes at >=6/8. Lens passes when >= half the items produce one passing connection AND the user says "wouldn't have found alone" on >= 3 items.

- First full run (pre-hardening): **24/28 (86%), 6/6 items, 0 fallbacks/errors.** All 4 failures were systems diagrams: self-loops, dangling boundary node, loops from unlisted edges, unmarked inferences.
- Hardened rerun (diagram-discipline rule): **24/24 (100%), 6/6 items.** Standouts: scattering-amplitude<->attention, mock-trial-witnesses<->Shannon codes, prospect-theory->asymmetric PID, generalist-pollinators<->weak-ties.
- Second bar: **PENDING USER.** Evidence: `eval/report.md` (master, graded) + `eval/report-systems-rerun.md` (hardening verification).

Gotchas (all bitten once, documented so they are never re-bitten): report clobbering (-> `--out`), Groq TPM pacing, `npm run` flag misparsing (call `.bin` shims directly), editor line-splices in scripts (always `tsc` after), tracked `tsconfig.tsbuildinfo` (exclude from commits), background-job output files (`eval-*.txt`) must be deleted before committing.

---

## 15. Session Commit History (NEW 10/6/2026)

`3c99dee` Stage 1 restore+reform (routes restored, re-skinned, dead links killed, panels wired)
`644db06` Stage 1 workbench shell (dashboard deleted, 15 pages removed)
`d721257` Stage 5 lens backend (`lib/lens/`, `/api/lens`, harness, deps)
`b415604` scroll fix part 1 (globals.css body rule)
`2b39a3f` scroll fix part 2 (layout.tsx body class) -- the one that actually fixed it
`ae28fb2` lens eval PASS (live key, gpt-oss-120b, diagram discipline, 24/24 graded) + Phase A (beta toggle, userField, storage prefs, harness flags)
`610ae44` P2 fallback-honesty UI (real-provider fallback surfaces degraded strip with retry), P1 eval rerun 12/12 passes on live Groq
Remote `origin/main` == local HEAD at every step (verified via `git ls-remote` after each push). Repo: `https://github.com/rishibagale/yentellect.git`.

---

## 16. Standing User Decisions (NEW 10/6/2026 -- do not re-litigate)

1. `/` is the auth-required workbench. The old marketing landing stays deleted.
2. History/profile/session/settings routes are RESTORED and REFORMED, never deleted. They dissolve into workbench panels stage by stage.
3. The Groq key comes from Render (same value in `frontend/.env.local`). More LLM keys later; the registry makes them config, not code. Name any new provider -> verify its docs URL before adding a preset (never from memory).
4. Lens prompts stay verbatim to the lens spec. Only the verified diagram-discipline addition is sanctioned.
5. Eval gates UI. No polished UI on a failing lens.
6. No-document users get a chat box: a typed 3am thought IS the selection (Phase C, built).
7. Push to `origin/main` after verification; `tsconfig.tsbuildinfo` stays out of commits; scratch `eval-*.txt` files deleted before committing; `report.md` is append-only evidence.

---

*End of CONTEXT.md*
