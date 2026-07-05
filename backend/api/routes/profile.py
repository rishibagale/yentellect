"""Profile management API routes."""

import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from ...core.graph import KnowledgeGraph
from ...db.database import DatabaseManager
from ..security import CurrentUser, get_current_user, require_user_id

router = APIRouter(prefix="/profile", tags=["profile"])
db = DatabaseManager()
logger = logging.getLogger(__name__)


class CreateProfileRequest(BaseModel):
    user_id: UUID
    name: str = Field(default="", max_length=100)


@router.post("/create")
async def create_profile(
    req: CreateProfileRequest,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Create a new user profile (called on sign-up)."""
    user_id = require_user_id(req.user_id, current_user)
    try:
        safe_name = req.name.strip()[:100]
        user = db.get_user(user_id)
        if user:
            return {"status": "exists", "user_id": user_id}
        db.create_user(user_id, safe_name)
        return {"status": "created", "user_id": user_id}
    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to create profile")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not create profile.",
        )


@router.get("/{user_id}")
async def get_profile(
    user_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Get full cognitive profile for a user."""
    safe_user_id = require_user_id(user_id, current_user)
    try:
        graph = KnowledgeGraph(safe_user_id, db)
        profile = graph.get_profile()
        return profile.model_dump(mode="json")
    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to get profile")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not load profile.",
        )


@router.get("/{user_id}/metrics")
async def get_metrics(
    user_id: UUID,
    limit: Optional[int] = Query(20, ge=1, le=100),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Get session performance metrics over time."""
    safe_user_id = require_user_id(user_id, current_user)
    try:
        metrics = db.get_session_metrics(safe_user_id, limit=limit or 20)
        return {"metrics": metrics}
    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to get profile metrics")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not load profile metrics.",
        )