"""Session management API routes."""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field

from ...core.session import (
    start_session as start_session_fn,
    process_turn as process_turn_fn,
    end_session as end_session_fn,
)
from ...db.database import DatabaseManager
from ..security import (
    CurrentUser,
    enforce_rate_limit,
    get_current_user,
    require_session_owner,
    require_user_id,
    sanitize_input,
)

router = APIRouter(prefix="/sessions", tags=["sessions"])
logger = logging.getLogger(__name__)
db = DatabaseManager()


class StartSessionRequest(BaseModel):
    user_id: UUID
    opening_message: str = Field(default="", max_length=2000)


class TurnRequest(BaseModel):
    user_input: str = Field(min_length=1, max_length=2000)


@router.post("/start")
async def start_session(
    req: StartSessionRequest,
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Start a new cognitive training session."""
    user_id = require_user_id(req.user_id, current_user)
    enforce_rate_limit(request, f"session-start:{user_id}", limit=8, window_seconds=60)
    try:
        result = start_session_fn(user_id, req.opening_message.strip())
        return result
    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to start session")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not start session.",
        )


@router.post("/{session_id}/turn")
async def process_turn(
    session_id: UUID,
    req: TurnRequest,
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Process a conversational turn."""
    require_session_owner(db, session_id, current_user)
    enforce_rate_limit(request, f"session-turn:{current_user.id}", limit=20, window_seconds=60)
    try:
        result = process_turn_fn(str(session_id), req.user_input.strip())
        return result
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")
    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to process session turn")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not process turn.",
        )


@router.post("/{session_id}/end")
async def end_session(
    session_id: UUID,
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
):
    """End a session and get summary."""
    require_session_owner(db, session_id, current_user)
    enforce_rate_limit(request, f"session-end:{current_user.id}", limit=12, window_seconds=60)
    try:
        result = end_session_fn(str(session_id))
        return result
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")
    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to end session")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not end session.",
        )


@router.get("/metrics")
async def get_session_metrics(current_user: CurrentUser = Depends(get_current_user)):
    rows = db.get_session_metrics(str(current_user.id))
    return {"metrics": rows}


@router.get("/{session_id}")
async def get_session_detail(
    session_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
):
    require_session_owner(db, session_id, current_user)
    s = db.get_session(str(session_id))
    if not s:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")
    turns = db.get_session_turns(str(session_id))
    return {"session": s, "turns": turns}
