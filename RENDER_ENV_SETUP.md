# Render Environment Variables

Set these in Render Dashboard → Backend Service → Environment → Environment Variables.

## Required

| Key | Value Example | Used In |
|-----|---------------|---------|
| `FRONTEND_URL` | `https://cog-research.vercel.app` | CORS whitelist (`backend/api/main.py`) |
| `GROQ_API_KEY` | `gsk_...` (your Groq key) | LLM responses (`backend/core/session.py`) |
| `SUPABASE_URL` | `https://<project>.supabase.co` | Base URL for REST API (`backend/db/database_supabase.py`) |
| `SUPABASE_SERVICE_KEY` | `<service_role key from Supabase dashboard>` | Auth header for backend writes (`backend/db/database_supabase.py`) |

## How to Get the Values

### SUPABASE_URL
1. Copy your Supabase project URL from `frontend/.env.local` (`NEXT_PUBLIC_SUPABASE_URL`) or from Supabase Dashboard → Project Settings → API.
2. Paste it into Render as `SUPABASE_URL`.

### SUPABASE_SERVICE_KEY
1. In Supabase Dashboard → Project Settings → API, copy the **service_role** key.
2. Paste it into Render as `SUPABASE_SERVICE_KEY`.

Note: The database schema must be initialized once via Supabase SQL Editor using `backend/db/schema_supabase.sql`. After both env vars are set, trigger a redeploy in Render.

### GROQ_API_KEY
1. Go to [console.groq.com/keys](https://console.groq.com/keys)
2. Create a new API key
3. Paste as `GROQ_API_KEY`

### FRONTEND_URL
Use: `https://cog-research.vercel.app`

## After Setting Variables

Trigger a manual redeploy in Render Dashboard → **"Manual Deploy"** → **"Deploy latest commit"**.

If the dashboard still fails with `Network is unreachable` to `db.<project-ref>.supabase.co`, the Render egress path cannot reach the current Supabase host. Use this exact workaround:
1. In Render, edit the backend env var `SUPABASE_DB_URL` and replace `db.<project-ref>.supabase.co` with the IPv4 pooler host from your Supabase project settings.
2. Keep port `5432`.
3. Redeploy.

If that still fails, remove `SUPABASE_DB_URL` from Render, redeploy, and continue using ephemeral SQLite until the network issue is resolved.
