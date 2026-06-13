# Implementation Plan

**Overview:** Migrate Yentellect from a local-only development setup to a fully-deployed cloud architecture, replacing SQLite with Supabase Postgres, deploying the Python backend to Render, wiring up Supabase auth, and fixing the frontend's session failures.

**Scope & Context:** The current project has a Next.js frontend deployed on Vercel, a Python FastAPI backend that only runs locally with SQLite, and a half-wired Supabase config that crashes builds because `@supabase/ssr` is not installed. Sessions fail in production because `NEXT_PUBLIC_API_URL` points to `localhost:8000`. The backend uses spaCy, LangGraph, and Groq for cognitive mode classification — these are incompatible with Supabase Edge Functions, so Render (which already has a `render.yaml` config) is the correct deployment target. The plan preserves the core ML/session logic while switching the database layer from SQLite to async PostgreSQL via Supabase.

**Key Changes:**
- **Database:** Replace `sqlite3` with `asyncpg` + Supabase Postgres, translating all queries to parameterized SQL
- **Backend deployment:** Deploy on Render using the existing `render.yaml`, configuring env vars for Supabase DB + Groq
- **Frontend Auth:** Install `@supabase/ssr` and `@supabase/supabase-js`, implement real Supabase auth with signup/login flows
- **Frontend API:** Update `NEXT_PUBLIC_API_URL` to point to the Render backend URL
- **Middleware:** Fix the middleware to redirect unauthenticated users and refresh sessions
- **Session Fix:** The frontend currently stores user ID in `sessionStorage` — with auth, this comes from Supabase's session

---

## [Types]

**New and modified type definitions across frontend and backend.**

### Backend — New Pydantic Models (`backend/db/models.py` — new file)

```python
class SupabaseConfig(BaseSettings):
    """Supabase PostgreSQL connection settings."""
    SUPABASE_DB_URL: str = Field(..., alias="SUPABASE_DB_URL")
    SUPABASE_DB_POOL_SIZE: int = 10
    SUPABASE_DB_MAX_OVERFLOW: int = 20
    
    model_config = SettingsConfigDict(env_file=".env")
```

### Frontend — Modified Types (`frontend/lib/api.ts`)

- **No structural changes** to existing types (`ThinkingMode`, `SignalVector`, etc.)
- New type: `AuthSession` — maps to Supabase session data for the app context

### Frontend — New Auth Types (`frontend/lib/auth-types.ts` — new file)

```typescript
export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
}

export interface SignUpData {
  email: string;
  password: string;
  displayName: string;
}

export interface SignInData {
  email: string;
  password: string;
}
```

---

## [Files]

**Global restructuring of database layer and auth layer.**

### New Files to Create

| File | Purpose |
|------|---------|
| `backend/db/models.py` | Pydantic settings model for Supabase/DB config |
| `backend/db/database_supabase.py` | Async PostgreSQL database manager (replaces `database.py`) |
| `frontend/utils/supabase/provider.tsx` | React context provider wrapping Supabase client |
| `frontend/app/auth/login/page.tsx` | Login page with email/password form |
| `frontend/app/auth/signup/page.tsx` | Signup page with email/password + name form |
| `frontend/app/auth/callback/route.ts` | Route handler for Supabase OAuth callback |
| `frontend/app/auth/reset-password/page.tsx` | Password reset flow |
| `frontend/components/AuthGuard.tsx` | Higher-order component that redirects unauthenticated users |
| `frontend/lib/auth-types.ts` | Auth-related TypeScript interfaces |

### Files to Modify

| File | Change |
|------|--------|
| `frontend/package.json` | Add `@supabase/ssr`, `@supabase/supabase-js` dependencies |
| `frontend/middleware.ts` | Complete rewrite — handle auth session refresh, protect routes, redirect to login |
| `frontend/utils/supabase/client.ts` | Rewrite to use `createBrowserClient` with proper cookie handling |
| `frontend/utils/supabase/server.ts` | Rewrite to use `createServerClient` with `cookies()` from `next/headers` |
| `frontend/utils/supabase/middleware.ts` | Keep as the cookie-handling helper for middleware |
| `frontend/app/layout.tsx` | Wrap in `SupabaseProvider` and `AuthGuard` |
| `frontend/app/page.tsx` | Show auth-aware home (logged-in vs logged-out state) |
| `frontend/app/session/page.tsx` | Use Supabase user ID instead of `sessionStorage`, add AuthGuard |
| `frontend/app/profile/page.tsx` | Use Supabase user ID instead of `sessionStorage`, add AuthGuard |
| `frontend/lib/api.ts` | Update `API_BASE` to default to Render URL, accept dynamic URL override |
| `frontend/.env.local` | Replace `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` with proper anon key, add `NEXT_PUBLIC_API_URL` pointing to Render |
| `frontend/next.config.js` | Add `env` block for build-time env passthrough |
| `backend/pyproject.toml` | Add `asyncpg`, `supabase` Python client, `psycopg2-binary` |
| `backend/db/database.py` | Refactor to abstract base class; create async Postgres implementation |
| `backend/db/schema.sql` | Convert to PostgreSQL-compatible SQL (remove SQLite-isms like `datetime('now')`, use `NOW()`, add SERIAL/BIGSERIAL) |
| `backend/api/main.py` | Switch DB init to async Postgres, add Supabase JWK auth middleware (optional) |
| `backend/core/session.py` | Accept async DB manager, use async queries |
| `render.yaml` | Add Supabase DB URL, update build command for asyncpg, remove spaCy download if heavy |
| `.env.example` | Add Supabase DB URL, Render URL examples |
| `CONTEXT.md` | Update with new architecture, deployment URLs, run instructions |

### Files to Delete

| File | Reason |
|------|--------|
| `backend/db/database.py` (contents) | Replaced by `database_supabase.py` — or keep as base class |

---

## [Functions]

**Complete function-level changes across backend and frontend.**

### Backend — New Functions

| Function | File | Signature | Purpose |
|----------|------|-----------|---------|
| `SupabaseDatabaseManager.__init__` | `backend/db/database_supabase.py` | `(db_url: str, pool_size: int = 10)` | Init async connection pool |
| `SupabaseDatabaseManager.get_pool` | `backend/db/database_supabase.py` | `async -> asyncpg.Pool` | Get or create asyncpg pool |
| `SupabaseDatabaseManager.init_db` | `backend/db/database_supabase.py` | `async -> None` | Run schema migration |
| `SupabaseDatabaseManager.get_user` | `backend/db/database_supabase.py` | `async (user_id: str) -> dict\|None` | Get user by ID |
| `SupabaseDatabaseManager.create_user` | `backend/db/database_supabase.py` | `async (user_id: str, name: str) -> dict` | Create user |
| ... (mirrors all existing functions as async) | | | |
| `SupabaseDatabaseManager.close` | `backend/db/database_supabase.py` | `async -> None` | Close pool on shutdown |

### Backend — Modified Functions

| Function | File | Change |
|----------|------|--------|
| `DatabaseManager.__init__` | `backend/db/database.py` | Make abstract; accept `db_url` param |
| `DatabaseManager.get_connection` | `backend/db/database.py` | Return `abc.ABC` method |
| `SessionManager.__init__` | `backend/core/session.py` | Accept async DB manager |
| `SessionManager.start_session` | `backend/core/session.py` | Make async; use await for DB calls |
| `SessionManager.process_turn` | `backend/core/session.py` | Make async |
| `SessionManager.end_session` | `backend/core/session.py` | Make async |
| `start_session` (module-level) | `backend/core/session.py` | Make async |
| `process_turn` (module-level) | `backend/core/session.py` | Make async |
| `end_session` (module-level) | `backend/core/session.py` | Make async |
| `lifespan` | `backend/api/main.py` | Use async DB init on startup, pool close on shutdown |

### Frontend — New Functions

| Function | File | Signature | Purpose |
|----------|------|-----------|---------|
| `SupabaseProvider` | `frontend/utils/supabase/provider.tsx` | Component wrapping children with context | Provide Supabase client + session to all children |
| `useSupabase` | `frontend/utils/supabase/provider.tsx` | `() -> { supabase, session, user }` | Hook to access Supabase context |
| `useRequireAuth` | `frontend/components/AuthGuard.tsx` | `() -> void` | Hook that redirects to /auth/login if not authenticated |
| `signUp` | `frontend/lib/auth-types.ts` | `async (data: SignUpData) -> AuthUser` | Create account |
| `signIn` | `frontend/lib/auth-types.ts` | `async (data: SignInData) -> AuthUser` | Sign in |
| `signOut` | `frontend/lib/auth-types.ts` | `async () -> void` | Sign out |
| `getSession` | `frontend/lib/auth-types.ts` | `async () -> Session\|null` | Get current session |

### Frontend — Modified Functions

| Function | File | Change |
|----------|------|--------|
| `middleware` | `frontend/middleware.ts` | Complete rewrite — check auth, refresh session, redirect to `/auth/login` if unauthenticated for protected routes |
| `createClient` (browser) | `frontend/utils/supabase/client.ts` | Use `createBrowserClient` from `@supabase/ssr` |
| `createClient` (server) | `frontend/utils/supabase/server.ts` | Use `createServerClient` with dynamic cookie store |
| `Home` | `frontend/app/page.tsx` | Show logged-in state with user's name, or CTA to login; create session using Supabase user ID |
| `SessionContent` | `frontend/app/session/page.tsx` | Pull `userId` from Supabase session instead of `sessionStorage` |
| `ProfileContent` | `frontend/app/profile/page.tsx` | Pull `userId` from Supabase session instead of `sessionStorage`/search params |
| `fetchJson` | `frontend/lib/api.ts` | Support configurable base URL |

---

## [Classes]

**Class hierarchy changes for the database layer.**

### New Classes

| Class | File | Extends | Key Methods | Purpose |
|-------|------|---------|-------------|---------|
| `SupabaseDatabaseManager` | `backend/db/database_supabase.py` | (does not extend old DB) | `get_user`, `create_user`, `create_session`, `save_turn`, `save_signal_vector`, `get_user_concepts`, `get_user_edges`, `save_session_metrics`, `get_session_metrics`, `init_db`, `close` | Async Postgres implementation |
| `SupabaseProvider` | `frontend/utils/supabase/provider.tsx` | React.FC | Render prop | Context provider wrapper |
| `AuthGuard` | `frontend/components/AuthGuard.tsx` | React.FC | Render prop (checks auth before rendering children) | Protected route wrapper |

### Modified Classes

| Class | File | Modification |
|-------|------|-------------|
| `DatabaseManager` | `backend/db/database.py` | No structural change — kept as-is for local dev. The new `SupabaseDatabaseManager` is a separate class. |
| `SessionManager` | `backend/core/session.py` | Add async methods alongside sync methods; accept `db_manager` as abstract DB interface |

### Removed Classes

None. The old `DatabaseManager` stays for local development fallback.

---

## [Dependencies]

**New packages across both projects.**

### Backend — New `pyproject.toml` Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `asyncpg` | ^0.29.0 | Async PostgreSQL driver |
| `supabase` | ^2.5.0 | Supabase Python client (for auth verification if needed) |
| `psycopg2-binary` | ^2.9.9 | Fallback sync Postgres driver |

### Backend — Removed Dependencies from `pyproject.toml`

| Package | Reason |
|---------|--------|
| `sqlite-utils` | No longer needed (switching to raw SQL + asyncpg) |

### Frontend — New `package.json` Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@supabase/ssr` | ^0.5.0 | Server-side rendering helpers for Supabase auth |
| `@supabase/supabase-js` | ^2.45.0 | Supabase JS client |

### Infrastructure Dependencies

| Service | Purpose | Configuration |
|---------|---------|---------------|
| Supabase Postgres | Production database | Connection string from Supabase dashboard → `SUPABASE_DB_URL` |
| Render | Backend hosting | `render.yaml` references for build + deploy |
| Vercel | Frontend hosting | Already configured; update env vars |

---

## [Testing]

**Existing tests must be updated for async DB, and new auth tests added.**

### Backend Tests

| Test File | Status | Change |
|-----------|--------|--------|
| `backend/tests/test_signals.py` | ✅ Update | Replace `DatabaseManager` with mock or in-memory test DB; no logic change |
| New: `backend/tests/test_db_supabase.py` | ❌ New | Test async CRUD operations against a test Supabase instance |

### Frontend Tests

No formal test suite exists. Manual validation plan:

| Scenario | Steps |
|----------|-------|
| Auth: signup | Navigate to `/auth/signup`, fill form, verify redirect to home with user name displayed |
| Auth: login | Sign out, navigate to `/auth/login`, verify redirect to home |
| Auth: protected route | Navigate to `/session` while logged out, verify redirect to `/auth/login` |
| Session: start | Logged in, navigate home, type problem, click "Begin Training", verify session redirect |
| Session: chat | Send a message, verify AI response appears, verify mode indicator updates |
| Session: end | Type "end", verify summary modal appears |
| Profile: viewing | Navigate to `/profile`, verify graph + stats load |
| Build: production | `npm run build` succeeds with no errors |

### Validation Commands

```bash
# Backend
cd backend
uv run pytest -v --cov=backend.core

# Frontend
cd frontend
npm run build   # Must succeed
```

---

## [Implementation Order]

**Ordered sequence of implementation steps, each building on the previous.**

1. **Install frontend Supabase dependencies** — `@supabase/ssr`, `@supabase/supabase-js` via npm
2. **Rewrite Supabase utility files** — `client.ts`, `server.ts`, `middleware.ts` using proper `@supabase/ssr` APIs
3. **Rewrite middleware.ts** — Replace with proper auth-aware middleware: refresh session, protect routes, redirect to login
4. **Create auth pages** — `/auth/login`, `/auth/signup`, `/auth/callback` route handler, `/auth/reset-password`
5. **Create SupabaseProvider + AuthGuard** — React context for session + protected route wrapper
6. **Update layout.tsx** — Wrap root layout in SupabaseProvider + AuthGuard
7. **Update page.tsx (home)** — Show auth-aware state; user greeting + name field pre-filled from auth
8. **Update session/page.tsx** — Use Supabase user ID instead of sessionStorage; remove userId from URL params
9. **Update profile/page.tsx** — Use Supabase user ID instead of sessionStorage/search params
10. **Update lib/api.ts** — Change default API_BASE to deployed Render URL; support env override
11. **Install backend Postgres dependencies** — `asyncpg`, `psycopg2-binary`, `supabase` via uv
12. **Create async Postgres database manager** — `backend/db/database_supabase.py` with asyncpg pool
13. **Convert schema.sql to PostgreSQL dialect** — `NOW()`, `SERIAL`, proper boolean types
14. **Update SessionManager to async** — Make all DB calls async; add async variants alongside sync
15. **Update API routes to async** — All route handlers become async
16. **Update render.yaml** — Add `SUPABASE_DB_URL` env var, update build command
17. **Update backend env + config** — Add Supabase DB URL to `.env`, update `.env.example`
18. **Deploy backend to Render** — Manual deploy via Render dashboard (connect GitHub repo)
19. **Update Vercel env vars** — Set `NEXT_PUBLIC_API_URL` to Render URL, set Supabase keys
20. **Redeploy frontend to Vercel** — Trigger redeploy from Vercel dashboard
21. **Test end-to-end** — Run through auth → session → profile flow on deployed URLs