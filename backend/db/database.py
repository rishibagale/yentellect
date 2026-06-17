"""
Yentellect Database Layer

SQLite database manager with context manager support.
Async-compatible for FastAPI integration.
Uses connection pooling via sqlite3.
"""

import os
import sqlite3
import uuid
from typing import Optional, Generator, AsyncGenerator, Dict, Any, List
from contextlib import contextmanager, asynccontextmanager
from pathlib import Path
from datetime import datetime
import json


# Default database path
DEFAULT_DB_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "yentellect.db"
)


class DatabaseManager:
    """
    Manages SQLite database connection and schema initialization.
    
    Provides context managers for sync and async access.
    Thread-safe via SQLite's WAL mode.
    
    In production (Render), set SUPABASE_DB_URL env var to use
    SupabasePostgreSQL instead. Falls back to SQLite if not set.
    """
    
    def __init__(self, db_path: str = None):
        """
        Initialize database manager.
        
        Args:
            db_path: Path to SQLite database file. Defaults to project root.
        """
        # Auto-detect production database
        supabase_url = os.getenv("SUPABASE_DB_URL", "")
        if supabase_url:
            # Production: use Supabase PostgreSQL via database_supabase.py
            from .database_supabase import SupabaseDatabaseManager
            self._impl = SupabaseDatabaseManager(db_url=supabase_url)
            self._using_supabase = True
        else:
            # Local dev: use SQLite
            import warnings
            warnings.warn(
                "SUPABASE_DB_URL not set. Using ephemeral SQLite. "
                "Data will reset on every Render deploy. "
                "See RENDER_ENV_SETUP.md for setup.",
                RuntimeWarning
            )
            self.db_path = db_path or DEFAULT_DB_PATH
            self._schema_path = os.path.join(
                os.path.dirname(__file__),
                "schema.sql"
            )
            self._using_supabase = False
            self._impl = None
        
    def get_connection(self) -> sqlite3.Connection:
        """
        Get a new SQLite connection with optimized settings.
        
        Returns:
            sqlite3.Connection with WAL mode and foreign keys enabled.
        """
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
        conn.execute("PRAGMA busy_timeout=5000")
        return conn
    
    @contextmanager
    def get_db(self) -> Generator[sqlite3.Connection, None, None]:
        """
        Context manager for database access.
        
        Yields:
            sqlite3.Connection with automatic commit/rollback.
        """
        conn = self.get_connection()
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()
    
    def init_db(self) -> None:
        """
        Initialize database schema.
        
        Runs schema.sql to create all tables and indexes.
        Safe to call multiple times (uses IF NOT EXISTS).
        """
        schema_path = self._schema_path
        if not os.path.exists(schema_path):
            raise FileNotFoundError(f"Schema file not found: {schema_path}")
        
        with open(schema_path, 'r') as f:
            schema_sql = f.read()
        
        with self.get_db() as conn:
            conn.executescript(schema_sql)
    
    def get_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Get user profile by ID.
        
        Args:
            user_id: User UUID
            
        Returns:
            Dict with user data or None
        """
        with self.get_db() as conn:
            cursor = conn.execute(
                "SELECT * FROM users WHERE user_id = ?",
                (user_id,)
            )
            row = cursor.fetchone()
            return dict(row) if row else None
    
    def create_user(self, user_id: str, name: str = "") -> Dict[str, Any]:
        """
        Create a new user profile.
        
        Args:
            user_id: UUID for the new user
            name: Display name
            
        Returns:
            Dict with created user data
        """
        now = datetime.utcnow().isoformat()
        with self.get_db() as conn:
            conn.execute(
                """INSERT INTO users (user_id, name, created_at, updated_at)
                   VALUES (?, ?, ?, ?)""",
                (user_id, name, now, now)
            )
            cursor = conn.execute(
                "SELECT * FROM users WHERE user_id = ?",
                (user_id,)
            )
            return dict(cursor.fetchone())
    
    def update_user_profile(self, user_id: str, **kwargs) -> Optional[Dict[str, Any]]:
        """
        Update user profile fields.
        
        Args:
            user_id: User UUID
            **kwargs: Fields to update
            
        Returns:
            Updated user dict or None
        """
        allowed_fields = {"name", "dominant_mode", "weakest_mode", "session_count"}
        updates = {k: v for k, v in kwargs.items() if k in allowed_fields}
        if not updates:
            return self.get_user(user_id)
        
        updates["updated_at"] = datetime.utcnow().isoformat()
        set_clause = ", ".join(f"{k} = ?" for k in updates)
        values = list(updates.values()) + [user_id]
        
        with self.get_db() as conn:
            conn.execute(
                f"UPDATE users SET {set_clause} WHERE user_id = ?",
                values
            )
            cursor = conn.execute(
                "SELECT * FROM users WHERE user_id = ?",
                (user_id,)
            )
            row = cursor.fetchone()
            return dict(row) if row else None
    
    def create_session(self, session_id: str, user_id: str, mode_target: str) -> Dict[str, Any]:
        """
        Create a new session record.
        
        Args:
            session_id: UUID for the session
            user_id: User UUID
            mode_target: ThinkingMode value
            
        Returns:
            Dict with created session data
        """
        now = datetime.utcnow().isoformat()
        with self.get_db() as conn:
            conn.execute(
                """INSERT INTO sessions (session_id, user_id, mode_target, created_at)
                   VALUES (?, ?, ?, ?)""",
                (session_id, user_id, mode_target, now)
            )
            cursor = conn.execute(
                "SELECT * FROM sessions WHERE session_id = ?",
                (session_id,)
            )
            return dict(cursor.fetchone())
    
    def update_session(self, session_id: str, **kwargs) -> Optional[Dict[str, Any]]:
        """
        Update session fields.
        
        Args:
            session_id: Session UUID
            **kwargs: Fields to update
            
        Returns:
            Updated session dict or None
        """
        allowed_fields = {"turn_count", "status", "summary", "ended_at"}
        updates = {k: v for k, v in kwargs.items() if k in allowed_fields}
        if not updates:
            return None
        
        set_clause = ", ".join(f"{k} = ?" for k in updates)
        values = list(updates.values()) + [session_id]
        
        with self.get_db() as conn:
            conn.execute(
                f"UPDATE sessions SET {set_clause} WHERE session_id = ?",
                values
            )
            cursor = conn.execute(
                "SELECT * FROM sessions WHERE session_id = ?",
                (session_id,)
            )
            row = cursor.fetchone()
            return dict(row) if row else None
    
    def get_user_sessions(self, user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """
        Get user's sessions ordered by creation time.
        
        Args:
            user_id: User UUID
            limit: Max number of sessions to return
            
        Returns:
            List of session dicts
        """
        with self.get_db() as conn:
            cursor = conn.execute(
                """SELECT * FROM sessions WHERE user_id = ?
                   ORDER BY created_at DESC LIMIT ?""",
                (user_id, limit)
            )
            return [dict(row) for row in cursor.fetchall()]
    
    def save_turn(self, turn_id: str, session_id: str, turn_number: int,
                  user_input: str, response: str, predicted_mode: str,
                  confidence: float) -> Dict[str, Any]:
        """
        Save a conversational turn.
        
        Args:
            turn_id: UUID for the turn
            session_id: Session UUID
            turn_number: Sequential turn number
            user_input: User's message
            response: Yentellect's response
            predicted_mode: Classified thinking mode
            confidence: Classification confidence
            
        Returns:
            Dict with created turn data
        """
        now = datetime.utcnow().isoformat()
        with self.get_db() as conn:
            conn.execute(
                """INSERT INTO turns (turn_id, session_id, turn_number, user_input,
                   response, predicted_mode, confidence, timestamp)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (turn_id, session_id, turn_number, user_input,
                 response, predicted_mode, confidence, now)
            )
            cursor = conn.execute(
                "SELECT * FROM turns WHERE turn_id = ?",
                (turn_id,)
            )
            return dict(cursor.fetchone())
    
    def save_signal_vector(self, signal_id: str, turn_id: str, **signals) -> Dict[str, Any]:
        """
        Save signal vector for a turn.
        
        Args:
            signal_id: UUID
            turn_id: Turn UUID
            **signals: SignalVector fields
            
        Returns:
            Dict with created signal vector data
        """
        columns = ["signal_id", "turn_id"]
        values = [signal_id, turn_id]
        
        for key, value in signals.items():
            if key in ("type_token_ratio", "question_density", "hedge_word_rate",
                       "self_correction_rate", "cross_domain_refs", "first_person_rate",
                       "sentence_complexity", "ideational_fluency"):
                columns.append(key)
                values.append(value)
        
        placeholders = ", ".join("?" for _ in columns)
        columns_str = ", ".join(columns)
        
        with self.get_db() as conn:
            conn.execute(
                f"INSERT INTO signal_vectors ({columns_str}) VALUES ({placeholders})",
                values
            )
            cursor = conn.execute(
                "SELECT * FROM signal_vectors WHERE signal_id = ?",
                (signal_id,)
            )
            return dict(cursor.fetchone())
    
    def save_concept_node(self, concept_id: str, user_id: str, name: str,
                          domain: str, thinking_mode_association: str) -> Dict[str, Any]:
        """
        Save a knowledge graph concept node.
        
        Args:
            concept_id: UUID
            user_id: User UUID
            name: Concept name
            domain: Concept domain
            thinking_mode_association: Associated thinking mode
            
        Returns:
            Dict with created concept node data
        """
        now = datetime.utcnow().isoformat()
        with self.get_db() as conn:
            conn.execute(
                """INSERT INTO concept_nodes (concept_id, user_id, name, domain,
                   thinking_mode_association, last_reinforced, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (concept_id, user_id, name, domain,
                 thinking_mode_association, now, now)
            )
            cursor = conn.execute(
                "SELECT * FROM concept_nodes WHERE concept_id = ?",
                (concept_id,)
            )
            return dict(cursor.fetchone())
    
    def update_concept_node(self, concept_id: str, **kwargs) -> Optional[Dict[str, Any]]:
        """
        Update a concept node.
        
        Args:
            concept_id: Concept UUID
            **kwargs: Fields to update
            
        Returns:
            Updated concept node dict or None
        """
        allowed_fields = {"confidence_score", "last_reinforced", "session_count",
                         "thinking_mode_association"}
        updates = {k: v for k, v in kwargs.items() if k in allowed_fields}
        if not updates:
            return None
        
        set_clause = ", ".join(f"{k} = ?" for k in updates)
        values = list(updates.values()) + [concept_id]
        
        with self.get_db() as conn:
            conn.execute(
                f"UPDATE concept_nodes SET {set_clause} WHERE concept_id = ?",
                values
            )
            cursor = conn.execute(
                "SELECT * FROM concept_nodes WHERE concept_id = ?",
                (concept_id,)
            )
            row = cursor.fetchone()
            return dict(row) if row else None
    
    def get_user_concepts(self, user_id: str) -> List[Dict[str, Any]]:
        """
        Get all concept nodes for a user.
        
        Args:
            user_id: User UUID
            
        Returns:
            List of concept node dicts
        """
        with self.get_db() as conn:
            cursor = conn.execute(
                "SELECT * FROM concept_nodes WHERE user_id = ? ORDER BY name",
                (user_id,)
            )
            return [dict(row) for row in cursor.fetchall()]
    
    def get_user_edges(self, user_id: str) -> List[Dict[str, Any]]:
        """
        Get all graph edges for a user.
        
        Args:
            user_id: User UUID
            
        Returns:
            List of edge dicts
        """
        with self.get_db() as conn:
            cursor = conn.execute(
                "SELECT * FROM graph_edges WHERE user_id = ?",
                (user_id,)
            )
            return [dict(row) for row in cursor.fetchall()]
    
    def save_session_metrics(self, metric_id: str, session_id: str,
                             modes_activated: List[str],
                             concepts_added: int, bridges_formed: int,
                             session_duration_seconds: int,
                             mode_scores: Dict[str, float],
                             overall_score: float) -> Dict[str, Any]:
        """
        Save end-of-session metrics.
        
        Args:
            metric_id: UUID
            session_id: Session UUID
            modes_activated: List of modes used
            concepts_added: Number of new concepts
            bridges_formed: Number of new bridges
            session_duration_seconds: Duration in seconds
            mode_scores: Dict of mode name to score
            overall_score: Overall session score
            
        Returns:
            Dict with created metrics
        """
        now = datetime.utcnow().isoformat()
        with self.get_db() as conn:
            conn.execute(
                """INSERT INTO session_metrics (metric_id, session_id,
                   modes_activated, concepts_added, bridges_formed,
                   session_duration_seconds, mode_scores, overall_score, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (metric_id, session_id,
                 json.dumps(modes_activated), concepts_added, bridges_formed,
                 session_duration_seconds, json.dumps(mode_scores),
                 overall_score, now)
            )
            cursor = conn.execute(
                "SELECT * FROM session_metrics WHERE metric_id = ?",
                (metric_id,)
            )
            return dict(cursor.fetchone())
    
    def get_session_metrics(self, user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """
        Get session metrics for a user.
        
        Args:
            user_id: User UUID
            limit: Max number of results
            
        Returns:
            List of metrics dicts
        """
        with self.get_db() as conn:
            cursor = conn.execute(
                """SELECT sm.* FROM session_metrics sm
                   JOIN sessions s ON sm.session_id = s.session_id
                   WHERE s.user_id = ?
                   ORDER BY sm.created_at DESC LIMIT ?""",
                (user_id, limit)
            )
            return [dict(row) for row in cursor.fetchall()]


# Global instance for convenience
db = DatabaseManager()


def get_db() -> DatabaseManager:
    """Get the global database manager instance."""
    return db


def init_db() -> None:
    """Initialize the database schema using the global manager."""
    db.init_db()