"""Knowledge graph visualization API routes."""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from ...core.graph import KnowledgeGraph
from ...db.database import DatabaseManager
from ..security import CurrentUser, get_current_user, require_user_id

router = APIRouter(prefix="/graph", tags=["graph"])
db = DatabaseManager()
logger = logging.getLogger(__name__)


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