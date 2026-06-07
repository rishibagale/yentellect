"""Session management API routes."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ...core.session import (
    start_session as start_session_fn,
    process_turn as process_turn_fn,
    end_session as end_session_fn,
)

router = APIRouter(prefix="/sessions", tags=["sessions"])


class StartSessionRequest(BaseModel):
    user_id: str
    opening_message: str


class TurnRequest(BaseModel):
    user_input: str


@router.post("/start")
async def start_session(req: StartSessionRequest):
    """Start a new cognitive training session."""
    try:
        result = start_session_fn(req.user_id, req.opening_message)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{session_id}/turn")
async def process_turn(session_id: str, req: TurnRequest):
    """Process a conversational turn."""
    try:
        result = process_turn_fn(session_id, req.user_input)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{session_id}/end")
async def end_session(session_id: str):
    """End a session and get summary."""
    try:
        result = end_session_fn(session_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))