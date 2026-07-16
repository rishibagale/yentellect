"""Knowledge graph visualization API routes."""

import json
import logging
from uuid import UUID
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from ...core.graph import KnowledgeGraph
from ...core.vsa import similarity, compute_session_vector
from ...db.database import DatabaseManager
from ..security import CurrentUser, get_current_user, require_user_id

router = APIRouter(prefix="/graph", tags=["graph"])
db = DatabaseManager()
logger = logging.getLogger(__name__)


class FuseRequest(BaseModel):
    session_a_id: str = Field(..., description="First session UUID to fuse")
    session_b_id: str = Field(..., description="Second session UUID to fuse")


@router.get("/nearest/{session_id}")
async def get_nearest_sessions(
    session_id: str,
    limit: int = 5,
    persist: bool = False,
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
            query_vec = compute_session_vector([session.get("mode_target", "CONVERGENT")])
        else:
            query_vec = json.loads(query_vec_raw)

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
                        "session_id": session_id,
                        "target_session_id": s["session_id"],
                        "mode_target": s["mode_target"],
                        "similarity": round(score, 4),
                    })

        scored.sort(key=lambda x: x["similarity"], reverse=True)
        result = scored[:limit]

        # Optionally persist high-confidence edges as real graph edges
        if persist and result:
            try:
                graph = KnowledgeGraph(user_id, db)
                graph.persist_similarity_edges(result, threshold=0.3)
            except Exception:
                logger.warning("Failed to persist similarity edges", exc_info=True)

        return {"nearest": result}

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


@router.post("/fuse")
async def fuse_sessions(
    req: FuseRequest,
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Fuse two sessions into a new fusion concept using VSA binding.
    
    Creates a new concept node with a VSA vector that is the circular
    convolution (bind) of the two session vectors. Edges are created
    from the fusion concept to both parent session concepts.
    """
    try:
        # Verify both sessions exist and belong to the user
        session_a = db.get_session(req.session_a_id)
        session_b = db.get_session(req.session_b_id)
        
        if not session_a or not session_b:
            raise HTTPException(status_code=404, detail="One or both sessions not found")
        
        user_id = session_a["user_id"]
        if current_user and current_user.id != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        if session_b["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Sessions belong to different users")
        
        graph = KnowledgeGraph(user_id, db)
        fusion = graph.fuse_sessions(req.session_a_id, req.session_b_id)
        
        if not fusion:
            raise HTTPException(
                status_code=400,
                detail="Could not fuse sessions. Both sessions must have VSA vectors."
            )
        
        return {
            "fusion_concept_id": str(fusion.id),
            "name": fusion.name,
            "domain": fusion.domain,
            "is_fusion": True,
            "fusion_parent_ids": fusion.fusion_parent_ids,
            "thinkingMode": fusion.thinking_mode_association.value,
        }
    
    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to fuse sessions")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fuse sessions",
        )