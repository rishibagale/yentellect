"""
Yentellect FastAPI Backend

Main application entry point with CORS configuration,
lifespan event for DB initialization, and mounted routers.
"""

import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from ..db.database import init_db
from .routes import sessions, profile, graph, dashboard


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator:
    """
    Application lifespan: initialize database on startup.
    """
    # Startup: initialize database schema
    try:
        init_db()
        print("Database initialized successfully.")
    except Exception as e:
        print(f"Warning: Database initialization issue: {e}")
    
    yield
    
    # Shutdown (cleanup if needed)
    print("Yentellect backend shutting down.")


# Create FastAPI app
app = FastAPI(
    title="Yentellect API",
    description="Cognitive Development Platform Backend",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS configuration
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        FRONTEND_URL,
        "http://localhost:3000",
        "https://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}