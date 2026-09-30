# Yentellect — Project Context

> Single source of truth for the Yentellect platform and how to run every part of it.
> Generated on **7/18/2026**. Last full refresh: **9/30/2026** (commits through `6fed645`).
> Doc cleanup **9/30/2026**: removed stale `puter_test/` / `go_watcher/` / `rebuild` Go-source references (those directories no longer exist); corrected port guidance.

---

## 1. What is Yentellect?

**Yentellect** is a production-grade cognitive development platform. It builds a persistent cognitive model of the user across sessions, detects dominant and underdeveloped thinking modes from behavioral text signals, and delivers adaptive Socratic sessions targeting the weakest modes — specifically **analogical reasoning**, **divergent thinking**, and **metacognitive awareness**.

> *"Most AI makes you more informed. Yentellect makes you think better."*

### The Six Thinking Modes

| Mode | Trains | Neural basis |
|------|--------|--------------|
| **Convergent** | Precision under constraint, focused problem-solving | Dorsolateral Prefrontal Cortex (DLPFC) |
| **Divergent** | Ideational fluency, creative generation, flexible thinking | DMN–DLPFC coupling |
| **Analogical** | Cross-domain structural mapping, relational reasoning | Frontopolar cortex (Brodmann 10) |
| **Metacognitive** | Reasoning about reasoning, calibration accuracy | Anterior Prefrontal Cortex |
| **Systems** | Causal chains, feedback loops, emergent properties | Inferior parietal + DLPFC |
| **DMN** | Open wandering, insight incubation, associative thinking | Posterior Cingulate + Medial PFC |

---

## 2. Repository Map

```
yentellect/
├── CONTEXT.md                          # ← this file (full refresh 9/30/2026)
├── README.md                           # project readme (repo: github.com/rishibagale/yentellect)
├── LICENSE                             # MIT
├── .env.example                        # backend env template
│
├── frontend/                           # Next.js 14 UI (TypeScript)
│   ├── app/
│   │   ├── layout.tsx                  # root layout
│   │   ├── globals.css                 # tailwind base
│   │   ├── page.tsx                    # home (name + opening question)
│   │   ├── session/page.tsx            # training session (+ read-only ended view via ?session_id=, passes initialTurns)
│   │   ├── profile/page.tsx            # knowledge graph + progress
│   │   ├── dashboard/page.tsx          # cognitive fingerprint dashboard
│   │   ├── history/page.tsx            # session history list
│   │   ├── settings/page.tsx           # user settings
│   │   └── auth/                       # login, signup, reset-password, callback
│   ├── components/
│   │   ├── Header.tsx                  # sticky glass nav ("New session" CTA → /session)
│   │   ├── LoadingState.tsx
│   │   ├── ErrorState.tsx
│   │   ├── ModeIndicator.tsx
│   │   ├── ModeBadge.tsx
│   │   ├── KnowledgeGraph.tsx          # react-force-graph-3D neural graph, bloom, fusion (Ctrl/Cmd+click)
│   │   ├── DomainExplorer.tsx          # 3D graph with domain filter bar (added 9/30/2026)
│   │   ├── CognitiveTimeline.tsx       # vertical session timeline (added 9/30/2026)
│   │   ├── NodeDetailPanel.tsx         # selected-node detail drawer
│   │   ├── ProgressChart.tsx           # recharts line chart
│   │   ├── SessionChat.tsx             # chat + readOnly ended-session mode (readOnly, initialTurns props)
│   │   ├── SessionCard.tsx
│   │   ├── CognitiveFingerprint.tsx
│   │   ├── AppShell.tsx
│   │   └── AuthGuard.tsx
│   ├── lib/
│   │   ├── api.ts                      # typed API client (SessionDetailResponse expects full turn fields)
│   │   ├── tokens.ts                   # design tokens
│   │   ├── design-tokens.ts
│   │   ├── auth-types.ts
│   │   └── combination/                # VSA vector math
│   │       ├── vsa.ts
│   │       └── modeVectors.ts
│   ├── utils/supabase/                 # Supabase client, server, middleware, provider
│   └── package.json                    # next, react, d3, recharts
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

- **Frontend ↔ Backend**: REST + JSON. CORS allows `http://localhost:3000`.
  The port-8000 backend is the only local server now; there is no second
  local service competing for the port (the Node `puter_test` playground and
  its `rebuild.exe` watcher bridge were removed from the repo).

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

---

## 5. UI Status (frontend) — Last audit 9/30/2026

The Yentellect UI is **production-ready** with Supabase auth, dashboard, history, and settings pages. Ended sessions render full conversation history in read-only mode.

### Pages
| Route | Description |
|-------|-------------|
| `/` | Landing page with hero, mode explorer, session start form |
| `/session` | Active training session (or read-only ended session view via `?session_id=`, full turn history) |
| `/dashboard` | Cognitive fingerprint, mode breakdown, recent sessions, streak |
| `/profile` | Knowledge graph + progress chart |
| `/history` | Paginated session history list |
| `/settings` | User settings |
| `/auth/login` | Supabase login |
| `/auth/signup` | Supabase signup |
| `/auth/reset-password` | Password reset |
| `/auth/callback` | OAuth callback handler |

### Key Components
- **AppShell** — Shared layout with sidebar navigation
- **AuthGuard** — Redirects unauthenticated users to login
- **KnowledgeGraph** — react-force-graph-3D neural graph with bloom, VSA similarity edges, Ctrl/Cmd+click fusion
- **DomainExplorer** — 3D graph with domain filter bar (added 9/30/2026)
- **CognitiveTimeline** — Vertical session timeline with mode dots + score bars (added 9/30/2026)
- **NodeDetailPanel** — Selected-node detail drawer
- **ProgressChart** — Recharts line chart showing mode performance over time
- **SessionChat** — Chat interface with mode indicator, confidence, end-session flow, and `readOnly` ended-session mode
- **SessionCard** — Clickable history card that opens ended session view
- **CognitiveFingerprint** — Radar/spider chart of mode scores
- **ModeBadge** — Colored mode label chip

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

## 8. Security Hardening

Added in commit `eb2d20f`:

- **`backend/api/security.py`** — JWT auth via Supabase, rate limiting (per-endpoint), input sanitization, CSRF protection, CSP headers, brute force protection
- **`backend/db/rls_policies.sql`** — Row-level security policies for Supabase
- **Auth middleware** — `frontend/middleware.ts` protects routes (uses local `getSession()`, not remote `getUser()`, per `40c58ed` to avoid 504 timeouts), `frontend/utils/supabase/` provides client/server/provider
- **AuthGuard** component redirects unauthenticated users

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

---

## 11. Open Tasks / Known Limitations

- [ ] **Verify completed-session click fix end-to-end**: backend now returns full turn data (`f9c8666` + `6fed645`); needs a live click-through on History/Dashboard → `/session?session_id=...` against a running backend
- [ ] **Backend venv is an empty stub**: `backend/.venv` ships with no packages installed; run `uv sync --all-extras` + `python -m spacy download en_core_web_sm` before first launch
- [ ] **Missing local API URL**: `frontend/.env.local` has no `NEXT_PUBLIC_API_URL`, so a local frontend calls the production Render backend by default
- [ ] **Backend port 8000 is free**: the retired Node `puter_test` server that occupied it is gone; run the backend on its default `--port 8000`
- [ ] **CORS**: backend's `allow_origins` includes `http://localhost:3000` and `https://localhost:3000`. If you serve the frontend on a different port, update `backend/api/main.py`.
- [ ] **OneDrive `.next` build flakiness**: `EINVAL readlink` errors under `frontend/.next/` occur on OneDrive-synced paths; workaround is `Remove-Item -Recurse -Force .next` before `npm run build`

---

## 12. Pointers for the Next Agent

- **Where to start testing**: backend on `http://localhost:8000` (`uv run uvicorn backend.api.main:app --reload --port 8000`), frontend on `http://localhost:3000` (`npm run dev`). Set `NEXT_PUBLIC_API_URL=http://localhost:8000` in `frontend/.env.local` for local runs.
- **Where to add a feature**: New UI components go in `frontend/components/`. New API routes go in `backend/api/routes/`. (The retired `rebuild/` Go CLI has no sources left; do not extend it.)
- **Where the build artifacts are**: `frontend/.next/`, `rebuild/bin/rebuild.exe` (orphaned binary, kept for reference).
- **Don't add new dependencies lightly** — Yentellect frontend already pins to React 18 + d3 + recharts; backend to FastAPI + spaCy + LangGraph.
- **VSA vectors**: 512-dimensional float arrays stored as JSON in `sessions.vector`. The frontend and backend both have VSA math modules that must stay in sync.
- **Supabase**: Auth is fully wired now. New API routes should use `get_current_user` dependency from `backend/api/security.py`.
- **Session detail contract**: `GET /sessions/{id}` must always return full turn objects (`turn_id`, `turn_number`, `user_input`, `response`, `predicted_mode`, `confidence`, `created_at`) — the read-only `SessionChat` depends on it. Both `database.py` and `database_supabase.py` `get_session_turns()` implement this; keep them in sync.
- **SQLite migrations**: new columns go in `schema.sql` + `_migrate()` in `database.py` (see `started_at` precedent).

---

*End of CONTEXT.md*
