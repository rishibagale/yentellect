"""
Yentellect FastAPI Backend

Main application entry point with CORS configuration,
lifespan event for DB initialization, and mounted routers.
"""

import logging
import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from ..db.database import init_db
from .routes import sessions, profile, graph, dashboard


logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger(__name__)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Attach conservative security headers to every API response."""

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        
        # Existing headers
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "no-referrer")
        response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
        
        # Additional security headers
        response.headers.setdefault("X-XSS-Protection", "0")  # Deprecated but defense-in-depth
        response.headers.setdefault("X-DNS-Prefetch-Control", "off")
        
        if request.url.scheme == "https":
            response.headers.setdefault(
                "Strict-Transport-Security",
                "max-age=31536000; includeSubDomains; preload",
            )
        
        # Remove Server header to prevent fingerprinting
        if "server" in response.headers:
            del response.headers["server"]
        
        return response


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator:
    """
    Application lifespan: initialize database on startup.
    """
    # Startup: initialize database schema
    try:
        init_db()
        logger.info("Database initialized successfully.")
    except Exception:
        logger.warning("Database initialization issue", exc_info=True)
    
    yield
    
    # Shutdown (cleanup if needed)
    logger.info("Yentellect backend shutting down.")


# Create FastAPI app
app = FastAPI(
    title="Yentellect API",
    description="Cognitive Development Platform Backend",
    version="0.1.0",
    lifespan=lifespan,
    # Disable default docs in production to reduce attack surface
    docs_url="/docs" if os.getenv("ENVIRONMENT", "").lower() != "production" else None,
    redoc_url=None if os.getenv("ENVIRONMENT", "").lower() == "production" else None,
)


@app.get("/health")
async def health():
    """Lightweight health-check endpoint for uptime monitoring."""
    return {"status": "ok"}

# CORS configuration - strict origins
# Keeps backwards compatibility with both local dev and production Vercel frontend
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "ALLOWED_ORIGINS",
        f"{FRONTEND_URL},http://localhost:3000,https://cog-research.vercel.app,https://yentellect.vercel.app",
    ).split(",")
    if origin.strip()
]

app.add_middleware(SecurityHeadersMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
    max_age=600,  # Cache preflight for 10 minutes
)

# Mount routers
app.include_router(sessions.router)
app.include_router(profile.router)
app.include_router(graph.router)
app.include_router(dashboard.router)


@app.get("/")
async def root():
    """API root health check."""
    return {
        "name": "Yentellect API",
        "version": "0.1.0",
        "status": "running",
    }