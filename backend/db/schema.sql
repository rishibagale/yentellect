-- Yentellect Database Schema
-- 
-- Stores cognitive profiles, sessions, turns, knowledge graph data,
-- signal vectors, and session metrics.
-- All UUIDs use TEXT format for SQLite compatibility.

-- Users table (one per cognitive profile)
CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,                    -- UUID
    name TEXT NOT NULL DEFAULT '',
    dominant_mode TEXT,                          -- ThinkingMode enum value or NULL
    weakest_mode TEXT,                           -- ThinkingMode enum value or NULL
    session_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Sessions table (one per training session)
CREATE TABLE IF NOT EXISTS sessions (
    session_id TEXT PRIMARY KEY,                 -- UUID
    user_id TEXT NOT NULL,
    mode_target TEXT NOT NULL,                   -- ThinkingMode enum value
    turn_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',       -- 'active', 'completed', 'abandoned'
    summary TEXT,                                -- JSON summary from state machine
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    ended_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);

-- Concept nodes (knowledge graph vertices)
CREATE TABLE IF NOT EXISTS concept_nodes (
    concept_id TEXT PRIMARY KEY,                 -- UUID
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    domain TEXT NOT NULL,
    confidence_score REAL NOT NULL DEFAULT 1.0 CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
    last_reinforced TEXT NOT NULL DEFAULT (datetime('now')),
    session_count INTEGER NOT NULL DEFAULT 0,
    thinking_mode_association TEXT NOT NULL DEFAULT 'CONVERGENT',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_concept_nodes_user_id ON concept_nodes(user_id);
CREATE INDEX IF NOT EXISTS idx_concept_nodes_domain ON concept_nodes(domain);

-- Graph edges (knowledge graph edges)
CREATE TABLE IF NOT EXISTS graph_edges (
    edge_id TEXT PRIMARY KEY,                    -- AUTO uuid
    user_id TEXT NOT NULL,
    source_id TEXT NOT NULL,
    target_id TEXT NOT NULL,
    weight REAL NOT NULL DEFAULT 0.5 CHECK (weight >= 0.0 AND weight <= 1.0),
    connection_count INTEGER NOT NULL DEFAULT 0,
    last_activated TEXT NOT NULL DEFAULT (datetime('now')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (source_id) REFERENCES concept_nodes(concept_id) ON DELETE CASCADE,
    FOREIGN KEY (target_id) REFERENCES concept_nodes(concept_id) ON DELETE CASCADE,
    UNIQUE(user_id, source_id, target_id)
);
CREATE INDEX IF NOT EXISTS idx_graph_edges_user_id ON graph_edges(user_id);
CREATE INDEX IF NOT EXISTS idx_graph_edges_source ON graph_edges(source_id);
CREATE INDEX IF NOT EXISTS idx_graph_edges_target ON graph_edges(target_id);

-- Conversational turns (one per user message + system response)
CREATE TABLE IF NOT EXISTS turns (
    turn_id TEXT PRIMARY KEY,                    -- UUID
    session_id TEXT NOT NULL,
    turn_number INTEGER NOT NULL,
    user_input TEXT NOT NULL,
    response TEXT NOT NULL,
    predicted_mode TEXT NOT NULL,                -- ThinkingMode enum value
    confidence REAL NOT NULL CHECK (confidence >= 0.0 AND confidence <= 1.0),
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_turns_session_id ON turns(session_id);

-- Signal vectors (embedded in turns, indexed for analysis)
CREATE TABLE IF NOT EXISTS signal_vectors (
    signal_id TEXT PRIMARY KEY,                  -- UUID
    turn_id TEXT NOT NULL,
    type_token_ratio REAL NOT NULL DEFAULT 0.0,
    question_density REAL NOT NULL DEFAULT 0.0,
    hedge_word_rate REAL NOT NULL DEFAULT 0.0,
    self_correction_rate REAL NOT NULL DEFAULT 0.0,
    cross_domain_refs REAL NOT NULL DEFAULT 0.0,
    first_person_rate REAL NOT NULL DEFAULT 0.0,
    sentence_complexity REAL NOT NULL DEFAULT 0.0,
    ideational_fluency REAL NOT NULL DEFAULT 0.0,
    FOREIGN KEY (turn_id) REFERENCES turns(turn_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_signal_vectors_turn_id ON signal_vectors(turn_id);

-- Session metrics (end-of-session summary data)
CREATE TABLE IF NOT EXISTS session_metrics (
    metric_id TEXT PRIMARY KEY,                  -- UUID
    session_id TEXT NOT NULL,
    modes_activated TEXT,                        -- JSON array of ThinkingMode values
    concepts_added INTEGER NOT NULL DEFAULT 0,
    bridges_formed INTEGER NOT NULL DEFAULT 0,
    session_duration_seconds INTEGER NOT NULL DEFAULT 0,
    mode_scores TEXT,                            -- JSON: {mode: score}
    overall_score REAL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_session_metrics_session_id ON session_metrics(session_id);