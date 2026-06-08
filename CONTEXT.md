# Yentellect — Project Context

> Single source of truth for the Yentellect platform, its IDE integration, and how to run every part of it.
> Generated on **6/8/2026**.

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
│   │   └── profile/page.tsx            # knowledge graph + progress
│   ├── components/
│   │   ├── Header.tsx                  # sticky glass nav
│   │   ├── LoadingState.tsx
│   │   ├── ErrorState.tsx
│   │   ├── ModeIndicator.tsx
│   │   ├── KnowledgeGraph.tsx          # d3 force-directed graph
│   │   ├── ProgressChart.tsx           # recharts line chart
│   │   └── SessionChat.tsx
│   ├── lib/api.ts                      # typed API client
│   └── package.json                    # next, react, d3, recharts
│
├── backend/                            # FastAPI service (Python)
│   ├── pyproject.toml                  # uv-managed
│   ├── api/
│   │   ├── main.py                     # FastAPI app + CORS
│   │   └── routes/
│   │       ├── sessions.py             # /sessions/start, /turn, /end
│   │       ├── profile.py              # /profile/{id}, /metrics
│   │       └── graph.py                # /graph/{id}
│   ├── core/
│   │   ├── models.py                   # Pydantic: ThinkingMode, SignalVector, …
│   │   ├── signals.py                  # spaCy + heuristic signal extraction
│   │   ├── classifier.py               # mode prediction
│   │   ├── graph.py                    # NetworkX knowledge graph + decay
│   │   ├── session.py                  # LangGraph state machine
│   │   └── prompts.py                  # per-mode system prompts
│   ├── db/
│   │   ├── database.py                 # SQLite (singleton)
│   │   └── schema.sql                  # DDL
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

## 5. UI Status (frontend) — Last audit 6/8/2026

The Yentellect UI is **production-ready**. The latest `npm run build` produced:

```
Route (app)                  Size     First Load JS
ƒ /                          2.43 kB  90 kB
ƒ /profile                   121 kB   218 kB
ƒ /session                   5.61 kB  103 kB
```

What was fixed in the last pass:
- **Critical**: `app/session/page.tsx` had a `useEffect` chain that could spawn duplicate sessions on `useSearchParams` re-render. Now uses `useRef` guard + `retryKey` counter.
- **Critical**: `components/KnowledgeGraph.tsx` tooltip used `.html()` with concatenated strings (HTML-entity escaping bug + XSS risk). Rebuilt with DOM API and pre-built `<div>` children.
- **New shared components**: `Header`, `LoadingState`, `ErrorState`.
- **Polish**: glass-morphism cards, gradient hero, auto-resizing chat textarea, per-message confidence %, staggered fade-ins.

The user explicitly said the **sign-in / account system should NOT be wired up** for now — the name field is used as the `user_id` directly so testing can continue without auth.

---

## 6. Rebuild CLI Status

All 13 unit tests pass on Windows. Built binary at `rebuild/bin/rebuild.exe` (4,069,376 bytes).

```
=== Final test run ===
ok  github.com/example/rebuild/internal/debouncer  1.527s
ok  github.com/example/rebuild/internal/runner     1.270s
ok  github.com/example/rebuild/internal/watcher    1.613s
```

Note: `-race` is not yet enabled because the box has no C compiler (gcc/clang missing). Code is race-free by design (`sync.Mutex` in debouncer, runner, and main). To enable race detection later, install MinGW-w64.

---

## 7. IDE ↔ CLI Integration (puter_test) Status

| Feature | Status | Endpoint / Notes |
|---|---|---|
| Prompt → Puter AI | ✅ Working | `puter.ai.chat(prompt, {model})` via CDN SDK in browser |
| Project file tree | ✅ Working | `GET /api/tree?path=X` |
| File contents as context | ✅ Working | `GET /api/file?path=X` |
| Start rebuild watcher | ✅ Working | `POST /api/watcher/start` |
| Stop rebuild watcher | ✅ Working | `POST /api/watcher/stop` |
| Live log streaming | ✅ Working | `GET /api/watcher/log` (poll every 2s) |
| Watcher start/exit events | ✅ Working | `GET /api/watcher/stream` (Server-Sent Events) |
| Auth / accounts | ⏸️ Disabled by user request | name is used as `user_id` |

The user explicitly said the **sign-in / account system should NOT be wired up** for now. Auth is paused per the original task instruction.

---

## 8. Quick-Start Cheat Sheet

```powershell
# Open the AI playground (already running, just refresh):
start http://localhost:8000/

# Frontend dev server:
cd "c:\Users\rushi\OneDrive\Desktop\yentellect\frontend"
npm run dev

# Backend API:
cd "c:\Users\rushi\OneDrive\Desktop\yentellect\backend"
uv run uvicorn backend.api.main:app --reload --port 8001

# Go CLI directly:
cd "c:\Users\rushi\OneDrive\Desktop\yentellect\rebuild"
.\bin\rebuild.exe --command "go test ./..." --paths . --delay 400ms

# Re-run all Go tests:
go test ./... -count=1
```

---

## 9. Open Tasks / Known Limitations

- [ ] **Race detection for Go tests**: install MinGW-w64 and re-run with `CGO_ENABLED=1`
- [ ] **Auth / accounts**: paused at user request; revisit when Yentellect sign-in is specified
- [ ] **Backend port conflict**: backend defaults to 8000; puter_test uses 8000; the cheat sheet runs backend on 8001 to avoid the conflict
- [ ] **Puter JS in Node.js**: 401 from the SDK in pure Node (no auth). Use the browser (http://localhost:8000/) where guest auth is automatic.
- [ ] **Race-free check unverified**: code uses `sync.Mutex` everywhere but `-race` not yet runnable
- [ ] **CORS**: backend's `allow_origins` includes `http://localhost:3000` and `https://localhost:3000`. If you serve the frontend on a different port, update `backend/api/main.py`.

---

## 10. Pointers for the Next Agent

- **Where to start the IDE**: `puter_test/server.js` (Node) is the only thing that needs to be running for the user to test. Open `http://localhost:8000/`.
- **Where to add a feature**: New UI components go in `frontend/components/`. New API routes go in `backend/api/routes/`. New Go files go in `rebuild/internal/<pkg>/`.
- **Where the build artifacts are**: `frontend/.next/`, `rebuild/bin/`, `puter_test/watcher.log`.
- **Don't add new dependencies lightly** — Yentellect frontend already pins to React 18 + d3 + recharts; backend to FastAPI + spaCy + LangGraph; rebuild to fsnotify.

---

*End of CONTEXT.md*
