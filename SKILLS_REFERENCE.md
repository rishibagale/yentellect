# Yentellect — Skills Reference

This file documents the skills and resources available for this project.

## Available Skills

### 1. frontend-design
**Purpose:** Guidance for distinctive, intentional visual design when building new UI or reshaping existing ones. Helps with aesthetic direction, typography, and making choices that don't read as templated defaults.

**Key directives:**
- Ground design in the subject's own world (materials, instruments, artifacts)
- Hero section should be a thesis — open with the most characteristic thing
- Typography carries personality — pair display and body faces deliberately
- Structure is information — use structural devices that encode truth about content
- Leverage motion deliberately — orchestrated moments over scattered effects
- One signature element per page: "Spend your boldness in one place"
- Work in two passes: brainstorm → critique → revise → build

**Use when:** Designing new pages, redesigning existing UI, choosing colors/typography, creating layout concepts.

### 2. supabase
**Purpose:** Complete reference for Supabase integration including Auth, Database, Edge Functions, Realtime, Storage, Vectors, Cron, and Queues.

**Key directives:**
- Verify against changelog before implementing (Supabase changes frequently)
- Security checklist for auth, RLS, views, and storage (never use `user_metadata` in JWT auth decisions)
- RLS on every table in exposed schemas
- UPDATE requires SELECT policy
- `TO authenticated` alone is authentication without authorization (BOLA/IDOR risk)
- Prefer MCP `search_docs` tool for documentation
- For schema changes, use `execute_sql` (MCP) or `supabase db query` (CLI)

**Use when:** Working with Supabase auth, database, RLS policies, storage buckets, realtime subscriptions, or any Supabase feature.

### 3. supabase-postgres-best-practices
**Purpose:** Postgres performance optimization and best practices from Supabase.

**Key directives:**
- Index strategies, query optimization
- Schema design patterns
- Connection pooling configuration

**Use when:** Writing or optimizing Postgres queries, schema designs, or database configurations.

### 4. nextjs-supabase-auth
**Purpose:** Expert integration of Supabase Auth with Next.js App Router.

**Key directives:**
- Server-side cookie handling patterns
- Middleware session refresh
- Route protection strategies

**Use when:** Implementing or debugging Next.js + Supabase auth integration.

## Deployment URLs

| Service | URL | Config File |
|---------|-----|-------------|
| Frontend (Vercel) | `https://cog-research.vercel.app` | `vercel.json` (auto-detected) |
| Backend (Render) | `https://yentellect.onrender.com` | `render.yaml` |
| Supabase Project | `https://ygapudtdgcslbqhibgjl.supabase.co` | `frontend/.env.local` |

## Environment Variables

| Variable | Default | Used In |
|----------|---------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `client.ts`, `server.ts`, `middleware.ts` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key | `client.ts`, `server.ts`, `middleware.ts` |
| `NEXT_PUBLIC_API_URL` | `https://yentellect.onrender.com` | `api.ts`, `auth-types.ts`, `callback/route.ts`, `layout.tsx` |
| `SUPABASE_DB_URL` | (production only) | `database_supabase.py` |
| `GROQ_API_KEY` | (production only) | `session.py` |
| `FRONTEND_URL` | `http://localhost:3000` | `backend/api/main.py` (CORS) |

## Architecture Overview

```
Browser (Vercel)
  │
  ├── Supabase Auth (login/signup/session)
  │     └── via @supabase/ssr + @supabase/supabase-js
  │
  └── Backend API (Render)
        └── FastAPI + SQLite (local) / asyncpg + Supabase Postgres (prod)
              ├── /sessions/*     — Cognitive training sessions
              ├── /profile/*      — User cognitive profiles
              ├── /graph/*        — Knowledge graph data
              └── /dashboard/*    — Aggregated analytics
```

## Quick Reference

### Supabase Auth — Current Config
- **Auth Provider:** Email/Password + Google OAuth (configurable) + GitHub OAuth (configurable)
- **Session Storage:** HTTP cookies (via `@supabase/ssr`)
- **Middleware Protection:** `/session`, `/profile`, `/dashboard`, `/history`, `/settings` require auth
- **Public Routes:** `/`, `/auth/login`, `/auth/signup`, `/auth/callback`, `/auth/reset-password`

### Backend — Current State
- **Local DB:** SQLite (`yentellect.db`)
- **Production DB:** Supabase Postgres (via `asyncpg` — `database_supabase.py`)
- **LLM:** Groq API (falls back to mock responses if no API key)
- **Signal Extraction:** spaCy (local) + heuristic rules
- **Mode Classification:** ML-based (scikit-learn)