"""Profile management API routes."""

from fastapi import APIRouter, HTTPException
from typing import Optional

from ...core.graph import KnowledgeGraph
from ...core.models import CognitiveProfile
from ...db.database import DatabaseManager

router = APIRouter(prefix="/profile", tags=["profile"])
db = DatabaseManager()


@router.get("/{user_id}")
async def get_profile(user_id: str):
    """Get full cognitive profile for a user."""
    try:
        graph = KnowledgeGraph(user_id, db)
        profile = graph.get_profile()
        return profile.model_dump(mode="json")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{user_id}/metrics")
async def get_metrics(user_id: str, limit: Optional[int] = 20):
    """Get session performance metrics over time."""
    try:
        metrics = db.get_session_metrics(user_id, limit=limit)
        return {"metrics": metrics}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))