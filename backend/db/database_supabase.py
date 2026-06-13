"""
Yentellect Database Layer for Supabase PostgreSQL

Async PostgreSQL database manager using asyncpg.
Replaces the SQLite DatabaseManager for production deployments.
"""

import os
import uuid
import json
import asyncio
from typing import Optional, Dict, Any, List
from datetime import datetime

import asyncpg


class SupabaseDatabaseManager:
    """
    Manages async PostgreSQL connection pool for Supabase.
    
    All methods are async. Use this in production with FastAPI's
    async route handlers.
    """

    def __init__(self, db_url: str = None, pool_size: int = 10):
        """
        Initialize database manager.
        
        Args:
            db_url: PostgreSQL connection string. Falls back to SUPABASE_DB_URL env var.
            pool_size: Connection pool size
        """
        self.db_url = db_url or os.getenv("SUPABASE_DB_URL", "")
        self.pool_size = pool_size
        self._pool: Optional[asyncpg.Pool] = None

    async def get_pool(self) -> asyncpg.Pool:
        """Get or create the asyncpg connection pool."""
        if self._pool is None:
            self._pool = await asyncpg.create_pool(
                self.db_url,
                min_size=2,
                max_size=self.pool_size,
                command_timeout=30,
            )
        return self._pool

    async def init_db(self) -> None:
        """Initialize database schema from the Supabase-compatible SQL file."""
        schema_path = os.path.join(
            os.path.dirname(__file__),
            "schema_supabase.sql"
        )
        if not os.path.exists(schema_path):
            raise FileNotFoundError(f"Schema file not found: {schema_path}")

        with open(schema_path, 'r') as f:
            schema_sql = f.read()

        pool = await self.get_pool()
        async with pool.acquire() as conn:
            await conn.execute(schema_sql)
        print("✅ Supabase database schema initialized.")

    async def close(self) -> None:
        """Close the connection pool."""
        if self._pool:
            await self._pool.close()
            self._pool = None
            print("Supabase database pool closed.")

    async def get_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user profile by ID."""
        pool = await self.get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM users WHERE user_id = $1", user_id
            )
            return dict(row) if row else None

    async def create_user(self, user_id: str, name: str = "") -> Dict[str, Any]:
        """Create a new user profile."""
        now = datetime.utcnow().isoformat()
        pool = await self.get_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                """INSERT INTO users (user_id, name, created_at, updated_at)
                   VALUES ($1, $2, $3, $4)""",
                user_id, name, now, now
            )
            row = await conn.fetchrow(
                "SELECT * FROM users WHERE user_id = $1", user_id
            )
            return dict(row)

    async def update_user_profile(self, user_id: str, **kwargs) -> Optional[Dict[str, Any]]:
        """Update user profile fields."""
        allowed_fields = {"name", "dominant_mode", "weakest_mode", "session_count"}
        updates = {k: v for k, v in kwargs.items() if k in allowed_fields}
        if not updates:
            return await self.get_user(user_id)

        updates["updated_at"] = datetime.utcnow().isoformat()
        set_clause = ", ".join(f"{k} = ${i+1}" for i, k in enumerate(updates))
        values = list(updates.values())
        values.append(user_id)

        pool = await self.get_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                f"UPDATE users SET {set_clause} WHERE user_id = ${len(values)}",
                *values
            )
            row = await conn.fetchrow(
                "SELECT * FROM users WHERE user_id = $1", user_id
            )
            return dict(row) if row else None

    async def create_session(self, session_id: str, user_id: str, mode_target: str) -> Dict[str, Any]:
        """Create a new session record."""
        now = datetime.utcnow().isoformat()
        pool = await self.get_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                """INSERT INTO sessions (session_id, user_id, mode_target, created_at)
                   VALUES ($1, $2, $3, $4)""",
                session_id, user_id, mode_target, now
            )
            row = await conn.fetchrow(
                "SELECT * FROM sessions WHERE session_id = $1", session_id
            )
            return dict(row)

    async def update_session(self, session_id: str, **kwargs) -> Optional[Dict[str, Any]]:
        """Update session fields."""
        allowed_fields = {"turn_count", "status", "summary", "ended_at"}
        updates = {k: v for k, v in kwargs.items() if k in allowed_fields}
        if not updates:
            return None

        set_clause = ", ".join(f"{k} = ${i+1}" for i, k in enumerate(updates))
        values = list(updates.values())
        values.append(session_id)

        pool = await self.get_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                f"UPDATE sessions SET {set_clause} WHERE session_id = ${len(values)}",
                *values
            )
            row = await conn.fetchrow(
                "SELECT * FROM sessions WHERE session_id = $1", session_id
            )
            return dict(row) if row else None

    async def get_user_sessions(self, user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Get user's sessions ordered by creation time."""
        pool = await self.get_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """SELECT * FROM sessions WHERE user_id = $1
                   ORDER BY created_at DESC LIMIT $2""",
                user_id, limit
            )
            return [dict(row) for row in rows]

    async def save_turn(self, turn_id: str, session_id: str, turn_number: int,
                        user_input: str, response: str, predicted_mode: str,
                        confidence: float) -> Dict[str, Any]:
        """Save a conversational turn."""
        now = datetime.utcnow().isoformat()
        pool = await self.get_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                """INSERT INTO turns (turn_id, session_id, turn_number, user_input,
                   response, predicted_mode, confidence, timestamp)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8)""",
                turn_id, session_id, turn_number, user_input,
                response, predicted_mode, confidence, now
            )
            row = await conn.fetchrow(
                "SELECT * FROM turns WHERE turn_id = $1", turn_id
            )
            return dict(row)

    async def save_signal_vector(self, signal_id: str, turn_id: str, **signals) -> Dict[str, Any]:
        """Save signal vector for a turn."""
        allowed_keys = {"type_token_ratio", "question_density", "hedge_word_rate",
                        "self_correction_rate", "cross_domain_refs", "first_person_rate",
                        "sentence_complexity", "ideational_fluency"}
        vec = {k: v for k, v in signals.items() if k in allowed_keys}

        columns = ["signal_id", "turn_id"] + list(vec.keys())
        placeholders = ", ".join(f"${i+1}" for i in range(len(columns)))
        values = [signal_id, turn_id] + list(vec.values())

        pool = await self.get_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                f"INSERT INTO signal_vectors ({', '.join(columns)}) VALUES ({placeholders})",
                *values
            )
            row = await conn.fetchrow(
                "SELECT * FROM signal_vectors WHERE signal_id = $1", signal_id
            )
            return dict(row)

    async def save_concept_node(self, concept_id: str, user_id: str, name: str,
                                domain: str, thinking_mode_association: str) -> Dict[str, Any]:
        """Save a knowledge graph concept node."""
        now = datetime.utcnow().isoformat()
        pool = await self.get_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                """INSERT INTO concept_nodes (concept_id, user_id, name, domain,
                   thinking_mode_association, last_reinforced, created_at)
                   VALUES ($1, $2, $3, $4, $5, $6, $7)""",
                concept_id, user_id, name, domain,
                thinking_mode_association, now, now
            )
            row = await conn.fetchrow(
                "SELECT * FROM concept_nodes WHERE concept_id = $1", concept_id
            )
            return dict(row)

    async def update_concept_node(self, concept_id: str, **kwargs) -> Optional[Dict[str, Any]]:
        """Update a concept node."""
        allowed_fields = {"confidence_score", "last_reinforced", "session_count",
                          "thinking_mode_association"}
        updates = {k: v for k, v in kwargs.items() if k in allowed_fields}
        if not updates:
            return None

        set_clause = ", ".join(f"{k} = ${i+1}" for i, k in enumerate(updates))
        values = list(updates.values())
        values.append(concept_id)

        pool = await self.get_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                f"UPDATE concept_nodes SET {set_clause} WHERE concept_id = ${len(values)}",
                *values
            )
            row = await conn.fetchrow(
                "SELECT * FROM concept_nodes WHERE concept_id = $1", concept_id
            )
            return dict(row) if row else None

    async def get_user_concepts(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all concept nodes for a user."""
        pool = await self.get_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT * FROM concept_nodes WHERE user_id = $1 ORDER BY name",
                user_id
            )
            return [dict(row) for row in rows]

    async def get_user_edges(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all graph edges for a user."""
        pool = await self.get_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT * FROM graph_edges WHERE user_id = $1",
                user_id
            )
            return [dict(row) for row in rows]

    async def save_session_metrics(self, metric_id: str, session_id: str,
                                    modes_activated: List[str],
                                    concepts_added: int, bridges_formed: int,
                                    session_duration_seconds: int,
                                    mode_scores: Dict[str, float],
                                    overall_score: float) -> Dict[str, Any]:
        """Save end-of-session metrics."""
        now = datetime.utcnow().isoformat()
        pool = await self.get_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                """INSERT INTO session_metrics (metric_id, session_id,
                   modes_activated, concepts_added, bridges_formed,
                   session_duration_seconds, mode_scores, overall_score, created_at)
                   VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7::jsonb, $8, $9)""",
                metric_id, session_id,
                json.dumps(modes_activated), concepts_added, bridges_formed,
                session_duration_seconds, json.dumps(mode_scores),
                overall_score, now
            )
            row = await conn.fetchrow(
                "SELECT * FROM session_metrics WHERE metric_id = $1",
                metric_id
            )
            return dict(row)

    async def get_session_metrics(self, user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Get session metrics for a user."""
        pool = await self.get_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """SELECT sm.* FROM session_metrics sm
                   JOIN sessions s ON sm.session_id = s.session_id
                   WHERE s.user_id = $1
                   ORDER BY sm.created_at DESC LIMIT $2""",
                user_id, limit
            )
            return [dict(row) for row in rows]