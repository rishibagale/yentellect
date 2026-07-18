# Yentellect — Project Context

> Single source of truth for the Yentellect platform, its IDE integration, and how to run every part of it.
> Generated on **7/18/2026**.

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
├── CONTEXT.md                          # ← this file
├── README.md                           # project readme
├── LICENSE                             # MIT
├── .env.example                        # backend env template
│
├── frontend/                           # Next.js 14 UI (TypeScript)
│   ├── app/
│   │   ├── layout.tsx                  # root layout
│   │   ├── globals.css                 # tailwind base
│   │   ├── page.tsx                    # home (name + opening question)
│   │   ├── session/page.tsx            # training session
│   │   ├── profile/page.tsx            # knowledge graph + progress
│   │   ├── dashboard/page.tsx          # cognitive fingerprint dashboard
│   │   ├── history/page.tsx            # session history list
│   │   ├── settings/page.tsx           # user settings
│   │   └── auth/                       # login, signup, reset-password, callback
│   ├── components/
│   │   ├── Header.tsx                  # sticky glass nav
│   │   ├── LoadingState.tsx
│   │   ├── ErrorState.tsx
│   │   ├── ModeIndicator.tsx
│   │   ├── ModeBadge.tsx
│   │   ├── KnowledgeGraph.tsx          # d3 force-directed graph
│   │   ├── ProgressChart.tsx           # recharts line chart
│   │   ├── SessionChat.tsx
│   │   ├── SessionCard.tsx
│   │   ├── CognitiveFingerprint.tsx
│   │   ├── AppShell.tsx
│   │   └── AuthGuard.tsx
│   ├── lib/
│   │   ├── api.ts                      # typed API client
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
│   │       ├── sessions.py             # /sessions/start, /turn, /end, /metrics, /{id}
│   │       ├── profile.py              # /profile/{id}, /metrics
│   │       ├── graph.py                # /graph/{id}, /nearest/{session_id}
│   │       └── dashboard.py            # /dashboard/{id}, /history, /fingerprint
│   ├── core/
│   │   ├── models.py                   # Pydantic: ThinkingMode, SignalVector, …
│   │   ├── signals.py                  # spaCy + heuristic signal extraction
│   │   ├── classifier.py               # mode prediction
│   │   ├── graph.py                    # NetworkX knowledge graph + decay
│   │   ├── session.py                  # LangGraph state machine
│   │   ├── vsa.py                      # VSA vector computation (Python mirror)
│   │   └── prompts.py                  # per-mode system prompts
│   ├── db/
│   │   ├── database.py                 # SQLite (singleton)
│   │   ├── database_supabase.py        # Supabase PostgreSQL client
│   │   ├── schema.sql                  # SQLite DDL
│   │   ├── schema_supabase.sql         # Supabase DDL
│   │   ├── rls_policies.sql            # Row-level security policies
│   │   └── migrations/
│   │       └── 002_add_session_vector.sql
│   └── Makefile
│
├── rebuild/                            # Go CLI (fsnotify file watcher)
│   ├── go.mod                          # module github.com/example/rebuild
│   ├── go.sum
│   ├── main.go                         # flag parsing, signal handling
│   ├── Makefile
│   ├── README.md
│   ├── bin/rebuild.exe                 # 4 MB Windows binary (built)
│   └── internal/
│       ├── debouncer/{debouncer,debouncer_test}.go
│       ├── runner/{runner,runner_test}.go
│       └── watcher/{watcher,watcher_test}.go
│
├── go_watcher/                         # older Go experiment (kept for reference)
│
├── puter_test/                         # browser-based AI playground (this is your "IDE")
│   ├── package.json                    # @heyputer/puter.js
│   ├── server.js                       # local Node server (port 8000)
│   ├── app.js                          # AI prompt + project context
│   ├── app_watcher.js                  # rebuild CLI control panel
│   ├── index.html                      # single-page UI
│   ├── watcher.log                     # build/test output (when watcher runs)
│   └── node_modules/
│
└── puter_test/server.js                # serves UI + APIs:
                                        #   GET  /api/tree
                                        #   GET  /api/file
                                        #   POST /api/watcher/{start,stop}
                                        #   GET  /api/watcher/{status,log,stream}
```

---

## 3. How Everything Connects

```
┌───────────────────────────┐         ┌───────────────────────────┐
│     Frontend (Next.js)    │  HTTP   │      Backend (FastAPI)    │
│   localhost:3000          │ ──────► │   localhost:8000          │
│   (Yentellect UI)         │         │   (session logic, LLM)    │
└───────────────────────────┘         └───────────────────────────┘

┌───────────────────────────┐         ┌───────────────────────────┐
│   puter_test (Node)       │  spawn  │     rebuild (Go CLI)      │
│   localhost:8000          │ ──────► │   rebuild/bin/rebuild.exe │
│   (AI playground + IDE)   │  stdout │   watches dirs, runs cmds│
└──────────┬────────────────┘         └───────────────────────────┘
           │   ▲
           │   │  HTTPS (puter.ai)
           ▼   │
      puter.com  (minimax/minimax-m3 and 6 other models)
```

- **Frontend ↔ Backend**: REST + JSON. CORS allows `http://localhost:3000`.
- **puter_test → rebuild**: `child_process.spawn(rebuild.exe)`. Output is written to `puter_test/watcher.log` and tailed back into the browser via polling + SSE.
- **puter_test → Puter AI**: `puter.ai.chat(prompt, { model })` in the browser via the `https://js.puter.com/v2/` SDK.

---

## 4. Run Instructions

### Prerequisites (already installed on this machine)

| Tool | Path | Version |
|------|------|---------|
| Node.js | `C:\Program Files\nodejs` | 22.x |
| Go | `C:\Program Files\Go\bin` | 1.26.4 (added to user PATH) |
| Python | (uv-managed) | 3.11+ via `uv` |

### A) Start the AI Playground (this is the IDE)

```powershell
cd "c:\Users\rushi\OneDrive\Desktop\yentellect\puter_test"
# server is already running on PID 32744, but to restart:
$old = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
if ($old) { Stop-Process -Id $old.OwningProcess -Force; Start-Sleep 1 }
Start-Process node -ArgumentList "server.js" -WindowStyle Hidden
# Open browser: http://localhost:8000/
```

What you get:
- Prompt textarea + model picker
- Project file browser with multi-select context
- **Build Watcher** panel that controls the Go CLI live
- AI response area with copy button

### B) Start the Frontend

```powershell
cd "c:\Users\rushi\OneDrive\Desktop\yentellect\frontend"
npm install        # first time only
npm run dev        # http://localhost:3000
```

### C) Start the Backend

```powershell
cd "c:\Users\rushi\OneDrive\Desktop\yentellect\backend"
uv sync --all-extras                              # first time only
python -m spacy download en_core_web_sm           # first time only
cp ../.env.example .env                           # first time only
uv run uvicorn backend.api.main:app --reload --port 8001
```

The frontend talks to the backend on port `8000` by default. The puter_test server also uses `8000`; if you want both running simultaneously, set `NEXT_PUBLIC_API_URL=http://localhost:8001` in `frontend/.env.local` and start the backend on `8001` as shown above.

### D) Use the Rebuild CLI directly (CLI mode)

```powershell
cd "c:\Users\rushi\OneDrive\Desktop\yentellect\rebuild"
go test ./...                          # one-off
.\bin\rebuild.exe --command "go test ./... -count=1" --paths . --delay 400ms
```

Run `--help` for the full flag list. Ctrl-C triggers a graceful shutdown.

---

## 5. UI Status (frontend) — Last audit 7/18/2026

The Yentellect UI is **production-ready** with Supabase auth, dashboard, history, and settings pages.

### Pages
| Route | Description |
|-------|-------------|
| `/` | Landing page with hero, mode explorer, session start form |
| `/session` | Active training session (or read-only ended session view via `?session_id=`) |
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
- **KnowledgeGraph** — D3 force-directed graph with VSA similarity edges
- **ProgressChart** — Recharts line chart showing mode performance over time
- **SessionChat** — Chat interface with mode indicator, confidence, end-session flow
- **SessionCard** — Clickable history card that opens ended session view
- **CognitiveFingerprint** — Radar/spider chart of mode scores
- **ModeBadge** — Colored mode label chip

---

## 6. Backend API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/sessions/start` | Start new session |
| POST | `/sessions/{id}/turn` | Process a turn |
| POST | `/sessions/{id}/end` | End session and get summary |
| GET | `/sessions/{id}` | Fetch ended session details + turns |
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

Added in this session (commits `e34c8aa` → `574790f`):

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
- Fetches similarity edges on mount and renders them as dashed accent lines with opacity proportional to similarity score

---

## 8. Security Hardening

Added in commit `eb2d20f`:

- **`backend/api/security.py`** — JWT auth via Supabase, rate limiting (per-endpoint), input sanitization, CSRF protection, CSP headers, brute force protection
- **`backend/db/rls_policies.sql`** — Row-level security policies for Supabase
- **Auth middleware** — `frontend/middleware.ts` protects routes, `frontend/utils/supabase/` provides client/server/provider
- **AuthGuard** component redirects unauthenticated users

---

## 9. Supabase Integration

- **Database**: Supabase PostgreSQL with `database_supabase.py` client
- **Auth**: Supabase Auth with email/password + OAuth callback
- **Deployment**: Frontend on Vercel, backend on Render
- **Schema**: `backend/db/schema_supabase.sql` + `rls_policies.sql`

---

## 10. UI Fixes (commits b6e3c10 → 574790f)

| Issue | Fix |
|-------|-----|
| Dashboard "Start session" goes to `/` | Changed to `/session` |
| Mobile session UI cramped | Sidebar hidden behind collapsible `<details>` on mobile |
| Graph shows "Session a1b2c3d4" | Labels now show `"{mode}: {goal}"` from user's opening message |
| Progress chart empty with 10+ sessions | Added `/api/sessions/metrics` endpoint, lowered threshold to 1 session |
| History click does nothing | Session cards navigate to `/session?session_id=...`, page loads ended session read-only |
| Zero-score sessions saved immediately | `save_session_metrics()` guarded behind `turn_count >= 2` |
| Slow loading | `SessionSkeleton` renders immediately while API call is in-flight |

---

## 11. Open Tasks / Known Limitations

- [ ] **Race detection for Go tests**: install MinGW-w64 and re-run with `CGO_ENABLED=1`
- [ ] **Backend port conflict**: backend defaults to 8000; puter_test uses 8000; the cheat sheet runs backend on 8001 to avoid the conflict
- [ ] **Puter JS in Node.js**: 401 from the SDK in pure Node (no auth). Use the browser (http://localhost:8000/) where guest auth is automatic.
- [ ] **Race-free check unverified**: code uses `sync.Mutex` everywhere but `-race` not yet runnable
- [ ] **CORS**: backend's `allow_origins` includes `http://localhost:3000` and `https://localhost:3000`. If you serve the frontend on a different port, update `backend/api/main.py`.
- [ ] **Session chat read-only mode**: ended session view shows initial message/response but doesn't render full turn history yet — `SessionChat` needs a `readOnly` prop to display all turns

---

## 12. Pointers for the Next Agent

- **Where to start the IDE**: `puter_test/server.js` (Node) is the only thing that needs to be running for the user to test. Open `http://localhost:8000/`.
- **Where to add a feature**: New UI components go in `frontend/components/`. New API routes go in `backend/api/routes/`. New Go files go in `rebuild/internal/<pkg>/`.
- **Where the build artifacts are**: `frontend/.next/`, `rebuild/bin/`, `puter_test/watcher.log`.
- **Don't add new dependencies lightly** — Yentellect frontend already pins to React 18 + d3 + recharts; backend to FastAPI + spaCy + LangGraph; rebuild to fsnotify.
- **VSA vectors**: 512-dimensional float arrays stored as JSON in `sessions.vector`. The frontend and backend both have VSA math modules that must stay in sync.
- **Supabase**: Auth is fully wired now. New API routes should use `get_current_user` dependency from `backend/api/security.py`.

---

*End of CONTEXT.md*