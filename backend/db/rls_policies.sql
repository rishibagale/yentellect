-- Yentellect Row-Level Security Policies for Supabase
-- 
-- These policies ensure users can only access their own data.
-- Run this in Supabase SQL Editor AFTER running schema_supabase.sql.
-- 
-- IMPORTANT: The backend uses SUPABASE_SERVICE_KEY which bypasses RLS.
-- These policies protect data when accessed via the anon key or
-- if the service key is ever compromised.

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE concept_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE graph_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_vectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_metrics ENABLE ROW LEVEL SECURITY;

-- ============================================
-- USERS table policies
-- ============================================

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
    ON users FOR SELECT
    USING (user_id = current_setting('request.jwt.claims')::json->>'sub');

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON users FOR UPDATE
    USING (user_id = current_setting('request.jwt.claims')::json->>'sub')
    WITH CHECK (user_id = current_setting('request.jwt.claims')::json->>'sub');

-- Users can insert their own profile (on signup)
CREATE POLICY "Users can insert own profile"
    ON users FOR INSERT
    WITH CHECK (user_id = current_setting('request.jwt.claims')::json->>'sub');

-- ============================================
-- SESSIONS table policies
-- ============================================

-- Users can read their own sessions
CREATE POLICY "Users can read own sessions"
    ON sessions FOR SELECT
    USING (user_id = current_setting('request.jwt.claims')::json->>'sub');

-- Users can create their own sessions
CREATE POLICY "Users can create own sessions"
    ON sessions FOR INSERT
    WITH CHECK (user_id = current_setting('request.jwt.claims')::json->>'sub');

-- Users can update their own sessions
CREATE POLICY "Users can update own sessions"
    ON sessions FOR UPDATE
    USING (user_id = current_setting('request.jwt.claims')::json->>'sub')
    WITH CHECK (user_id = current_setting('request.jwt.claims')::json->>'sub');

-- Users can delete their own sessions
CREATE POLICY "Users can delete own sessions"
    ON sessions FOR DELETE
    USING (user_id = current_setting('request.jwt.claims')::json->>'sub');

-- ============================================
-- CONCEPT_NODES table policies
-- ============================================

-- Users can read their own concept nodes
CREATE POLICY "Users can read own concept nodes"
    ON concept_nodes FOR SELECT
    USING (user_id = current_setting('request.jwt.claims')::json->>'sub');

-- Users can create their own concept nodes
CREATE POLICY "Users can create own concept nodes"
    ON concept_nodes FOR INSERT
    WITH CHECK (user_id = current_setting('request.jwt.claims')::json->>'sub');

-- Users can update their own concept nodes
CREATE POLICY "Users can update own concept nodes"
    ON concept_nodes FOR UPDATE
    USING (user_id = current_setting('request.jwt.claims')::json->>'sub')
    WITH CHECK (user_id = current_setting('request.jwt.claims')::json->>'sub');

-- Users can delete their own concept nodes
CREATE POLICY "Users can delete own concept nodes"
    ON concept_nodes FOR DELETE
    USING (user_id = current_setting('request.jwt.claims')::json->>'sub');

-- ============================================
-- GRAPH_EDGES table policies
-- ============================================

-- Users can read their own graph edges
CREATE POLICY "Users can read own graph edges"
    ON graph_edges FOR SELECT
    USING (user_id = current_setting('request.jwt.claims')::json->>'sub');

-- Users can create their own graph edges
CREATE POLICY "Users can create own graph edges"
    ON graph_edges FOR INSERT
    WITH CHECK (user_id = current_setting('request.jwt.claims')::json->>'sub');

-- Users can update their own graph edges
CREATE POLICY "Users can update own graph edges"
    ON graph_edges FOR UPDATE
    USING (user_id = current_setting('request.jwt.claims')::json->>'sub')
    WITH CHECK (user_id = current_setting('request.jwt.claims')::json->>'sub');

-- Users can delete their own graph edges
CREATE POLICY "Users can delete own graph edges"
    ON graph_edges FOR DELETE
    USING (user_id = current_setting('request.jwt.claims')::json->>'sub');

-- ============================================
-- TURNS table policies
-- ============================================

-- Users can read turns from their own sessions
CREATE POLICY "Users can read own session turns"
    ON turns FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM sessions
            WHERE sessions.session_id = turns.session_id
            AND sessions.user_id = current_setting('request.jwt.claims')::json->>'sub'
        )
    );

-- Users can create turns in their own sessions
CREATE POLICY "Users can create turns in own sessions"
    ON turns FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM sessions
            WHERE sessions.session_id = turns.session_id
            AND sessions.user_id = current_setting('request.jwt.claims')::json->>'sub'
        )
    );

-- ============================================
-- SIGNAL_VECTORS table policies
-- ============================================

-- Users can read signal vectors from their own session turns
CREATE POLICY "Users can read own signal vectors"
    ON signal_vectors FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM turns
            JOIN sessions ON sessions.session_id = turns.session_id
            WHERE turns.turn_id = signal_vectors.turn_id
            AND sessions.user_id = current_setting('request.jwt.claims')::json->>'sub'
        )
    );

-- Users can create signal vectors in their own sessions
CREATE POLICY "Users can create own signal vectors"
    ON signal_vectors FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM turns
            JOIN sessions ON sessions.session_id = turns.session_id
            WHERE turns.turn_id = signal_vectors.turn_id
            AND sessions.user_id = current_setting('request.jwt.claims')::json->>'sub'
        )
    );

-- ============================================
-- SESSION_METRICS table policies
-- ============================================

-- Users can read metrics from their own sessions
CREATE POLICY "Users can read own session metrics"
    ON session_metrics FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM sessions
            WHERE sessions.session_id = session_metrics.session_id
            AND sessions.user_id = current_setting('request.jwt.claims')::json->>'sub'
        )
    );

-- Users can create metrics for their own sessions
CREATE POLICY "Users can create own session metrics"
    ON session_metrics FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM sessions
            WHERE sessions.session_id = session_metrics.session_id
            AND sessions.user_id = current_setting('request.jwt.claims')::json->>'sub'
        )
    );

-- ============================================
-- Helper function for JWT user ID extraction
-- ============================================

-- Create a helper function to get the current user ID from JWT
CREATE OR REPLACE FUNCTION auth.user_id()
RETURNS TEXT
LANGUAGE SQL
STABLE
AS $$
  SELECT current_setting('request.jwt.claims')::json->>'sub';
$$;