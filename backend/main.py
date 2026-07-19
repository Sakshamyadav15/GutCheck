"""
main.py — FastAPI application entry point for DeetsCheck backend.

Run with: uvicorn backend.main:app --reload --port 8000
Or from the backend directory: uvicorn main:app --reload --port 8000
"""

import sys
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Add parent dir to path for relative imports to work from project root
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.db.database import init_db
from backend.api.routes import router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: initialise DB on startup."""
    await init_db()
    yield


app = FastAPI(
    title="DeetsCheck API",
    description=(
        "DeetsCheck — Train the instinct, don't outsource it. "
        "Backend API for the  AI and MIL submission. "
        "Implements the Predict → Investigate → Reveal → Calibrate loop with "
        "server-enforced ordering (PRD §11)."
    ),
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS — allow frontend dev server and production domain
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite dev server
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "https://gut-check.vercel.app",  # production
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "gut-check-api", "version": "2.0.0"}


@app.get("/")
async def root():
    return {
        "message": "DeetsCheck API — Train the instinct. Don't outsource it.",
        "docs": "/docs",
        "": "",
        "track": "AI and MIL",
    }
