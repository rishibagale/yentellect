-- Migration 002: Add VSA session vector column
-- Stores the 512-dim composite vector as JSONB array

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS vector JSONB;

-- Index for faster lookups (GIN on JSONB)
CREATE INDEX IF NOT EXISTS idx_sessions_vector ON sessions USING GIN (vector);

-- Index for user-based queries
CREATE INDEX IF NOT EXISTS idx_sessions_user_vector ON sessions(user_id) WHERE vector IS NOT NULL;