"""Knowledge graph visualization API routes."""

import json
import logging
from uuid import UUID
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status

from ...core.graph import KnowledgeGraph
from ...core.vsa import similarity, compute_session_vector, MODE_VECTORS
from ...db.database import DatabaseManager
from ..security import CurrentUser, get_current_user, require_user_id

router = APIRouter(prefix="/graph", tags=["graph"])
db = DatabaseManager()
logger = logging.getLogger(__name__)


@router.get("/nearest/{session_id}")
async def get_nearest_sessions(
    session_id: str,
    limit: int = 5,
    current_user: CurrentUser = Depends(get_current_user)
):
    """Get top-N most similar past sessions by VSA similarity."""
    try:
        session = db.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        user_id = session["user_id"]
        if current_user and current_user.id != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")

        query_vec_raw = session.get("vector")
        if not query_vec_raw:
            # Fall back to mode vector if no stored vector
            query_vec = compute_session_vector([session.get("mode_target", "CONVERGENT")])
        else:
            query_vec = json.loads(query_vec_raw)

        # Load all completed sessions for the same user with vectors
        all_sessions = db.get_user_sessions(user_id, limit=100)
        scored = []
        for s in all_sessions:
            if s["session_id"] == session_id:
                continue
            sv = s.get("vector")
            if sv:
                vec = json.loads(sv)
                score = similarity(query_vec, vec)
                if score > 0.05:
                    scored.append({
                        "session_id": s["session_id"],
                        "mode_target": s["mode_target"],
                        "similarity": round(score, 4),
                    })

        scored.sort(key=lambda x: x["similarity"], reverse=True)
        return {"nearest": scored[:limit]}

    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to get nearest sessions")
        raise HTTPException(status_code=500, detail="Failed to compute similarities")


@router.get("/{user_id}")
async def get_graph(user_id: UUID, current_user: CurrentUser = Depends(get_current_user)):
    """Get knowledge graph in D3.js JSON format for visualization."""
    safe_user_id = require_user_id(user_id, current_user)
    try:
        graph = KnowledgeGraph(safe_user_id, db)
        d3_data = graph.to_d3_json()
        return d3_data
    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to get knowledge graph")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not load graph.",
        )