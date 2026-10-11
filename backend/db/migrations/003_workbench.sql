-- Migration 003: Add workbench persistence columns
-- Stores workbench UI state, user preferences, and imported document per session

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS layout JSONB,
  ADD COLUMN IF NOT EXISTS user_field TEXT,
  ADD COLUMN IF NOT EXISTS beta_modes BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS doc JSONB;

-- Index for finding sessions with workbench state
CREATE INDEX IF NOT EXISTS idx_sessions_layout ON sessions USING GIN (layout);
CREATE INDEX IF NOT EXISTS idx_sessions_doc ON sessions USING GIN (doc);