"""
Yentellect Database Layer for Supabase (REST API adapter)

Drop-in replacement for the SQLite DatabaseManager.
Uses Supabase REST endpoints over HTTPS (no direct Postgres connection).
Reads SUPABASE_URL and SUPABASE_SERVICE_KEY from environment.
"""

import logging
import os
import uuid
import json
from typing import Optional, Dict, Any, List
from datetime import datetime

import httpx


logger = logging.getLogger(__name__)


_SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

_HEADERS = {
    "apikey": _SERVICE_KEY,
    "Authorization": f"Bearer {_SERVICE_KEY}",
    "Prefer": "resolution=merge",  # upsert friendly
    "Content-Type": "application/json",
}


def _base() -> str:
    if not _SUPABASE_URL:
        raise ValueError("SUPABASE_URL is required")
    base = _SUPABASE_URL.replace("/rest/v1", "").replace("/rest/v1/", "")
    return base + "/rest/v1"


def _headers(extra: Optional[Dict[str, str]] = None) -> Dict[str, str]:
    h = dict(_HEADERS)
    if extra:
        h.update(extra)
    return h


class SupabaseDatabaseManager:
    """Manages data access via Supabase REST API."""

    def __init__(self, db_url: str = None):  # kept for signature compatibility
        if not _SUPABASE_URL or not _SERVICE_KEY:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY are required for REST adapter")

    # init_db cannot run SQL via REST; user should run backend/db/schema_supabase.sql once.
    def init_db(self) -> None:
        print("Supabase REST adapter: schema must be initialized via Supabase SQL Editor using backend/db/schema_supabase.sql")
        print("To initialize:")
        print("1. Open Supabase Dashboard -> SQL Editor")
        print("2. Paste contents of backend/db/schema_supabase.sql")
        print("3. Run it once to create tables")

    def _json_or_none(self, r: httpx.Response):
        try:
            text = r.text
            if not text.strip():
                return None
            return r.json()
        except Exception:
            return None

    def _check_response(self, r: httpx.Response, context: str) -> None:
        if r.is_success:
            return
        logger.warning("%s failed with Supabase REST status %s", context, r.status_code)
        raise RuntimeError(f"{context} failed")

    def get_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        with httpx.Client() as client:
            r = client.get(
                f"{_base()}/users",
                headers=_headers(),
                params={"user_id": f"eq.{user_id}", "select": "*"},
            )
            self._check_response(r, "get_user")
            rows = self._json_or_none(r)
            if isinstance(rows, list):
                return rows[0] if rows else None
            return None

    def create_user(self, user_id: str, name: str = "", *, provided_id: bool = True) -> Dict[str, Any]:
        now = datetime.utcnow().isoformat()
        if not provided_id or not user_id:
            user_id = str(uuid.uuid4())
        payload = {"user_id": user_id, "name": name, "created_at": now, "updated_at": now}
        with httpx.Client() as client:
            r = client.post(
                f"{_base()}/users",
                headers=_headers(),
                json=payload,
            )
            self._check_response(r, "create_user")
            row = self._json_or_none(r)
            if isinstance(row, list) and row:
                return row[0]
            return payload

    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        with httpx.Client() as client:
            r = client.get(
                f"{_base()}/sessions",
                headers=_headers(),
                params={"session_id": f"eq.{session_id}", "select": "*"},
            )
            self._check_response(r, "get_session")
            rows = self._json_or_none(r)
            if isinstance(rows, list):
                return rows[0] if rows else None
            return None

    def update_user_profile(self, user_id: str, **kwargs) -> Optional[Dict[str, Any]]:
        allowed_fields = {"name", "dominant_mode", "weakest_mode", "session_count"}
        updates = {k: v for k, v in kwargs.items() if k in allowed_fields}
        if not updates:
            return self.get_user(user_id)
        updates["updated_at"] = datetime.utcnow().isoformat()
        with httpx.Client() as client:
            r = client.patch(
                f"{_base()}/users",
                headers=_headers(),
                params={"user_id": f"eq.{user_id}"},
                json=updates,
            )
            self._check_response(r, "update_user_profile")
            rows = self._json_or_none(r)
            if isinstance(rows, list):
                return rows[0] if rows else None
            return None

    def create_session(self, session_id: str, user_id: str, mode_target: str) -> Dict[str, Any]:
        now = datetime.utcnow().isoformat()
        payload = {"session_id": session_id, "user_id": user_id, "mode_target": mode_target, "created_at": now}
        with httpx.Client() as client:
            r = client.post(
                f"{_base()}/sessions",
                headers=_headers(),
                json=payload,
            )
            self._check_response(r, "create_session")
            row = self._json_or_none(r)
            if isinstance(row, list) and row:
                return row[0]
            return payload

    def update_session(self, session_id: str, **kwargs) -> Optional[Dict[str, Any]]:
        allowed_fields = {"turn_count", "status", "summary", "ended_at", "started_at", "vector"}
        updates = {k: v for k, v in kwargs.items() if k in allowed_fields}
        if not updates:
            return None
        if "started_at" in updates and hasattr(updates["started_at"], "isoformat"):
            updates["started_at"] = updates["started_at"].isoformat()
        with httpx.Client() as client:
            r = client.patch(
                f"{_base()}/sessions",
                headers=_headers(),
                params={"session_id": f"eq.{session_id}"},
                json=updates,
            )
            self._check_response(r, "update_session")
            rows = self._json_or_none(r)
            if isinstance(rows, list):
                return rows[0] if rows else None
            return None

    def get_user_sessions(self, user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        with httpx.Client() as client:
            r = client.get(
                f"{_base()}/sessions",
                headers=_headers(),
                params={"user_id": f"eq.{user_id}", "order": "created_at.desc", "limit": str(limit)},
            )
            self._check_response(r, "get_user_sessions")
            return self._json_or_none(r) or []

    def save_turn(self, turn_id: str, session_id: str, turn_number: int,
                  user_input: str, response: str, predicted_mode: str,
                  confidence: float) -> Dict[str, Any]:
        now = datetime.utcnow().isoformat()
        payload = {
            "turn_id": turn_id, "session_id": session_id, "turn_number": turn_number,
            "user_input": user_input, "response": response,
            "predicted_mode": predicted_mode, "confidence": confidence, "timestamp": now,
        }
        with httpx.Client() as client:
            r = client.post(
                f"{_base()}/turns",
                headers=_headers(),
                json=payload,
            )
            self._check_response(r, "save_turn")
            row = self._json_or_none(r)
            if isinstance(row, list) and row:
                return row[0]
            return payload

    def save_signal_vector(self, signal_id: str, turn_id: str, **signals) -> Dict[str, Any]:
        allowed = {"type_token_ratio", "question_density", "hedge_word_rate",
                   "self_correction_rate", "cross_domain_refs", "first_person_rate",
                   "sentence_complexity", "ideational_fluency"}
        payload = {"signal_id": signal_id, "turn_id": turn_id}
        for k, v in signals.items():
            if k in allowed:
                payload[k] = v
        with httpx.Client() as client:
            r = client.post(
                f"{_base()}/signal_vectors",
                headers=_headers(),
                json=payload,
            )
            self._check_response(r, "save_signal_vector")
            row = self._json_or_none(r)
            if isinstance(row, list) and row:
                return row[0]
            return payload

    def save_concept_node(self, concept_id: str, user_id: str, name: str,
                          domain: str, thinking_mode_association: str) -> Dict[str, Any]:
        now = datetime.utcnow().isoformat()
        payload = {
            "concept_id": concept_id, "user_id": user_id, "name": name,
            "domain": domain, "thinking_mode_association": thinking_mode_association,
            "last_reinforced": now, "created_at": now,
        }
        with httpx.Client() as client:
            r = client.post(
                f"{_base()}/concept_nodes",
                headers=_headers(),
                json=payload,
            )
            self._check_response(r, "save_concept_node")
            row = self._json_or_none(r)
            if isinstance(row, list) and row:
                return row[0]
            return payload

    def update_concept_node(self, concept_id: str, **kwargs) -> Optional[Dict[str, Any]]:
        allowed = {"confidence_score", "last_reinforced", "session_count", "thinking_mode_association"}
        updates = {k: v for k, v in kwargs.items() if k in allowed}
        if not updates:
            return None
        if "last_reinforced" in updates and hasattr(updates["last_reinforced"], "isoformat"):
            updates["last_reinforced"] = updates["last_reinforced"].isoformat()
        with httpx.Client() as client:
            r = client.patch(
                f"{_base()}/concept_nodes",
                headers=_headers(),
                params={"concept_id": f"eq.{concept_id}"},
                json=updates,
            )
            self._check_response(r, "update_concept_node")
            rows = self._json_or_none(r)
            if isinstance(rows, list):
                return rows[0] if rows else None
            return None

    def get_user_concepts(self, user_id: str) -> List[Dict[str, Any]]:
        with httpx.Client() as client:
            r = client.get(
                f"{_base()}/concept_nodes",
                headers=_headers(),
                params={"user_id": f"eq.{user_id}", "order": "name"},
            )
            self._check_response(r, "get_user_concepts")
            return self._json_or_none(r) or []

    def get_user_edges(self, user_id: str) -> List[Dict[str, Any]]:
        with httpx.Client() as client:
            r = client.get(
                f"{_base()}/graph_edges",
                headers=_headers(),
                params={"user_id": f"eq.{user_id}"},
            )
            self._check_response(r, "get_user_edges")
            return self._json_or_none(r) or []

    def save_session_metrics(self, metric_id: str, session_id: str,
                             modes_activated: List[str],
                             concepts_added: int, bridges_formed: int,
                             session_duration_seconds: int,
                             mode_scores: Dict[str, float],
                             overall_score: float) -> Dict[str, Any]:
        now = datetime.utcnow().isoformat()
        payload = {
            "metric_id": metric_id, "session_id": session_id,
            "modes_activated": modes_activated, "concepts_added": concepts_added,
            "bridges_formed": bridges_formed, "session_duration_seconds": session_duration_seconds,
            "mode_scores": mode_scores, "overall_score": overall_score, "created_at": now,
        }
        with httpx.Client() as client:
            r = client.post(
                f"{_base()}/session_metrics",
                headers=_headers(),
                json=payload,
            )
            self._check_response(r, "save_session_metrics")
            row = self._json_or_none(r)
            return row[0] if isinstance(row, list) and row else payload

    def get_session_turns(self, session_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent turns for a session to build conversation history."""
        with httpx.Client() as client:
            r = client.get(
                f"{_base()}/turns",
                headers=_headers(),
                params={"session_id": f"eq.{session_id}", "order": "turn_number.asc", "limit": str(limit)},
            )
            self._check_response(r, "get_session_turns")
            rows = self._json_or_none(r) or []
            return [
                {"user_input": row.get("user_input", ""), "response": row.get("response", "")}
                for row in rows
            ]

    def get_dashboard_batch(self, user_id: str, limit: int = 20) -> Dict[str, Any]:
        """Fetch dashboard data in 2 REST calls instead of 5+."""
        import httpx
        with httpx.Client() as client:
            # 1) Get user
            r_user = client.get(
                f"{_base()}/users",
                headers=_headers(),
                params={"user_id": f"eq.{user_id}", "select": "*"},
            )
            self._check_response(r_user, "get_dashboard_batch(user)")
            users = self._json_or_none(r_user) or []
            user = users[0] if users else None

            # 2) Get sessions + metrics in one pass
            r_sessions = client.get(
                f"{_base()}/sessions",
                headers=_headers(),
                params={"user_id": f"eq.{user_id}", "order": "created_at.desc", "limit": str(limit), "select": "session_id"},
            )
            self._check_response(r_sessions, "get_dashboard_batch(sessions)")
            sessions = self._json_or_none(r_sessions) or []
            session_ids = [s["session_id"] for s in sessions if s.get("session_id")]

            metrics = []
            concepts = []
            edges = []

            if session_ids:
                in_clause = "in.(" + ",".join(session_ids) + ")"
                # Fetch metrics for all sessions in one call
                r_metrics = client.get(
                    f"{_base()}/session_metrics",
                    headers=_headers(),
                    params={"session_id": in_clause, "order": "created_at.desc"},
                )
                try:
                    self._check_response(r_metrics, "get_dashboard_batch(metrics)")
                    metrics = self._json_or_none(r_metrics) or []
                except RuntimeError:
                    pass

            # 3) Fetch concepts + edges in parallel (single connection, sequential fine)
            r_concepts = client.get(
                f"{_base()}/concept_nodes",
                headers=_headers(),
                params={"user_id": f"eq.{user_id}", "order": "name"},
            )
            try:
                self._check_response(r_concepts, "get_dashboard_batch(concepts)")
                concepts = self._json_or_none(r_concepts) or []
            except RuntimeError:
                pass

            r_edges = client.get(
                f"{_base()}/graph_edges",
                headers=_headers(),
                params={"user_id": f"eq.{user_id}"},
            )
            try:
                self._check_response(r_edges, "get_dashboard_batch(edges)")
                edges = self._json_or_none(r_edges) or []
            except RuntimeError:
                pass

            return {
                "user": user,
                "sessions": sessions,
                "metrics": metrics[:limit],
                "concepts": concepts,
                "edges": edges,
            }

    def get_session_metrics(self, user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        with httpx.Client() as client:
            # session_metrics does not have user_id; resolve via sessions first.
            s_r = client.get(
                f"{_base()}/sessions",
                headers=_headers(),
                params={"user_id": f"eq.{user_id}", "order": "created_at.desc", "limit": str(limit), "select": "session_id"},
            )
            try:
                self._check_response(s_r, "get_session_metrics(sessions)")
            except RuntimeError as e:
                msg = str(e)
                if "relation" in msg and "does not exist" in msg:
                    return []
                raise
            sessions = self._json_or_none(s_r) or []
            session_ids = [s["session_id"] for s in sessions if s.get("session_id")]
            if not session_ids:
                return []
            in_clause = "in.(" + ",".join(session_ids) + ")"
            r = client.get(
                f"{_base()}/session_metrics",
                headers=_headers(),
                params={"session_id": in_clause, "order": "created_at.desc"},
            )
            self._check_response(r, "get_session_metrics")
            data = self._json_or_none(r)
            if isinstance(data, list):
                return data[:limit]
            return []
