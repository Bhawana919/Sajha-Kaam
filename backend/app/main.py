"""Sajha Kaam API.

Run (from backend/):  uvicorn app.main:app --host 0.0.0.0 --port 8000
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session

from app.config import settings
from app.db import engine, init_db
from app.routers import anchor, auth, demo, jobs, junior, public
from app.seed import seed

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    with Session(engine) as session:
        seed(session)
    yield


app = FastAPI(title="Sajha Kaam API", version="0.1.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
for r in (auth.router, junior.router, anchor.router, jobs.router, public.router, demo.router):
    app.include_router(r)


@app.get("/health", tags=["meta"])
def health() -> dict:
    s = settings()
    return {"ok": True, "demo_mode": s.demo_mode, "llm": s.llm_provider}
