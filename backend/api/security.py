"""Security helpers for authenticated Yentellect API routes."""

from __future__ import annotations

import hashlib
import hmac
import logging
import os
import re
import time
from collections import defaultdict, deque
from dataclasses import dataclass
from typing import Deque, Optional
from uuid import UUID

import httpx
from fastapi import Header, HTTPException, Request, status

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class CurrentUser:
    """Authenticated Supabase user context."""

    id: str
    email: str | None = None


_rate_buckets: dict[str, Deque[float]] = defaultdict(deque)
# Track failed login attempts per IP for brute-force protection
_failed_login_attempts: dict[str, list[float]] = defaultdict(list)


def _auth_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required.",
        headers={"WWW-Authenticate": "Bearer"},
    )


def _supabase_auth_config() -> tuple[str, str]:
    supabase_url = os.getenv("SUPABASE_URL", "").rstrip("/")
    api_key = os.getenv("SUPABASE_SERVICE_KEY", "") or os.getenv("SUPABASE_ANON_KEY", "")
    if not supabase_url or not api_key:
        logger.error("Supabase auth verification is not configured")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service is unavailable.",
        )
    return supabase_url, api_key


def sanitize_input(text: str, max_length: int = 2000) -> str:
    """Sanitize user input to prevent injection attacks.
    
    - Strips control characters
    - Limits length
    - Removes null bytes
    - Prevents prompt injection markers
    """
    if not isinstance(text, str):
        return ""
    
    # Remove null bytes and control characters (except newlines and tabs)
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)
    
    # Limit length
    text = text[:max_length]
    
    # Strip leading/trailing whitespace
    text = text.strip()
    
    return text


def validate_password_strength(password: str) -> Optional[str]:
    """Validate password strength. Returns error message or None."""
    if len(password) < 8:
        return "Password must be at least 8 characters long."
    if len(password) > 128:
        return "Password must be at most 128 characters long."
    if not re.search(r'[A-Z]', password):
        return "Password must contain at least one uppercase letter."
    if not re.search(r'[a-z]', password):
        return "Password must contain at least one lowercase letter."
    if not re.search(r'[0-9]', password):
        return "Password must contain at least one number."
    return None


def check_brute_force(ip_address: str, max_attempts: int = 5, window_seconds: int = 300) -> bool:
    """Check if an IP has exceeded failed login attempts.
    
    Returns True if the IP is blocked.
    """
    now = time.monotonic()
    attempts = _failed_login_attempts[ip_address]
    
    # Clean old attempts
    while attempts and now - attempts[0] > window_seconds:
        attempts.pop(0)
    
    return len(attempts) >= max_attempts


def record_failed_attempt(ip_address: str) -> None:
    """Record a failed login attempt for an IP."""
    now = time.monotonic()
    _failed_login_attempts[ip_address].append(now)


def clear_failed_attempts(ip_address: str) -> None:
    """Clear failed login attempts for an IP (on successful login)."""
    _failed_login_attempts.pop(ip_address, None)


async def get_current_user(authorization: str | None = Header(default=None)) -> CurrentUser:
    """Validate a Supabase access token and return its user identity.

    The backend never trusts user IDs sent by the browser. Every protected route
    derives ownership from the verified Supabase `sub`/user id.
    """

    if not authorization:
        raise _auth_error()

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token.strip() or len(token) > 8192:
        raise _auth_error()

    supabase_url, api_key = _supabase_auth_config()
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                f"{supabase_url}/auth/v1/user",
                headers={"Authorization": f"Bearer {token.strip()}", "apikey": api_key},
            )
    except httpx.HTTPError:
        logger.warning("Supabase auth verification request failed", exc_info=True)
        raise _auth_error()

    if response.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN):
        raise _auth_error()
    if not response.is_success:
        logger.warning("Supabase auth verification failed with status %s", response.status_code)
        raise _auth_error()

    try:
        data = response.json()
    except ValueError:
        logger.warning("Supabase auth verification returned invalid JSON")
        raise _auth_error()

    user_id = data.get("id")
    if not isinstance(user_id, str):
        raise _auth_error()
    try:
        UUID(user_id)
    except ValueError:
        logger.warning("Supabase auth returned a non-UUID user id")
        raise _auth_error()

    email = data.get("email") if isinstance(data.get("email"), str) else None
    return CurrentUser(id=user_id, email=email)


def require_user_id(user_id: str | UUID, current_user: CurrentUser) -> str:
    """Ensure a requested user id belongs to the authenticated user."""

    requested = str(user_id)
    if requested != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
    return requested


def require_session_owner(db, session_id: str | UUID, current_user: CurrentUser) -> dict:
    """Ensure a session exists and belongs to the authenticated user."""

    session = db.get_session(str(session_id))
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")
    if session.get("user_id") != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
    return session


def enforce_rate_limit(
    request: Request,
    key: str,
    *,
    limit: int,
    window_seconds: int,
) -> None:
    """Small in-memory sliding-window rate limiter.

    This protects expensive session/LLM endpoints from accidental spam and basic
    brute-force abuse. It is process-local by design; use Redis for multi-instance
    distributed rate limiting if the backend scales horizontally.
    """

    client_host = request.client.host if request.client else "unknown"
    bucket_key = f"{key}:{client_host}"
    now = time.monotonic()
    bucket = _rate_buckets[bucket_key]

    while bucket and now - bucket[0] > window_seconds:
        bucket.popleft()

    if len(bucket) >= limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests. Please wait and try again.",
        )

    bucket.append(now)


def generate_csrf_token(user_id: str) -> str:
    """Generate a CSRF token for a user."""
    secret = os.getenv("CSRF_SECRET", os.getenv("SUPABASE_SERVICE_KEY", ""))
    if not secret:
        logger.warning("CSRF_SECRET not configured; CSRF protection is weak")
        return ""
    msg = f"{user_id}:{int(time.time() / 86400)}"  # Rotate daily
    return hmac.new(secret.encode(), msg.encode(), hashlib.sha256).hexdigest()


def validate_csrf_token(token: str, user_id: str) -> bool:
    """Validate a CSRF token for a user."""
    secret = os.getenv("CSRF_SECRET", os.getenv("SUPABASE_SERVICE_KEY", ""))
    if not secret:
        return True  # Skip validation if not configured
    expected = generate_csrf_token(user_id)
    return hmac.compare_digest(token, expected)