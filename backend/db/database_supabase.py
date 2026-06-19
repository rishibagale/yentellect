"""
Yentellect Database Layer for Supabase PostgreSQL

Synchronous psycopg2 database manager.
Drop-in replacement for the SQLite DatabaseManager.
"""

import os
import uuid
import json
from typing import Optional, Dict, Any, List
from datetime import datetime

import psycopg2
from psycopg2 import sql


class SupabaseDatabaseManager:
    """Manages synchronous PostgreSQL connection for Supabase."""

    def __init__(self, db_url: str = None):
        self.db_url = db_url or os.getenv("SUPABASE_DB_URL", "")
        if not self.db_url:
            raise ValueError("SUPABASE_DB_URL is required for SupabaseDatabaseManager")
        if "db@" in self.db_url or self.db_url.count("@") != 1:
            raise ValueError(
                "Malformed SUPABASE_DB_URL. It must look like: "
                "postgresql://postgres:<password>@<host>:5432/postgres. "
                f"Got: {self.db_url}"
            )

    def get_connection(self):
        try:
            return psycopg2.connect(self.db_url)
        except Exception as e:
            raise RuntimeError(
                f"Failed to connect to Supabase with SUPABASE_DB_URL={self.db_url!r}. "
                f"Error: {e}"
            ) from e

    def init_db(self) -> None:
        schema_path = os.path.join(
            os.path.dirname(__file__),
            "schema_supabase.sql"
        )
        if not os.path.exists(schema_path):
            raise FileNotFoundError(f"Schema file not found: {schema_path}")

        with open(schema_path, 'r') as f:
            schema_sql = f.read()

        with self.get_connection() as conn:
            with conn.cursor() as cur:
                for statement in schema_sql.split(";"):
                    statement = statement.strip()
                    if statement:
                        cur.execute(statement)
            conn.commit()
        print("Supabase database schema initialized.")

    def get_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM users WHERE user_id = %s", (user_id,))
                row = cur.fetchone()
                if row:
                    cols = [desc[0] for desc in cur.description]
                    return dict(zip(cols, row))
                return None

    def create_user(self, user_id: str, name: str = "") -> Dict[str, Any]:
        now = datetime.utcnow().isoformat()
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """INSERT INTO users (user_id, name, created_at, updated_at)
                       VALUES (%s, %s, %s, %s)""",
                    (user_id, name, now, now)
                )
                cur.execute("SELECT * FROM users WHERE user_id = %s", (user_id,))
                row = cur.fetchone()
                if row:
                    cols = [desc[0] for desc in cur.description]
                    return dict(zip(cols, row))
                raise RuntimeError("Failed to create user")

    def update_user_profile(self, user_id: str, **kwargs) -> Optional[Dict[str, Any]]:
        allowed_fields = {"name", "dominant_mode", "weakest_mode", "session_count"}
        updates = {k: v for k, v in kwargs.items() if k in allowed_fields}
        if not updates:
            return self.get_user(user_id)

        updates["updated_at"] = datetime.utcnow().isoformat()
        set_clause = sql.SQL(", ").join(sql.SQL("{} = %s").format(sql.Identifier(k)) for k in updates)
        values = list(updates.values()) + [user_id]

        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    sql.SQL("UPDATE users SET {} WHERE user_id = %s").format(set_clause),
                    values
                )
                cur.execute("SELECT * FROM users WHERE user_id = %s", (user_id,))
                row = cur.fetchone()
                if row:
                    cols = [desc[0] for desc in cur.description]
                    return dict(zip(cols, row))
                return None

    def create_session(self, session_id: str, user_id: str, mode_target: str) -> Dict[str, Any]:
        now = datetime.utcnow().isoformat()
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """INSERT INTO sessions (session_id, user_id, mode_target, created_at)
                       VALUES (%s, %s, %s, %s)""",
                    (session_id, user_id, mode_target, now)
                )
                cur.execute("SELECT * FROM sessions WHERE session_id = %s", (session_id,))
                row = cur.fetchone()
                if row:
                    cols = [desc[0] for desc in cur.description]
                    return dict(zip(cols, row))
                raise RuntimeError("Failed to create session")

    def update_session(self, session_id: str, **kwargs) -> Optional[Dict[str, Any]]:
        allowed_fields = {"turn_count", "status", "summary", "ended_at"}
        updates = {k: v for k, v in kwargs.items() if k in allowed_fields}
        if not updates:
            return None

        set_clause = sql.SQL(", ").join(sql.SQL("{} = %s").format(sql.Identifier(k)) for k in updates)
        values = list(updates.values()) + [session_id]

        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    sql.SQL("UPDATE sessions SET {} WHERE session_id = %s").format(set_clause),
                    values
                )
                cur.execute("SELECT * FROM sessions WHERE session_id = %s", (session_id,))
                row = cur.fetchone()
                if row:
                    cols = [desc[0] for desc in cur.description]
                    return dict(zip(cols, row))
                return None

    def get_user_sessions(self, user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """SELECT * FROM sessions WHERE user_id = %s
                       ORDER BY created_at DESC LIMIT %s""",
                    (user_id, limit)
                )
                rows = cur.fetchall()
                if rows:
                    cols = [desc[0] for desc in cur.description]
                    return [dict(zip(cols, row)) for row in rows]
                return []

    def save_turn(self, turn_id: str, session_id: str, turn_number: int,
                  user_input: str, response: str, predicted_mode: str,
                  confidence: float) -> Dict[str, Any]:
        now = datetime.utcnow().isoformat()
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """INSERT INTO turns (turn_id, session_id, turn_number, user_input,
                       response, predicted_mode, confidence, timestamp)
                       VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
                    (turn_id, session_id, turn_number, user_input,
                     response, predicted_mode, confidence, now)
                )
                cur.execute("SELECT * FROM turns WHERE turn_id = %s", (turn_id,))
                row = cur.fetchone()
                if row:
                    cols = [desc[0] for desc in cur.description]
                    return dict(zip(cols, row))
                raise RuntimeError("Failed to save turn")

    def save_signal_vector(self, signal_id: str, turn_id: str, **signals) -> Dict[str, Any]:
        allowed_keys = {"type_token_ratio", "question_density", "hedge_word_rate",
                        "self_correction_rate", "cross_domain_refs", "first_person_rate",
                        "sentence_complexity", "ideational_fluency"}
        vec = {k: v for k, v in signals.items() if k in allowed_keys}

        columns = ["signal_id", "turn_id"] + list(vec.keys())
        placeholders = ", ".join(["%s"] * len(columns))
        values = [signal_id, turn_id] + list(vec.values())

        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    f"INSERT INTO signal_vectors ({', '.join(columns)}) VALUES ({placeholders})",
                    values
                )
                cur.execute("SELECT * FROM signal_vectors WHERE signal_id = %s", (signal_id,))
                row = cur.fetchone()
                if row:
                    cols = [desc[0] for desc in cur.description]
                    return dict(zip(cols, row))
                raise RuntimeError("Failed to save signal vector")

    def save_concept_node(self, concept_id: str, user_id: str, name: str,
                          domain: str, thinking_mode_association: str) -> Dict[str, Any]:
        now = datetime.utcnow().isoformat()
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """INSERT INTO concept_nodes (concept_id, user_id, name, domain,
                       thinking_mode_association, last_reinforced, created_at)
                       VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                    (concept_id, user_id, name, domain,
                     thinking_mode_association, now, now)
                )
                cur.execute("SELECT * FROM concept_nodes WHERE concept_id = %s", (concept_id,))
                row = cur.fetchone()
                if row:
                    cols = [desc[0] for desc in cur.description]
                    return dict(zip(cols, row))
                raise RuntimeError("Failed to save concept node")

    def update_concept_node(self, concept_id: str, **kwargs) -> Optional[Dict[str, Any]]:
        allowed_fields = {"confidence_score", "last_reinforced", "session_count",
                         "thinking_mode_association"}
        updates = {k: v for k, v in kwargs.items() if k in allowed_fields}
        if not updates:
            return None

        set_clause = sql.SQL(", ").join(sql.SQL("{} = %s").format(sql.Identifier(k)) for k in updates)
        values = list(updates.values()) + [concept_id]

        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    sql.SQL("UPDATE concept_nodes SET {} WHERE concept_id = %s").format(set_clause),
                    values
                )
                cur.execute("SELECT * FROM concept_nodes WHERE concept_id = %s", (concept_id,))
                row = cur.fetchone()
                if row:
                    cols = [desc[0] for desc in cur.description]
                    return dict(zip(cols, row))
                return None

    def get_user_concepts(self, user_id: str) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT * FROM concept_nodes WHERE user_id = %s ORDER BY name",
                    (user_id,)
                )
                rows = cur.fetchall()
                if rows:
                    cols = [desc[0] for desc in cur.description]
                    return [dict(zip(cols, row)) for row in rows]
                return []

    def get_user_edges(self, user_id: str) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT * FROM graph_edges WHERE user_id = %s",
                    (user_id,)
                )
                rows = cur.fetchall()
                if rows:
                    cols = [desc[0] for desc in cur.description]
                    return [dict(zip(cols, row)) for row in rows]
                return []

    def save_session_metrics(self, metric_id: str, session_id: str,
                             modes_activated: List[str],
                             concepts_added: int, bridges_formed: int,
                             session_duration_seconds: int,
                             mode_scores: Dict[str, float],
                             overall_score: float) -> Dict[str, Any]:
        now = datetime.utcnow().isoformat()
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """INSERT INTO session_metrics (metric_id, session_id,
                       modes_activated, concepts_added, bridges_formed,
                       session_duration_seconds, mode_scores, overall_score, created_at)
                       VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                    (metric_id, session_id,
                     json.dumps(modes_activated), concepts_added, bridges_formed,
                     session_duration_seconds, json.dumps(mode_scores),
                     overall_score, now)
                )
                cur.execute("SELECT * FROM session_metrics WHERE metric_id = %s", (metric_id,))
                row = cur.fetchone()
                if row:
                    cols = [desc[0] for desc in cur.description]
                    return dict(zip(cols, row))
                raise RuntimeError("Failed to save session metrics")

    def get_session_metrics(self, user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """SELECT sm.* FROM session_metrics sm
                       JOIN sessions s ON sm.session_id = s.session_id
                       WHERE s.user_id = %s
                       ORDER BY sm.created_at DESC LIMIT %s""",
                    (user_id, limit)
                )
                rows = cur.fetchall()
                if rows:
                    cols = [desc[0] for desc in cur.description]
                    return [dict(zip(cols, row)) for row in rows]
                return []