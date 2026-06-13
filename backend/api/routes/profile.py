"""Profile management API routes."""

from fastapi import APIRouter, HTTPException
from typing import Optional
from pydantic import BaseModel

from ...core.graph import KnowledgeGraph
from ...core.models import CognitiveProfile
from ...db.database import DatabaseManager

router = APIRouter(prefix="/profile", tags=["profile"])
db = DatabaseManager()


class CreateProfileRequest(BaseModel):
    user_id: str
    name: str = ""


@router.post("/create")
async def create_profile(req: CreateProfileRequest):
    """Create a new user profile (called on sign-up)."""
    try:
        user = db.get_user(req.user_id)
        if user:
            return {"status": "exists", "user_id": req.user_id}
        user = db.create_user(req.user_id, req.name)
        return {"status": "created", "user_id": req.user_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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