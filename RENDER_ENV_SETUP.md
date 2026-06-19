# Render Environment Variables

Set these in Render Dashboard → Backend Service → Environment → Environment Variables.

## Required

| Key | Value Example | Used In |
|-----|---------------|---------|
| `FRONTEND_URL` | `https://yentellect.vercel.app` | CORS whitelist (`backend/api/main.py`) |
| `GROQ_API_KEY` | `gsk_...` (your Groq key) | LLM responses (`backend/core/session.py`) |
| `SUPABASE_DB_URL` | `postgresql://postgres:[pass]@[host]:5432/postgres` | Production DB (`backend/db/database_supabase.py`) |

## How to Get the Values

### SUPABASE_DB_URL
1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/ygapudtdgcslbqhibgjl/settings/database)
2. Click **"Connection string"** → select **"URI"** tab
3. Copy the connection string (it includes the password)
4. Replace `@db.<project>.supabase.co` with `@<project>.<region>.pooler.supabase.com`
5. Example final URL: `postgresql://postgres:[YOUR-PASSWORD]@<project>.<region>.pooler.supabase.com:5432/postgres`
6. Paste as `SUPABASE_DB_URL`

**Troubleshooting:**
- If Render shows `Network is unreachable` while connecting to `db.ygapudtdgcslbqhibgjl.supabase.co`, it usually means Render cannot route to Supabase over IPv6. Fix: change the `db.` host in the URL to the IPv4 pool host shown in Supabase settings. Example: replace `db.ygapudtdgcslbqhibgjl.supabase.co` with `aws-0-us-west-1.pooler.supabase.com`.
- Keep the database port in the URL as `5432` when using the pooler.
- Ensure `SYNC` is enabled for `SUPABASE_DB_URL` in `render.yaml` so Render actually supports this env var.
- After updating the URL to the pooler host, trigger a redeploy.
- If the connection still fails, omit `SUPABASE_DB_URL` in Render and redeploy to continue using ephemeral SQLite.

### GROQ_API_KEY
1. Go to [console.groq.com/keys](https://console.groq.com/keys)
2. Create a new API key
3. Paste as `GROQ_API_KEY`

### FRONTEND_URL
Use: `https://yentellect.vercel.app`

## After Setting Variables

Trigger a manual redeploy in Render Dashboard → **"Manual Deploy"** → **"Deploy latest commit"**.

If the dashboard still fails with `Network is unreachable` to `db.ygapudtdgcslbqhibgjl.supabase.co`, the Render egress path cannot reach the current Supabase host. Use this exact workaround:
1. In Render, edit the backend env var `SUPABASE_DB_URL` and replace `db.ygapudtdgcslbqhibgjl.supabase.co` with the IPv4 pooler host from your Supabase project settings.
2. Keep port `5432`.
3. Redeploy.

If that still fails, remove `SUPABASE_DB_URL` from Render, redeploy, and continue using ephemeral SQLite until the network issue is resolved.
