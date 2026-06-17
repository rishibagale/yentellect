# Render Environment Variables

Set these in Render Dashboard → Backend Service → Environment → Environment Variables.

## Required

| Key | Value Example | Used In |
|-----|---------------|---------|
| `FRONTEND_URL` | `https://yentellect.vercel.app` | CORS whitelist (`backend/api/main.py`) |
| `GROQ_API_KEY` | `gsk_...` (your Groq key) | LLM responses (`backend/core/session.py`) |
| `SUPABASE_DB_URL` | `postgresql://postgres:[pass]@[host]:6543/postgres` | Production DB (`backend/db/database_supabase.py`) |

## How to Get the Values

### SUPABASE_DB_URL
1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/ygapudtdgcslbqhibgjl/settings/database)
2. Click **"Connection string"** → select **"URI"** tab
3. Copy the connection string (it includes the password)
4. Paste as `SUPABASE_DB_URL`

### GROQ_API_KEY
1. Go to [console.groq.com/keys](https://console.groq.com/keys)
2. Create a new API key
3. Paste as `GROQ_API_KEY`

### FRONTEND_URL
Use: `https://yentellect.vercel.app`

## After Setting Variables

Trigger a manual redeploy in Render Dashboard → **"Manual Deploy"** → **"Deploy latest commit"**.